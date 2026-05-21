'use strict';

const express     = require('express');
const router      = express.Router();
const rateLimit   = require('express-rate-limit');

const { generateQueryFromOllama, generateExplanation } = require('../services/ollamaService');
const { getSchemaContext }      = require('../services/schemaService');
const { validateQuery }         = require('../services/queryValidator');
const { executeQuery }          = require('../services/mongoExecutor');
const { parseNaturalLanguageQuery } = require('../services/nlpExtractor');
const { detectIntent }          = require('../services/intentClassifier');
const { matchPattern }          = require('../services/queryPatternMatcher');
const { createHistoryEntry }    = require('../models/QueryHistory');
const { normalizeField, isValidField, normalizeValue } = require('../config/schemaRegistry');
const { normalizeQueryObject }  = require('../services/queryNormalizer');
const { generateQueryExplanation } = require('../services/queryExplainer');
const { getContextAwareQuery, updateContext } = require('../services/contextMemory');
const { calculateConfidence }   = require('../services/confidenceEngine');
const authMiddleware            = require('../middleware/authMiddleware');

const queryLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    message: { error: 'Too many requests. Please wait a moment.' },
    standardHeaders: true,
    legacyHeaders: false,
});

const OP_MAP = { '$gt': '>', '$lt': '<', '$gte': '>=', '$lte': '<=', '$eq': '=', '$ne': '!=' };

function buildSQLFromMongo(collection, mongoQuery) {
    if (!mongoQuery || Array.isArray(mongoQuery) || !Object.keys(mongoQuery).length) {
        return `SELECT * FROM ${collection};`;
    }

    function parse(field, value) {
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            const conditions = [];
            for (const op in value) {
                const sqlOp = OP_MAP[op];
                if (sqlOp) {
                    const val = value[op];
                    conditions.push(`${field} ${sqlOp} ${typeof val === 'string' ? `'${val}'` : val}`);
                }
            }
            if (conditions.length > 0) return conditions.join(' AND ');
        }
        return `${field} = ${typeof value === 'string' ? `'${value}'` : value}`;
    }

    function buildCondition(queryObj) {
        const conds = [];
        for (const key in queryObj) {
            if (key === '$and' && Array.isArray(queryObj[key])) {
                const andConds = queryObj[key].map(buildCondition).filter(Boolean);
                if (andConds.length) conds.push(`(${andConds.join(' AND ')})`);
            } else if (key === '$or' && Array.isArray(queryObj[key])) {
                const orConds = queryObj[key].map(buildCondition).filter(Boolean);
                if (orConds.length) conds.push(`(${orConds.join(' OR ')})`);
            } else {
                conds.push(parse(key, queryObj[key]));
            }
        }
        return conds.join(' AND ');
    }

    const whereClause = buildCondition(mongoQuery);
    return whereClause
        ? `SELECT * FROM ${collection} WHERE ${whereClause};`
        : `SELECT * FROM ${collection};`;
}

// (normalizeQueryObject migrated to queryNormalizer.js)

// ─── POST /api/query ──────────────────────────────────────────────────────────
router.post('/query', authMiddleware, queryLimiter, async (req, res) => {
    const startTotal = Date.now();

    try {
        const { userQuery } = req.body;
        if (!userQuery || typeof userQuery !== 'string' || !userQuery.trim()) {
            return res.status(400).json({ error: 'userQuery is required.' });
        }

        // ── Layer 1: Context Memory ──────────────────────────────────────────
        const userId = req.user?.id || req.user?._id || 'anonymous';
        const contextUserQuery = getContextAwareQuery(userQuery, userId);
        if (contextUserQuery !== userQuery) {
            console.log(`🧠 CONTEXT INJECTED: "${userQuery}" → "${contextUserQuery}"`);
        }

        // ── Layer 2: Intent Detection ────────────────────────────────────────
        const intent = detectIntent(contextUserQuery);

        // ── Layer 3: Block dangerous operations ──────────────────────────────
        if (intent === 'BLOCKED') {
            return res.status(403).json({
                error: '⛔ Blocked: AskDB is read-only. Destructive operations (DELETE, DROP, TRUNCATE) are not permitted.',
            });
        }

        // ── Layer 4: Pattern Matching (high reliability) ─────────────────────
        let generated = null;
        let aiSource  = 'pattern';

        if (typeof matchPattern !== 'function') {
            console.error('❌ matchPattern function missing');
        } else {
            console.log('✅ QUERY PATTERN MATCHER LOADED');
            const patternResult = matchPattern(contextUserQuery);

            if (patternResult.matched) {
                if (patternResult.blocked) {
                    return res.status(403).json({
                        success: true,
                        intent,
                        ai_source: 'pattern',
                        generated_query: {
                            query_type: 'blocked',
                            collection: patternResult.result.collection,
                            mongo_query: {},
                            sql_query: patternResult.result.sql_query,
                            explanation: patternResult.result.explanation,
                            complexity: 'Blocked',
                        },
                        execution_time: 0,
                        total_time: Date.now() - startTotal,
                        result_count: 0,
                        result: [],
                    });
                }
                generated = patternResult.result;
                aiSource  = 'pattern';
                console.log(`✅ PATTERN MATCH USED`);
            } else if (patternResult.error) {
                console.log(`❌ STRICT VALIDATION FAILED: ${patternResult.error}`);
                return res.status(400).json({
                    success: false,
                    error: patternResult.error
                });
            } else {
                console.log(`❌ PATTERN MATCHER FAILED`);
            }
        }

        // ── Layer 5: Schema-aware Ollama Generation ─────────────────────────
        if (!generated) {
            let schemaContext = null;
            try { schemaContext = await getSchemaContext(); } catch { /* continue */ }

            try {
                generated = await generateQueryFromOllama(contextUserQuery, schemaContext);
                aiSource  = 'ollama';
                console.log(`✅ OLLAMA USED`);
            } catch (ollamaErr) {
                console.warn('Ollama failed → NLP fallback:', ollamaErr.message);
                generated = parseNaturalLanguageQuery(contextUserQuery);
                aiSource  = 'nlp_fallback';
                console.log(`⚠️ NLP FALLBACK USED`);
            }
        }

        // ── Layer 6: Normalize & Validate ────────────────────────────────────
        if (!generated?.collection) {
            generated = parseNaturalLanguageQuery(contextUserQuery);
            aiSource  = 'nlp_fallback';
            console.log(`⚠️ NLP FALLBACK USED (Missing Collection)`);
        }

        const queryType  = (generated.query_type || 'find').toLowerCase();
        let mongoQuery = generated.mongo_query ?? generated.query ?? {};
        
        // Normalize the query against the schema
        if (queryType === 'find' || queryType === 'count') {
            mongoQuery = normalizeQueryObject(generated.collection, mongoQuery);
        }

        const sort       = generated.sort || {};
        const projection = generated.projection || {};
        const limit      = generated.limit || 100;
        const skip       = generated.skip || 0;

        const sqlQuery = generated.sql_query?.trim() ||
            buildSQLFromMongo(generated.collection, Array.isArray(mongoQuery) ? {} : mongoQuery);

        if (queryType !== 'blocked') {
            validateQuery({ query_type: queryType, collection: generated.collection, mongo_query: mongoQuery });
        }

        // ── Execute ───────────────────────────────────────────────────────────
        const { result, execution_time, resultCount } = await executeQuery({
            query_type: queryType,
            collection: generated.collection,
            query: mongoQuery,
            sort,
            projection,
            limit,
            skip,
        });

        // ── AI Explanation (non-blocking) ─────────────────────────────────────
        const explanationString = generateQueryExplanation({
            query_type: queryType,
            collection: generated.collection,
            mongo_query: mongoQuery,
            sort,
            skip,
            limit
        });
        
        let explanationData = {
            explanation: explanationString,
            complexity:  generated.complexity  || 'Simple',
        };
        
        console.log('✅ QUERY EXPLANATION GENERATED');
        console.log(`Original: ${userQuery}`);
        console.log(`Explanation: ${explanationString}`);
        
        // ── Calculate Confidence ──────────────────────────────────────────────
        const confidence = calculateConfidence(aiSource, {
            collection: generated.collection,
            mongo_query: mongoQuery
        });

        // ── Update Context Memory ─────────────────────────────────────────────
        if (queryType !== 'blocked' && generated.collection) {
            updateContext(userId, {
                collection: generated.collection,
                query_type: queryType
            });
        }

        // ── Persist history ───────────────────────────────────────────────────
        createHistoryEntry({
            userId,
            userQuery,
            generatedQuery: { query_type: queryType, collection: generated.collection, mongo_query: mongoQuery, sql_query: sqlQuery },
            executionTime: execution_time,
            resultCount,
        }).catch(err => console.warn('History save failed:', err.message));

        const totalTime = Date.now() - startTotal;
        
        // ── Observability Logs ────────────────────────────────────────────────
        console.log('\n━━━━━━━━━━━━━━━━━━');
        console.log(`USER QUERY       : ${userQuery}`);
        console.log(`CONTEXT INJECTED : ${contextUserQuery !== userQuery ? contextUserQuery : 'None'}`);
        console.log(`AI ROUTE         : ${aiSource.toUpperCase()}`);
        console.log(`FINAL QUERY      : db.${generated.collection}.${queryType}(${JSON.stringify(mongoQuery)})`);
        console.log(`SQL GENERATED    : ${sqlQuery}`);
        console.log(`CONFIDENCE SCORE : ${confidence}`);
        console.log('━━━━━━━━━━━━━━━━━━\n');

        return res.status(200).json({
            success: true,
            intent,
            ai_source: aiSource,
            generated_query: {
                query_type: queryType,
                collection: generated.collection,
                mongo_query: mongoQuery,
                sql_query: sqlQuery,
                explanation: explanationData.explanation,
                complexity:  explanationData.complexity,
                confidence: confidence,
                sort,
                skip,
                limit
            },
            execution_time,
            total_time: totalTime,
            result_count: resultCount,
            result,
        });

    } catch (error) {
        console.error('Query API Error:', error.message);
        const status = error.message.includes('Unsafe') || error.message.includes('blocked') ? 403 : 500;
        return res.status(status).json({ error: error.message || 'Failed to process the query.' });
    }
});

router.get('/status', (req, res) => {
    res.json({ status: 'AskDB backend running', timestamp: new Date().toISOString() });
});

module.exports = router;
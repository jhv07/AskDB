/**
 * NLP Extractor Service
 * Converts natural language → MongoDB + SQL queries
 */

// =====================
// Operator Maps
// =====================
const OPERATOR_MAP = {
    '>': '$gt', 'above': '$gt', 'greater': '$gt', 'more': '$gt', 'over': '$gt',
    '<': '$lt', 'below': '$lt', 'less': '$lt', 'under': '$lt',
    '>=': '$gte',
    '<=': '$lte',
    '=': '$eq', 'equal': '$eq', 'is': '$eq', 'exactly': '$eq',
    '!=': '$ne', 'not': '$ne'
};

const SQL_OPERATOR_MAP = {
    '$gt': '>', '$lt': '<', '$gte': '>=', '$lte': '<=', '$eq': '=', '$ne': '!='
};

// =====================
// 1. FIXED COLLECTION EXTRACTION
// =====================
const extractCollection = (text) => {
    const words = text.toLowerCase().split(/\s+/);

    const stopWords = ["me", "all", "the", "data", "records"];
    const verbs = ["find", "get", "show", "select", "fetch"];

    const knownCollections = ["students", "customers", "orders", "products"];

    // ✅ First: detect known collections directly
    for (let word of words) {
        if (knownCollections.includes(word)) {
            return word;
        }
    }

    // ✅ Second: fallback after verbs
    for (let i = 0; i < words.length; i++) {
        if (verbs.includes(words[i])) {
            for (let j = i + 1; j < words.length; j++) {
                if (!stopWords.includes(words[j])) {
                    return words[j];
                }
            }
        }
    }

    return "your_collection";
};

// =====================
// 2. CONDITION EXTRACTION
// =====================
const extractConditions = (text) => {
    const conditions = [];

    // Pattern: field operator value
    const pattern = /([a-zA-Z_]+)\s*(>=|<=|>|<|=|above|below|greater|less|under|more|over|is|equal|not)\s+(?:than\s+)?([\w\d]+)/gi;

    let match;

    while ((match = pattern.exec(text)) !== null) {
        const field = match[1].toLowerCase();
        const rawOperator = match[2].toLowerCase();
        let rawValue = match[3].replace(/['"]/g, '');

        let value = isNaN(rawValue) ? rawValue : Number(rawValue);
        let mongoOp = OPERATOR_MAP[rawOperator] || '$eq';

        conditions.push({ field, mongoOp, value });
    }

    return conditions;
};

// =====================
// 3. BUILD QUERIES
// =====================
const buildQueries = (collection, conditions) => {
    let mongoQuery = {};
    let sqlConditions = [];
    let explanations = [];

    // ✅ No filters
    if (conditions.length === 0) {
        return {
            mongo: {},
            sql: `SELECT * FROM ${collection};`,
            explanation: `Fetches all records from ${collection}.`
        };
    }

    conditions.forEach(({ field, mongoOp, value }) => {

        // Mongo
        if (mongoOp === '$eq') {
            mongoQuery[field] = value;
        } else {
            if (!mongoQuery[field]) mongoQuery[field] = {};
            mongoQuery[field][mongoOp] = value;
        }

        // SQL
        const sqlOp = SQL_OPERATOR_MAP[mongoOp] || '=';
        const val = typeof value === 'string' ? `'${value}'` : value;

        sqlConditions.push(`${field} ${sqlOp} ${val}`);

        // Explanation
        let human =
            sqlOp === '=' ? 'is equal to' :
                sqlOp === '>' ? 'is greater than' :
                    sqlOp === '<' ? 'is less than' :
                        sqlOp;

        explanations.push(`${field} ${human} ${value}`);
    });

    return {
        mongo: mongoQuery,
        sql: `SELECT * FROM ${collection} WHERE ${sqlConditions.join(' AND ')};`,
        explanation: `Fetches ${collection} where ${explanations.join(' and ')}.`
    };
};

// =====================
// 4. MAIN FUNCTION
// =====================
const parseNaturalLanguageQuery = (userInput) => {
    try {
        if (!userInput || typeof userInput !== 'string') {
            throw new Error("Invalid input format");
        }

        const text = userInput.trim().toLowerCase();

        const collection = extractCollection(text);
        const conditions = extractConditions(text);

        const { mongo, sql, explanation } = buildQueries(collection, conditions);

        return {
            query_type: "find",
            collection,
            mongo_query: mongo,
            sql_query: sql,
            explanation
        };

    } catch (error) {
        return {
            query_type: "find",
            collection: "your_collection",
            mongo_query: {},
            sql_query: "SELECT * FROM your_collection;",
            explanation: "Fallback: could not parse query.",
            error_log: error.message
        };
    }
};

// =====================
module.exports = {
    parseNaturalLanguageQuery,
    extractCollection,
    extractConditions
};
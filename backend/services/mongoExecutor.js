const { getDB } = require('../config/db');

const FORBIDDEN_OPERATORS = new Set([
    '$where', '$function', '$accumulator',
    'mapReduce', 'mapreduce', 'eval',
]);

const FORBIDDEN_QUERY_TYPES = new Set([
    'deleteMany', 'updateMany', 'insertMany',
    'dropDatabase', 'drop', 'delete', 'update', 'insert',
]);

const BLOCKED_PIPELINE_STAGES = new Set(['$out', '$merge']);

function deepScanForbidden(obj, path = 'root') {
    if (Array.isArray(obj)) {
        for (let i = 0; i < obj.length; i++) {
            deepScanForbidden(obj[i], `${path}[${i}]`);
        }
        return;
    }

    if (obj && typeof obj === 'object') {
        for (const key of Object.keys(obj)) {
            if (FORBIDDEN_OPERATORS.has(key)) {
                throw new Error(`Unsafe operator detected: "${key}" at ${path}`);
            }
            if (BLOCKED_PIPELINE_STAGES.has(key)) {
                throw new Error(`Write operator blocked: "${key}" at ${path}`);
            }
            deepScanForbidden(obj[key], `${path}.${key}`);
        }
    }
}

function validatePipeline(pipeline) {
    if (!Array.isArray(pipeline)) {
        throw new Error('Aggregation query must be a pipeline array');
    }

    for (let i = 0; i < pipeline.length; i++) {
        const stage = pipeline[i];
        if (typeof stage !== 'object' || stage === null) {
            throw new Error(`Pipeline stage [${i}] must be an object`);
        }

        const stageOp = Object.keys(stage)[0];

        if (BLOCKED_PIPELINE_STAGES.has(stageOp)) {
            throw new Error(`Pipeline stage "${stageOp}" is not allowed (write operation)`);
        }

        deepScanForbidden(stage, `pipeline[${i}]`);
    }
}

// Recursively resolve {"$date": "ISO string"} and {"$numberLong": "ms"} values
// that Ollama may embed in queries
function resolveDates(obj) {
    if (Array.isArray(obj)) {
        return obj.map(resolveDates);
    }
    if (obj && typeof obj === 'object') {
        if (obj.$date !== undefined) {
            const val = obj.$date;
            if (typeof val === 'string') return new Date(val);
            if (typeof val === 'number') return new Date(val);
            if (val && val.$numberLong) return new Date(parseInt(val.$numberLong, 10));
            return new Date(val);
        }
        if (obj.$numberLong !== undefined) {
            return parseInt(obj.$numberLong, 10);
        }
        const resolved = {};
        for (const key of Object.keys(obj)) {
            resolved[key] = resolveDates(obj[key]);
        }
        return resolved;
    }
    return obj;
}

async function executeQuery({
    query_type,
    collection: collectionName,
    query,
    sort = {},
    projection = {},
    limit = 100,
    skip = 0,
}) {
    const db = getDB();

    const type = (query_type || 'find').toLowerCase();
    if (FORBIDDEN_QUERY_TYPES.has(type)) {
        throw new Error(`Query type "${type}" is not permitted`);
    }

    if (!collectionName || !/^[a-zA-Z0-9_.-]+$/.test(collectionName)) {
        throw new Error(`Invalid collection name: "${collectionName}"`);
    }

    deepScanForbidden(query, 'query');

    const resolvedQuery = resolveDates(query);
    const resolvedSort  = resolveDates(sort);

    const safeLimit = Math.min(Math.max(1, parseInt(limit) || 100), 500);
    const safeSkip  = Math.max(0, parseInt(skip) || 0);

    const collection = db.collection(collectionName);
    const startTime  = Date.now();
    let result;
    let resultCount;

    if (type === 'find' || type === 'search') {
        const filter = resolvedQuery && typeof resolvedQuery === 'object' && !Array.isArray(resolvedQuery)
            ? resolvedQuery
            : {};
        let cursor = collection.find(filter, { projection: projection || {} });
        
        if (resolvedSort && Object.keys(resolvedSort).length > 0) {
            cursor = cursor.sort(resolvedSort);
        }
        if (safeSkip > 0) {
            cursor = cursor.skip(safeSkip);
        }
        cursor = cursor.limit(safeLimit);

        result = await cursor.toArray();
        resultCount = result.length;

    } else if (type === 'aggregate') {
        validatePipeline(resolvedQuery);

        const pipeline = [...resolvedQuery];
        const hasLimit = pipeline.some((stage) => stage.$limit !== undefined);
        if (!hasLimit) {
            pipeline.push({ $limit: safeLimit });
        }

        result = await collection.aggregate(pipeline, { allowDiskUse: true }).toArray();
        resultCount = result.length;

    } else if (type === 'count' || type === 'countdocuments') {
        const filter = resolvedQuery && typeof resolvedQuery === 'object' && !Array.isArray(resolvedQuery)
            ? resolvedQuery
            : {};
        resultCount = await collection.countDocuments(filter);
        result = [{ count: resultCount }];

    } else {
        throw new Error(`Unsupported query type: "${type}"`);
    }

    const execution_time = Date.now() - startTime;
    console.log(`${type} on "${collectionName}" → ${resultCount} docs in ${execution_time}ms`);

    return { result, execution_time, resultCount, collectionName };
}

module.exports = { executeQuery };
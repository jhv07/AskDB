const { isValidField } = require('../config/schemaRegistry');

const FORBIDDEN_KEYWORDS = [
    '$where', '$function', '$accumulator',
    'deletemany', 'updatemany', 'insertmany',
    'dropdatabase', 'eval', 'mapreduce',
    'drop', '$out', '$merge',
];

const ALLOWED_QUERY_TYPES = ['find', 'aggregate', 'count', 'search', 'countdocuments', 'create'];

function validateQuery(queryObject) {
    if (!queryObject || typeof queryObject !== 'object') {
        throw new Error('Invalid query object structure.');
    }

    const type = (queryObject.query_type || '').toLowerCase();
    if (!ALLOWED_QUERY_TYPES.includes(type)) {
        throw new Error(`Invalid query_type: "${queryObject.query_type}". Allowed: ${ALLOWED_QUERY_TYPES.join(', ')}`);
    }

    if (!queryObject.collection || typeof queryObject.collection !== 'string') {
        throw new Error('Invalid or missing collection name.');
    }

    if (!/^[a-zA-Z0-9_.-]+$/.test(queryObject.collection)) {
        throw new Error(`Collection name contains invalid characters: "${queryObject.collection}"`);
    }

    // Support both query and mongo_query field names
    const rawQuery = queryObject.query !== undefined ? queryObject.query : queryObject.mongo_query;

    const queryStr = JSON.stringify(queryObject).toLowerCase();
    for (const keyword of FORBIDDEN_KEYWORDS) {
        if (queryStr.includes(keyword.toLowerCase())) {
            throw new Error(`Unsafe query blocked. Forbidden keyword detected: "${keyword}"`);
        }
    }

    if (rawQuery === undefined || rawQuery === null) {
        return true;
    }

    if (type === 'aggregate' && !Array.isArray(rawQuery)) {
        throw new Error('Aggregate query must be a pipeline array.');
    }

    if ((type === 'find' || type === 'count') && Array.isArray(rawQuery)) {
        throw new Error('Find/count query must be a filter object, not an array.');
    }

    // ── Hallucination Prevention: Strip invalid fields ──
    function stripInvalidFields(obj, col) {
        if (!obj || typeof obj !== 'object') return;
        if (Array.isArray(obj)) {
            obj.forEach(item => stripInvalidFields(item, col));
            return;
        }

        for (const key of Object.keys(obj)) {
            if (key.startsWith('$')) {
                // Logical or operator, recurse
                stripInvalidFields(obj[key], col);
            } else {
                if (!isValidField(col, key)) {
                    console.warn(`⚠️ INVALID FIELD REMOVED: [${col}] stripped field "${key}"`);
                    delete obj[key];
                } else if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
                     // Check inside operators
                     stripInvalidFields(obj[key], col);
                }
            }
        }
    }

    if (rawQuery && type !== 'aggregate' && type !== 'create') {
        stripInvalidFields(rawQuery, queryObject.collection);
    }

    return true;
}

module.exports = { validateQuery };
'use strict';

const OP_MAP = {
    '$gt': 'greater than',
    '$lt': 'less than',
    '$gte': 'greater than or equal to',
    '$lte': 'less than or equal to',
    '$eq': 'equal to',
    '$ne': 'not equal to',
    '$in': 'in',
    '$nin': 'not in'
};

const ORDINALS = {
    1: 'highest',
    2: 'second highest',
    3: 'third highest',
    4: 'fourth highest',
    5: 'fifth highest'
};

const REVERSE_ORDINALS = {
    1: 'lowest',
    2: 'second lowest',
    3: 'third lowest',
    4: 'fourth lowest',
    5: 'fifth lowest'
};

function formatValue(val) {
    if (typeof val === 'string') return `"${val}"`;
    return val;
}

function parseCondition(field, value) {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        const conds = [];
        for (const op in value) {
            if (OP_MAP[op]) {
                conds.push(`${OP_MAP[op]} ${formatValue(value[op])}`);
            }
        }
        if (conds.length) return `${field} are ${conds.join(' and ')}`;
    }
    
    if (value === true) return `${field} is active/true`;
    if (value === false) return `${field} is inactive/false`;
    
    return `${field} is ${formatValue(value)}`;
}

function parseFilters(query) {
    const conditions = [];
    
    for (const key in query) {
        if (key === '$and' && Array.isArray(query[key])) {
            const andConds = query[key].map(parseFilters).filter(Boolean);
            if (andConds.length) conditions.push(`(${andConds.join(' and ')})`);
        } else if (key === '$or' && Array.isArray(query[key])) {
            const orConds = query[key].map(parseFilters).filter(Boolean);
            if (orConds.length) conditions.push(`(${orConds.join(' or ')})`);
        } else {
            conditions.push(parseCondition(key, query[key]));
        }
    }
    return conditions.join(' and ');
}

function generateQueryExplanation(queryData) {
    try {
        const { query_type, collection, mongo_query, sort, skip, limit } = queryData;
        const type = (query_type || 'find').toLowerCase();
        const col = collection || 'records';
        const query = mongo_query || {};
        
        // ── AGGREGATION QUERIES ──
        if (type === 'aggregate' && Array.isArray(query)) {
            for (const stage of query) {
                if (stage.$group) {
                    const groupKeys = Object.keys(stage.$group).filter(k => k !== '_id');
                    if (groupKeys.length > 0) {
                        const firstAgg = stage.$group[groupKeys[0]];
                        if (firstAgg.$avg) return `Calculates the average ${typeof firstAgg.$avg === 'string' ? firstAgg.$avg.replace('$', '') : 'value'} across all ${col}.`;
                        if (firstAgg.$sum) return `Calculates the total sum across all ${col}.`;
                        if (firstAgg.$max) return `Finds the maximum ${typeof firstAgg.$max === 'string' ? firstAgg.$max.replace('$', '') : 'value'} across all ${col}.`;
                        if (firstAgg.$min) return `Finds the minimum ${typeof firstAgg.$min === 'string' ? firstAgg.$min.replace('$', '') : 'value'} across all ${col}.`;
                    }
                }
            }
            return `Performs a complex aggregation pipeline on the ${col} collection.`;
        }

        // ── RANKING QUERIES ──
        if (sort && Object.keys(sort).length > 0) {
            const sortField = Object.keys(sort)[0];
            const sortDir = sort[sortField]; // 1 or -1
            
            if (limit === 1) {
                const rank = (skip || 0) + 1;
                let rankWord;
                if (sortDir === -1) {
                    rankWord = ORDINALS[rank] || `${rank}th highest`;
                } else {
                    rankWord = REVERSE_ORDINALS[rank] || `${rank}th lowest`;
                }
                return `Finds the record in ${col} with the ${rankWord} ${sortField}.`;
            }
        }
        
        // ── TOP N QUERIES ──
        if (limit && limit > 1 && limit !== 100 && Object.keys(query).length === 0 && (!sort || Object.keys(sort).length === 0)) {
            return `Returns the top ${limit} matching records from ${col}.`;
        }

        // ── FIND QUERIES ──
        if (Object.keys(query).length === 0) {
            if (limit && limit !== 100) return `Returns the top ${limit} matching records from ${col}.`;
            return `Finds all records in the ${col} collection.`;
        }
        
        const filterText = parseFilters(query);
        if (filterText) {
            // Check for simple boolean matching (e.g. { active: true })
            if (Object.keys(query).length === 1 && typeof Object.values(query)[0] === 'boolean') {
                const field = Object.keys(query)[0];
                const isActive = Object.values(query)[0];
                return `Finds ${isActive ? 'active' : 'inactive'} records in ${col}.`;
            }
            
            return `Finds records in ${col} where ${filterText}.`;
        }
        
        return `Finds matching records in the ${col} collection.`;
        
    } catch (err) {
        console.warn('Explainer error:', err);
        return 'Query executed successfully.';
    }
}

module.exports = { generateQueryExplanation };

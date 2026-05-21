/**
 * Dynamic Query Engine
 * Hackathon MVP: Converts Natural Language to MongoDB & SQL 
 */

// Mapping dictionaries for natural language to DB syntax
const MONGO_OPERATORS = {
    '>': '$gt', 'above': '$gt', 'greater': '$gt', 'more': '$gt', 'over': '$gt',
    '<': '$lt', 'below': '$lt', 'less': '$lt', 'under': '$lt',
    '>=': '$gte', '<=': '$lte',
    '=': '$eq', 'equal': '$eq', 'is': '$eq', 'exactly': '$eq',
    '!=': '$ne', 'not': '$ne'
};

const SQL_OPERATORS = {
    '$gt': '>', '$lt': '<', '$gte': '>=', '$lte': '<=', '$eq': '=', '$ne': '!='
};

/**
 * 1. Extract Collection Name
 * Looks for target nouns after action verbs.
 */
const extractCollection = (text) => {
    const tableRegex = /(?:find|get|show|select|fetch)\s+(?:all\s+)?([a-zA-Z_]+)/i;
    const match = text.match(tableRegex);
    return match ? match[1].toLowerCase() : "your_table";
};

/**
 * 2. Extract Fields & Conditions
 * Finds patterns like: "age above 25" or "status is active"
 */
const extractConditions = (text) => {
    const conditions = [];
    // Captures: [field] [operator] [value]
    const conditionRegex = /([a-zA-Z_]+)\s*(>|<|=|>=|<=|above|below|greater|less|under|more|is|equal|not|over)\s+(?:than\s+)?('?"?\w+'?"?)/gi;

    let match;
    while ((match = conditionRegex.exec(text)) !== null) {
        const field = match[1].toLowerCase();
        let rawOp = match[2].toLowerCase();
        let rawValue = match[3].replace(/['"]/g, ''); // strip quotes

        // Auto-type conversion
        let value = isNaN(rawValue) ? rawValue : Number(rawValue);
        let mongoOp = MONGO_OPERATORS[rawOp] || '$eq';

        conditions.push({ field, mongoOp, value });
    }
    return conditions;
};

/**
 * 3. Generate MongoDB Query
 */
const generateMongoQuery = (conditions) => {
    let mongoQuery = {};
    conditions.forEach(({ field, mongoOp, value }) => {
        if (!mongoQuery[field]) mongoQuery[field] = {};

        if (mongoOp === '$eq') {
            mongoQuery[field] = value; // Shorthand equality
        } else {
            mongoQuery[field][mongoOp] = value;
        }
    });
    return mongoQuery;
};

/**
 * 4. Generate SQL Query
 */
const generateSQLQuery = (collection, conditions) => {
    if (conditions.length === 0) {
        return `SELECT * FROM ${collection};`;
    }

    const sqlSnippets = conditions.map(({ field, mongoOp, value }) => {
        const sqlOp = SQL_OPERATORS[mongoOp] || '=';
        const parsedVal = typeof value === 'string' ? `'${value}'` : value;
        return `${field} ${sqlOp} ${parsedVal}`;
    });

    return `SELECT * FROM ${collection} WHERE ${sqlSnippets.join(' AND ')};`;
};

/**
 * 5. Generate Explanation
 */
const generateExplanation = (collection, conditions) => {
    if (conditions.length === 0) {
        return `Fetches all records from the ${collection} collection.`;
    }
    const explanations = conditions.map(({ field, mongoOp, value }) => {
        const sqlOp = SQL_OPERATORS[mongoOp] || '=';
        let humanOp = sqlOp === '=' ? 'is equal to' :
            sqlOp === '>' ? 'is greater than' :
                sqlOp === '<' ? 'is less than' : sqlOp;
        return `${field} ${humanOp} ${value}`;
    });
    return `Fetches ${collection} where ${explanations.join(' and ')}.`;
};

/**
 * MAIN: Orchestrator Pipeline
 */
const processNaturalLanguage = (userInput) => {
    try {
        if (!userInput || typeof userInput !== 'string') throw new Error("Invalid Input");

        const queryStr = userInput.trim();
        const collection = extractCollection(queryStr);
        const conditions = extractConditions(queryStr);

        const mongo = generateMongoQuery(conditions);
        const sql = generateSQLQuery(collection, conditions);
        const explanation = generateExplanation(collection, conditions);

        // BONUS: Hackathon Analytics
        const hasFilters = conditions.length > 0;
        const confidence_score = hasFilters ? 95 : (collection !== "your_table" ? 70 : 40);
        const risk_level = hasFilters ? "SAFE" : "WARNING (Full Collection Scan)";

        let performance_suggestion = "Query is optimized.";
        if (!hasFilters) {
            performance_suggestion = "Add filters to prevent reading the entire table into memory.";
        } else {
            const indexFields = conditions.map(c => c.field).join(', ');
            performance_suggestion = `Consider adding a compound index on: { ${indexFields} } for faster lookups.`;
        }

        return {
            query_type: "find",
            collection: collection,
            mongo_query: mongo,
            sql_query: sql,
            explanation: explanation,
            confidence_score: confidence_score,
            risk_level: risk_level,
            performance_suggestion: performance_suggestion
        };

    } catch (error) {
        // ULTIMATE FALLBACK: Never Crash
        return {
            query_type: "find",
            collection: "your_table",
            mongo_query: {},
            sql_query: "SELECT * FROM your_table;",
            explanation: "Fallback executed due to unparseable natural language.",
            confidence_score: 10,
            risk_level: "WARNING (Full Collection Scan)",
            performance_suggestion: "Unable to parse. Review input string."
        };
    }
};

module.exports = { processNaturalLanguage };

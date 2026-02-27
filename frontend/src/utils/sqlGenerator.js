export function generateSQL(queryObject) {
    if (!queryObject || !queryObject.collection) return "-- No valid query provided";

    const { query_type, collection, query } = queryObject;

    if (query_type === "count" || query_type === "countDocuments") {
        let sql = `SELECT COUNT(*) FROM ${collection}`;
        const where = parseConditions(query);
        if (where) sql += `\nWHERE ${where}`;
        return sql + ";";
    }

    if (query_type === "find") {
        let sql = `SELECT * FROM ${collection}`;
        const where = parseConditions(query);
        if (where) sql += `\nWHERE ${where}`;
        return sql + ";";
    }

    if (query_type === "aggregate") {
        return `-- SQL translation for complex aggregation pipelines is limited.\n-- Target collection: ${collection}`;
    }

    return `-- Unsupported query type: ${query_type}`;
}

function parseConditions(query) {
    if (!query || Object.keys(query).length === 0) return "";

    const conditions = [];

    for (const [key, value] of Object.entries(query)) {
        if (key === "$or" && Array.isArray(value)) {
            const orConds = value.map((v) => parseConditions(v)).filter(Boolean);
            if (orConds.length) conditions.push(`(${orConds.join(" OR ")})`);
            continue;
        }
        if (key === "$and" && Array.isArray(value)) {
            const andConds = value.map((v) => parseConditions(v)).filter(Boolean);
            if (andConds.length) conditions.push(`(${andConds.join(" AND ")})`);
            continue;
        }

        if (typeof value === "object" && value !== null && !Array.isArray(value)) {
            for (const [op, opValue] of Object.entries(value)) {
                let sqlOp = "=";
                let formattedVal = typeof opValue === "string" ? `'${opValue}'` : opValue;

                switch (op) {
                    case "$gt": sqlOp = ">"; break;
                    case "$gte": sqlOp = ">="; break;
                    case "$lt": sqlOp = "<"; break;
                    case "$lte": sqlOp = "<="; break;
                    case "$ne": sqlOp = "!="; break;
                    case "$in":
                        if (Array.isArray(opValue)) {
                            formattedVal = `(${opValue.map((v) => (typeof v === "string" ? `'${v}'` : v)).join(", ")})`;
                            sqlOp = "IN";
                        }
                        break;
                    case "$regex":
                        // simplified regex conversion to LIKE
                        sqlOp = "LIKE";
                        const cleanRegex = opValue.toString().replace(/^\^/, "").replace(/\$$/, "");
                        formattedVal = `'%${cleanRegex}%'`;
                        break;
                    default:
                        sqlOp = "=";
                }
                conditions.push(`${key} ${sqlOp} ${formattedVal}`);
            }
        } else {
            const formattedVal = typeof value === "string" ? `'${value}'` : value;
            conditions.push(`${key} = ${formattedVal}`);
        }
    }

    return conditions.join(" AND ");
}

export function analyzeQueryRisk(queryObject) {
    if (!queryObject) return { level: "safe", label: "🟢 Safe Query", color: "text-emerald-400 border-emerald-400/30 bg-emerald-400/10", reason: "Standard query" };

    const { query_type, query } = queryObject;

    if (query_type === "aggregate") {
        return { level: "complex", label: "🟡 Complex Query", color: "text-amber-400 border-amber-400/30 bg-amber-400/10", reason: "Uses aggregation pipeline" };
    }

    const queryStr = JSON.stringify(query || {});

    if (queryStr.includes("$regex")) {
        return { level: "expensive", label: "🔴 Potentially Expensive", color: "text-rose-400 border-rose-400/30 bg-rose-400/10", reason: "Regex search causes high latency" };
    }

    if (Object.keys(query || {}).length === 0 && (query_type === "find" || query_type === "count" || query_type === "countDocuments")) {
        return { level: "expensive", label: "🔴 Full Collection Scan", color: "text-rose-400 border-rose-400/30 bg-rose-400/10", reason: "Missing filters" };
    }

    if (queryStr.includes("$or") || queryStr.includes("$in")) {
        return { level: "complex", label: "🟡 Complex Query", color: "text-amber-400 border-amber-400/30 bg-amber-400/10", reason: "Uses OR/IN operators" };
    }

    return { level: "safe", label: "🟢 Safe Query", color: "text-emerald-400 border-emerald-400/30 bg-emerald-400/10", reason: "Uses exact match operators utilizing indexes" };
}

export function generateOptimizationSuggestions(queryObject) {
    if (!queryObject || !queryObject.collection) return { risk: "NONE", suggestions: [] };

    const { query_type, query, collection } = queryObject;
    const suggestions = [];
    let riskLevel = "SAFE";

    const isFindOrCount = query_type === "find" || query_type === "count" || query_type === "countDocuments";
    const queryStr = JSON.stringify(query || {});

    // 1. Full Collection Scan Check
    if (isFindOrCount && (!query || Object.keys(query).length === 0)) {
        riskLevel = "HIGH";
        suggestions.push({
            type: "INDEX",
            message: "This query performs a full collection scan because it lacks filters. Adding specific filter criteria or limits is highly recommended.",
            code: `db.${collection}.find({ /* add indexed filter field here */ }).limit(100)`
        });
    }

    // 2. Regex Scan Check
    if (queryStr.includes("$regex")) {
        riskLevel = "HIGH";
        suggestions.push({
            type: "INDEX",
            message: "Regular expressions (especially leading wildcards) force expensive collection scans. Consider using a Text Index for optimized text search.",
            code: `db.${collection}.createIndex({ "searchField": "text" })`
        });
    }

    // 3. Simple Field Filtering (Suggest Index)
    if (query && typeof query === 'object') {
        const filterKeys = Object.keys(query).filter(k => !k.startsWith('$'));
        if (filterKeys.length > 0 && riskLevel !== "HIGH") {
            riskLevel = "MEDIUM";
            suggestions.push({
                type: "INDEX",
                message: `Ensure you have an index covering the filtered field '${filterKeys[0]}' to prevent collection scans.`,
                code: `db.${collection}.createIndex({ ${filterKeys[0]}: 1 })`
            });
        }
    }

    // 4. Multiple $or Chains
    if (queryStr.includes("$or")) {
        riskLevel = "MEDIUM";
        suggestions.push({
            type: "INDEX",
            message: "$or queries can be slow. Ensure all fields within the $or clauses have individual indexes, or consider a compound index if they are consistently queried together.",
            code: `// Create single-field indexes for each field in $or`
        });
    }

    // 5. Aggregate Without Early $match
    if (query_type === "aggregate") {
        if (Array.isArray(query) && query.length > 0 && !Object.keys(query[0]).includes("$match")) {
            riskLevel = "HIGH";
            suggestions.push({
                type: "PIPELINE",
                message: "Aggregation pipelines should ideally start with a $match stage to drastically reduce the number of documents passed to subsequent expensive stages.",
                code: `[\n  { $match: { "status": "Active" } },\n  // ... rest of pipeline\n]`
            });
        }
    }

    return {
        risk: riskLevel,
        suggestions
    };
}

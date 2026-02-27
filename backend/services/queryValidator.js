function validateQuery(queryObject) {

    if (!queryObject || typeof queryObject !== "object") {
        throw new Error("Invalid query object structure.");
    }

    const queryStr = JSON.stringify(queryObject).toLowerCase();

    const forbiddenWords = [
        "delete",
        "drop",
        "update",
        "insert",
        "$where",
        "mapreduce",
        "eval"
    ];

    for (const word of forbiddenWords) {
        if (queryStr.includes(word)) {
            throw new Error(`Unsafe query detected. Contains forbidden keyword: ${word}`);
        }
    }

    const allowedTypes = ["find", "aggregate", "count", "search", "countdocuments"];

    const type = (queryObject.query_type || "").toLowerCase();

    if (!allowedTypes.includes(type)) {
        throw new Error(`Invalid query_type generated: ${queryObject.query_type}`);
    }

    if (!queryObject.collection || typeof queryObject.collection !== "string") {
        throw new Error("Invalid or missing collection name.");
    }

    if (typeof queryObject.query !== "object") {
        throw new Error("Invalid query structure.");
    }

    return true;
}

module.exports = { validateQuery };
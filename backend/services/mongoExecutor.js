const { getDB } = require('../config/db');

async function executeQuery(queryObject) {
    const db = getDB();
    const type = queryObject.query_type;
    const collectionName = queryObject.collection;
    const query = queryObject.query;

    const collection = db.collection(collectionName);

    const startTime = Date.now();
    let result;

    if (type === "find" || type === "search") {
        result = await collection.find(query).toArray();
    } else if (type === "aggregate") {
        const pipeline = Array.isArray(query) ? query : [query];
        result = await collection.aggregate(pipeline).toArray();
    } else if (type === "count" || type === "countDocuments") {
        result = await collection.countDocuments(query);
    } else {
        throw new Error(`Unsupported query execution type: ${type}`);
    }

    const execution_time = Date.now() - startTime;

    return {
        result,
        execution_time
    };
}

module.exports = { executeQuery };
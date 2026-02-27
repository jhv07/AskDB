export const simulateExecution = async (queryObject) => {
    return new Promise(resolve => setTimeout(() => {
        // Basic logic to guess execution times
        const isFind = queryObject.query_type === 'find';
        const hasRegex = JSON.stringify(queryObject).includes('$regex');

        let baseMongoTime = isFind ? 12 : 35;
        if (hasRegex) baseMongoTime += 150;

        let baseSqlTime = isFind ? 24 : 45;
        if (hasRegex) baseSqlTime += 200;

        // slight randomization for realism
        const mongoExecution = Math.max(1, Math.floor(baseMongoTime + (Math.random() * 10 - 5)));
        const sqlExecution = Math.max(2, Math.floor(baseSqlTime + (Math.random() * 15 - 5)));

        resolve({
            executionTimeMongo: mongoExecution,
            executionTimeSQL: sqlExecution,
            result: [
                { _id: "1", name: "Alice", marks: 85, status: "Active" },
                { _id: "2", name: "Bob", marks: 62, status: "Active" },
                { _id: "3", name: "Charlie", marks: 75, status: "Active" },
            ]
        });
    }, 600));
};

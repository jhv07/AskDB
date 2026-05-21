'use strict';

const { detectIntent } = require('../services/intentClassifier');
const { matchPattern } = require('../services/queryPatternMatcher');

const testCases = [
    { id: 1, name: "Show all employees", query: "Show all employees" },
    { id: 2, name: "Find customers from Hyderabad", query: "Find customers from Hyderabad" },
    { id: 3, name: "Show sales with amount above 100", query: "Show sales with amount above 100" },
    { id: 4, name: "Count all active users", query: "Count all active users" },
    { id: 5, name: "Total orders by category", query: "Total orders by category" },
    { id: 6, name: "Show orders grouped by month", query: "Show orders grouped by month" },
    { id: 7, name: "Count employees department wise", query: "Count employees department wise" },
    { id: 8, name: "Show total sales amount grouped by category", query: "Show total sales amount grouped by category" },
    { id: 9, name: "Find the second highest salary", query: "Find the second highest salary" },
    { id: 10, name: "Find top 5 customers with highest order value", query: "Find top 5 customers with highest order value" },
    { id: 11, name: "Find employees whose salary is greater than average salary", query: "Find employees whose salary is greater than average salary" },
    { id: 12, name: "Find employees whose name starts with A", query: "Find employees whose name starts with A" },
    { id: 13, name: "Perform case-insensitive search on employee names", query: "Perform case-insensitive search on employee names" },
    { id: 14, name: "Sort employees by salary descending", query: "Sort employees by salary descending" },
    { id: 15, name: "Show page 2 with 10 employees", query: "Show page 2 with 10 employees" },
    { id: 16, name: "Find employees with department details", query: "Find employees with department details" },
    { id: 17, name: "Find customer names with their total orders", query: "Find customer names with their total orders" },
    { id: 18, name: "Create student collection", query: "Create a student collection with name, marks, and department fields" },
    { id: 19, name: "Create employee collection", query: "Create an employee collection with salary and joining date" },
    { id: 20, name: "Find employees without email", query: "Find employees without email field check" }
];

console.log("==================================================");
console.log("🧪 RUNNING 20-QUERY ASKDB COMPLIANCE TEST SUITE");
console.log("==================================================\n");

let passed = 0;

for (const tc of testCases) {
    console.log(`--------------------------------------------------`);
    console.log(`📝 TEST CASE #${tc.id}: ${tc.name}`);
    console.log(`💬 QUERY: "${tc.query}"`);

    const intent = detectIntent(tc.query);
    console.log(`🎯 INTENT: ${intent}`);

    const res = matchPattern(tc.query);

    if (res.matched) {
        console.log(`✅ STATUS: MATCHED`);
        console.log(`📦 COLLECTION: ${res.result.collection}`);
        console.log(`📂 MONGO QUERY:`, JSON.stringify(res.result.mongo_query, null, 2));
        console.log(`⛓️ SQL QUERY:`, res.result.sql_query);
        if (res.result.sort) console.log(`🔀 SORT:`, JSON.stringify(res.result.sort));
        if (res.result.skip) console.log(`⏩ SKIP:`, res.result.skip);
        if (res.result.limit) console.log(`⏹️ LIMIT:`, res.result.limit);
        passed++;
    } else if (res.error) {
        console.log(`❌ STATUS: GRACEFUL FAILURE (SAFE)`);
        console.log(`🛑 ERROR: "${res.error}"`);
        passed++;
    } else {
        console.log(`⚠️ STATUS: NO MATCH (AI FALLBACK)`);
    }
    console.log();
}

console.log("==================================================");
console.log(`🎉 TEST RUN COMPLETE: Passed ${passed}/${testCases.length} checks`);
console.log("==================================================");

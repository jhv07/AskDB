const express = require('express');
const router = express.Router();

const { detectIntent } = require('../services/intentClassifier');
const { generateMongoQuery } = require('../services/openaiService');
const { validateQuery } = require('../services/queryValidator');
const { executeQuery } = require('../services/mongoExecutor');
const authMiddleware = require('../middleware/authMiddleware');

/**
 * @swagger
 * /api/query:
 *   post:
 *     summary: Executes a natural language query against the MongoDB database
 *     description: Extracts intent, generates a MongoDB native query via LLM, validates its safety, and executes it.
 *     tags: [Query]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userQuery
 *             properties:
 *               userQuery:
 *                 type: string
 *                 example: "Show me all active customers in Hyderabad"
 *     responses:
 *       200:
 *         description: Successful query execution
 *       400:
 *         description: Bad Request - Missing parameters
 *       401:
 *         description: Unauthorized - Missing or invalid token
 *       500:
 *         description: Server Error - Query failed validation or execution
 */
router.post('/query', authMiddleware, async (req, res) => {
    try {
        const { userQuery } = req.body;

        // 1️⃣ Validate input
        if (!userQuery || typeof userQuery !== "string") {
            return res.status(400).json({
                error: "userQuery is required and must be a string"
            });
        }

        // 2️⃣ Detect Intent
        const intent = detectIntent(userQuery);

        // 3️⃣ Generate Mongo Query using Ollama
        const generated_query = await generateMongoQuery(userQuery, intent);

        // 4️⃣ Validate Query for security
        validateQuery(generated_query);

        // 5️⃣ Execute Query
        const { result, execution_time } = await executeQuery(generated_query);

        // 6️⃣ Return structured response
        return res.status(200).json({
            intent,
            generated_query,
            explanation: generated_query.explanation,
            execution_time,
            result
        });

    } catch (error) {
        console.error("Error executing query API:", error);

        return res.status(500).json({
            error: error.message || "Failed to process the query."
        });
    }
});

module.exports = router;
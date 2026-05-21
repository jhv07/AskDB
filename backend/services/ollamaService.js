const axios = require('axios');

const OLLAMA_URL   = process.env.OLLAMA_URL  || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3';
const MAX_RETRIES  = 3;
const RETRY_DELAY  = 1000;
const TIMEOUT_MS   = 90000;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function extractJSON(raw) {
    if (!raw || typeof raw !== 'string') throw new Error('Empty Ollama response');

    let cleaned = raw
        .replace(/```json\s*/gi, '')
        .replace(/```\s*/g, '')
        .trim();

    const start = cleaned.indexOf('{');
    const end   = cleaned.lastIndexOf('}');

    if (start === -1 || end === -1 || end < start) {
        throw new Error('No valid JSON object in Ollama response');
    }

    const jsonStr = cleaned.substring(start, end + 1);

    try {
        return JSON.parse(jsonStr);
    } catch {
        const fixed = jsonStr
            .replace(/,\s*}/g, '}')
            .replace(/,\s*]/g, ']')
            .replace(/'/g, '"')
            .replace(/([{,]\s*)(\w+)(\s*:)/g, '$1"$2"$3');
        return JSON.parse(fixed);
    }
}

const { getSchemaString } = require('../config/schemaRegistry');

function buildQueryPrompt(userQuery, schemaContext) {
    const schemaInfo = `DATABASE SCHEMA:\n${getSchemaString()}`;

    return `You are an expert MongoDB query generator. Convert the user's natural language query into a precise MongoDB query.

${schemaInfo}

RULES:
- active students means active=true
- marks above X means $gt
- use aggregation for averages/counts
- never hallucinate fields
- always use valid MongoDB syntax
- return ONLY valid JSON

REQUIRED JSON FORMAT:
{
  "query_type": "find|aggregate|count",
  "collection": "VALID_COLLECTION_NAME",
  "mongo_query": {} or [],
  "sort": {},
  "skip": 0,
  "limit": 50
}

FEW-SHOT EXAMPLES:

Example 1:
User: students with marks above 80
Output:
{
  "query_type": "find",
  "collection": "students",
  "mongo_query": {
    "marks": { "$gt": 80 }
  }
}

Example 2:
User: active students
Output:
{
  "query_type": "find",
  "collection": "students",
  "mongo_query": {
    "active": true
  }
}

Example 3:
User: average salary
Output:
{
  "query_type": "aggregate",
  "collection": "employees",
  "mongo_query": [
    {
      "$group": {
        "_id": null,
        "avg_salary": { "$avg": "$salary" }
      }
    }
  ]
}

Example 4:
User: second highest salary
Output:
{
  "query_type": "find",
  "collection": "employees",
  "mongo_query": {},
  "sort": { "salary": -1 },
  "skip": 1,
  "limit": 1
}

User Query: "${userQuery}"
Output:`;
}

function buildExplanationPrompt(mongoQuery, resultCount) {
    return `You are a database assistant. Explain what this MongoDB query does in ONE plain English sentence.

Query: ${JSON.stringify(mongoQuery)}
Results: ${resultCount} documents returned.

Return ONLY valid JSON (no markdown):
{"explanation": "This query ...", "complexity": "Simple"}

complexity options: "Simple", "Moderate", "Complex"
- Simple: basic find with filters
- Moderate: find with sort/projection or basic aggregate
- Complex: multi-stage aggregate with $lookup or $group chains`;
}

async function callOllama(prompt) {
    const response = await axios.post(
        `${OLLAMA_URL}/api/generate`,
        {
            model: OLLAMA_MODEL,
            prompt,
            stream: false,
            options: {
                temperature: 0.05,
                num_predict: 1000,
            },
        },
        { timeout: TIMEOUT_MS }
    );
    return response.data.response;
}

async function generateQueryFromOllama(userQuery, schemaContext = null) {
    const prompt = buildQueryPrompt(userQuery, schemaContext);
    let lastError;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            console.log(`Ollama attempt ${attempt}/${MAX_RETRIES}: "${userQuery}"`);
            const raw    = await callOllama(prompt);
            const parsed = extractJSON(raw);

            if (!parsed.collection || typeof parsed.collection !== 'string') {
                throw new Error('Missing collection in Ollama response');
            }
            if (!parsed.query_type) parsed.query_type = 'find';
            if (parsed.mongo_query === undefined) parsed.mongo_query = {};

            console.log(`Ollama OK (${attempt}): ${parsed.collection} / ${parsed.query_type}`);
            return parsed;

        } catch (err) {
            lastError = err;
            console.warn(`Ollama attempt ${attempt} failed: ${err.message}`);
            if (attempt < MAX_RETRIES) await sleep(RETRY_DELAY * attempt);
        }
    }

    throw new Error(`Ollama failed after ${MAX_RETRIES} attempts: ${lastError.message}`);
}

async function generateExplanation(mongoQuery, resultCount = 0) {
    try {
        const raw    = await callOllama(buildExplanationPrompt(mongoQuery, resultCount));
        const parsed = extractJSON(raw);
        return {
            explanation: parsed.explanation || 'Query executed successfully.',
            complexity:  parsed.complexity  || 'Simple',
        };
    } catch (err) {
        console.warn('Explanation failed:', err.message);
        return { explanation: 'Query executed and returned results from MongoDB.', complexity: 'Simple' };
    }
}

async function checkOllamaHealth() {
    try {
        const res    = await axios.get(`${OLLAMA_URL}/api/tags`, { timeout: 5000 });
        const models = res.data?.models?.map((m) => m.name) || [];
        return { healthy: true, models };
    } catch {
        return { healthy: false, models: [] };
    }
}

module.exports = { generateQueryFromOllama, generateExplanation, checkOllamaHealth };
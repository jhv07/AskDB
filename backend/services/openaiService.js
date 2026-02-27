const axios = require("axios");

async function generateMongoQuery(userQuery, intent) {
  try {
    const systemPrompt = `
You are a MongoDB query generator.
Output STRICT valid JSON only.

Database: hackathonDB

Collections:

students:
{ name, marks, grade }

customers:
{ name, email, city, status, createdAt }

orders:
{ customerId, amount, category, orderDate, status }

products:
{ name, category, price, description }

Rules:
- Only READ operations.
- Allowed: find, aggregate, countDocuments.
- For numeric comparisons use simple find syntax.
- Example:
  "marks more than 50" →
  { "marks": { "$gt": 50 } }
- Do NOT use $expr.
- Do NOT use $field.
- Do NOT invent operators.
- Only use "$gt", "$lt", "$gte", "$lte", "$eq".

Return:

{
  "query_type": "find | aggregate | count",
  "collection": "collection_name",
  "query": {},
  "explanation": "short explanation"
}
`;

    const response = await axios.post(
      "http://localhost:11434/api/generate",
      {
        model: "llama3",
        prompt: systemPrompt + "\nUser Query: " + userQuery,
        stream: false,
        format: "json",
        options: { temperature: 0 }
      }
    );

    let data = response.data.response;

    // 🔥 FIX: Handle string JSON from Ollama
    if (typeof data === "string") {
      data = JSON.parse(data);
    }

    return data;

  } catch (error) {
    throw new Error("Ollama generation failed: " + error.message);
  }
}

module.exports = { generateMongoQuery };
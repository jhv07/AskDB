const axios = require("axios");

async function generateQueryFromLLM(userQuery) {
    try {
        const response = await axios.post(
            "https://api.openai.com/v1/chat/completions",
            {
                model: "gpt-4o-mini",
                messages: [
                    {
                        role: "system",
                        content: `
You are a database query generator.

STRICT RULES:
- Return ONLY JSON
- NO explanation outside JSON
- NO text before or after JSON
- DO NOT say "Here is the query"

FORMAT:

{
  "query_type": "find",
  "collection": "students",
  "mongo_query": {},
  "sql_query": "",
  "explanation": ""
}

Example:
User: show students with marks above 50

{
  "query_type": "find",
  "collection": "students",
  "mongo_query": { "marks": { "$gt": 50 } },
  "sql_query": "SELECT * FROM students WHERE marks > 50;",
  "explanation": "Fetch students with marks greater than 50"
}
`
                    },
                    {
                        role: "user",
                        content: userQuery
                    }
                ],
                temperature: 0
            },
            {
                headers: {
                    Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
                    "Content-Type": "application/json"
                }
            }
        );

        let text = response.data.choices[0].message.content;

        console.log("🧠 RAW LLM TEXT:", text);

        // 🔥 Extract JSON safely (handles messy responses)
        const start = text.indexOf('{');
        const end = text.lastIndexOf('}');

        if (start === -1 || end === -1) {
            throw new Error("No JSON found in LLM response");
        }

        const jsonString = text.substring(start, end + 1);

        let parsed;

        try {
            parsed = JSON.parse(jsonString);
        } catch (e) {
            console.error("❌ JSON PARSE ERROR:", jsonString);
            throw new Error("Invalid JSON from LLM");
        }

        return parsed;

    } catch (error) {
        console.error("🔥 LLM ERROR FULL:", error.response?.data || error.message);
        throw new Error("LLM failed");
    }
}

module.exports = { generateQueryFromLLM };
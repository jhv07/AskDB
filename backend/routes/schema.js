const express = require('express');
const router = express.Router();
const { getFullSchema, getSchemaContext, getSuggestions, invalidateSchemaCache } = require('../services/schemaService');
const authMiddleware = require('../middleware/authMiddleware');

// ─── GET /api/schema ──────────────────────────────────────────────────────────
// Returns full schema: collections, fields, indexes, document counts
router.get('/schema', authMiddleware, async (req, res) => {
    try {
        const forceRefresh = req.query.refresh === 'true';
        const schema = await getFullSchema(forceRefresh);
        return res.status(200).json({ success: true, schema });
    } catch (err) {
        console.error('❌ Schema API Error:', err.message);
        return res.status(500).json({ error: 'Failed to detect schema: ' + err.message });
    }
});

// ─── GET /api/schema/context ──────────────────────────────────────────────────
// Returns the plain-text schema context string used in Ollama prompts
router.get('/schema/context', authMiddleware, async (req, res) => {
    try {
        const context = await getSchemaContext();
        return res.status(200).json({ success: true, context });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

// ─── GET /api/schema/suggestions ─────────────────────────────────────────────
// Returns schema-aware query suggestion chips for the UI
router.get('/schema/suggestions', authMiddleware, async (req, res) => {
    try {
        const suggestions = await getSuggestions();
        return res.status(200).json({ success: true, suggestions });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

// ─── POST /api/schema/refresh ─────────────────────────────────────────────────
// Manually invalidates the schema cache
router.post('/schema/refresh', authMiddleware, async (req, res) => {
    try {
        invalidateSchemaCache();
        const schema = await getFullSchema(true);
        return res.status(200).json({ success: true, message: 'Schema refreshed', schema });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

module.exports = router;

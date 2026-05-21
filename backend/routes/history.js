const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const {
    createHistoryEntry,
    getUserHistory,
    toggleFavorite,
    deleteHistoryEntry,
    clearUserHistory,
} = require('../models/QueryHistory');

// ─── GET /api/history ─────────────────────────────────────────────────────────
router.get('/history', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;
        const { page = 1, limit = 20, search = '' } = req.query;

        const data = await getUserHistory(userId, {
            page: parseInt(page),
            limit: parseInt(limit),
            search,
        });

        return res.status(200).json({ success: true, ...data });
    } catch (err) {
        console.error('❌ History GET Error:', err.message);
        return res.status(500).json({ error: err.message });
    }
});

// ─── POST /api/history ────────────────────────────────────────────────────────
router.post('/history', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;
        const { userQuery, generatedQuery, executionTime, resultCount } = req.body;

        if (!userQuery) return res.status(400).json({ error: 'userQuery is required' });

        const entry = await createHistoryEntry({
            userId,
            userQuery,
            generatedQuery: generatedQuery || {},
            executionTime: executionTime || 0,
            resultCount: resultCount || 0,
        });

        return res.status(201).json({ success: true, entry });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

// ─── PATCH /api/history/:id/favorite ─────────────────────────────────────────
router.patch('/history/:id/favorite', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;
        const newFavorite = await toggleFavorite(req.params.id, userId);
        return res.status(200).json({ success: true, isFavorite: newFavorite });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

// ─── DELETE /api/history/:id ──────────────────────────────────────────────────
router.delete('/history/:id', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;
        await deleteHistoryEntry(req.params.id, userId);
        return res.status(200).json({ success: true, message: 'Entry deleted' });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

// ─── DELETE /api/history ─────────────────────────────────────────────────────
router.delete('/history', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;
        const deleted = await clearUserHistory(userId);
        return res.status(200).json({ success: true, deleted });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

module.exports = router;

const { getDB } = require('../config/db');
const { ObjectId } = require('mongodb');

const COLLECTION = 'query_history';

// ─────────────────────────────────────────────
// CREATE: Save a query history entry
// ─────────────────────────────────────────────
async function createHistoryEntry({ userId, userQuery, generatedQuery, executionTime, resultCount }) {
    const db = getDB();
    const doc = {
        userId: userId.toString(),
        userQuery,
        generatedQuery,          // Full Ollama output object
        executionTime,           // ms
        resultCount: resultCount || 0,
        isFavorite: false,
        createdAt: new Date(),
    };
    const result = await db.collection(COLLECTION).insertOne(doc);
    return { ...doc, _id: result.insertedId };
}

// ─────────────────────────────────────────────
// READ: Get paginated history for a user
// ─────────────────────────────────────────────
async function getUserHistory(userId, { page = 1, limit = 20, search = '' } = {}) {
    const db = getDB();
    const skip = (page - 1) * limit;

    const filter = { userId: userId.toString() };
    if (search) {
        filter.userQuery = { $regex: search, $options: 'i' };
    }

    const [entries, total] = await Promise.all([
        db.collection(COLLECTION)
            .find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .toArray(),
        db.collection(COLLECTION).countDocuments(filter),
    ]);

    return { entries, total, page, limit };
}

// ─────────────────────────────────────────────
// UPDATE: Toggle favorite
// ─────────────────────────────────────────────
async function toggleFavorite(id, userId) {
    const db = getDB();
    const entry = await db.collection(COLLECTION).findOne({
        _id: new ObjectId(id),
        userId: userId.toString(),
    });

    if (!entry) throw new Error('History entry not found');

    const newFavorite = !entry.isFavorite;
    await db.collection(COLLECTION).updateOne(
        { _id: new ObjectId(id) },
        { $set: { isFavorite: newFavorite } }
    );

    return newFavorite;
}

// ─────────────────────────────────────────────
// DELETE: Remove a history entry
// ─────────────────────────────────────────────
async function deleteHistoryEntry(id, userId) {
    const db = getDB();
    const result = await db.collection(COLLECTION).deleteOne({
        _id: new ObjectId(id),
        userId: userId.toString(),
    });

    if (result.deletedCount === 0) {
        throw new Error('Entry not found or not authorized');
    }

    return true;
}

// ─────────────────────────────────────────────
// DELETE: Clear all history for a user
// ─────────────────────────────────────────────
async function clearUserHistory(userId) {
    const db = getDB();
    const result = await db.collection(COLLECTION).deleteMany({
        userId: userId.toString(),
    });
    return result.deletedCount;
}

module.exports = {
    createHistoryEntry,
    getUserHistory,
    toggleFavorite,
    deleteHistoryEntry,
    clearUserHistory,
};

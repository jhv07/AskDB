'use strict';

// Simple in-memory context store mapping userId/sessionId to their last query context
const contextStore = new Map();

function getContext(userId) {
    if (!userId) return null;
    return contextStore.get(userId) || null;
}

function updateContext(userId, queryData) {
    if (!userId || !queryData) return;
    
    contextStore.set(userId, {
        collection: queryData.collection,
        query_type: queryData.query_type,
        timestamp: Date.now()
    });
}

function getContextAwareQuery(userQuery, userId) {
    const context = getContext(userId);
    if (!context || !context.collection) return userQuery;

    // Check if the query is a follow-up that likely relies on previous context
    // E.g., "what about above 90", "show active ones", "sort by salary"
    const isFollowUp = /what about|and|show|sort by|filter|group by/i.test(userQuery) || userQuery.split(/\s+/).length <= 4;
    
    // Check if a collection is explicitly mentioned in the new query
    // Very basic check - if it doesn't contain a collection word, prepend context
    const collectionMentioned = /(students|employees|customers|orders|products|departments|users|sales)/i.test(userQuery);
    
    if (isFollowUp && !collectionMentioned) {
        return `In the ${context.collection} collection, ${userQuery}`;
    }
    
    return userQuery;
}

module.exports = { getContext, updateContext, getContextAwareQuery };

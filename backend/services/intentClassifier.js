'use strict';

/**
 * Classifies the natural language query into one of 10 supported uppercase intents:
 * - BLOCKED
 * - CREATE
 * - RANKING
 * - COUNT
 * - JOIN
 * - PAGINATION
 * - REGEX_SEARCH
 * - NULL_CHECK
 * - AGGREGATE
 * - FIND
 */
function detectIntent(userQuery) {
    const q = (userQuery || '').trim();
    const lower = q.toLowerCase();

    // 1. BLOCKED operations
    if (/delete|drop|truncate|remove all|wipe|clear all/i.test(lower)) {
        return 'BLOCKED';
    }

    // 2. CREATE operations
    if (/^(?:create|make)\b/i.test(lower) && /\b(collection|table)\b/i.test(lower)) {
        return 'CREATE';
    }

    // 3. RANKING queries
    // E.g., "second highest salary", "top 5 employees", "bottom 3 students"
    // Exclude general aggregates or duplicate checking
    const isRanking = /highest|lowest|maximum|minimum|max|min|best|worst|top|bottom/i.test(lower) && 
                     !/above\s+average|greater than.*average|higher than.*average/i.test(lower) &&
                     !/highest\s+\w+\s+in\s+each|highest\s+\w+\s+per\s+dep|max\s+\w+\s+in\s+each/i.test(lower) &&
                     !/duplicate/i.test(lower) &&
                     !/top\s+\d+\s+customer|highest.*order.*value|best.*customer|highest.*total.*order|customer.*highest.*order/i.test(lower);
    if (isRanking) {
        return 'RANKING';
    }

    // 4. AGGREGATE group-by keywords prioritized before simpler COUNT intent
    if (/department.wise|per department|by department|each department|group by|category.wise|monthly|per category/i.test(lower)) {
        return 'AGGREGATE';
    }

    // 5. COUNT queries
    if (/^(?:how many|count)/i.test(lower) || /\bcount\b/i.test(lower)) {
        return 'COUNT';
    }

    // 5. JOIN queries
    if (/join|with department detail|employee.*department|customer.*order|order.*customer/i.test(lower)) {
        return 'JOIN';
    }

    // 6. PAGINATION queries
    if (/page\s+\d+|skip\s+\d+|pagination/i.test(lower)) {
        return 'PAGINATION';
    }

    // 7. REGEX_SEARCH queries
    if (/starts?\s+with|contains|case.insensitive|case insensitive/i.test(lower)) {
        return 'REGEX_SEARCH';
    }

    // 8. NULL_CHECK queries
    if (/without|missing|not exist|no email/i.test(lower)) {
        return 'NULL_CHECK';
    }

    // 9. AGGREGATE queries
    if (/average|avg|total|sum|highest|max|maximum|lowest|min|minimum|monthly|by month|month.wise|per month|trend|by category|per category|category.wise|duplicate/i.test(lower)) {
        return 'AGGREGATE';
    }

    // 10. FIND queries
    return 'FIND';
}

module.exports = { detectIntent };

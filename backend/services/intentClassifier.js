function detectIntent(userQuery) {
    const query = (userQuery || "").toLowerCase();

    const aggregateRegex = /(total|sum|average|top|group|monthly|trend)/;
    if (aggregateRegex.test(query)) {
        return "aggregate";
    }

    const searchRegex = /(search|contains|similar|about)/;
    if (searchRegex.test(query)) {
        return "search";
    }

    const countRegex = /(count)/;
    if (countRegex.test(query)) {
        return "count";
    }

    return "find";
}

module.exports = { detectIntent };

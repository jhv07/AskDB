'use strict';

const { normalizeField, isValidField, normalizeValue } = require('../config/schemaRegistry');

function normalizeQueryObject(collectionName, queryObj, currentField = null) {
    if (queryObj === null || queryObj === undefined) return queryObj;
    
    // If it's a primitive value and we know the field, normalize it
    if (typeof queryObj !== 'object') {
        if (currentField) {
            const normalizedVal = normalizeValue(collectionName, currentField, queryObj);
            if (normalizedVal !== queryObj) {
                console.log(`✅ NORMALIZATION APPLIED: [${collectionName}] ${currentField}: ${queryObj} -> ${normalizedVal}`);
            }
            return normalizedVal;
        }
        return queryObj;
    }

    if (Array.isArray(queryObj)) {
        return queryObj.map(item => normalizeQueryObject(collectionName, item, currentField));
    }
    
    const normalized = {};
    for (const key of Object.keys(queryObj)) {
        if (key.startsWith('$')) {
            // For logical operators like $and, $or, child is a new query object so we clear currentField.
            // For comparison operators like $gt, $lt, child is a value so we keep currentField.
            const nextField = (key === '$and' || key === '$or' || key === '$nor') ? null : currentField;
            normalized[key] = normalizeQueryObject(collectionName, queryObj[key], nextField);
        } else {
            const normalizedField = normalizeField(collectionName, key);
            if (isValidField(collectionName, normalizedField)) {
                normalized[normalizedField] = normalizeQueryObject(collectionName, queryObj[key], normalizedField);
            }
        }
    }
    return normalized;
}

module.exports = { normalizeQueryObject };

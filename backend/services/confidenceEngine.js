'use strict';

const { isValidField } = require('../config/schemaRegistry');

function calculateConfidence(aiSource, generatedQuery, schemaContext = null) {
    let confidence = 0.5;

    // Base score by AI Source
    if (aiSource === 'pattern') {
        confidence = 0.95; // High confidence for exact regex match
    } else if (aiSource === 'ollama') {
        confidence = 0.85;
    } else if (aiSource === 'nlp_fallback') {
        confidence = 0.60;
    }

    // Schema Match Confidence Bonus
    if (generatedQuery && generatedQuery.collection && generatedQuery.mongo_query) {
        const col = generatedQuery.collection;
        let allFieldsValid = true;
        let fieldCount = 0;

        function checkFields(obj) {
            if (!obj || typeof obj !== 'object') return;
            if (Array.isArray(obj)) {
                obj.forEach(checkFields);
                return;
            }
            
            for (const key of Object.keys(obj)) {
                if (key.startsWith('$')) {
                    checkFields(obj[key]);
                } else {
                    fieldCount++;
                    if (!isValidField(col, key)) {
                        allFieldsValid = false;
                    }
                }
            }
        }

        checkFields(generatedQuery.mongo_query);

        // If there are fields and they are all valid according to the schema
        if (fieldCount > 0 && allFieldsValid) {
            confidence += 0.04;
        }
    }

    // Cap at 1.0
    return Math.min(1.0, confidence);
}

module.exports = { calculateConfidence };

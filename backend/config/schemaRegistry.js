const SCHEMA_REGISTRY = {
    collections: {
        employees: {
            fields: ['name', 'email', 'department', 'salary', 'joiningDate', 'skills', 'experience', 'isActive'],
            aliases: {
                status: 'isActive',
                active: 'isActive'
            },
            normalize: {
                isActive: {
                    active: true,
                    inactive: false
                }
            }
        },
        students: {
            fields: ['name', 'marks', 'grade', 'department', 'rollNumber', 'active'],
            aliases: {
                status: 'active'
            },
            normalize: {
                active: {
                    active: true,
                    inactive: false
                }
            }
        },
        customers: {
            fields: ['name', 'email', 'city', 'status', 'createdAt'],
            aliases: {
                active: 'status'
            }
        },
        orders: {
            fields: ['customerName', 'customerId', 'amount', 'category', 'month', 'monthNum', 'orderDate', 'status'],
            aliases: {}
        },
        products: {
            fields: ['name', 'category', 'price', 'stock', 'description'],
            aliases: {}
        },
        sales: {
            fields: ['category', 'amount', 'month', 'monthNum', 'year', 'date', 'region'],
            aliases: {}
        },
        users: {
            fields: ['username', 'email', 'role', 'createdAt', 'active', 'age'],
            aliases: {
                status: 'active'
            },
            normalize: {
                active: {
                    active: true,
                    inactive: false
                }
            }
        },
        departments: {
            fields: ['name', 'head', 'budget'],
            aliases: {}
        }
    }
};

function getSchemaString() {
    return Object.entries(SCHEMA_REGISTRY.collections).map(([col, data]) => {
        return `- ${col} (${data.fields.join(', ')})`;
    }).join('\n');
}

function normalizeField(collectionName, fieldName) {
    const col = SCHEMA_REGISTRY.collections[collectionName];
    if (!col) return fieldName; // Fallback

    if (col.aliases[fieldName]) {
        return col.aliases[fieldName];
    }
    
    // Check if valid field
    if (col.fields.includes(fieldName)) {
        return fieldName;
    }
    
    // Case-insensitive match check
    const lowerField = fieldName.toLowerCase();
    const match = col.fields.find(f => f.toLowerCase() === lowerField);
    if (match) return match;

    // Return original, validation might strip it later or it's a nested field
    return fieldName;
}

function isValidField(collectionName, fieldName) {
    // Basic nested fields bypass e.g. "address.city" or MongoDB operators like "$regex"
    if (fieldName.includes('.') || fieldName.startsWith('$')) return true;
    
    const col = SCHEMA_REGISTRY.collections[collectionName];
    if (!col) return false;
    
    return col.fields.includes(fieldName);
}

function normalizeValue(collectionName, fieldName, value) {
    const col = SCHEMA_REGISTRY.collections[collectionName];
    if (!col || !col.normalize || !col.normalize[fieldName]) return value;

    if (typeof value === 'string' && col.normalize[fieldName].hasOwnProperty(value.toLowerCase())) {
        return col.normalize[fieldName][value.toLowerCase()];
    }
    return value;
}

function isValidCollection(collectionName) {
    return !!SCHEMA_REGISTRY.collections[collectionName];
}

module.exports = {
    SCHEMA_REGISTRY,
    getSchemaString,
    normalizeField,
    isValidField,
    isValidCollection,
    normalizeValue
};

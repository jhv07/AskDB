const { getDB } = require('../config/db');

const CACHE_TTL_MS = parseInt(process.env.SCHEMA_CACHE_TTL_MS, 10) || 300000; // 5 minutes

let schemaCache = null;
let cacheTimestamp = 0;

// ─────────────────────────────────────────────
// UTILITY: Infer JS type → human-readable type
// ─────────────────────────────────────────────
function inferType(value) {
    if (value === null || value === undefined) return 'null';
    if (value instanceof Date) return 'Date';
    if (Array.isArray(value)) return 'Array';
    if (typeof value === 'object' && value.constructor?.name === 'ObjectId') return 'ObjectId';
    if (typeof value === 'object') return 'Object';
    return typeof value; // string, number, boolean
}

// ─────────────────────────────────────────────
// CORE: Introspect a single collection
// ─────────────────────────────────────────────
async function introspectCollection(db, collectionName) {
    const collection = db.collection(collectionName);

    // Sample up to 10 documents for field detection
    const samples = await collection.find({}).limit(10).toArray();
    const totalCount = await collection.estimatedDocumentCount();

    // Collect all unique field names + types across samples
    const fieldMap = {};
    for (const doc of samples) {
        for (const [key, value] of Object.entries(doc)) {
            if (!fieldMap[key]) {
                fieldMap[key] = new Set();
            }
            fieldMap[key].add(inferType(value));
        }
    }

    // Convert to clean array
    const fields = Object.entries(fieldMap).map(([name, types]) => ({
        name,
        types: [...types],
    }));

    // Get indexes
    let indexes = [];
    try {
        const rawIndexes = await collection.indexes();
        indexes = rawIndexes.map((idx) => ({
            name: idx.name,
            key: idx.key,
            unique: idx.unique || false,
        }));
    } catch {
        // Some collections may not support index listing
    }

    return {
        name: collectionName,
        documentCount: totalCount,
        fields,
        indexes,
        sampleDocument: samples[0] || null,
    };
}

// ─────────────────────────────────────────────
// MAIN: Get full schema (cached)
// ─────────────────────────────────────────────
async function getFullSchema(forceRefresh = false) {
    const now = Date.now();
    const isCacheValid = schemaCache && (now - cacheTimestamp) < CACHE_TTL_MS;

    if (!forceRefresh && isCacheValid) {
        console.log('📦 Schema served from cache');
        return schemaCache;
    }

    console.log('🔍 Detecting MongoDB schema...');
    const db = getDB();

    // Get all collection names (excluding system collections)
    const allCollections = await db.listCollections().toArray();
    const userCollections = allCollections
        .map((c) => c.name)
        .filter((name) => !name.startsWith('system.'));

    // Introspect all collections in parallel
    const collectionSchemas = await Promise.all(
        userCollections.map((name) => introspectCollection(db, name))
    );

    const schema = {
        database: db.databaseName,
        collectionCount: collectionSchemas.length,
        collections: collectionSchemas,
        generatedAt: new Date().toISOString(),
    };

    // Update cache
    schemaCache = schema;
    cacheTimestamp = now;

    console.log(`✅ Schema detected: ${collectionSchemas.length} collections`);
    return schema;
}

// ─────────────────────────────────────────────
// EXPORT: Build context string for Ollama prompts
// ─────────────────────────────────────────────
async function getSchemaContext() {
    try {
        const schema = await getFullSchema();

        if (!schema.collections.length) {
            return 'No collections found in the database.';
        }

        const lines = schema.collections.map((col) => {
            const fieldNames = col.fields.map((f) => f.name).join(', ');
            return `- ${col.name} (${col.documentCount} docs) → fields: ${fieldNames}`;
        });

        return lines.join('\n');
    } catch (err) {
        console.warn('⚠️ Schema context unavailable:', err.message);
        return 'Schema unavailable. Infer collection from query context.';
    }
}

// ─────────────────────────────────────────────
// EXPORT: Query suggestions based on schema
// ─────────────────────────────────────────────
async function getSuggestions() {
    try {
        const schema = await getFullSchema();

        const suggestions = [];

        for (const col of schema.collections) {
            const name = col.name;
            const fields = col.fields.map((f) => f.name);

            // Generic suggestions per collection
            suggestions.push(`Show all ${name}`);
            suggestions.push(`Count total ${name}`);

            // Field-specific suggestions
            const numericFields = col.fields
                .filter((f) => f.types.includes('number'))
                .map((f) => f.name);

            if (numericFields.length > 0) {
                const f = numericFields[0];
                suggestions.push(`Show ${name} with ${f} above 100`);
                suggestions.push(`Top 5 ${name} by ${f}`);
            }

            // Date-based suggestions
            const dateFields = col.fields
                .filter((f) => f.types.includes('Date'))
                .map((f) => f.name);

            if (dateFields.length > 0) {
                suggestions.push(`Show ${name} grouped by month`);
            }

            // Status-like string fields
            const statusFields = fields.filter((f) =>
                ['status', 'category', 'type', 'role', 'department'].includes(f.toLowerCase())
            );
            if (statusFields.length > 0) {
                suggestions.push(`Total ${name} by ${statusFields[0]}`);
            }
        }

        // Deduplicate and limit
        return [...new Set(suggestions)].slice(0, 12);
    } catch (err) {
        console.warn('⚠️ Suggestions unavailable:', err.message);
        return [
            'Show all students',
            'Count total orders',
            'Show sales by category',
            'Top 5 customers by revenue',
        ];
    }
}

// ─────────────────────────────────────────────
// UTILITY: Invalidate cache (call after writes)
// ─────────────────────────────────────────────
function invalidateSchemaCache() {
    schemaCache = null;
    cacheTimestamp = 0;
    console.log('🗑️ Schema cache invalidated');
}

module.exports = {
    getFullSchema,
    getSchemaContext,
    getSuggestions,
    invalidateSchemaCache,
};

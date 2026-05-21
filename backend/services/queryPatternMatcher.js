'use strict';

const { 
  SCHEMA_REGISTRY, 
  isValidCollection, 
  isValidField, 
  normalizeField, 
  normalizeValue 
} = require('../config/schemaRegistry');

const { detectIntent } = require('./intentClassifier');

const NOW = () => Date.now();
const DAYS_AGO = (n) => new Date(NOW() - n * 86400000);

// ── Collection keyword map ─────────────────────────────────────────────────────
const COLLECTION_MAP = [
  { col: 'employees', words: ['employee','employees','staff','worker','workers','emp','salary','salaries','hire','joining','department','dept'] },
  { col: 'students',  words: ['student','students','marks','grade','grades','roll','rollnumber','score','scores','academic'] },
  { col: 'customers', words: ['customer','customers','client','clients','buyer','buyers'] },
  { col: 'orders',    words: ['order','orders','purchase','purchases','transaction','transactions','revenue','sale','sales'] },
  { col: 'products',  words: ['product','products','item','items','price','prices','stock','inventory'] },
  { col: 'departments', words: ['departments','department'] },
  { col: 'users',     words: ['user','users','account','accounts','member','members','age'] },
  { col: 'sales',     words: ['sales','sale','revenue','region','year'] }
];

function inferCollection(q) {
  const lower = q.toLowerCase();
  const words = lower.split(/\W+/);
  for (const { col, words: kws } of COLLECTION_MAP) {
    if (kws.some(k => words.includes(k) || lower.includes(k))) return col;
  }
  return null;
}

// ── Ordinal helpers ────────────────────────────────────────────────────────────
const ORDINALS = {
  'first': 1, 'second': 2, 'third': 3, 'fourth': 4, 'fifth': 5,
  'sixth': 6, 'seventh': 7, 'eighth': 8, 'ninth': 9, 'tenth': 10,
  '1st': 1, '2nd': 2, '3rd': 3, '4th': 4, '5th': 5,
  '6th': 6, '7th': 7, '8th': 8, '9th': 9, '10th': 10
};

function extractNumber(q) {
  const m = q.match(/\b(\d+)\b/);
  return m ? parseInt(m[1]) : null;
}

// ── Numeric range extraction ───────────────────────────────────────────────────
function extractRange(q) {
  const m = q.match(/between\s+(\d+)\s+and\s+(\d+)/i);
  if (m) return { min: parseInt(m[1]), max: parseInt(m[2]) };
  const gt = q.match(/(?:above|greater than|more than|over)\s+(\d+)/i);
  const lt = q.match(/(?:below|less than|under)\s+(\d+)/i);
  return { min: gt ? parseInt(gt[1]) : null, max: lt ? parseInt(lt[1]) : null };
}

// ── Field detector ─────────────────────────────────────────────────────────────
function detectField(q) {
  if (/salary|salaries/i.test(q)) return 'salary';
  if (/marks|score|grades/i.test(q)) return 'marks';
  if (/price/i.test(q)) return 'price';
  if (/amount|revenue/i.test(q)) return 'amount';
  if (/age|older|younger/i.test(q)) return 'age';
  if (/joining|join date|hired/i.test(q)) return 'joiningDate';
  if (/stock|inventory/i.test(q)) return 'stock';
  if (/experience/i.test(q)) return 'experience';
  if (/budget/i.test(q)) return 'budget';
  if (/email/i.test(q)) return 'email';
  if (/name/i.test(q)) return 'name';
  if (/status/i.test(q)) return 'status';
  return null;
}

// ── Multi-Condition Parser helpers ──────────────────────────────────────────────
function extractConditionsFromSub(sub, context) {
  const lower = sub.toLowerCase();
  const conds = [];

  // Boolean status condition
  if (/\binactive\b/i.test(lower)) {
    conds.push({ active: false });
  } else if (/\bactive\b/i.test(lower)) {
    conds.push({ active: true });
  }

  // Location filter condition
  const cityMatch = /from\s+([A-Z][a-z]+)/i.exec(sub);
  if (cityMatch) {
    conds.push({ city: cityMatch[1] });
  }

  // Email status condition
  if (/without\s+(?:an?\s+)?email|no\s+email|missing\s+email|email.*not\s+exist/i.test(lower)) {
    conds.push({ email: { $exists: false } });
  }

  // Relational comparisons
  const gtRegex = /(?:([a-zA-Z]+)\s+(?:is\s+)?)?(?:above|greater than|more than|over|older than|>)\s*(\d+)/gi;
  const ltRegex = /(?:([a-zA-Z]+)\s+(?:is\s+)?)?(?:below|less than|under|younger than|<)\s*(\d+)/gi;

  let match;
  gtRegex.lastIndex = 0;
  ltRegex.lastIndex = 0;

  while ((match = gtRegex.exec(sub)) !== null) {
    const rawField = match[1];
    const val = parseInt(match[2]);
    const detected = rawField ? detectField(rawField) : null;
    const field = detected || context.lastField || 'salary';
    if (detected) {
      context.lastField = detected;
    }
    conds.push({ [field]: { $gt: val } });
  }

  while ((match = ltRegex.exec(sub)) !== null) {
    const rawField = match[1];
    const val = parseInt(match[2]);
    const detected = rawField ? detectField(rawField) : null;
    const field = detected || context.lastField || 'salary';
    if (detected) {
      context.lastField = detected;
    }
    conds.push({ [field]: { $lt: val } });
  }

  return conds;
}

function parseQuery(q, context) {
  // First split by 'or'
  const orParts = q.split(/\bor\b/i);
  if (orParts.length > 1) {
    const subQueries = orParts.map(part => parseQuery(part, context)).filter(Boolean);
    if (subQueries.length === 0) return null;
    if (subQueries.length === 1) return subQueries[0];
    return { $or: subQueries };
  }

  // Then split by 'and'
  const andParts = q.split(/\band\b/i);
  if (andParts.length > 1) {
    const subQueries = andParts.map(part => parseQuery(part, context)).filter(Boolean);
    if (subQueries.length === 0) return null;
    if (subQueries.length === 1) return subQueries[0];
    return { $and: subQueries };
  }

  // Base case: extract from simple substring
  const conds = extractConditionsFromSub(q, context);
  if (conds.length === 0) return null;
  if (conds.length === 1) return conds[0];
  return { $and: conds };
}

function flattenQuery(query) {
  if (!query || typeof query !== 'object') return query;

  if (query.$and && Array.isArray(query.$and)) {
    const flatSub = [];
    for (const sub of query.$and) {
      const flat = flattenQuery(sub);
      if (flat && flat.$and && Array.isArray(flat.$and)) {
        flatSub.push(...flat.$and);
      } else if (flat) {
        flatSub.push(flat);
      }
    }
    return flatSub.length === 1 ? flatSub[0] : { $and: flatSub };
  }

  if (query.$or && Array.isArray(query.$or)) {
    const flatSub = [];
    for (const sub of query.$or) {
      const flat = flattenQuery(sub);
      if (flat && flat.$or && Array.isArray(flat.$or)) {
        flatSub.push(...flat.$or);
      } else if (flat) {
        flatSub.push(flat);
      }
    }
    return flatSub.length === 1 ? flatSub[0] : { $or: flatSub };
  }

  return query;
}

function buildSQL(collection, mongoQuery) {
  let s = `SELECT * FROM ${collection}`;
  
  function parseVal(val) {
    if (typeof val === 'string') return `'${val}'`;
    return val;
  }

  function getConditionString(field, condition) {
    if (condition && typeof condition === 'object' && !Array.isArray(condition)) {
      const parts = [];
      const opMap = { '$gt': '>', '$lt': '<', '$gte': '>=', '$lte': '<=', '$eq': '=', '$ne': '!=' };
      for (const [op, val] of Object.entries(condition)) {
        if (opMap[op]) {
          parts.push(`${field} ${opMap[op]} ${parseVal(val)}`);
        }
      }
      return parts.join(' AND ');
    }
    return `${field} = ${parseVal(condition)}`;
  }

  function buildWhere(query) {
    if (!query || typeof query !== 'object') return '';
    
    if (query.$and && Array.isArray(query.$and)) {
      const sub = query.$and.map(buildWhere).filter(Boolean);
      if (sub.length === 0) return '';
      if (sub.length === 1) return sub[0];
      return sub.join('\nAND ');
    }
    if (query.$or && Array.isArray(query.$or)) {
      const sub = query.$or.map(buildWhere).filter(Boolean);
      if (sub.length === 0) return '';
      if (sub.length === 1) return sub[0];
      return `(${sub.join(' OR ')})`;
    }
    
    const conds = [];
    for (const [key, val] of Object.entries(query)) {
      if (key.startsWith('$')) continue;
      conds.push(getConditionString(key, val));
    }
    return conds.join(' AND ');
  }

  const where = buildWhere(mongoQuery);
  if (where) {
    s += `\nWHERE ${where}`;
  }
  return s + ';';
}

function sqlFind(col, where, order, limit, skip) {
  let s = `SELECT * FROM ${col}`;
  if (where) s += ` WHERE ${where}`;
  if (order) s += ` ORDER BY ${order}`;
  if (limit) s += ` LIMIT ${limit}`;
  if (skip)  s += ` OFFSET ${skip}`;
  return s + ';';
}

// ═══════════════════════════════════════════════════════════════════════════════
// DETAILED QUERY GENERATOR SERVICE BLOCKS
// ═══════════════════════════════════════════════════════════════════════════════

// ── 1. buildCreateQuery ────────────────────────────────────────────────────────
function buildCreateQuery(q) {
  const lower = q.toLowerCase();
  let colName = null;
  // Order 1: "create collection/table <name>"
  const m1 = /(?:create|make)\s+(?:collection|table)\s+([a-zA-Z0-9_-]+)/i.exec(lower);
  if (m1) {
    colName = m1[1];
  } else {
    // Order 2: "create [a/an/the] <name> collection/table"
    const m2 = /(?:create|make)\s+(?:a\s+|an\s+|the\s+)?([a-zA-Z0-9_-]+)\s+(?:collection|table)/i.exec(lower);
    if (m2) {
      colName = m2[1];
    }
  }

  if (!colName) {
    colName = inferCollection(q);
  }

  if (!colName) {
    console.log("❌ COULD NOT INFER COLLECTION");
    return {
      matched: false,
      error: "Could not determine collection name for CREATE query."
    };
  }

  let sqlColumns = "id INT PRIMARY KEY AUTO_INCREMENT";
  const schema = SCHEMA_REGISTRY.collections[colName];
  if (schema) {
    const cols = schema.fields.map(f => {
      let type = "VARCHAR(255)";
      if (f === 'salary' || f === 'amount' || f === 'price' || f === 'budget') type = "DECIMAL(10, 2)";
      else if (f === 'age' || f === 'marks' || f === 'rollNumber' || f === 'stock' || f === 'experience') type = "INT";
      else if (f === 'joiningDate' || f === 'createdAt' || f === 'orderDate' || f === 'date') type = "DATE";
      else if (f === 'isActive' || f === 'active') type = "BOOLEAN";
      return `    ${f} ${type}`;
    });
    sqlColumns = [
      "id INT PRIMARY KEY AUTO_INCREMENT",
      ...cols
    ].join(',\n');
  }

  return {
    matched: true,
    result: {
      query_type: 'create',
      collection: colName,
      mongo_query: { create: colName },
      sql_query: `CREATE TABLE ${colName} (\n${sqlColumns}\n);`,
      explanation: `Creates a new collection named "${colName}" in MongoDB and a corresponding table in SQL.`,
      complexity: 'Simple'
    }
  };
}

// ── 2. buildRankingQuery ───────────────────────────────────────────────────────
function buildRankingQuery(col, q) {
  const lower = q.toLowerCase();
  
  // Extract number for top/bottom
  const limitNum = extractNumber(lower);
  
  // Ordinal matching
  const ordRegex = /(first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|1st|2nd|3rd|4th|5th|6th|7th|8th|9th|10th)/i;
  const ordMatch = ordRegex.exec(lower);
  const ordStr = ordMatch ? ordMatch[1].toLowerCase() : 'first';
  const ord = ORDINALS[ordStr] || 1;
  const skipN = ord - 1;

  // Detect direction from highest/lowest keywords
  const dir = /lowest|minimum|min|worst|bottom/i.test(lower) ? 1 : -1;
  const dirLabel = dir === -1 ? 'descending' : 'ascending';
  const rankWord = dir === -1 ? 'highest' : 'lowest';

  // Determine raw field
  let rawField = null;
  const rankWordMatch = /(?:highest|lowest|maximum|minimum|max|min|best|worst|top|bottom)\s+(?:of\s+)?([a-zA-Z]+)/i.exec(lower);
  
  const collectionKeywords = new Set([
    'employee', 'employees', 'staff', 'worker', 'workers', 'emp',
    'student', 'students', 'customer', 'customers', 'client', 'clients', 'buyer', 'buyers',
    'order', 'orders', 'purchase', 'purchases', 'transaction', 'transactions', 'sale', 'sales',
    'product', 'products', 'item', 'items', 'user', 'users'
  ]);

  if (rankWordMatch) {
    const word = rankWordMatch[1].toLowerCase();
    if (!collectionKeywords.has(word)) {
      rawField = rankWordMatch[1];
    }
  }

  if (!rawField) {
    const topBottomNumMatch = /(?:top|bottom)\s+(\d+)\s+([a-zA-Z]+)/i.exec(lower);
    if (topBottomNumMatch) {
      const word = topBottomNumMatch[2].toLowerCase();
      if (!collectionKeywords.has(word)) {
        rawField = topBottomNumMatch[2];
      }
    }
  }

  if (!rawField) {
    const byMatch = /by\s+([a-zA-Z]+)/i.exec(lower);
    if (byMatch) {
      rawField = byMatch[1];
    }
  }

  let rankField = null;
  if (rawField) {
    rankField = detectField(rawField);
  } else {
    rankField = detectField(lower);
  }

  // Default fields for collection when no explicit field is present
  if (!rankField && !rawField) {
    if (col === 'students') rankField = 'marks';
    else if (col === 'products') rankField = 'price';
    else if (col === 'orders' || col === 'sales') rankField = 'amount';
    else if (col === 'employees') rankField = 'salary';
  }

  // Reject hallucinated/unknown fields immediately
  const schema = SCHEMA_REGISTRY.collections[col];
  const resolvedField = rankField ? normalizeField(col, rankField) : null;
  const isFieldInSchema = resolvedField && schema.fields.includes(resolvedField);

  if (!isFieldInSchema) {
    const invalidName = rawField || rankField || "unknown";
    console.log("❌ INVALID FIELD IN RANKING:", invalidName);
    return {
      matched: false,
      error: `Unknown field: ${invalidName}`
    };
  }

  // 1. Check for "top N" or "bottom N"
  const topBottomMatch = /(top|bottom)\s+(\d+)/i.exec(lower);
  if (topBottomMatch) {
    const dirWord = topBottomMatch[1].toLowerCase();
    const n = parseInt(topBottomMatch[2]);
    const d = /bottom/i.test(dirWord) ? 1 : -1;
    
    return {
      matched: true,
      result: {
        query_type: 'find',
        collection: col,
        mongo_query: {},
        sort: { [resolvedField]: d },
        limit: n,
        sql_query: `SELECT * FROM ${col} ORDER BY ${resolvedField} ${d === -1 ? 'DESC' : 'ASC'} LIMIT ${n};`,
        explanation: `Returns the ${dirWord} ${n} ${col} by ${resolvedField}.`,
        complexity: 'Simple'
      }
    };
  }

  // 2. Ordinal ranking
  const res = {
    query_type: 'find',
    collection: col,
    mongo_query: {},
    sort: { [resolvedField]: dir },
    limit: 1,
    sql_query: `SELECT * FROM ${col} ORDER BY ${resolvedField} ${dir === -1 ? 'DESC' : 'ASC'} LIMIT 1${skipN ? ` OFFSET ${skipN}` : ''};`,
    explanation: `Finds the ${ordStr} ${rankWord} from ${col} by sorting ${resolvedField} ${dirLabel}${skipN ? ` and skipping ${skipN} record(s)` : ''}.`,
    complexity: 'Moderate'
  };
  if (skipN > 0) res.skip = skipN;
  return { matched: true, result: res };
}

// ── 3. buildCountQuery ─────────────────────────────────────────────────────────
function buildCountQuery(col, q) {
  const lower = q.toLowerCase();
  const filter = {};
  
  if (/active/i.test(lower)) {
    const fieldName = normalizeField(col, 'status');
    const val = normalizeValue(col, fieldName, 'active');
    filter[fieldName] = val;
  } else if (/inactive/i.test(lower)) {
    const fieldName = normalizeField(col, 'status');
    const val = normalizeValue(col, fieldName, 'inactive');
    filter[fieldName] = val;
  }
  
  if (/completed/i.test(lower)) {
    filter.status = 'Completed';
  }

  const city = /from\s+([A-Z][a-z]+)/i.exec(q);
  if (city) filter.city = city[1];

  const amtMatch = /(?:above|over|greater than)\s+(\d+)/i.exec(lower);
  if (amtMatch) {
    const amtField = /\border\b/i.test(lower) ? 'amount' : (detectField(lower) || 'salary');
    const resolvedAmtField = normalizeField(col, amtField);
    filter[resolvedAmtField] = { $gt: parseInt(amtMatch[1]) };
  }

  // Schema check on generated count filters
  const schema = SCHEMA_REGISTRY.collections[col];
  for (const k of Object.keys(filter)) {
    if (!schema.fields.includes(k)) {
      console.log("❌ INVALID FIELD IN COUNT:", k);
      return {
        matched: false,
        error: `Unknown field: ${k}`
      };
    }
  }

  return {
    matched: true,
    result: {
      query_type: 'count',
      collection: col,
      mongo_query: filter,
      sql_query: `SELECT COUNT(*) FROM ${col}${Object.keys(filter).length ? ' WHERE ' + Object.entries(filter).map(([k,v]) => typeof v === 'object' ? `${k} > ${v.$gt}` : `${k} = '${v}'`).join(' AND ') : ''};`,
      explanation: `Counts ${col} matching the specified filter criteria.`,
      complexity: 'Simple'
    }
  };
}

// ── 4. buildAggregateQuery ─────────────────────────────────────────────────────
function buildAggregateQuery(col, q) {
  const lower = q.toLowerCase();
  const schema = SCHEMA_REGISTRY.collections[col];
  
  // Helper to safely get and validate resolvedField inside blocks
  function getValidatedField(defaultField = 'salary') {
    const f = detectField(lower) || defaultField;
    const rf = normalizeField(col, f);
    if (schema && !schema.fields.includes(rf)) {
      console.log("❌ INVALID FIELD IN AGGREGATE:", f);
      return { error: `Unknown field: ${f}` };
    }
    return { resolvedField: rf, fieldName: f };
  }

  // A. TOP N CUSTOMERS
  if (/top\s+\d+\s+customer|highest.*order.*value|best.*customer|highest.*total.*order|customer.*highest.*order/i.test(lower)) {
    const n = extractNumber(lower) || 5;
    return {
      matched: true,
      result: {
        query_type: 'aggregate',
        collection: 'orders',
        mongo_query: [
          { $group: { _id: '$customerId', customerName: { $first: '$customerName' }, totalValue: { $sum: '$amount' }, orderCount: { $sum: 1 } } },
          { $sort: { totalValue: -1 } },
          { $limit: n },
        ],
        sql_query: `SELECT customerId, customerName, SUM(amount) as totalValue, COUNT(*) as orderCount FROM orders GROUP BY customerId ORDER BY totalValue DESC LIMIT ${n};`,
        explanation: `Finds the top ${n} customers ranked by their total order value.`,
        complexity: 'Moderate'
      }
    };
  }

  // B. ABOVE AVERAGE
  if (/above\s+average|greater than.*average|higher than.*average/i.test(lower)) {
    const fRes = getValidatedField('salary');
    if (fRes.error) return { matched: false, error: fRes.error };
    const { resolvedField } = fRes;

    return {
      matched: true,
      result: {
        query_type: 'aggregate',
        collection: col,
        mongo_query: [
          { $group: { _id: null, avgVal: { $avg: `$${resolvedField}` } } },
          { $lookup: { from: col, let: { avg: '$avgVal' }, pipeline: [{ $match: { $expr: { $gt: [`$${resolvedField}`, '$$avg'] } } }], as: 'result' } },
          { $unwind: '$result' },
          { $replaceRoot: { newRoot: '$result' } },
        ],
        sql_query: `SELECT * FROM ${col} WHERE ${resolvedField} > (SELECT AVG(${resolvedField}) FROM ${col});`,
        explanation: `Finds ${col} whose ${resolvedField} exceeds the average ${resolvedField} across all ${col}.`,
        complexity: 'Complex'
      }
    };
  }

  // C. FIND DUPLICATES
  if (/duplicate/i.test(lower)) {
    const dupField = /duplicate\s+(\w+)/i.exec(lower)?.[1] || 'name';
    const resolvedDupField = normalizeField(col, dupField);
    if (schema && !schema.fields.includes(resolvedDupField)) {
      console.log("❌ INVALID FIELD IN DUPLICATE:", dupField);
      return {
        matched: false,
        error: `Unknown field: ${dupField}`
      };
    }
    return {
      matched: true,
      result: {
        query_type: 'aggregate',
        collection: col,
        mongo_query: [
          { $group: { _id: `$${resolvedDupField}`, count: { $sum: 1 } } },
          { $match: { count: { $gt: 1 } } },
          { $sort: { count: -1 } },
        ],
        sql_query: `SELECT ${resolvedDupField}, COUNT(*) as count FROM ${col} GROUP BY ${resolvedDupField} HAVING count > 1;`,
        explanation: `Finds duplicate ${resolvedDupField} values in ${col} by grouping and filtering groups with more than one entry.`,
        complexity: 'Moderate'
      }
    };
  }

  // D. HIGHEST FIELD IN EACH / PER DEPARTMENT
  if (/highest\s+\w+\s+in\s+each|highest\s+\w+\s+per\s+dep|max\s+\w+\s+in\s+each/i.test(lower)) {
    const fRes = getValidatedField('salary');
    if (fRes.error) return { matched: false, error: fRes.error };
    const { resolvedField } = fRes;

    return {
      matched: true,
      result: {
        query_type: 'aggregate',
        collection: col,
        mongo_query: [
          { $group: { _id: '$department', [`max_${resolvedField}`]: { $max: `$${resolvedField}` } } },
          { $sort: { _id: 1 } },
        ],
        sql_query: `SELECT department, MAX(${resolvedField}) as max_${resolvedField} FROM ${col} GROUP BY department ORDER BY department;`,
        explanation: `Finds the highest ${resolvedField} in each department by grouping employees by department.`,
        complexity: 'Moderate'
      }
    };
  }

  // E. DEPARTMENTS HAVING MORE THAN N EMPLOYEES
  if (/departments?\s+(?:having|with)\s+more\s+than|departments?\s+(?:having|with)\s+greater/i.test(lower)) {
    const n = extractNumber(lower) || 5;
    return {
      matched: true,
      result: {
        query_type: 'aggregate',
        collection: 'employees',
        mongo_query: [
          { $group: { _id: '$department', count: { $sum: 1 } } },
          { $match: { count: { $gt: n } } },
          { $sort: { count: -1 } },
        ],
        sql_query: `SELECT department, COUNT(*) as count FROM employees GROUP BY department HAVING count > ${n};`,
        explanation: `Finds departments that have more than ${n} employees.`,
        complexity: 'Moderate'
      }
    };
  }

  // F. DEPARTMENT-WISE GROUPING / SUM / AVG / COUNT / MAX
  if (/department.wise|per department|by department|each department|group by dep|in each dep/i.test(lower)) {
    let agg, sqlAgg, label;
    if (/count|how many/i.test(lower)) {
      agg = { count: { $sum: 1 } };
      sqlAgg = 'COUNT(*) as count';
      label = 'count';
    } else {
      const defaultField = col === 'products' ? 'price' : (col === 'orders' || col === 'sales' ? 'amount' : 'salary');
      const fRes = getValidatedField(defaultField);
      if (fRes.error) return { matched: false, error: fRes.error };
      const { resolvedField } = fRes;

      if (/average|avg/i.test(lower)) {
        agg = { [`avg_${resolvedField}`]: { $avg: `$${resolvedField}` } };
        sqlAgg = `AVG(${resolvedField}) as avg_${resolvedField}`;
        label = `average ${resolvedField}`;
      } else if (/highest|max|maximum/i.test(lower)) {
        agg = { [`max_${resolvedField}`]: { $max: `$${resolvedField}` } };
        sqlAgg = `MAX(${resolvedField}) as max_${resolvedField}`;
        label = `max ${resolvedField}`;
      } else {
        agg = { [`total_${resolvedField}`]: { $sum: `$${resolvedField}` } };
        sqlAgg = `SUM(${resolvedField}) as total_${resolvedField}`;
        label = `total ${resolvedField}`;
      }
    }

    const pipe = [
      { $group: { _id: '$department', ...agg } },
      { $sort: { _id: 1 } },
    ];

    if (/more than|greater than|having|above/i.test(lower)) {
      const n = extractNumber(lower) || 5;
      const key = Object.keys(agg)[0];
      pipe.splice(1, 0, { $match: { [key]: { $gt: n } } });
      pipe[0] = { $group: { _id: '$department', ...agg } };
      pipe[1] = { $match: { [key]: { $gt: n } } };
      pipe[2] = { $sort: { _id: 1 } };
    }

    return {
      matched: true,
      result: {
        query_type: 'aggregate',
        collection: col,
        mongo_query: pipe,
        sql_query: `SELECT department, ${sqlAgg} FROM ${col} GROUP BY department ORDER BY department;`,
        explanation: `Groups ${col} by department and calculates the ${label} for each.`,
        complexity: 'Moderate'
      }
    };
  }

  // G. MONTHLY GROUPING
  if (/monthly|by month|month.wise|per month|trend/i.test(lower)) {
    const matchStage = [];
    const amtThresh = extractNumber(lower);
    if (/completed/i.test(lower)) matchStage.push({ $match: { status: 'Completed' } });
    if (amtThresh && /above|over|greater/i.test(lower)) matchStage.push({ $match: { amount: { $gt: amtThresh } } });

    return {
      matched: true,
      result: {
        query_type: 'aggregate',
        collection: col,
        mongo_query: [
          ...matchStage,
          { $group: { _id: '$month', total: { $sum: '$amount' }, count: { $sum: 1 } } },
          { $sort: { _id: 1 } },
        ],
        sql_query: `SELECT month, SUM(amount) as total, COUNT(*) as count FROM ${col} GROUP BY month ORDER BY month;`,
        explanation: `Groups ${col} by month and calculates total amounts and counts per month.`,
        complexity: 'Moderate'
      }
    };
  }

  // H. GROUPED BY CATEGORY
  if (/by category|per category|grouped by category|category.wise/i.test(lower)) {
    return {
      matched: true,
      result: {
        query_type: 'aggregate',
        collection: col,
        mongo_query: [
          { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
          { $sort: { total: -1 } },
        ],
        sql_query: `SELECT category, SUM(amount) as total, COUNT(*) as count FROM ${col} GROUP BY category ORDER BY total DESC;`,
        explanation: `Groups ${col} by category, summing amounts and counting entries per category.`,
        complexity: 'Moderate'
      }
    };
  }

  // I. GLOBAL AGGREGATION
  if (/average|avg|total|sum|highest|max|maximum|lowest|min|minimum/i.test(lower)) {
    let aggStage, sqlAgg, label;
    const defaultField = col === 'products' ? 'price' : (col === 'orders' || col === 'sales' ? 'amount' : 'salary');
    const fRes = getValidatedField(defaultField);
    if (fRes.error) return { matched: false, error: fRes.error };
    const { resolvedField } = fRes;
    
    if (/average|avg/i.test(lower)) {
        aggStage = { [`avg_${resolvedField}`]: { $avg: `$${resolvedField}` } };
        sqlAgg = `AVG(${resolvedField}) as avg_${resolvedField}`;
        label = `average ${resolvedField}`;
    } else if (/highest|max|maximum/i.test(lower)) {
        aggStage = { [`max_${resolvedField}`]: { $max: `$${resolvedField}` } };
        sqlAgg = `MAX(${resolvedField}) as max_${resolvedField}`;
        label = `highest ${resolvedField}`;
    } else if (/lowest|min|minimum/i.test(lower)) {
        aggStage = { [`min_${resolvedField}`]: { $min: `$${resolvedField}` } };
        sqlAgg = `MIN(${resolvedField}) as min_${resolvedField}`;
        label = `lowest ${resolvedField}`;
    } else if (/total|sum/i.test(lower)) {
        aggStage = { [`total_${resolvedField}`]: { $sum: `$${resolvedField}` } };
        sqlAgg = `SUM(${resolvedField}) as total_${resolvedField}`;
        label = `total ${resolvedField}`;
    }

    if (aggStage) {
        return {
            matched: true,
            result: {
                query_type: 'aggregate',
                collection: col,
                mongo_query: [
                    { $group: { _id: null, ...aggStage } }
                ],
                sql_query: `SELECT ${sqlAgg} FROM ${col};`,
                explanation: `Calculates the ${label} across all ${col}.`,
                complexity: 'Simple'
            }
        };
    }
  }

  return {
    matched: false,
    error: `Could not parse aggregate query for: ${q}`
  };
}

// ── 5. buildLookupQuery ────────────────────────────────────────────────────────
function buildLookupQuery(col, q) {
  const lower = q.toLowerCase();

  // JOIN: employees + departments
  if (/join|with department detail|employee.*department/i.test(lower) && /(department|dept)/i.test(lower)) {
    return {
      matched: true,
      result: {
        query_type: 'aggregate',
        collection: 'employees',
        mongo_query: [
          { $lookup: { from: 'departments', localField: 'department', foreignField: 'name', as: 'deptInfo' } },
          { $unwind: { path: '$deptInfo', preserveNullAndEmptyArrays: true } },
          { $limit: 100 },
        ],
        sql_query: 'SELECT e.*, d.* FROM employees e LEFT JOIN departments d ON e.department = d.name;',
        explanation: 'Joins employees with departments collection using $lookup to add department details.',
        complexity: 'Complex'
      }
    };
  }

  // JOIN: customers + orders
  if (/customer.*order|order.*customer/i.test(lower)) {
    return {
      matched: true,
      result: {
        query_type: 'aggregate',
        collection: 'customers',
        mongo_query: [
          { $lookup: { from: 'orders', localField: '_id', foreignField: 'customerId', as: 'orders' } },
          { $addFields: { totalOrders: { $size: '$orders' }, totalAmount: { $sum: '$orders.amount' } } },
          { $project: { name: 1, email: 1, city: 1, totalOrders: 1, totalAmount: 1 } },
          { $limit: 50 },
        ],
        sql_query: 'SELECT c.name, c.email, COUNT(o.id) as totalOrders, SUM(o.amount) as totalAmount FROM customers c LEFT JOIN orders o ON c.id = o.customerId GROUP BY c.id;',
        explanation: 'Joins customers with their orders, calculating total order count and amount per customer.',
        complexity: 'Complex'
      }
    };
  }

  return {
    matched: false,
    error: `Unsupported join operation for query: ${q}`
  };
}

// ── 6. buildPaginationQuery ────────────────────────────────────────────────────
function buildPaginationQuery(col, q) {
  const lower = q.toLowerCase();
  const pageMatch = /page\s+(\d+).*?(\d+)\s+(?:per page|records|employees|items|students)/i.exec(lower)
    || /(\d+)\s+(?:per page|records|items|students).*page\s+(\d+)/i.exec(lower)
    || /page\s+(\d+)/i.exec(lower);
  
  let page = 1, perPage = 10;
  if (pageMatch) {
    if (pageMatch.length >= 3) {
      if (/page\s+(\d+).*?(\d+)/.test(lower)) {
        page = parseInt(pageMatch[1]);
        perPage = parseInt(pageMatch[2]) || 10;
      } else {
        perPage = parseInt(pageMatch[1]) || 10;
        page = parseInt(pageMatch[2]);
      }
    } else {
      page = parseInt(pageMatch[1]);
    }
  }

  const skipN = (page - 1) * perPage;

  return {
    matched: true,
    result: {
      query_type: 'find',
      collection: col,
      mongo_query: {},
      sort: {},
      skip: skipN,
      limit: perPage,
      sql_query: `SELECT * FROM ${col} LIMIT ${perPage} OFFSET ${skipN};`,
      explanation: `Returns page ${page} of ${col} with ${perPage} records per page (skipping ${skipN}).`,
      complexity: 'Simple'
    }
  };
}

// ── 7. buildRegexQuery ─────────────────────────────────────────────────────────
function buildRegexQuery(col, q) {
  const lower = q.toLowerCase();
  const schema = SCHEMA_REGISTRY.collections[col];
  const fieldName = detectField(lower) || 'name';
  const resolvedField = normalizeField(col, fieldName);

  if (schema && !schema.fields.includes(resolvedField)) {
    console.log("❌ INVALID FIELD IN REGEX:", fieldName);
    return {
      matched: false,
      error: `Unknown field: ${fieldName}`
    };
  }

  // starts with
  const startsWith = /starts?\s+with\s+["']?([a-zA-Z0-9])["']?/i.exec(lower);
  if (startsWith) {
    const val = startsWith[1].toUpperCase();
    return {
      matched: true,
      result: {
        query_type: 'find',
        collection: col,
        mongo_query: { [resolvedField]: { $regex: `^${val}`, $options: 'i' } },
        sql_query: `SELECT * FROM ${col} WHERE ${resolvedField} LIKE '${val}%';`,
        explanation: `Finds ${col} whose ${resolvedField} starts with the string "${val}".`,
        complexity: 'Simple'
      }
    };
  }

  // case insensitive or contains
  const containsMatch = /contains\s+["']?([^"']+)["']?/i.exec(lower)
    || /search.*?["']([^"']+)["']/i.exec(lower);
  if (containsMatch) {
    const term = containsMatch[1];
    return {
      matched: true,
      result: {
        query_type: 'find',
        collection: col,
        mongo_query: { [resolvedField]: { $regex: term, $options: 'i' } },
        sql_query: `SELECT * FROM ${col} WHERE LOWER(${resolvedField}) LIKE LOWER('%${term}%');`,
        explanation: `Performs a case-insensitive search on the ${resolvedField} field in ${col} for "${term}".`,
        complexity: 'Simple'
      }
    };
  }

  // General fallback for case-insensitive search request without search term
  return {
    matched: true,
    result: {
      query_type: 'find',
      collection: col,
      mongo_query: { [resolvedField]: { $regex: '.*', $options: 'i' } },
      sql_query: `SELECT * FROM ${col} WHERE ${resolvedField} LIKE '%';`,
      explanation: `Performs a general case-insensitive search on the ${resolvedField} field in ${col}.`,
      complexity: 'Simple'
    }
  };
}

// ── 8. buildNullQuery ──────────────────────────────────────────────────────────
function buildNullQuery(col, q) {
  const lower = q.toLowerCase();
  const schema = SCHEMA_REGISTRY.collections[col];

  // Extract the target field name
  const match = /without\s+(?:an?\s+)?([a-zA-Z0-9_-]+)|missing\s+([a-zA-Z0-9_-]+)|no\s+([a-zA-Z0-9_-]+)/i.exec(lower);
  const rawField = match ? (match[1] || match[2] || match[3]) : 'email';
  const resolvedField = normalizeField(col, rawField);

  if (schema && !schema.fields.includes(resolvedField)) {
    console.log("❌ INVALID FIELD IN NULL_CHECK:", rawField);
    return {
      matched: false,
      error: `Unknown field: ${rawField}`
    };
  }

  return {
    matched: true,
    result: {
      query_type: 'find',
      collection: col,
      mongo_query: { [resolvedField]: { $exists: false } },
      sql_query: `SELECT * FROM ${col} WHERE ${resolvedField} IS NULL;`,
      explanation: `Finds ${col} that do not have the ${resolvedField} field.`,
      complexity: 'Simple'
    }
  };
}

// ── 9. buildFindQuery ──────────────────────────────────────────────────────────
function buildFindQuery(col, q) {
  const lower = q.toLowerCase();
  const field = detectField(lower) || 'salary';
  const resolvedField = normalizeField(col, field);
  const schema = SCHEMA_REGISTRY.collections[col];

  // 1. Relational range comparison e.g., "between"
  if (/between/i.test(lower)) {
    const { min, max } = extractRange(lower);
    if (min !== null && max !== null) {
      if (schema && !schema.fields.includes(resolvedField)) {
        console.log("❌ INVALID FIELD IN FIND range:", field);
        return { matched: false, error: `Unknown field: ${field}` };
      }
      return {
        matched: true,
        result: {
          query_type: 'find',
          collection: col,
          mongo_query: { [resolvedField]: { $gte: min, $lte: max } },
          sql_query: `SELECT * FROM ${col} WHERE ${resolvedField} BETWEEN ${min} AND ${max};`,
          explanation: `Finds ${col} where ${resolvedField} is between ${min} and ${max}.`,
          complexity: 'Simple'
        }
      };
    }
  }

  // 2. Oldest
  if (/oldest|most senior|earliest/i.test(lower)) {
    const sortField = /join/i.test(lower) ? 'joiningDate' : 'age';
    const resolvedSortField = normalizeField(col, sortField);
    if (schema && !schema.fields.includes(resolvedSortField)) {
      console.log("❌ INVALID FIELD IN FIND oldest:", sortField);
      return { matched: false, error: `Unknown field: ${sortField}` };
    }
    return {
      matched: true,
      result: {
        query_type: 'find',
        collection: col,
        mongo_query: {},
        sort: { [resolvedSortField]: 1 },
        limit: 1,
        sql_query: `SELECT * FROM ${col} ORDER BY ${resolvedSortField} ASC LIMIT 1;`,
        explanation: `Finds the oldest ${col.replace(/s$/, '')} by ${resolvedSortField}.`,
        complexity: 'Simple'
      }
    };
  }

  // 3. Department In
  const SKIP_WORDS = new Set(['each','any','all','the','a','an','some','their','both','few','many','several']);
  const deptIn = /(?:belonging to|in|from)\s+((?:[a-zA-Z]{2,}(?:\s+or\s+)?)+)\s+dep/i.exec(lower);
  if (deptIn) {
    const rawDepts = deptIn[1].split(/\s+or\s+/i).map(d => d.trim()).filter(d => !SKIP_WORDS.has(d.toLowerCase()));
    if (rawDepts.length > 0) {
      const depts = rawDepts.map(d => d.charAt(0).toUpperCase() + d.slice(1).toLowerCase());
      return {
        matched: true,
        result: {
          query_type: 'find',
          collection: col,
          mongo_query: { department: { $in: depts } },
          sql_query: `SELECT * FROM ${col} WHERE department IN (${depts.map(d => `'${d}'`).join(', ')});`,
          explanation: `Finds ${col} belonging to ${depts.join(' or ')} departments.`,
          complexity: 'Simple'
        }
      };
    }
  }

  // 4. Multi-Condition general matching
  const parsedConditions = parseQuery(q, { lastField: field });
  if (parsedConditions) {
    const finalMongoQuery = flattenQuery(parsedConditions);
    
    // Strict schema field checking in logic operators
    let validationError = null;
    function validateKeys(obj) {
      if (!obj || typeof obj !== 'object') return;
      if (Array.isArray(obj)) {
        obj.forEach(validateKeys);
        return;
      }
      for (const k of Object.keys(obj)) {
        if (k.startsWith('$')) {
          validateKeys(obj[k]);
        } else {
          const resolvedKey = normalizeField(col, k);
          if (schema && !schema.fields.includes(resolvedKey)) {
            validationError = `Unknown field: ${k}`;
            return;
          }
        }
      }
    }
    validateKeys(finalMongoQuery);
    if (validationError) {
      console.log("❌ INVALID FIELD IN MULTI-CONDITION:", validationError);
      return { matched: false, error: validationError };
    }

    console.log("✅ MULTI CONDITION DETECTED");
    console.log(JSON.stringify(finalMongoQuery, null, 2));

    let sort = {};
    if (/sort|order by/i.test(lower)) {
      const dir = /asc|ascending|lowest|smallest/i.test(lower) ? 1 : -1;
      sort = { [resolvedField]: dir };
    }

    const sql = buildSQL(col, finalMongoQuery);
    const result = {
      query_type: 'find',
      collection: col,
      mongo_query: finalMongoQuery,
      sql_query: sql,
      explanation: `Finds all ${col} matching the specified multi-condition criteria.`,
      complexity: 'Simple'
    };

    if (Object.keys(sort).length > 0) {
      result.sort = sort;
      const dirStr = sort[resolvedField] === -1 ? 'DESC' : 'ASC';
      result.sql_query = sql.replace(/;$/, `\nORDER BY ${resolvedField} ${dirStr};`);
    }

    return { matched: true, result };
  }

  // 5. Sort only
  if (/sort|order by/i.test(lower)) {
    const dir = /asc|ascending|lowest|smallest/i.test(lower) ? 1 : -1;
    const dirLabel = dir === -1 ? 'descending' : 'ascending';
    if (schema && !schema.fields.includes(resolvedField)) {
      console.log("❌ INVALID FIELD IN SORT:", field);
      return { matched: false, error: `Unknown field: ${field}` };
    }
    return {
      matched: true,
      result: {
        query_type: 'find',
        collection: col,
        mongo_query: {},
        sort: { [resolvedField]: dir },
        limit: 50,
        sql_query: `SELECT * FROM ${col} ORDER BY ${resolvedField} ${dir === -1 ? 'DESC' : 'ASC'} LIMIT 50;`,
        explanation: `Returns ${col} sorted by ${resolvedField} in ${dirLabel} order.`,
        complexity: 'Simple'
      }
    };
  }

  // 6. Above / Below
  const compMatch = /(?:above|greater than|more than|over)\s+(\d+)|(?:below|less than|under)\s+(\d+)/i.exec(lower);
  if (compMatch) {
    const val = parseInt(compMatch[1] || compMatch[2]);
    const op = compMatch[1] ? '$gt' : '$lt';
    const sqlOp = compMatch[1] ? '>' : '<';
    if (schema && !schema.fields.includes(resolvedField)) {
      console.log("❌ INVALID FIELD IN COMPARE:", field);
      return { matched: false, error: `Unknown field: ${field}` };
    }
    return {
      matched: true,
      result: {
        query_type: 'find',
        collection: col,
        mongo_query: { [resolvedField]: { [op]: val } },
        sql_query: `SELECT * FROM ${col} WHERE ${resolvedField} ${sqlOp} ${val};`,
        explanation: `Finds ${col} where ${resolvedField} is ${compMatch[1] ? 'greater' : 'less'} than ${val}.`,
        complexity: 'Simple'
      }
    };
  }

  // 7. Location
  const cityMatch = /from\s+([A-Z][a-z]+)/i.exec(q);
  if (cityMatch) {
    const city = cityMatch[1];
    return {
      matched: true,
      result: {
        query_type: 'find',
        collection: col,
        mongo_query: { city },
        sql_query: `SELECT * FROM ${col} WHERE city = '${city}';`,
        explanation: `Finds ${col} from ${city}.`,
        complexity: 'Simple'
      }
    };
  }

  // 8. Active/Inactive status
  if (/active/i.test(lower)) {
    const status = /inactive/i.test(lower) ? 'inactive' : 'active';
    const statusField = normalizeField(col, 'status');
    const normalVal = normalizeValue(col, statusField, status);
    return {
      matched: true,
      result: {
        query_type: 'find',
        collection: col,
        mongo_query: { [statusField]: normalVal },
        sql_query: `SELECT * FROM ${col} WHERE ${statusField} = '${status}';`,
        explanation: `Finds all ${status} ${col}.`,
        complexity: 'Simple'
      }
    };
  }

  // 9. Show all
  if (/show all|get all|list all|find all|select all|fetch all/i.test(lower)) {
    return {
      matched: true,
      result: {
        query_type: 'find',
        collection: col,
        mongo_query: {},
        limit: 100,
        sql_query: `SELECT * FROM ${col} LIMIT 100;`,
        explanation: `Returns all documents from the ${col} collection (up to 100).`,
        complexity: 'Simple'
      }
    };
  }

  return { matched: false };
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN MATCHPATTERN ROUTER — EXECUTES THE STRICT QUERY ROUTING PIPELINE
// ═══════════════════════════════════════════════════════════════════════════════
function matchPattern(userQuery) {
  const q = userQuery.trim();
  const lower = q.toLowerCase();
  
  // 1. Detect Intent deterministically
  const intent = detectIntent(q);
  console.log("✅ INTENT DETECTED:", intent);

  // 2. Infer & Validate Collection
  const col = inferCollection(q) || 'employees';
  if (!isValidCollection(col)) {
    console.log("❌ INVALID COLLECTION:", col);
    console.log("❌ QUERY REJECTED");
    return {
      matched: false,
      error: `Unknown collection: ${col}`
    };
  }

  // 3. EXECUTE STRICT EXECUTION ORDER ROUTING
  
  // 1. Blocked operations
  if (intent === 'BLOCKED') {
    console.log("✅ ROUTING TO: BLOCKED");
    return {
      matched: true,
      blocked: true,
      result: {
        query_type: 'blocked',
        collection: col,
        mongo_query: {},
        sql_query: '-- BLOCKED: Dangerous write operation',
        explanation: '⛔ This operation is blocked. AskDB is read-only and does not allow destructive operations like DELETE, DROP, or TRUNCATE.',
        complexity: 'Blocked',
      },
    };
  }

  // 2. CREATE operations
  if (intent === 'CREATE') {
    console.log("✅ ROUTING TO: buildCreateQuery");
    return buildCreateQuery(q);
  }

  // 3. Ranking queries
  if (intent === 'RANKING') {
    console.log("✅ ROUTING TO: buildRankingQuery");
    return buildRankingQuery(col, q);
  }

  // 4. Count queries
  if (intent === 'COUNT') {
    console.log("✅ ROUTING TO: buildCountQuery");
    return buildCountQuery(col, q);
  }

  // 5. Aggregation queries
  if (intent === 'AGGREGATE') {
    console.log("✅ ROUTING TO: buildAggregateQuery");
    return buildAggregateQuery(col, q);
  }

  // 6. Join queries
  if (intent === 'JOIN') {
    console.log("✅ ROUTING TO: buildLookupQuery");
    return buildLookupQuery(col, q);
  }

  // 7. Pagination queries
  if (intent === 'PAGINATION') {
    console.log("✅ ROUTING TO: buildPaginationQuery");
    return buildPaginationQuery(col, q);
  }

  // 8. Regex/Text search
  if (intent === 'REGEX_SEARCH') {
    console.log("✅ ROUTING TO: buildRegexQuery");
    return buildRegexQuery(col, q);
  }

  // 9. Null check queries
  if (intent === 'NULL_CHECK') {
    console.log("✅ ROUTING TO: buildNullQuery");
    return buildNullQuery(col, q);
  }

  // 10. Normal filters (intent === 'FIND')
  console.log("✅ ROUTING TO: buildFindQuery");
  const res = buildFindQuery(col, q);
  if (res.matched || res.error) {
    return res;
  }

  // 11. AI Fallback (no direct template matched)
  console.log("❌ QUERY REJECTED - FALLING BACK");
  return { matched: false };
}

module.exports = { matchPattern, inferCollection };

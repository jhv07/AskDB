# AskDB — Natural Language MongoDB Query Engine

> Type English. Get MongoDB queries. Instantly.

---

## Quick Start

### Prerequisites
- **Node.js** v18 or v22 LTS
- **MongoDB** running locally on port 27017
- **Ollama** running locally with `llama3` or `llama3.2`

### Start Ollama
```bash
ollama serve
ollama pull llama3
```

### Terminal 1 — Backend
```bash
cd AskDB/backend
npm install
npm run dev
```

Backend starts at: **http://localhost:5000**  
Auto-seeds sample data on first run (employees, customers, orders, students, products, sales).

### Terminal 2 — Frontend
```bash
cd AskDB/frontend
npm install
npm run dev
```

Frontend starts at: **http://localhost:5173**

---

## Environment Variables

### Backend `.env`
```
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/AskDB
DB_NAME=AskDB
JWT_SECRET=askdb_super_secret_jwt_key_change_in_production
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama3
SCHEMA_CACHE_TTL_MS=300000
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

### Frontend `.env`
```
VITE_API_URL=http://localhost:5000
VITE_GOOGLE_CLIENT_ID=your_google_client_id
```

---

## Demo Queries

### Basic
- Show all students with marks above 80
- Find customers from Hyderabad
- Count all active users

### Aggregation
- Total monthly revenue grouped by category
- Top 5 employees by salary
- Find departments with more than 5 employees
- Show average marks department-wise

### Advanced
- Find the second highest salary
- Find employees above average salary
- Find employees who joined in last 30 days
- Find employees whose name starts with "A"

### Joins
- Find customer names with their total orders
- Show employees with department details

---

## Architecture

```
AskDB/
├── backend/
│   ├── config/db.js          # MongoDB connection + auto-seed
│   ├── controllers/
│   │   └── authController.js # JWT auth (register/login/me)
│   ├── middleware/
│   │   └── authMiddleware.js # JWT verification
│   ├── models/
│   │   ├── User.js           # User model
│   │   └── QueryHistory.js   # History model
│   ├── routes/
│   │   ├── auth.js           # /api/auth/*
│   │   ├── query.js          # /api/query
│   │   ├── history.js        # /api/history
│   │   └── schema.js         # /api/schema
│   ├── services/
│   │   ├── ollamaService.js  # AI query generation
│   │   ├── mongoExecutor.js  # Secure query execution
│   │   ├── queryValidator.js # Security validation
│   │   ├── schemaService.js  # Schema introspection
│   │   ├── nlpExtractor.js   # NLP fallback
│   │   └── intentClassifier.js
│   └── server.js
└── frontend/
    └── src/
        ├── pages/
        │   ├── Dashboard.jsx  # Main query interface
        │   ├── Login.jsx
        │   └── Register.jsx
        ├── components/
        │   ├── QueryHistoryPanel.jsx
        │   ├── QueryOutputCard.jsx
        │   ├── QueryPipelineVisualizer.jsx
        │   ├── ExplanationCard.jsx
        │   ├── ResultRenderer.jsx
        │   └── ...
        ├── context/AuthContext.jsx
        └── services/api.js
```

---

## Security

All queries are **read-only**. The following operations are permanently blocked:
- `deleteMany`, `updateMany`, `insertMany`
- `dropDatabase`, `drop`, `eval`
- `$where`, `$function`, `$accumulator`
- `mapReduce`, `$out`, `$merge`

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, Tailwind CSS, Framer Motion |
| Backend | Node.js, Express.js |
| Database | MongoDB (local) |
| AI | Ollama (llama3) |
| Auth | JWT + bcrypt |

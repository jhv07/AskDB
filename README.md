# 🚀 AskDB – Intelligent Database Query Assistant

AskDB is a full-stack SaaS application that enables users to query MongoDB databases using natural language.

It simulates an AI-powered database intelligence pipeline including intent detection, schema mapping, query generation, validation, risk analysis, optimization, and execution comparison.

---

## 🌟 Key Features

* 🔐 JWT-based Authentication (Login / Register)
* 🧠 Natural Language → MongoDB Query Simulation
* ⚙️ AI Execution Pipeline Visualizer
* 📊 MongoDB vs SQL Execution Comparison
* 🧾 Query History Tracking
* 🎨 Modern UI with Animated Background & Typing Effects
* 🏗 MVC Backend Architecture

---

## 🛠 Tech Stack

### Frontend

* React.js
* Tailwind CSS
* Framer Motion
* Custom Animated Components

### Backend

* Node.js
* Express.js
* MongoDB
* JWT Authentication
* REST APIs

---

## 🏗 Architecture Overview

AskDB follows a clean separation of concerns:

```
AskDB/
│
├── backend/
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── services/
│   └── server.js
│
├── frontend/
│   ├── src/
│   ├── components/
│   └── pages/
│
└── README.md
```

---

## 🔐 Environment Setup

Create a `.env` file inside the `backend` directory:

```
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_secret_key
PORT=5000
```

⚠️ Never commit `.env` to GitHub.

---

## ▶️ Installation Guide

### 1️⃣ Clone Repository

```
git clone https://github.com/jhv07/AskDB.git
cd AskDB
```

---

### 2️⃣ Backend Setup

```
cd backend
npm install
npm start
```

Backend runs at:

```
http://localhost:5000
```

---

### 3️⃣ Frontend Setup

Open a new terminal:

```
cd frontend
npm install
npm run dev
```

Frontend runs at:

```
http://localhost:5173
```

---

## 📊 AI Pipeline Flow (Simulated)

1. Intent Detection
2. Schema Mapping
3. Query Generation
4. Validation
5. Risk Analysis
6. Optimization
7. Execution Simulation

This modular design allows future integration of real LLM APIs.

---

## 🚀 Future Enhancements

* Integration with OpenAI / LLM APIs
* Real-time MongoDB execution
* hRole-based Access Control
* Docker Deployment
* Cloud Hosting (Render / Vercel)
* Analytics Dashboard

---

## 📄 License

This project is licensed under the **MIT License**.

You are free to use, modify, and distribute this software for personal or commercial purposes, provided that proper attribution is given.



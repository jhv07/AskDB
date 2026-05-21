require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const { connectDB } = require('./config/db');

const app  = express();
const PORT = parseInt(process.env.PORT, 10) || 5000;

app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '1mb' }));

const queryRoutes   = require('./routes/query');
const authRoutes    = require('./routes/auth');
const schemaRoutes  = require('./routes/schema');
const historyRoutes = require('./routes/history');

app.use('/api',      queryRoutes);
app.use('/api/auth', authRoutes);
app.use('/api',      schemaRoutes);
app.use('/api',      historyRoutes);

app.get('/api/test', (req, res) => {
    res.json({
        status:    'AskDB backend running',
        ai:        `Ollama ${process.env.OLLAMA_MODEL || 'llama3'}`,
        database:  'MongoDB Local',
        timestamp: new Date().toISOString(),
    });
});

app.use((err, req, res, next) => {
    console.error('Unhandled error:', err.message);
    res.status(err.status || 500).json({
        error: err.message || 'Internal server error',
    });
});

connectDB().then(() => {
    const server = app.listen(PORT, () => {
        console.log(`AskDB Server running on http://localhost:${PORT}`);
        console.log(`Ollama: ${process.env.OLLAMA_URL || 'http://localhost:11434'} (${process.env.OLLAMA_MODEL || 'llama3'})`);
        console.log(`MongoDB: ${process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/AskDB'}`);
    });

    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.warn(`\nPort ${PORT} is already in use.`);
            console.warn(`AskDB backend may already be running on http://localhost:${PORT}`);
            console.warn(`If you need to restart, stop the existing process first.\n`);
            process.exit(0);
        } else {
            console.error('Server error:', err.message);
            process.exit(1);
        }
    });
}).catch((err) => {
    console.error('Failed to start server:', err.message);
    process.exit(1);
});
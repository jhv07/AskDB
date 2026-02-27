const { MongoClient } = require('mongodb');

let db;
let client;

async function connectDB() {
    const uri = process.env.MONGO_URI;

    if (!uri) {
        throw new Error("MONGO_URI environment variable is missing.");
    }

    try {
        client = new MongoClient(uri, {
            serverSelectionTimeoutMS: 5000
        });

        await client.connect();

        db = client.db("hackathonDB");

        console.log("MongoDB Connected Successfully");

    } catch (error) {
        console.error("Failed to connect to MongoDB:", error.message);
        process.exit(1);
    }
}

function getDB() {
    if (!db) {
        throw new Error("Database not connected. Call connectDB first.");
    }
    return db;
}

module.exports = { connectDB, getDB };
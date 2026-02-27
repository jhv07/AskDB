require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');

async function seedDB() {
    const uri = process.env.MONGO_URI;
    if (!uri) {
        throw new Error("MONGO_URI environment variable is missing.");
    }

    const client = new MongoClient(uri);

    try {
        await client.connect();
        console.log("Connected to MongoDB for seeding...");
        const db = client.db('hackathonDB');

        // Collections
        const customersCol = db.collection('customers');
        const ordersCol = db.collection('orders');
        const productsCol = db.collection('products');

        // Clear collections
        await customersCol.deleteMany({});
        await ordersCol.deleteMany({});
        await productsCol.deleteMany({});
        console.log("Cleared existing collections.");

        // Schema Options
        const cities = ["Hyderabad", "Mumbai", "Delhi", "Bangalore"];
        const statuses = ["active", "inactive"];
        const orderCategories = ["Electronics", "Grocery", "Clothing", "Furniture"];
        const orderStatuses = ["Completed", "Pending"];

        // Helper to generate dates spanning 6 months
        function randomDate(start, end) {
            return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
        }
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        const now = new Date();

        // 1. Generate 18 customers
        const customers = [];
        for (let i = 1; i <= 18; i++) {
            customers.push({
                name: `Customer ${i}`,
                email: `customer${i}@example.com`,
                city: cities[Math.floor(Math.random() * cities.length)],
                status: statuses[Math.floor(Math.random() * statuses.length)],
                createdAt: randomDate(sixMonthsAgo, now)
            });
        }
        const customerInsertResult = await customersCol.insertMany(customers);
        const customerIds = Object.values(customerInsertResult.insertedIds);
        console.log("Seeded 18 customers.");

        // 2. Generate 45 orders
        const orders = [];
        for (let i = 1; i <= 45; i++) {
            const randomCustomerIndex = Math.floor(Math.random() * customerIds.length);
            const amount = Math.floor(Math.random() * (25000 - 500 + 1)) + 500;
            orders.push({
                customerId: customerIds[randomCustomerIndex], // ObjectId referencing customers
                amount: amount,
                category: orderCategories[Math.floor(Math.random() * orderCategories.length)],
                orderDate: randomDate(sixMonthsAgo, now),
                status: orderStatuses[Math.floor(Math.random() * orderStatuses.length)]
            });
        }
        await ordersCol.insertMany(orders);
        console.log("Seeded 45 orders.");

        // 3. Generate 20 products
        const products = [];
        for (let i = 1; i <= 20; i++) {
            products.push({
                name: `Product ${i}`,
                category: orderCategories[Math.floor(Math.random() * orderCategories.length)],
                price: Math.floor(Math.random() * 5000) + 100,
                description: `Description for Product ${i}`
            });
        }
        const studentsCol = db.collection('students');
        await studentsCol.deleteMany({});

        const students = [];

        for (let i = 1; i <= 20; i++) {
            students.push({
                name: `Student ${i}`,
                marks: Math.floor(Math.random() * 100),
                grade: ["A", "B", "C"][Math.floor(Math.random() * 3)]
            });
        }

        await studentsCol.insertMany(students);
        console.log("Seeded students.");
        await productsCol.insertMany(products);
        console.log("Seeded 20 products.");

        console.log("Database seeded successfully!");
    } catch (error) {
        console.error("Error seeding database:", error);
        process.exit(1);
    } finally {
        await client.close();
        console.log("MongoDB connection closed.");
    }
}

seedDB();

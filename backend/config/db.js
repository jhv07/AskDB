const { MongoClient } = require('mongodb');

let db;
let client;

async function connectDB() {
    const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/AskDB';
    const dbName = process.env.DB_NAME || 'AskDB';

    try {
        client = new MongoClient(uri, {
            serverSelectionTimeoutMS: 8000,
        });

        await client.connect();
        db = client.db(dbName);

        console.log(`✅ MongoDB Connected → ${dbName}`);

        // Auto-seed if collections are empty
        await autoSeedIfEmpty(db);

    } catch (error) {
        console.error('❌ Failed to connect to MongoDB:', error.message);
        process.exit(1);
    }
}

function getDB() {
    if (!db) {
        throw new Error('Database not connected. Call connectDB first.');
    }
    return db;
}

// ─── AUTO SEED ────────────────────────────────────────────────────────────────
async function autoSeedIfEmpty(database) {
    try {
        const cities       = ['Hyderabad', 'Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Pune'];
        const categories   = ['Electronics', 'Grocery', 'Clothing', 'Furniture', 'Books'];
        const departments  = ['Computer Science', 'Mechanical', 'Civil', 'Electronics', 'MBA'];
        const months       = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        const customerNames = [
            'Aarav Sharma', 'Priya Patel', 'Rohit Verma', 'Sneha Reddy',
            'Kiran Mehta', 'Anjali Singh', 'Vikram Nair', 'Deepa Rao',
            'Suresh Kumar', 'Meera Iyer', 'Arjun Chowdhury', 'Lakshmi Das',
            'Ravi Teja', 'Sonal Gupta', 'Harish Pillai', 'Divya Mishra',
            'Nikhil Joshi', 'Pooja Agarwal',
        ];

        const rand    = (arr) => arr[Math.floor(Math.random() * arr.length)];
        const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

        // ── Employees (with salary, joiningDate, skills, department) ──────────────
        const employeeCount = await database.collection('employees').estimatedDocumentCount();
        if (employeeCount === 0) {
            const skills_pool = ['JavaScript', 'Python', 'Java', 'MongoDB', 'React', 'Node.js', 'SQL', 'Docker', 'AWS', 'Git'];
            const empNames = [
                'Alice Johnson','Bob Williams','Charlie Brown','Diana Prince','Edward Norton',
                'Fiona Green','George Hill','Hannah Baker','Ivan Drago','Julia Roberts',
                'Kevin Spacey','Laura Palmer','Mike Tyson','Nancy Drew','Oscar Wilde',
                'Paula Abdul','Quinn Hughes','Rachel Green','Sam Wilson','Tina Turner',
            ];
            const employees = empNames.map((name, i) => {
                const salary   = randInt(30000, 120000);
                const skillCnt = randInt(2, 6);
                const skillSet = skills_pool.sort(() => 0.5 - Math.random()).slice(0, skillCnt);
                const dept     = rand(['HR','IT','Finance','Marketing','Operations']);
                const daysAgo  = randInt(1, 730);
                const joiningDate = new Date(Date.now() - daysAgo * 86400000);
                return {
                    name,
                    email: `${name.split(' ')[0].toLowerCase()}${i + 1}@company.com`,
                    department: dept,
                    salary,
                    joiningDate,
                    skills: skillSet,
                    experience: randInt(1, 15),
                    isActive: Math.random() > 0.2,
                };
            });
            await database.collection('employees').insertMany(employees);
            console.log(`🌱 Auto-seeded ${employees.length} employees`);
        }

        // ── Customers ──────────────────────────────────────────────────────────────
        const customerCount = await database.collection('customers').estimatedDocumentCount();
        if (customerCount === 0) {
            const customers = customerNames.map((name, i) => ({
                name,
                email: `${name.split(' ')[0].toLowerCase()}${i + 1}@example.com`,
                city:  rand(cities),
                status: Math.random() > 0.35 ? 'active' : 'inactive',
                createdAt: new Date(2025, randInt(0, 11), randInt(1, 28)),
            }));
            const result = await database.collection('customers').insertMany(customers);
            console.log(`🌱 Auto-seeded ${customers.length} customers`);

            // ── Orders ────────────────────────────────────────────────────────────
            const customerIds = Object.values(result.insertedIds);
            const orders = [];
            for (let i = 0; i < 60; i++) {
                const custIdx  = randInt(0, customerNames.length - 1);
                const monthIdx = randInt(0, 11);
                const amount   = randInt(500, 28000);
                orders.push({
                    customerName: customerNames[custIdx],
                    customerId:   customerIds[custIdx % customerIds.length],
                    amount,
                    category:     rand(categories),
                    month:        months[monthIdx],
                    monthNum:     monthIdx + 1,
                    orderDate:    new Date(2025, monthIdx, randInt(1, 28)),
                    status:       amount > 8000 ? 'Completed' : rand(['Completed','Pending']),
                });
            }
            await database.collection('orders').insertMany(orders);
            console.log(`🌱 Auto-seeded ${orders.length} orders`);
        }

        // ── Students ───────────────────────────────────────────────────────────────
        const studentCount = await database.collection('students').estimatedDocumentCount();
        if (studentCount === 0) {
            const studentNames = [
                'Aarav','Priya','Rohit','Sneha','Kiran','Anjali','Vikram','Deepa',
                'Suresh','Meera','Arjun','Lakshmi','Ravi','Sonal','Harish','Divya',
                'Nikhil','Pooja','Ramesh','Kavya','Ajay','Swathi','Vinay','Nisha',
                'Sai','Madhuri','Arun','Preethi','Ganesh','Yamini',
            ];
            const students = studentNames.map((name, i) => {
                const marks = randInt(42, 99);
                return {
                    name,
                    marks,
                    grade:      marks >= 85 ? 'A' : marks >= 70 ? 'B' : marks >= 55 ? 'C' : 'D',
                    department: departments[i % departments.length],
                    rollNumber: `2024${String(i + 1).padStart(3, '0')}`,
                };
            });
            await database.collection('students').insertMany(students);
            console.log(`🌱 Auto-seeded ${students.length} students`);
        }

        // ── Products ───────────────────────────────────────────────────────────────
        const productCount = await database.collection('products').estimatedDocumentCount();
        if (productCount === 0) {
            const products = Array.from({ length: 20 }, (_, i) => ({
                name:        `Product ${i + 1}`,
                category:    rand(categories),
                price:       randInt(100, 5000),
                stock:       randInt(5, 200),
                description: `Premium quality ${rand(categories).toLowerCase()} product.`,
            }));
            await database.collection('products').insertMany(products);
            console.log(`🌱 Auto-seeded ${products.length} products`);
        }

        // ── Sales ──────────────────────────────────────────────────────────────────
        const salesCount = await database.collection('sales').estimatedDocumentCount();
        if (salesCount === 0) {
            const sales = Array.from({ length: 50 }, () => {
                const monthIdx = randInt(0, 11);
                return {
                    category: rand(categories),
                    amount:   randInt(2000, 50000),
                    month:    months[monthIdx],
                    monthNum: monthIdx + 1,
                    year:     2025,
                    date:     new Date(2025, monthIdx, randInt(1, 28)),
                    region:   rand(cities),
                };
            });
            await database.collection('sales').insertMany(sales);
            console.log(`🌱 Auto-seeded ${sales.length} sales records`);
        }

    } catch (err) {
        console.warn('⚠️ Auto-seed warning:', err.message);
    }
}

module.exports = { connectDB, getDB };
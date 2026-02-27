const { getDB } = require('../config/db');

class User {
    static getCollection() {
        return getDB().collection('users');
    }

    static async findByEmail(email) {
        return await this.getCollection().findOne({ email });
    }

    static async findById(id) {
        const { ObjectId } = require('mongodb');
        return await this.getCollection().findOne({ _id: new ObjectId(id) });
    }

    static async create(userData) {
        const user = {
            username: userData.username,
            email: userData.email,
            password: userData.password,
            role: userData.role || 'user',
            createdAt: new Date()
        };
        const result = await this.getCollection().insertOne(user);
        return { _id: result.insertedId, ...user };
    }
}

module.exports = User;

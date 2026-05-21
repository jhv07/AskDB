const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { OAuth2Client } = require('google-auth-library');
const googleClient = new OAuth2Client(process.env.VITE_GOOGLE_CLIENT_ID);

const generateToken = (userId, role) => {
    return jwt.sign(
        { id: userId, role },
        process.env.JWT_SECRET,
        { expiresIn: '30d' }
    );
};

const registerUser = async (req, res) => {
    try {
        const { username, email, password } = req.body;

        if (!username || !email || !password) {
            return res.status(400).json({ error: 'Please provide all required fields' });
        }

        const existingEmail    = await User.findByEmailOrUsername(email);
        const existingUsername = await User.findByEmailOrUsername(username);
        if (existingEmail || existingUsername) {
            return res.status(400).json({ error: 'User already exists with this email or username' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = await User.create({
            username,
            email,
            password: hashedPassword,
            role: 'user',
        });

        const token = generateToken(newUser._id, newUser.role);

        return res.status(201).json({
            message: 'User registered successfully',
            token,
            user: {
                id:       newUser._id,
                username: newUser.username,
                email:    newUser.email,
                role:     newUser.role,
            },
        });
    } catch (error) {
        console.error('Registration Error:', error.message);
        return res.status(500).json({ error: 'Server error during registration' });
    }
};

const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Please provide email and password' });
        }

        const user = await User.findByEmailOrUsername(email);
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = generateToken(user._id, user.role);

        return res.json({
            token,
            user: {
                id:       user._id,
                username: user.username,
                email:    user.email,
                role:     user.role,
            },
        });
    } catch (error) {
        console.error('Login Error:', error.message);
        return res.status(500).json({ error: 'Server error during login' });
    }
};

const getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        return res.json({
            id:       user._id,
            username: user.username,
            email:    user.email,
            role:     user.role,
        });
    } catch (error) {
        console.error('GetMe Error:', error.message);
        return res.status(500).json({ error: 'Server error fetching profile' });
    }
};

const googleLogin = async (req, res) => {
    try {
        const { credential } = req.body;
        if (!credential) {
            return res.status(400).json({ error: 'Missing Google credential' });
        }

        const ticket = await googleClient.verifyIdToken({
            idToken: credential,
            audience: process.env.VITE_GOOGLE_CLIENT_ID,
        });
        
        const payload = ticket.getPayload();
        const { email, name, sub } = payload;
        
        let user = await User.findByEmailOrUsername(email);
        
        if (!user) {
            // Create user
            user = await User.create({
                username: name.replace(/\s+/g, '').toLowerCase() + sub.slice(-4),
                email: email,
                password: await bcrypt.hash(sub + Date.now().toString(), 10), // Random placeholder password
                role: 'user',
            });
        }
        
        const token = generateToken(user._id, user.role);
        
        return res.json({
            token,
            user: {
                id:       user._id,
                username: user.username,
                email:    user.email,
                role:     user.role,
            },
        });
        
    } catch (error) {
        console.error('Google Login Error:', error.message);
        return res.status(500).json({ error: 'Server error during Google login' });
    }
};

module.exports = { registerUser, loginUser, getMe, googleLogin };

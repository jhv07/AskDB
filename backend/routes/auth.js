const express = require('express');
const router  = express.Router();
const { registerUser, loginUser, getMe, googleLogin } = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

// POST /api/auth/register
router.post('/register', registerUser);

// POST /api/auth/login
router.post('/login', loginUser);

// GET /api/auth/me  (protected)
router.get('/me', authMiddleware, getMe);

// POST /api/auth/google
router.post('/google', googleLogin);

module.exports = router;

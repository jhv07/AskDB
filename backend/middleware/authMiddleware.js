const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader) {
            return res.status(401).json({ error: "No token provided" });
        }

        // Extract token properly
        const token = authHeader.split(" ")[1];

        if (!token) {
            return res.status(401).json({ error: "Invalid token format" });
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        req.user = decoded;
        next();

    } catch (err) {
        console.error("JWT ERROR:", err.message);
        return res.status(401).json({ error: "Token is not valid" });
    }
};
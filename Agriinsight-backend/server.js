const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const cookieParser = require('cookie-parser');
const mysql = require('mysql2/promise');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:8080',
    credentials: true
}));

// Database connection
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// JWT secret
const JWT_SECRET = process.env.JWT_SECRET;

// Database initialization function
async function initializeDatabase() {
    try {
        // Create database if it doesn't exist
        await pool.query(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME}`);
        
        // Use the database
        await pool.query(`USE ${process.env.DB_NAME}`);

        // Create users table if it doesn't exist
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        console.log('Database initialized successfully');
    } catch (error) {
        console.error('Error initializing database:', error);
        process.exit(1);
    }
}

// Call the initialization function before starting the server
initializeDatabase().then(() => {
    // Start the server only after database initialization
    app.listen(port, () => {
        console.log(`Server running on port ${port}`);
    });
});

// Middleware to verify JWT
const verifyToken = (req, res, next) => {
    const token = req.cookies.auth_token;
    if (!token) return res.status(403).json({ error: 'No token provided' });

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) return res.status(401).json({ error: 'Unauthorized' });
        req.userId = decoded.id;
        next();
    });
};

// Routes

// Login
app.post('/auth/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const [rows] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
        const user = rows[0];

        if (!user || !bcrypt.compareSync(password, user.password)) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '1h' });
        res.cookie('auth_token', token, { httpOnly: true, secure: true, sameSite: 'strict', maxAge: 3600000 });
        res.json({ message: 'Logged in successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// User Registration
app.post('/auth/register', async (req, res) => {
    const { username, password, email } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        await pool.query('INSERT INTO users (username, password, email) VALUES (?, ?, ?)', [username, hashedPassword, email]);
        res.status(201).json({ message: 'User registered successfully' });
    } catch (error) {
        console.error(error);
        if (error.code === 'ER_DUP_ENTRY') {
            res.status(409).json({ error: 'Username or email already exists' });
        } else {
            res.status(500).json({ error: 'Internal server error' });
        }
    }
});

// Logout
app.post('/auth/logout', (req, res) => {
    res.clearCookie('auth_token');
    res.json({ message: 'Logged out successfully' });
});

// Weather data
app.get('/weather', verifyToken, async (req, res) => {
    const { days } = req.query;
    try {
        // This is a placeholder. In a real application, you'd fetch this data from your database or an external API
        const weatherData = {
            dates: [...Array(parseInt(days))].map((_, i) => new Date(Date.now() + i * 86400000).toISOString().split('T')[0]),
            temperatures: [...Array(parseInt(days))].map(() => Math.random() * 30 + 10),
            rainfall: [...Array(parseInt(days))].map(() => Math.random() * 50)
        };
        res.json(weatherData);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Yield data
app.get('/yield', verifyToken, async (req, res) => {
    const { crop, days } = req.query;
    try {
        // This is a placeholder. In a real application, you'd fetch this data from your database
        const yieldData = {
            cropType: crop,
            dates: [...Array(parseInt(days))].map((_, i) => new Date(Date.now() + i * 86400000).toISOString().split('T')[0]),
            yieldValues: [...Array(parseInt(days))].map(() => Math.random() * 100 + 50)
        };
        res.json(yieldData);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Soil data
app.get('/soil', verifyToken, async (req, res) => {
    const { crop } = req.query;
    try {
        // This is a placeholder. In a real application, you'd fetch this data from your database
        const soilData = {
            nutrients: ['Nitrogen', 'Phosphorus', 'Potassium', 'pH', 'Organic Matter'],
            levels: [Math.random() * 100, Math.random() * 100, Math.random() * 100, Math.random() * 14, Math.random() * 10]
        };
        res.json(soilData);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Market prices
app.get('/market-prices', verifyToken, async (req, res) => {
    try {
        // This is a placeholder. In a real application, you'd fetch this data from your database or an external API
        const marketPrices = {
            prices: [
                { cropName: 'Wheat', pricePerBushel: Math.random() * 10 + 5 },
                { cropName: 'Corn', pricePerBushel: Math.random() * 8 + 3 },
                { cropName: 'Soybeans', pricePerBushel: Math.random() * 15 + 8 }
            ]
        };
        res.json(marketPrices);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
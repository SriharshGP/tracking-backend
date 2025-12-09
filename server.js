const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3000;

// ================= MIDDLEWARE =================

// 1. Enable CORS for ALL domains
// This is critical. It allows "site-a.com" and "site-b.com" to both send data here.

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        
        // Allow requests from "null" origin (happens when you open file:// locally)
        if (origin === 'null') return callback(null, true);

        // In production, you would check if 'origin' is in your allowed list.
        // For now, we allow everyone by returning true:
        return callback(null, true);
    },
    credentials: true, // This solves the "credentials mode is include" error
    methods: ['POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type']
}));

// 2. Parse incoming JSON bodies
// This handles the data sent by fetch() or navigator.sendBeacon()
app.use(express.json());

// ================= ROUTES =================

// The endpoint matches the one in your tracker.js config
app.post('/collect', (req, res) => {
    const analyticsData = req.body;

    // Add a server-side timestamp for accuracy
    analyticsData.received_at = new Date().toISOString();
    
    // Get user IP (useful for geolocation later)
    analyticsData.user_ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    // Convert to a single string line
    const logEntry = JSON.stringify(analyticsData) + '\n';

    // File path: logs/events.jsonl
    const logFilePath = path.join(__dirname, 'logs', 'events.jsonl');

    // Append the data to the file
    fs.appendFile(logFilePath, logEntry, (err) => {
        if (err) {
            console.error('Error writing to file:', err);
            return res.status(500).send('Server Error');
        }
        console.log(`[Data Received] From: ${analyticsData.url}`);
        return res.status(200).send('Logged successfully');
    });
});

// Simple check to see if server is running
app.get('/', (req, res) => {
    res.send('Analytics Server is Running...');
});

// CHANGE 2: Add a route to READ the logs from the browser
app.get('/view-logs', (req, res) => {
    const logFilePath = path.join(__dirname, 'logs', 'events.jsonl');
    
    // Check if file exists
    if (!fs.existsSync(logFilePath)) {
        return res.status(404).send('No logs found yet.');
    }

    // Read the file and send it to the browser
    fs.readFile(logFilePath, 'utf8', (err, data) => {
        if (err) return res.status(500).send('Error reading logs');
        // Wrap in <pre> tags so it looks readable in browser
        res.send(`<pre>${data}</pre>`);
    });
});

// ================= STARTUP =================

// Create 'logs' folder if it doesn't exist
if (!fs.existsSync(path.join(__dirname, 'logs'))) {
    fs.mkdirSync(path.join(__dirname, 'logs'));
}

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
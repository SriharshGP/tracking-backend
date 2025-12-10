const express = require('express');
const { MongoClient } = require('mongodb');
const path = require('path');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3000;

const MONGODB_URI = "mongodb+srv://tracker-backend:Tracker%400987@cluster0.bliy5gt.mongodb.net/?appName=Cluster0";
let db;

// Function to connect to MongoDB
async function connectDB() {
    try {
        const client = await MongoClient.connect(MONGODB_URI);
        db = client.db('trackerDB'); // The name of your database
        console.log("✅ MongoDB successfully connected!");

        // Start the server ONLY AFTER the database connection is established
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });

    } catch (err) {
        console.error("❌ MongoDB connection failed:", err);
        process.exit(1);
    }
}
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
app.post('/api/sync', async (req, res) => {
    console.log("1. Request hit the route!"); // <--- Debug 1

    const analyticsData = req.body;
    analyticsData.received_at = new Date().toISOString();
    analyticsData.user_ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    try {
        console.log("2. Attempting to insert into DB..."); // <--- Debug 2
        
        // --- THIS IS LIKELY WHERE IT HANGS ---
        await db.collection('events').insertOne(analyticsData);
        // -------------------------------------

        console.log("3. Insert successful!"); // <--- Debug 3
        
        console.log(`[Data Received & Logged] Session: ${analyticsData.session_id}`);
        return res.status(200).send('Logged successfully');

    } catch (err) {
        console.error("❌ ERROR inside route:", err); // <--- Catch errors
        return res.status(500).send('Database Error');
    }
});

// Simple check to see if server is running
app.get('/', (req, res) => {
    res.send('Analytics Server is Running...');
});

// ✅ CORRECT MONGODB ROUTE
app.get('/view-logs', async (req, res) => {
    try {
        // Query the 'events' collection in MongoDB
        const logs = await db.collection('events').find().toArray();
        
        if (logs.length === 0) {
            return res.status(404).send('No logs found yet in the database.');
        }

        // Format the output nicely for the browser
        const formattedData = logs.map(doc => JSON.stringify(doc)).join('\n');
        res.send(`<pre>${formattedData}</pre>`);

    } catch (err) {
        console.error('Error querying MongoDB:', err);
        res.status(500).send('Database Query Error');
    }
});

// ================= STARTUP =================

connectDB();
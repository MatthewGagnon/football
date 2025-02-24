import express from 'express';
import mongoose from 'mongoose';
import session from 'express-session';
import bcrypt from 'bcrypt';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import path from 'path';

// Initialize dotenv
dotenv.config();

// Get directory name (needed when using ES modules)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static('public'));
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: process.env.NODE_ENV === 'production' }
}));

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
    .then(() => {
        console.log('Connected to MongoDB Atlas successfully!');
    })
    .catch((error) => {
        console.error('MongoDB connection error:', error);
    });

// User Schema
const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    username: { type: String, required: true, unique: true },
    sleeperId: String,
    sleeperUsername: String,
    leagues: [{
        leagueId: String,
        leagueName: String,
        season: Number
    }]
});

const User = mongoose.model('User', userSchema);

// Routes
app.post('/api/link-sleeper', async (req, res) => {
    try {
        const { email, sleeperUsername } = req.body;

        if (!email || !sleeperUsername) {
            return res.status(400).json({ error: 'Email and Sleeper username are required' });
        }

        // Verify user exists in Sleeper
        const sleeperResponse = await fetch(`https://api.sleeper.app/v1/user/${sleeperUsername}`);
        const sleeperUser = await sleeperResponse.json();

        if (!sleeperUser || !sleeperUser.user_id) {
            return res.status(404).json({ error: 'Sleeper user not found' });
        }

        // Create or update user
        let user = await User.findOne({ email });

        if (!user) {
            // Create new user
            user = new User({
                email,
                username: sleeperUsername,  // Use sleeper username as username
                sleeperId: sleeperUser.user_id,
                sleeperUsername
            });
        } else {
            // Update existing user
            user.sleeperId = sleeperUser.user_id;
            user.sleeperUsername = sleeperUsername;
        }

        // Fetch user's leagues
        const leaguesResponse = await fetch(
            `https://api.sleeper.app/v1/user/${sleeperUser.user_id}/leagues/nfl/2024`
        );
        const leaguesData = await leaguesResponse.json();

        // Update user's leagues
        user.leagues = leaguesData.map(league => ({
            leagueId: league.league_id,
            leagueName: league.name,
            season: league.season
        }));

        await user.save();

        // Set session
        req.session.userId = user._id;

        res.json({ message: 'Sleeper account linked successfully', user });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

app.get('/api/leagues', async (req, res) => {
    try {
        if (!req.session.userId) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        const user = await User.findById(req.session.userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ leagues: user.leagues });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.get('/api/auth/check', (req, res) => {
    res.json({ authenticated: !!req.session.userId });
});

app.post('/api/auth/logout', (req, res) => {
    req.session.destroy();
    res.json({ message: 'Logged out successfully' });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
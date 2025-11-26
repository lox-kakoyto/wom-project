console.log("--- Starting WOM Server script... ---");

const express = require("express");
const app = express();
const cors = require("cors");
const pool = require("./db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require('google-auth-library');
require("dotenv").config();

console.log("Libraries loaded successfully.");

// Middleware
app.use(cors());
// Increase limit for base64 images
app.use(express.json({ limit: '50mb' })); 

const JWT_SECRET = process.env.JWT_SECRET || "wom_secret_key_123";
// Using the Client ID you provided
const GOOGLE_CLIENT_ID = "831251822210-eljbdqkcp5f9bi0bdaqahpcdjmtve73m.apps.googleusercontent.com";
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

// Logger
app.use((req, res, next) => {
    console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
    next();
});

// --- AUTH ROUTES ---

// GOOGLE LOGIN
app.post("/auth/google", async (req, res) => {
    try {
        const { token } = req.body;
        console.log("Received Google Token");

        const ticket = await googleClient.verifyIdToken({
            idToken: token,
            audience: GOOGLE_CLIENT_ID,
        });
        
        const { name, email, picture, sub } = ticket.getPayload();
        
        // Check if user exists
        const userCheck = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
        
        let user;
        
        if (userCheck.rows.length > 0) {
            // User exists - Log them in
            user = userCheck.rows[0];
            // Update avatar if it's missing
            if (!user.avatar && picture) {
                await pool.query("UPDATE users SET avatar = $1 WHERE id = $2", [picture, user.id]);
                user.avatar = picture;
            }
        } else {
            // User doesn't exist - Create new user
            // We use a random password since they login via Google
            const randomPassword = Math.random().toString(36).slice(-8);
            const salt = await bcrypt.genSalt(10);
            const bcryptPassword = await bcrypt.hash(randomPassword, salt);
            
            const newUser = await pool.query(
                "INSERT INTO users (username, email, password_hash, role, avatar, banner) VALUES($1, $2, $3, 'User', $4, '') RETURNING *",
                [name, email, bcryptPassword, picture]
            );
            user = newUser.rows[0];
        }

        const jwtToken = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: "7d" });
        
        // Remove sensitive data
        delete user.password_hash;
        
        res.json({ token: jwtToken, user: user });

    } catch (err) {
        console.error("Google Auth Error:", err.message);
        res.status(500).json({ error: "Server error during Google Auth: " + err.message });
    }
});

// REGISTER
app.post("/auth/register", async (req, res) => {
    console.log("👉 НАЧАЛО РЕГИСТРАЦИИ. Получен запрос."); // <-- ДОБАВЬ

    try {
        const { username, email, password } = req.body;
        console.log("👉 Данные получены:", { username, email }); // <-- ДОБАВЬ (пароль не логируем!)

        console.log("👉 Проверка пользователя в базе..."); // <-- ДОБАВЬ
        const userCheck = await pool.query("SELECT * FROM users WHERE email = $1 OR username = $2", [email, username]);
        if (userCheck.rows.length > 0) {
            console.log("👉 Ошибка: Пользователь уже существует."); // <-- ДОБАВЬ
            return res.status(401).json({ error: "User with this email or username already exists." });
        }

        console.log("👉 Хеширование пароля..."); // <-- ДОБАВЬ
        const salt = await bcrypt.genSalt(10);
        const bcryptPassword = await bcrypt.hash(password, salt);

        console.log("👉 Запись нового пользователя в базу..."); // <-- ДОБАВЬ
        const newUser = await pool.query(
            "INSERT INTO users (username, email, password_hash, role, avatar, banner) VALUES($1, $2, $3, 'User', '', '') RETURNING *",
            [username, email, bcryptPassword]
        );
        console.log("👉 Пользователь успешно записан. ID:", newUser.rows[0].id); // <-- ДОБАВЬ

        console.log("👉 Генерация токена..."); // <-- ДОБАВЬ
        const token = jwt.sign({ id: newUser.rows[0].id }, JWT_SECRET, { expiresIn: "7d" });

        console.log("👉 Отправка успешного ответа клиенту."); // <-- ДОБАВЬ
        res.json({ token, user: newUser.rows[0] });

    } catch (err) {
        console.error("🔥 ПОЛНАЯ ОШИБКА РЕГИСТРАЦИИ 🔥:", err); // Эту строку оставь
        res.status(500).json({ error: "Server error during registration", details: err.message });
    }
});

// LOGIN
app.post("/auth/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
        if (user.rows.length === 0) {
            return res.status(401).json({ error: "Invalid Credentials" });
        }

        const validPassword = await bcrypt.compare(password, user.rows[0].password_hash);
        if (!validPassword) {
            return res.status(401).json({ error: "Invalid Credentials" });
        }

        const token = jwt.sign({ id: user.rows[0].id }, JWT_SECRET, { expiresIn: "7d" });

        const userData = user.rows[0];
        delete userData.password_hash;

        res.json({ token, user: userData });

    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Server error during login" });
    }
});

// VERIFY TOKEN
app.get("/auth/me", async (req, res) => {
    try {
        const token = req.header("Authorization");
        if (!token) return res.json(null);

        const cleanToken = token.replace("Bearer ", "");
        
        try {
            const verified = jwt.verify(cleanToken, JWT_SECRET);
            const user = await pool.query("SELECT * FROM users WHERE id = $1", [verified.id]);
            
            if (user.rows.length === 0) return res.json(null);
            
            const userData = user.rows[0];
            delete userData.password_hash;
            res.json(userData);
        } catch (e) {
            res.json(null);
        }
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

// --- DATA ROUTES ---

app.get("/users", async (req, res) => {
    try {
        const allUsers = await pool.query("SELECT * FROM users");
        const formattedUsers = allUsers.rows.map(user => ({
            id: user.id.toString(),
            username: user.username,
            role: user.role,
            avatar: user.avatar || '',
            banner: user.banner || '',
            bio: user.bio,
            joinDate: new Date(user.created_at).toLocaleDateString()
        }));
        res.json(formattedUsers);
    } catch (err) {
        console.error("Error fetching users:", err.message);
        res.status(500).json({ error: err.message });
    }
});

app.put("/users/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { avatar, banner, bio } = req.body;
        
        // Build dynamic query based on what's provided
        let query = "UPDATE users SET ";
        let params = [];
        let paramCount = 1;
        
        if (avatar !== undefined) {
            query += `avatar = $${paramCount}, `;
            params.push(avatar);
            paramCount++;
        }
        if (banner !== undefined) {
            query += `banner = $${paramCount}, `;
            params.push(banner);
            paramCount++;
        }
        if (bio !== undefined) {
            query += `bio = $${paramCount}, `;
            params.push(bio);
            paramCount++;
        }
        
        // Remove trailing comma and space
        query = query.slice(0, -2);
        query += ` WHERE id = $${paramCount} RETURNING *`;
        params.push(id);

        const update = await pool.query(query, params);

        res.json(update.rows[0]);
    } catch (err) {
        console.error("Error updating user:", err.message);
        res.status(500).json({ error: err.message });
    }
});

app.get("/articles", async (req, res) => {
    try {
        const allArticles = await pool.query("SELECT * FROM articles ORDER BY created_at DESC");
        const formattedArticles = allArticles.rows.map(row => ({
            id: row.id.toString(),
            slug: row.slug,
            title: row.title,
            content: row.content,
            category: row.category,
            authorId: row.author_id ? row.author_id.toString() : '1', 
            lastEdited: new Date(row.created_at).toLocaleDateString(),
            imageUrl: row.image_url,
            tags: row.tags || [],
            comments: [] 
        }));
        res.json(formattedArticles);
    } catch (err) {
        console.error("Error fetching articles:", err.message);
        res.status(500).json({ error: err.message });
    }
});

app.post("/articles", async (req, res) => {
    try {
        const { slug, title, content, category, authorId, imageUrl, tags } = req.body;
        const newArticle = await pool.query(
            "INSERT INTO articles (slug, title, content, category, author_id, image_url, tags) VALUES($1, $2, $3, $4, $5, $6, $7) RETURNING *",
            [slug, title, content, category, authorId, imageUrl, tags]
        );
        res.json(newArticle.rows[0]);
    } catch (err) {
        console.error("Error creating article:", err.message);
        res.status(500).json({ error: err.message });
    }
});

const initDB = async () => {
    try {
        console.log("[DB] Checking database tables...");
        
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(255) UNIQUE NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                role VARCHAR(50) DEFAULT 'User',
                avatar TEXT,
                banner TEXT,
                bio TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        
        await pool.query(`
            DO $$ 
            BEGIN 
                BEGIN
                    ALTER TABLE users ADD COLUMN banner TEXT;
                EXCEPTION
                    WHEN duplicate_column THEN RAISE NOTICE 'column banner already exists in users.';
                END;
            END $$;
        `);

        await pool.query(`
            INSERT INTO users (username, email, password_hash, role) 
            VALUES ('Admin', 'admin@wom.com', '$2b$10$tH.somERandomHashHereForSecurity', 'Admin') 
            ON CONFLICT (username) DO NOTHING;
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS articles (
                id SERIAL PRIMARY KEY,
                slug VARCHAR(255) UNIQUE NOT NULL,
                title VARCHAR(255) NOT NULL,
                content TEXT NOT NULL,
                category VARCHAR(100),
                author_id INTEGER REFERENCES users(id),
                image_url TEXT,
                tags TEXT[], 
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        console.log("[DB] Database initialized successfully.");
    } catch (err) {
        console.error("[DB] Initialization Error:", err);
    }
};

const PORT = process.env.PORT || 5000;

app.listen(PORT, async () => {
    console.log(`==================================`);
    console.log(`SERVER HAS STARTED ON PORT ${PORT}`);
    console.log(`URL: http://localhost:${PORT}`);
    console.log(`==================================`);
    await initDB();
});
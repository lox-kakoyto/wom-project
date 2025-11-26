
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
        
        const ticket = await googleClient.verifyIdToken({
            idToken: token,
            audience: GOOGLE_CLIENT_ID,
        });
        
        const { name, email, picture } = ticket.getPayload();
        
        const userCheck = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
        
        let user;
        
        if (userCheck.rows.length > 0) {
            user = userCheck.rows[0];
            if (!user.avatar && picture) {
                await pool.query("UPDATE users SET avatar = $1 WHERE id = $2", [picture, user.id]);
                user.avatar = picture;
            }
        } else {
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
        delete user.password_hash;
        
        res.json({ token: jwtToken, user: user });

    } catch (err) {
        console.error("Google Auth Error:", err.message);
        res.status(500).json({ error: "Server error during Google Auth: " + err.message });
    }
});

// REGISTER
app.post("/auth/register", async (req, res) => {
    try {
        const { username, email, password } = req.body;

        const userCheck = await pool.query("SELECT * FROM users WHERE email = $1 OR username = $2", [email, username]);
        if (userCheck.rows.length > 0) {
            return res.status(401).json({ error: "User with this email or username already exists." });
        }

        const salt = await bcrypt.genSalt(10);
        const bcryptPassword = await bcrypt.hash(password, salt);

        const newUser = await pool.query(
            "INSERT INTO users (username, email, password_hash, role, avatar, banner) VALUES($1, $2, $3, 'User', '', '') RETURNING *",
            [username, email, bcryptPassword]
        );

        const token = jwt.sign({ id: newUser.rows[0].id }, JWT_SECRET, { expiresIn: "7d" });

        res.json({ token, user: newUser.rows[0] });

    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Server error during registration" });
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

// USERS
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
        res.status(500).json({ error: err.message });
    }
});

app.put("/users/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { avatar, banner, bio } = req.body;
        
        let query = "UPDATE users SET ";
        let params = [];
        let paramCount = 1;
        
        if (avatar !== undefined) { query += `avatar = $${paramCount}, `; params.push(avatar); paramCount++; }
        if (banner !== undefined) { query += `banner = $${paramCount}, `; params.push(banner); paramCount++; }
        if (bio !== undefined) { query += `bio = $${paramCount}, `; params.push(bio); paramCount++; }
        
        query = query.slice(0, -2);
        query += ` WHERE id = $${paramCount} RETURNING *`;
        params.push(id);

        const update = await pool.query(query, params);
        res.json(update.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ARTICLES
app.get("/articles", async (req, res) => {
    try {
        const allArticles = await pool.query("SELECT * FROM articles ORDER BY created_at DESC");
        const allComments = await pool.query("SELECT * FROM article_comments ORDER BY created_at ASC");
        
        const formattedArticles = allArticles.rows.map(row => {
            // Filter comments for this article
            const rawComments = allComments.rows.filter(c => c.article_id === row.id);
            // Helper to build tree is complex on server, let's send flat list with parent_id and let client build tree
            // Or simpler: Client expects recursive structure. Ideally client builds it. 
            // We will map raw comments to client shape but keep them flat in JSON for now or let client handle it.
            // To minimize client refactor, let's send flat list but client needs to parse it.
            // Actually, let's structure comments as flat array in response, client DataContext will tree-ify them.
            
            const mappedComments = rawComments.map(c => ({
                id: c.id.toString(),
                authorId: c.author_id.toString(),
                content: c.content,
                timestamp: new Date(c.created_at).toLocaleTimeString(),
                parentId: c.parent_id ? c.parent_id.toString() : null,
                replies: [] // Client will populate
            }));

            return {
                id: row.id.toString(),
                slug: row.slug,
                title: row.title,
                content: row.content,
                category: row.category,
                authorId: row.author_id ? row.author_id.toString() : '1', 
                lastEdited: new Date(row.created_at).toLocaleDateString(),
                imageUrl: row.image_url,
                tags: row.tags || [],
                comments: mappedComments 
            };
        });
        res.json(formattedArticles);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post("/articles", async (req, res) => {
    try {
        const { slug, title, content, category, authorId, imageUrl, tags } = req.body;
        
        // If editing existing article
        const existing = await pool.query("SELECT id FROM articles WHERE slug = $1", [slug]);
        
        if (existing.rows.length > 0) {
             const updated = await pool.query(
                "UPDATE articles SET title=$1, content=$2, category=$3, image_url=$4, tags=$5 WHERE slug=$6 RETURNING *",
                [title, content, category, imageUrl, tags, slug]
             );
             res.json(updated.rows[0]);
        } else {
             const newArticle = await pool.query(
                "INSERT INTO articles (slug, title, content, category, author_id, image_url, tags) VALUES($1, $2, $3, $4, $5, $6, $7) RETURNING *",
                [slug, title, content, category, authorId, imageUrl, tags]
             );
             res.json(newArticle.rows[0]);
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post("/articles/comments", async (req, res) => {
    try {
        const { articleId, authorId, content, parentId } = req.body;
        // Ensure articleId is int
        const newComment = await pool.query(
            "INSERT INTO article_comments (article_id, author_id, content, parent_id) VALUES($1, $2, $3, $4) RETURNING *",
            [articleId, authorId, content, parentId || null]
        );
        res.json(newComment.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// COLISEUM (Threads)
app.get("/coliseum/threads", async (req, res) => {
    try {
        const threads = await pool.query("SELECT * FROM coliseum_threads ORDER BY created_at DESC");
        const comments = await pool.query("SELECT * FROM coliseum_comments ORDER BY created_at ASC");
        
        const formattedThreads = threads.rows.map(t => {
            const threadComments = comments.rows
                .filter(c => c.thread_id === t.id)
                .map(c => ({
                    id: c.id.toString(),
                    authorId: c.author_id.toString(),
                    content: c.content,
                    timestamp: new Date(c.created_at).toLocaleTimeString(),
                    replies: []
                }));

            return {
                id: t.id.toString(),
                title: t.title,
                authorId: t.author_id.toString(),
                content: t.content,
                timestamp: new Date(t.created_at).toLocaleDateString(),
                linkedArticleIds: [],
                views: 0,
                comments: threadComments
            };
        });
        res.json(formattedThreads);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post("/coliseum/threads", async (req, res) => {
    try {
        const { title, authorId, content } = req.body;
        const newThread = await pool.query(
            "INSERT INTO coliseum_threads (title, author_id, content) VALUES($1, $2, $3) RETURNING *",
            [title, authorId, content]
        );
        res.json(newThread.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post("/coliseum/comments", async (req, res) => {
    try {
        const { threadId, authorId, content } = req.body;
        const newComment = await pool.query(
            "INSERT INTO coliseum_comments (thread_id, author_id, content) VALUES($1, $2, $3) RETURNING *",
            [threadId, authorId, content]
        );
        res.json(newComment.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// CHAT
app.get("/chat", async (req, res) => {
    try {
        const messages = await pool.query("SELECT * FROM chat_messages ORDER BY created_at ASC LIMIT 100");
        const formatted = messages.rows.map(m => ({
            id: m.id.toString(),
            senderId: m.sender_id.toString(),
            content: m.content,
            timestamp: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            roomId: m.room_id,
            type: m.type
        }));
        res.json(formatted);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post("/chat", async (req, res) => {
    try {
        const { senderId, content, roomId, type } = req.body;
        const newMsg = await pool.query(
            "INSERT INTO chat_messages (sender_id, content, room_id, type) VALUES($1, $2, $3, $4) RETURNING *",
            [senderId, content, roomId, type || 'text']
        );
        res.json(newMsg.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// WALL POSTS
app.get("/wall", async (req, res) => {
    try {
        const posts = await pool.query("SELECT * FROM wall_posts ORDER BY created_at DESC");
        const comments = await pool.query("SELECT * FROM wall_comments ORDER BY created_at ASC");

        const formatted = posts.rows.map(p => {
            // Map comments to client format with flat structure (client will tree-ify)
            const postComments = comments.rows
                .filter(c => c.post_id === p.id)
                .map(c => ({
                    id: c.id.toString(),
                    authorId: c.author_id.toString(),
                    content: c.content,
                    timestamp: new Date(c.created_at).toLocaleTimeString(),
                    parentId: c.parent_id ? c.parent_id.toString() : null,
                    replies: []
                }));

            return {
                id: p.id.toString(),
                authorId: p.author_id.toString(),
                targetUserId: p.target_user_id.toString(),
                content: p.content,
                timestamp: new Date(p.created_at).toLocaleString(),
                comments: postComments
            };
        });
        res.json(formatted);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post("/wall", async (req, res) => {
    try {
        const { authorId, targetUserId, content } = req.body;
        const newPost = await pool.query(
            "INSERT INTO wall_posts (author_id, target_user_id, content) VALUES($1, $2, $3) RETURNING *",
            [authorId, targetUserId, content]
        );
        res.json(newPost.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post("/wall/comments", async (req, res) => {
    try {
        const { postId, authorId, content, parentId } = req.body;
        const newComment = await pool.query(
            "INSERT INTO wall_comments (post_id, author_id, content, parent_id) VALUES($1, $2, $3, $4) RETURNING *",
            [postId, authorId, content, parentId || null]
        );
        res.json(newComment.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// DB INITIALIZATION
const initDB = async () => {
    try {
        console.log("[DB] Checking database tables...");
        
        // Users
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
        
        // Articles
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

        // Article Comments
        await pool.query(`
            CREATE TABLE IF NOT EXISTS article_comments (
                id SERIAL PRIMARY KEY,
                article_id INTEGER REFERENCES articles(id),
                author_id INTEGER REFERENCES users(id),
                content TEXT NOT NULL,
                parent_id INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Coliseum Threads
        await pool.query(`
            CREATE TABLE IF NOT EXISTS coliseum_threads (
                id SERIAL PRIMARY KEY,
                title TEXT NOT NULL,
                content TEXT NOT NULL,
                author_id INTEGER REFERENCES users(id),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Coliseum Comments
        await pool.query(`
            CREATE TABLE IF NOT EXISTS coliseum_comments (
                id SERIAL PRIMARY KEY,
                thread_id INTEGER REFERENCES coliseum_threads(id),
                author_id INTEGER REFERENCES users(id),
                content TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Chat Messages
        await pool.query(`
            CREATE TABLE IF NOT EXISTS chat_messages (
                id SERIAL PRIMARY KEY,
                sender_id INTEGER REFERENCES users(id),
                content TEXT NOT NULL,
                room_id VARCHAR(50) NOT NULL,
                type VARCHAR(20) DEFAULT 'text',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Wall Posts
        await pool.query(`
            CREATE TABLE IF NOT EXISTS wall_posts (
                id SERIAL PRIMARY KEY,
                author_id INTEGER REFERENCES users(id),
                target_user_id INTEGER REFERENCES users(id),
                content TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Wall Comments
        await pool.query(`
            CREATE TABLE IF NOT EXISTS wall_comments (
                id SERIAL PRIMARY KEY,
                post_id INTEGER REFERENCES wall_posts(id),
                author_id INTEGER REFERENCES users(id),
                content TEXT NOT NULL,
                parent_id INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Initial Admin
        await pool.query(`
            INSERT INTO users (username, email, password_hash, role) 
            VALUES ('Admin', 'admin@wom.com', '$2b$10$tH.somERandomHashHereForSecurity', 'Admin') 
            ON CONFLICT (username) DO NOTHING;
        `);

        console.log("[DB] Database initialized successfully. All tables ready.");
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

console.log("--- Starting WOM Server script... ---");

import express from "express";
import cors from "cors";
import pool from "./db.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { OAuth2Client } from 'google-auth-library';
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

// ESM fix for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

console.log("Libraries loaded successfully.");

// Middleware
app.use(cors());
// Increase limit for base64 images
app.use(express.json({ limit: '50mb' })); 

// Serve Static Files (Vite build output)
// Changed from '../dist' to '../client/dist' based on logs
app.use(express.static(path.join(__dirname, '../client/dist')));

const JWT_SECRET = process.env.JWT_SECRET || "wom_secret_key_123";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "831251822210-eljbdqkcp5f9bi0bdaqahpcdjmtve73m.apps.googleusercontent.com";
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

// Logger
app.use((req, res, next) => {
    // console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
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
                "INSERT INTO users (username, email, password_hash, role, avatar, banner, watchlist) VALUES($1, $2, $3, 'User', $4, '', $5) RETURNING *",
                [name, email, bcryptPassword, picture, []]
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
            "INSERT INTO users (username, email, password_hash, role, avatar, banner, watchlist) VALUES($1, $2, $3, 'User', '', '', $4) RETURNING *",
            [username, email, bcryptPassword, []]
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

        // Allow login with email OR username
        const user = await pool.query("SELECT * FROM users WHERE email = $1 OR username = $1", [email]);
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
            const userId = parseInt(verified.id); // Convert to number assuming SERIAL id
            const user = await pool.query("SELECT * FROM users WHERE id = $1", [userId]);
            
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
        const allUsers = await pool.query("SELECT id, username, role, avatar, banner, bio, created_at, watchlist FROM users");
        const formattedUsers = allUsers.rows.map(user => ({
            id: user.id.toString(),
            username: user.username,
            role: user.role,
            avatar: user.avatar || '',
            banner: user.banner || '',
            bio: user.bio,
            joinDate: new Date(user.created_at).toLocaleDateString(),
            watchlist: user.watchlist || []
        }));
        res.json(formattedUsers);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put("/users/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const userId = parseInt(id); // Ensure integer for DB
        
        const { avatar, banner, bio } = req.body; 
        
        let query = "UPDATE users SET ";
        let params = [];
        let paramCount = 1;
        
        if (avatar !== undefined) { query += `avatar = $${paramCount}, `; params.push(avatar); paramCount++; }
        if (banner !== undefined) { query += `banner = $${paramCount}, `; params.push(banner); paramCount++; }
        if (bio !== undefined) { query += `bio = $${paramCount}, `; params.push(bio); paramCount++; }
        
        query = query.slice(0, -2);
        query += ` WHERE id = $${paramCount} RETURNING *`;
        params.push(userId); 

        const update = await pool.query(query, params);
        res.json(update.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Toggle Watchlist
app.post("/users/:id/watchlist", async (req, res) => {
    try {
        const { id } = req.params;
        const { slug } = req.body;
        
        const userRes = await pool.query("SELECT watchlist FROM users WHERE id = $1", [id]);
        if(userRes.rows.length === 0) return res.status(404).json({error: "User not found"});
        
        let list = userRes.rows[0].watchlist || [];
        
        if(list.includes(slug)) {
            list = list.filter(s => s !== slug);
        } else {
            list.push(slug);
        }
        
        const update = await pool.query("UPDATE users SET watchlist = $1 WHERE id = $2 RETURNING watchlist", [list, id]);
        res.json({ watchlist: update.rows[0].watchlist });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- FRIENDS ROUTES ---

// Get Friends & Requests
app.get("/friends/:userId", async (req, res) => {
    try {
        const { userId } = req.params;
        
        // Get accepted friendships
        const friendsQuery = await pool.query(`
            SELECT f.id, u.id as friend_id, u.username, u.avatar, u.role, u.bio, f.created_at
            FROM friendships f
            JOIN users u ON (u.id = f.user_id_1 OR u.id = f.user_id_2)
            WHERE (f.user_id_1 = $1 OR f.user_id_2 = $1) 
            AND u.id != $1 
            AND f.status = 'accepted'
        `, [userId]);

        // Get pending requests (Incoming)
        const requestsQuery = await pool.query(`
            SELECT f.id, u.id as sender_id, u.username, u.avatar
            FROM friendships f
            JOIN users u ON u.id = f.user_id_1
            WHERE f.user_id_2 = $1 AND f.status = 'pending'
        `, [userId]);

        res.json({
            friends: friendsQuery.rows,
            requests: requestsQuery.rows
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Send Friend Request
app.post("/friends/request", async (req, res) => {
    try {
        const { senderId, receiverId } = req.body;
        
        // Check if exists
        const check = await pool.query(
            "SELECT * FROM friendships WHERE (user_id_1 = $1 AND user_id_2 = $2) OR (user_id_1 = $2 AND user_id_2 = $1)",
            [senderId, receiverId]
        );

        if (check.rows.length > 0) {
            return res.status(400).json({ error: "Relationship already exists" });
        }

        const newRequest = await pool.query(
            "INSERT INTO friendships (user_id_1, user_id_2, status) VALUES ($1, $2, 'pending') RETURNING *",
            [senderId, receiverId]
        );

        // Notify Receiver
        await pool.query(
            "INSERT INTO notifications (user_id, type, content, link) VALUES ($1, 'friend_request', 'New friend request', '/friends')",
            [receiverId]
        );

        res.json(newRequest.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Accept Request
app.post("/friends/accept", async (req, res) => {
    try {
        const { requestId } = req.body;
        await pool.query("UPDATE friendships SET status = 'accepted' WHERE id = $1", [requestId]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Reject/Delete Request
app.post("/friends/reject", async (req, res) => {
    try {
        const { requestId } = req.body;
        await pool.query("DELETE FROM friendships WHERE id = $1", [requestId]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// --- CHAT ROUTES (OPTIMIZED) ---

// Get Messages for a specific ROOM (Active Chat)
app.get("/chat/:roomId", async (req, res) => {
    try {
        const { roomId } = req.params;
        // Limit to last 50 messages for efficiency
        const messages = await pool.query(
            "SELECT * FROM chat_messages WHERE room_id = $1 ORDER BY created_at ASC LIMIT 50",
            [roomId]
        );
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

// NOTIFICATIONS
app.get("/notifications/:userId", async (req, res) => {
    try {
        const { userId } = req.params;
        const notes = await pool.query("SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50", [userId]);
        
        const formatted = notes.rows.map(n => ({
            id: n.id.toString(),
            userId: n.user_id.toString(),
            type: n.type,
            content: n.content,
            read: n.is_read,
            timestamp: new Date(n.created_at).toLocaleString(),
            link: n.link
        }));
        res.json(formatted);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put("/notifications/:id/read", async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query("UPDATE notifications SET is_read = TRUE WHERE id = $1", [id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// ARTICLES
app.get("/articles", async (req, res) => {
    try {
        const allArticles = await pool.query("SELECT id, slug, title, content, category, author_id, image_url, tags, created_at FROM articles ORDER BY created_at DESC");
        const allComments = await pool.query("SELECT * FROM article_comments ORDER BY created_at ASC");
        
        const formattedArticles = allArticles.rows.map(row => {
            const rawComments = allComments.rows.filter(c => c.article_id === row.id);
            const mappedComments = rawComments.map(c => ({
                id: c.id.toString(),
                authorId: c.author_id.toString(),
                content: c.content,
                timestamp: new Date(c.created_at).toLocaleTimeString(),
                parentId: c.parent_id ? c.parent_id.toString() : null,
                replies: [] 
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
        
        const existing = await pool.query("SELECT id FROM articles WHERE slug = $1", [slug]);
        
        let result;
        if (existing.rows.length > 0) {
             const updated = await pool.query(
                "UPDATE articles SET title=$1, content=$2, category=$3, image_url=$4, tags=$5 WHERE slug=$6 RETURNING *",
                [title, content, category, imageUrl, tags, slug]
             );
             result = updated.rows[0];

             // --- NOTIFICATION LOGIC ---
             const watchers = await pool.query("SELECT id FROM users WHERE watchlist @> $1", [[slug]]);
             for (const watcher of watchers.rows) {
                 if (watcher.id.toString() !== authorId.toString()) {
                     await pool.query(
                         "INSERT INTO notifications (user_id, type, content, link) VALUES ($1, 'system', $2, $3)",
                         [watcher.id, `Page "${title}" was updated.`, `/wiki/${slug}`]
                     );
                 }
             }
        } else {
             const newArticle = await pool.query(
                "INSERT INTO articles (slug, title, content, category, author_id, image_url, tags) VALUES($1, $2, $3, $4, $5, $6, $7) RETURNING *",
                [slug, title, content, category, authorId, imageUrl, tags]
             );
             result = newArticle.rows[0];
        }
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post("/articles/comments", async (req, res) => {
    try {
        const { articleId, authorId, content, parentId } = req.body;
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

// WALL POSTS
app.get("/wall", async (req, res) => {
    try {
        // Simple Limit for now to prevent massive payloads
        const posts = await pool.query("SELECT * FROM wall_posts ORDER BY created_at DESC LIMIT 50");
        const comments = await pool.query("SELECT * FROM wall_comments ORDER BY created_at ASC");

        const formatted = posts.rows.map(p => {
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
        
        // Notify target user
        if (authorId !== targetUserId) {
            await pool.query(
                "INSERT INTO notifications (user_id, type, content, link) VALUES ($1, 'message', 'New wall post from a user.', $2)",
                [targetUserId, `/profile/${targetUserId}`]
            );
        }

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

// MEDIA ROUTES
app.get("/media", async (req, res) => {
    try {
        const result = await pool.query("SELECT id, filename, url, uploader_id, type, size, created_at FROM media_files ORDER BY created_at DESC");
        const formatted = result.rows.map(m => ({
            id: m.id.toString(),
            filename: m.filename,
            url: m.url,
            uploaderId: m.uploader_id ? m.uploader_id.toString() : '0',
            timestamp: new Date(m.created_at).toLocaleString(),
            type: m.type,
            size: m.size
        }));
        res.json(formatted);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post("/media", async (req, res) => {
    try {
        const { filename, url, uploaderId, type, size } = req.body;
        const newMedia = await pool.query(
            "INSERT INTO media_files (filename, url, uploader_id, type, size) VALUES($1, $2, $3, $4, $5) RETURNING *",
            [filename, url, uploaderId, type, size]
        );
        res.json(newMedia.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Catch-all route to serve the React App
// Also changed from '../dist' to '../client/dist'
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
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
                watchlist TEXT[],
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Friendships
        await pool.query(`
            CREATE TABLE IF NOT EXISTS friendships (
                id SERIAL PRIMARY KEY,
                user_id_1 INTEGER REFERENCES users(id),
                user_id_2 INTEGER REFERENCES users(id),
                status VARCHAR(20) DEFAULT 'pending', -- pending, accepted
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Check for watchlist column if table existed but column didn't
        try {
            await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS watchlist TEXT[] DEFAULT '{}'`);
        } catch (e) { console.log("Watchlist column check skipped or failed", e.message); }
        
        // Notifications
        await pool.query(`
            CREATE TABLE IF NOT EXISTS notifications (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id),
                type VARCHAR(50),
                content TEXT,
                link TEXT,
                is_read BOOLEAN DEFAULT FALSE,
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
                room_id VARCHAR(100) NOT NULL,
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

        // Media Files
        await pool.query(`
            CREATE TABLE IF NOT EXISTS media_files (
                id SERIAL PRIMARY KEY,
                filename TEXT NOT NULL,
                url TEXT NOT NULL,
                uploader_id INTEGER REFERENCES users(id),
                type VARCHAR(20),
                size INTEGER,
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
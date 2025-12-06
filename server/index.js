console.log("--- Starting WOM Server script... ---");

import express from "express";
import cors from "cors";
import { pool } from "./db.js"; // Changed to named import
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

// Middleware - Increased limit for base64 images
app.use(cors());
app.use(express.json({ limit: '50mb' })); 

// Logger
app.use((req, res, next) => {
    console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
    next();
});

const JWT_SECRET = process.env.JWT_SECRET || "wom_secret_key_123";
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "831251822210-eljbdqkcp5f9bi0bdaqahpcdjmtve73m.apps.googleusercontent.com";
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

/* =========================================
   1. API ROUTES
   ========================================= */

// --- AUTHENTICATION ---

app.post("/auth/google", async (req, res) => {
    try {
        const { token } = req.body;
        const ticket = await googleClient.verifyIdToken({ idToken: token, audience: GOOGLE_CLIENT_ID });
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
        res.status(500).json({ error: "Server error during Google Auth" });
    }
});

app.post("/auth/register", async (req, res) => {
    try {
        const { username, email, password } = req.body;
        const userCheck = await pool.query("SELECT * FROM users WHERE email = $1 OR username = $2", [email, username]);
        if (userCheck.rows.length > 0) return res.status(401).json({ error: "User already exists." });
        
        const salt = await bcrypt.genSalt(10);
        const bcryptPassword = await bcrypt.hash(password, salt);
        const newUser = await pool.query(
            "INSERT INTO users (username, email, password_hash, role, avatar, banner, watchlist) VALUES($1, $2, $3, 'User', '', '', $4) RETURNING *",
            [username, email, bcryptPassword, []]
        );
        const token = jwt.sign({ id: newUser.rows[0].id }, JWT_SECRET, { expiresIn: "7d" });
        res.json({ token, user: newUser.rows[0] });
    } catch (err) {
        console.error("Register Error:", err.message);
        res.status(500).json({ error: "Server error during registration" });
    }
});

app.post("/auth/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await pool.query("SELECT * FROM users WHERE email = $1 OR username = $1", [email]);
        if (user.rows.length === 0) return res.status(401).json({ error: "Invalid Credentials" });
        
        const validPassword = await bcrypt.compare(password, user.rows[0].password_hash);
        if (!validPassword) return res.status(401).json({ error: "Invalid Credentials" });

        const token = jwt.sign({ id: user.rows[0].id }, JWT_SECRET, { expiresIn: "7d" });
        const userData = user.rows[0];
        delete userData.password_hash;
        res.json({ token, user: userData });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Server error during login" });
    }
});

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
        } catch (e) { res.json(null); }
    } catch (err) { res.status(500).send("Server Error"); }
});

// --- USERS ---

app.get("/users", async (req, res) => {
    try {
        const allUsers = await pool.query("SELECT id, username, role, avatar, banner, bio, created_at, watchlist FROM users");
        const formatted = allUsers.rows.map(user => ({
            id: user.id.toString(), 
            username: user.username, 
            role: user.role, 
            avatar: user.avatar || '', 
            banner: user.banner || '', 
            bio: user.bio, 
            joinDate: new Date(user.created_at).toLocaleDateString(), 
            watchlist: user.watchlist || []
        }));
        res.json(formatted);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put("/users/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { avatar, banner, bio } = req.body; 
        let query = "UPDATE users SET "; 
        let params = []; 
        let count = 1;

        if (avatar !== undefined) { query += `avatar = $${count}, `; params.push(avatar); count++; }
        if (banner !== undefined) { query += `banner = $${count}, `; params.push(banner); count++; }
        if (bio !== undefined) { query += `bio = $${count}, `; params.push(bio); count++; }
        
        query = query.slice(0, -2); 
        query += ` WHERE id = $${count} RETURNING *`; 
        params.push(id); 
        
        const update = await pool.query(query, params);
        res.json(update.rows[0]);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post("/users/:id/watchlist", async (req, res) => {
    try {
        const { id } = req.params; 
        const { slug } = req.body;
        const userRes = await pool.query("SELECT watchlist FROM users WHERE id = $1", [id]);
        let list = userRes.rows[0].watchlist || [];
        
        if(list.includes(slug)) {
            list = list.filter(s => s !== slug); 
        } else {
            list.push(slug);
        }
        
        const update = await pool.query("UPDATE users SET watchlist = $1 WHERE id = $2 RETURNING watchlist", [list, id]);
        res.json({ watchlist: update.rows[0].watchlist });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- FRIENDS ---

app.get("/friends/:userId", async (req, res) => {
    try {
        const { userId } = req.params;
        const friends = await pool.query(
            `SELECT f.id, u.id as friend_id, u.username, u.avatar, u.role, u.bio 
             FROM friendships f 
             JOIN users u ON (u.id = f.user_id_1 OR u.id = f.user_id_2) 
             WHERE (f.user_id_1 = $1 OR f.user_id_2 = $1) 
             AND u.id != $1 AND f.status = 'accepted'`, 
            [userId]
        );
        const requests = await pool.query(
            `SELECT f.id, u.id as sender_id, u.username, u.avatar 
             FROM friendships f 
             JOIN users u ON u.id = f.user_id_1 
             WHERE f.user_id_2 = $1 AND f.status = 'pending'`, 
            [userId]
        );
        res.json({ friends: friends.rows, requests: requests.rows });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post("/friends/request", async (req, res) => {
    try {
        const { senderId, receiverId } = req.body;
        const check = await pool.query(
            "SELECT * FROM friendships WHERE (user_id_1 = $1 AND user_id_2 = $2) OR (user_id_1 = $2 AND user_id_2 = $1)", 
            [senderId, receiverId]
        );
        if (check.rows.length > 0) return res.status(400).json({ error: "Exists" });
        
        const newReq = await pool.query(
            "INSERT INTO friendships (user_id_1, user_id_2, status) VALUES ($1, $2, 'pending') RETURNING *", 
            [senderId, receiverId]
        );
        await pool.query(
            "INSERT INTO notifications (user_id, type, content, link) VALUES ($1, 'friend_request', 'New friend request', '/friends')", 
            [receiverId]
        );
        res.json(newReq.rows[0]);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post("/friends/accept", async (req, res) => { 
    try { 
        await pool.query("UPDATE friendships SET status = 'accepted' WHERE id = $1", [req.body.requestId]); 
        res.json({success:true}); 
    } catch (e) { res.status(500).json({error:e.message}); } 
});

app.post("/friends/reject", async (req, res) => { 
    try { 
        await pool.query("DELETE FROM friendships WHERE id = $1", [req.body.requestId]); 
        res.json({success:true}); 
    } catch (e) { res.status(500).json({error:e.message}); } 
});

// --- CHAT ---

app.get("/chat/:roomId", async (req, res) => { 
    try { 
        const msgs = await pool.query("SELECT * FROM chat_messages WHERE room_id = $1 ORDER BY created_at ASC LIMIT 50", [req.params.roomId]); 
        res.json(msgs.rows.map(m => ({ 
            id: m.id.toString(), 
            senderId: m.sender_id.toString(), 
            content: m.content, 
            timestamp: new Date(m.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}), 
            roomId: m.room_id, 
            type: m.type 
        }))); 
    } catch (e) { res.status(500).json({error:e.message}); } 
});

app.post("/chat", async (req, res) => { 
    try { 
        const { senderId, content, roomId, type } = req.body; 
        const newMsg = await pool.query(
            "INSERT INTO chat_messages (sender_id, content, room_id, type) VALUES($1, $2, $3, $4) RETURNING *", 
            [senderId, content, roomId, type||'text']
        ); 
        res.json(newMsg.rows[0]); 
    } catch (e) { res.status(500).json({error:e.message}); } 
});

// --- ARTICLES (WIKI) ---

app.get("/articles", async (req, res) => {
    try {
        const arts = await pool.query("SELECT id, slug, title, content, category, author_id, image_url, tags, created_at FROM articles ORDER BY created_at DESC");
        const coms = await pool.query("SELECT * FROM article_comments ORDER BY created_at ASC");
        
        const fmt = arts.rows.map(row => {
            const rowComs = coms.rows.filter(c => c.article_id === row.id).map(c => ({ 
                id: c.id.toString(), 
                authorId: c.author_id.toString(), 
                content: c.content, 
                timestamp: new Date(c.created_at).toLocaleTimeString(), 
                parentId: c.parent_id?.toString() || null, 
                replies: [] 
            }));
            return { 
                id: row.id.toString(), 
                slug: row.slug, 
                title: row.title, 
                content: row.content, 
                category: row.category, 
                authorId: row.author_id?.toString() || '1', 
                lastEdited: new Date(row.created_at).toLocaleDateString(), 
                imageUrl: row.image_url, 
                tags: row.tags||[], 
                comments: rowComs 
            };
        });
        res.json(fmt);
    } catch (e) { res.status(500).json({error:e.message}); }
});

app.post("/articles", async (req, res) => {
    try {
        const { slug, title, content, category, authorId, imageUrl, tags } = req.body;
        const exist = await pool.query("SELECT id FROM articles WHERE slug = $1", [slug]);
        let result;
        
        if(exist.rows.length > 0) {
            const up = await pool.query(
                "UPDATE articles SET title=$1, content=$2, category=$3, image_url=$4, tags=$5 WHERE slug=$6 RETURNING *", 
                [title, content, category, imageUrl, tags, slug]
            );
            result = up.rows[0];
            
            // Notify watchers
            const watchers = await pool.query("SELECT id FROM users WHERE watchlist @> $1", [[slug]]);
            for(const w of watchers.rows) { 
                if(w.id.toString() !== authorId.toString()) {
                    await pool.query(
                        "INSERT INTO notifications (user_id, type, content, link) VALUES ($1, 'system', $2, $3)", 
                        [w.id, `Page "${title}" updated.`, `/wiki/${slug}`]
                    ); 
                }
            }
        } else {
            const ins = await pool.query(
                "INSERT INTO articles (slug, title, content, category, author_id, image_url, tags) VALUES($1, $2, $3, $4, $5, $6, $7) RETURNING *", 
                [slug, title, content, category, authorId, imageUrl, tags]
            );
            result = ins.rows[0];
        }
        res.json(result);
    } catch (e) { res.status(500).json({error:e.message}); }
});

app.post("/articles/comments", async (req, res) => { 
    try { 
        const { articleId, authorId, content, parentId } = req.body; 
        const nc = await pool.query(
            "INSERT INTO article_comments (article_id, author_id, content, parent_id) VALUES($1, $2, $3, $4) RETURNING *", 
            [articleId, authorId, content, parentId||null]
        ); 
        res.json(nc.rows[0]); 
    } catch (e) { res.status(500).json({error:e.message}); } 
});

// --- COLISEUM ---

app.get("/coliseum/threads", async (req, res) => { 
    try { 
        const th = await pool.query("SELECT * FROM coliseum_threads ORDER BY created_at DESC"); 
        const co = await pool.query("SELECT * FROM coliseum_comments ORDER BY created_at ASC"); 
        const fmt = th.rows.map(t => ({ 
            id: t.id.toString(), 
            title: t.title, 
            authorId: t.author_id.toString(), 
            content: t.content, 
            timestamp: new Date(t.created_at).toLocaleDateString(), 
            linkedArticleIds: [], 
            views: 0, 
            comments: co.rows.filter(c => c.thread_id === t.id).map(c => ({ 
                id: c.id.toString(), 
                authorId: c.author_id.toString(), 
                content: c.content, 
                timestamp: new Date(c.created_at).toLocaleTimeString(), 
                replies: [] 
            })) 
        })); 
        res.json(fmt); 
    } catch (e) { res.status(500).json({error:e.message}); } 
});

app.post("/coliseum/threads", async (req, res) => { 
    try { 
        const { title, authorId, content } = req.body; 
        const nt = await pool.query(
            "INSERT INTO coliseum_threads (title, author_id, content) VALUES($1, $2, $3) RETURNING *", 
            [title, authorId, content]
        ); 
        res.json(nt.rows[0]); 
    } catch (e) { res.status(500).json({error:e.message}); } 
});

app.post("/coliseum/comments", async (req, res) => { 
    try { 
        const { threadId, authorId, content } = req.body; 
        const nc = await pool.query(
            "INSERT INTO coliseum_comments (thread_id, author_id, content) VALUES($1, $2, $3) RETURNING *", 
            [threadId, authorId, content]
        ); 
        res.json(nc.rows[0]); 
    } catch (e) { res.status(500).json({error:e.message}); } 
});

// --- WALL ---

app.get("/wall", async (req, res) => { 
    try { 
        const posts = await pool.query("SELECT * FROM wall_posts ORDER BY created_at DESC LIMIT 50"); 
        const coms = await pool.query("SELECT * FROM wall_comments ORDER BY created_at ASC"); 
        const fmt = posts.rows.map(p => ({ 
            id: p.id.toString(), 
            authorId: p.author_id.toString(), 
            targetUserId: p.target_user_id.toString(), 
            content: p.content, 
            timestamp: new Date(p.created_at).toLocaleString(), 
            comments: coms.rows.filter(c => c.post_id === p.id).map(c => ({ 
                id: c.id.toString(), 
                authorId: c.author_id.toString(), 
                content: c.content, 
                timestamp: new Date(c.created_at).toLocaleTimeString(), 
                parentId: c.parent_id?.toString()||null, 
                replies: [] 
            })) 
        })); 
        res.json(fmt); 
    } catch (e) { res.status(500).json({error:e.message}); } 
});

app.post("/wall", async (req, res) => { 
    try { 
        const { authorId, targetUserId, content } = req.body; 
        const np = await pool.query(
            "INSERT INTO wall_posts (author_id, target_user_id, content) VALUES($1, $2, $3) RETURNING *", 
            [authorId, targetUserId, content]
        ); 
        
        if(authorId !== targetUserId) {
            await pool.query(
                "INSERT INTO notifications (user_id, type, content, link) VALUES ($1, 'message', 'New wall post.', $2)", 
                [targetUserId, `/profile/${targetUserId}`]
            );
        }
        res.json(np.rows[0]); 
    } catch (e) { res.status(500).json({error:e.message}); } 
});

app.post("/wall/comments", async (req, res) => { 
    try { 
        const { postId, authorId, content, parentId } = req.body; 
        const nc = await pool.query(
            "INSERT INTO wall_comments (post_id, author_id, content, parent_id) VALUES($1, $2, $3, $4) RETURNING *", 
            [postId, authorId, content, parentId||null]
        ); 
        res.json(nc.rows[0]); 
    } catch (e) { res.status(500).json({error:e.message}); } 
});

// --- NOTIFICATIONS & MEDIA ---

app.get("/notifications/:userId", async (req, res) => { 
    try { 
        const notes = await pool.query("SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50", [req.params.userId]); 
        const fmt = notes.rows.map(n => ({ 
            id: n.id.toString(), 
            userId: n.user_id.toString(), 
            type: n.type, 
            content: n.content, 
            read: n.is_read, 
            timestamp: new Date(n.created_at).toLocaleString(), 
            link: n.link 
        })); 
        res.json(fmt); 
    } catch (e) { res.status(500).json({error:e.message}); } 
});

app.put("/notifications/:id/read", async (req, res) => { 
    try { 
        await pool.query("UPDATE notifications SET is_read = TRUE WHERE id = $1", [req.params.id]); 
        res.json({success:true}); 
    } catch (e) { res.status(500).json({error:e.message}); } 
});

app.get("/media", async (req, res) => { 
    try { 
        const r = await pool.query("SELECT id, filename, url, uploader_id, type, size, created_at FROM media_files ORDER BY created_at DESC"); 
        const fmt = r.rows.map(m => ({ 
            id: m.id.toString(), 
            filename: m.filename, 
            url: m.url, 
            uploaderId: m.uploader_id?.toString()||'0', 
            timestamp: new Date(m.created_at).toLocaleString(), 
            type: m.type, 
            size: m.size 
        })); 
        res.json(fmt); 
    } catch (e) { res.status(500).json({error:e.message}); } 
});

app.post("/media", async (req, res) => { 
    try { 
        const { filename, url, uploaderId, type, size } = req.body; 
        const nm = await pool.query(
            "INSERT INTO media_files (filename, url, uploader_id, type, size) VALUES($1, $2, $3, $4, $5) RETURNING *", 
            [filename, url, uploaderId, type, size]
        ); 
        res.json(nm.rows[0]); 
    } catch (e) { res.status(500).json({error:e.message}); } 
});

/* =========================================
   2. STATIC FILES & FALLBACK
   ========================================= */

// Serve the built client files
app.use(express.static(path.join(__dirname, '../client/dist')));

// Handles any request that didn't match an API route or a static file,
// returning index.html so React Router can handle client-side routing.
// Express 5 regex matching
app.get(/.*/, (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

/* =========================================
   3. DB INITIALIZATION & SERVER START
   ========================================= */

const initDB = async () => {
    try {
        await pool.query("CREATE TABLE IF NOT EXISTS users (id SERIAL PRIMARY KEY, username VARCHAR(255) UNIQUE NOT NULL, email VARCHAR(255) UNIQUE NOT NULL, password_hash VARCHAR(255) NOT NULL, role VARCHAR(50) DEFAULT 'User', avatar TEXT, banner TEXT, bio TEXT, watchlist TEXT[], created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)");
        await pool.query("CREATE TABLE IF NOT EXISTS friendships (id SERIAL PRIMARY KEY, user_id_1 INTEGER REFERENCES users(id), user_id_2 INTEGER REFERENCES users(id), status VARCHAR(20) DEFAULT 'pending', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)");
        await pool.query("CREATE TABLE IF NOT EXISTS notifications (id SERIAL PRIMARY KEY, user_id INTEGER REFERENCES users(id), type VARCHAR(50), content TEXT, link TEXT, is_read BOOLEAN DEFAULT FALSE, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)");
        await pool.query("CREATE TABLE IF NOT EXISTS articles (id SERIAL PRIMARY KEY, slug VARCHAR(255) UNIQUE NOT NULL, title VARCHAR(255) NOT NULL, content TEXT NOT NULL, category VARCHAR(100), author_id INTEGER REFERENCES users(id), image_url TEXT, tags TEXT[], created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)");
        await pool.query("CREATE TABLE IF NOT EXISTS article_comments (id SERIAL PRIMARY KEY, article_id INTEGER REFERENCES articles(id), author_id INTEGER REFERENCES users(id), content TEXT NOT NULL, parent_id INTEGER, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)");
        await pool.query("CREATE TABLE IF NOT EXISTS coliseum_threads (id SERIAL PRIMARY KEY, title TEXT NOT NULL, content TEXT NOT NULL, author_id INTEGER REFERENCES users(id), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)");
        await pool.query("CREATE TABLE IF NOT EXISTS coliseum_comments (id SERIAL PRIMARY KEY, thread_id INTEGER REFERENCES coliseum_threads(id), author_id INTEGER REFERENCES users(id), content TEXT NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)");
        await pool.query("CREATE TABLE IF NOT EXISTS chat_messages (id SERIAL PRIMARY KEY, sender_id INTEGER REFERENCES users(id), content TEXT NOT NULL, room_id VARCHAR(100) NOT NULL, type VARCHAR(20) DEFAULT 'text', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)");
        await pool.query("CREATE TABLE IF NOT EXISTS wall_posts (id SERIAL PRIMARY KEY, author_id INTEGER REFERENCES users(id), target_user_id INTEGER REFERENCES users(id), content TEXT NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)");
        await pool.query("CREATE TABLE IF NOT EXISTS wall_comments (id SERIAL PRIMARY KEY, post_id INTEGER REFERENCES wall_posts(id), author_id INTEGER REFERENCES users(id), content TEXT NOT NULL, parent_id INTEGER, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)");
        await pool.query("CREATE TABLE IF NOT EXISTS media_files (id SERIAL PRIMARY KEY, filename TEXT NOT NULL, url TEXT NOT NULL, uploader_id INTEGER REFERENCES users(id), type VARCHAR(20), size INTEGER, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)");
        
        await pool.query("INSERT INTO users (username, email, password_hash, role) VALUES ('Admin', 'admin@wom.com', '$2b$10$tH.somERandomHashHereForSecurity', 'Admin') ON CONFLICT (username) DO NOTHING");
        console.log("[DB] Database initialized successfully.");
    } catch (err) { console.error("[DB] Initialization Error:", err); }
};

const PORT = process.env.PORT || 5000;
app.listen(PORT, async () => {
    console.log(`SERVER HAS STARTED ON PORT ${PORT}`);
    await initDB();
});
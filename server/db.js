const Pool = require("pg").Pool;
require("dotenv").config();

const connectionString = process.env.DATABASE_URL;

// Ensure we do NOT pass any 'ssl' configuration object when using the connectionString
// for internal networks (like Render's private network), as they often reject SSL connections
// resulting in ECONNREFUSED.
const pool = new Pool(
  connectionString
    ? {
        connectionString,
      }
    : {
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        database: process.env.DB_NAME,
      }
);

module.exports = pool;


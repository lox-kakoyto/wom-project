
const Pool = require("pg").Pool;
require("dotenv").config();

const isProduction = process.env.NODE_ENV === "production";

const connectionString = process.env.DATABASE_URL;

const pool = new Pool(
  isProduction
    ? {
        connectionString: connectionString,
        ssl: {
          rejectUnauthorized: false, // Обязательно для Render
        },
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

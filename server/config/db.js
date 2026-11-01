import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'cheydev_topup_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4',
  connectTimeout: 2000
};

// Create connection pool
export const pool = mysql.createPool(dbConfig);

// Helper function to test connection
export async function testConnection() {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.query('SELECT 1 as connected, NOW() as server_time');
    connection.release();
    return {
      connected: true,
      database: dbConfig.database,
      serverTime: rows[0].server_time
    };
  } catch (err) {
    return {
      connected: false,
      error: err.message,
      code: err.code
    };
  }
}

export default pool;

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = parseInt(process.env.DB_PORT || '3306', 10);
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME || 'cheydev_topup_db';

async function initDatabase() {
  console.log(`🔌 Connecting to MySQL Server at ${DB_HOST}:${DB_PORT} as ${DB_USER}...`);
  
  // Step 1: Connect to server without database selection
  const rootConn = await mysql.createConnection({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD
  });

  console.log(`✨ Connected to MySQL. Ensuring database '${DB_NAME}' exists...`);
  await rootConn.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
  console.log(`✅ Database '${DB_NAME}' confirmed.`);
  await rootConn.end();

  // Step 2: Connect to specific database to set up tables
  const db = await mysql.createConnection({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME
  });

  console.log('🛠️ Creating tables if not exists...');

  // 1. Users table
  await db.query(`
    CREATE TABLE IF NOT EXISTS \`users\` (
      \`id\` VARCHAR(64) PRIMARY KEY,
      \`name\` VARCHAR(255) NOT NULL,
      \`email\` VARCHAR(255) NOT NULL UNIQUE,
      \`phone\` VARCHAR(64) DEFAULT '',
      \`password\` VARCHAR(255) NOT NULL,
      \`role\` VARCHAR(64) DEFAULT 'VIP Member',
      \`avatar\` TEXT,
      \`wallet_balance\` DECIMAL(10, 2) DEFAULT 25.00,
      \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
  console.log('  - users table ready');

  // User Logins Audit Table
  await db.query(`
    CREATE TABLE IF NOT EXISTS \`user_logins\` (
      \`id\` INT AUTO_INCREMENT PRIMARY KEY,
      \`user_id\` VARCHAR(64) NOT NULL,
      \`user_email\` VARCHAR(255) NOT NULL,
      \`ip_address\` VARCHAR(64) NULL,
      \`user_agent\` TEXT NULL,
      \`login_time\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_user (\`user_id\`),
      INDEX idx_time (\`login_time\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
  console.log('  - user_logins table ready');

  // 2. Orders table
  await db.query(`
    CREATE TABLE IF NOT EXISTS \`orders\` (
      \`id\` INT AUTO_INCREMENT PRIMARY KEY,
      \`ref\` VARCHAR(64) NOT NULL UNIQUE,
      \`user_id\` VARCHAR(64) NULL,
      \`game_id\` VARCHAR(64) NOT NULL,
      \`game_name\` VARCHAR(255) NOT NULL,
      \`package_name\` VARCHAR(255) NOT NULL,
      \`package_id\` VARCHAR(64) NULL,
      \`quantity\` INT DEFAULT 1,
      \`total_usd\` DECIMAL(10, 2) NOT NULL,
      \`total_khr\` VARCHAR(64) NOT NULL,
      \`payment_method\` VARCHAR(128) NOT NULL,
      \`player_id\` VARCHAR(128) NOT NULL,
      \`zone_id\` VARCHAR(64) DEFAULT '',
      \`server_region\` VARCHAR(128) DEFAULT '',
      \`verified_player\` VARCHAR(255) DEFAULT '',
      \`status\` VARCHAR(64) DEFAULT 'DELIVERED',
      \`server_ping\` VARCHAR(32) DEFAULT '18ms',
      \`icon\` TEXT,
      \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_game (\`game_id\`),
      INDEX idx_created (\`created_at\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
  console.log('  - orders table ready');

  // 3. Wallet Transactions table
  await db.query(`
    CREATE TABLE IF NOT EXISTS \`wallet_transactions\` (
      \`id\` VARCHAR(64) PRIMARY KEY,
      \`user_id\` VARCHAR(64) NULL,
      \`type\` VARCHAR(32) NOT NULL,
      \`title\` VARCHAR(255) NOT NULL,
      \`amount\` DECIMAL(10, 2) NOT NULL,
      \`payment_method\` VARCHAR(128) NOT NULL,
      \`status\` VARCHAR(64) DEFAULT 'COMPLETED',
      \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_user (\`user_id\`),
      INDEX idx_created (\`created_at\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
  console.log('  - wallet_transactions table ready');

  // 4. Diamond Stock Table
  await db.query(`
    CREATE TABLE IF NOT EXISTS \`diamond_stock\` (
      \`id\` INT AUTO_INCREMENT PRIMARY KEY,
      \`game_id\` VARCHAR(64) NOT NULL,
      \`game_name\` VARCHAR(255) NOT NULL,
      \`package_id\` VARCHAR(64) NOT NULL UNIQUE,
      \`package_name\` VARCHAR(255) NOT NULL,
      \`currency_type\` VARCHAR(64) DEFAULT 'Diamonds',
      \`diamonds_amount\` INT DEFAULT 0,
      \`stock_quantity\` INT NOT NULL DEFAULT 500,
      \`min_stock_alert\` INT NOT NULL DEFAULT 20,
      \`cost_price\` DECIMAL(10, 2) DEFAULT 0.00,
      \`selling_price\` DECIMAL(10, 2) NOT NULL,
      \`status\` ENUM('IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK') DEFAULT 'IN_STOCK',
      \`supplier\` VARCHAR(128) DEFAULT 'Cheydev Direct Wholesale Stock',
      \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_game (\`game_id\`),
      INDEX idx_status (\`status\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
  console.log('  - diamond_stock table ready');

  // 5. Stock History / Audit Log Table
  await db.query(`
    CREATE TABLE IF NOT EXISTS \`stock_history\` (
      \`id\` INT AUTO_INCREMENT PRIMARY KEY,
      \`package_id\` VARCHAR(64) NOT NULL,
      \`change_type\` ENUM('RESTOCK', 'PURCHASE', 'MANUAL_ADJUST') NOT NULL,
      \`quantity_change\` INT NOT NULL,
      \`remaining_stock\` INT NOT NULL,
      \`order_ref\` VARCHAR(64) NULL,
      \`note\` VARCHAR(255) NULL,
      \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_package (\`package_id\`),
      INDEX idx_created (\`created_at\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
  console.log('  - stock_history table ready');

  // Seed default users if table empty
  const [usersCount] = await db.query('SELECT COUNT(*) as count FROM `users`');
  if (usersCount[0].count === 0) {
    console.log('🌱 Seeding initial demo users...');
    const seedUsers = [
      ['usr_001', 'Chey Gamer', 'gamer@cheydev.com', '+855 12 888 999', 'password123', 'Gold VIP Member', 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=150&auto=format&fit=crop&q=80', 50.00],
      ['usr_002', 'Dara Pro Gamer', 'dara@cheydev.com', '+855 96 777 666', 'password123', 'Platinum Member', 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80', 25.00]
    ];
    for (const u of seedUsers) {
      await db.query(
        'INSERT INTO `users` (id, name, email, phone, password, role, avatar, wallet_balance) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        u
      );
    }
    console.log('  - Seeded 2 users.');
  }

  // Seed Diamond Stock if table empty
  const [stockCount] = await db.query('SELECT COUNT(*) as count FROM `diamond_stock`');
  if (stockCount[0].count === 0) {
    console.log('💎 Seeding initial Diamond Stock inventory...');
    const stockItems = [
      // Mobile Legends (MLBB)
      ['mlbb', 'Mobile Legends KH', 'mlbb_55', '55 Diamonds', 'Diamonds', 55, 1200, 50, 0.70, 0.93, 'IN_STOCK', 'Moonton Direct API Gateway'],
      ['mlbb', 'Mobile Legends KH', 'mlbb_weekly', 'Weekly Diamond Pass', 'Pass', 210, 2500, 100, 1.40, 1.81, 'IN_STOCK', 'Moonton Direct API Gateway'],
      ['mlbb', 'Mobile Legends KH', 'mlbb_86', '86 Diamonds', 'Diamonds', 86, 1800, 50, 1.15, 1.48, 'IN_STOCK', 'Moonton Direct API Gateway'],
      ['mlbb', 'Mobile Legends KH', 'mlbb_172', '172 Diamonds', 'Diamonds', 172, 1100, 40, 2.30, 2.92, 'IN_STOCK', 'Moonton Direct API Gateway'],
      ['mlbb', 'Mobile Legends KH', 'mlbb_257', '257 Diamonds', 'Diamonds', 257, 1500, 40, 3.35, 4.18, 'IN_STOCK', 'Moonton Direct API Gateway'],
      ['mlbb', 'Mobile Legends KH', 'mlbb_343', '343 Diamonds', 'Diamonds', 343, 900, 30, 4.50, 5.65, 'IN_STOCK', 'Moonton Direct API Gateway'],
      ['mlbb', 'Mobile Legends KH', 'mlbb_514', '514 Diamonds', 'Diamonds', 514, 750, 25, 6.70, 8.36, 'IN_STOCK', 'Moonton Direct API Gateway'],
      ['mlbb', 'Mobile Legends KH', 'mlbb_706', '706 Diamonds', 'Diamonds', 706, 850, 25, 9.00, 11.20, 'IN_STOCK', 'Moonton Direct API Gateway'],
      ['mlbb', 'Mobile Legends KH', 'mlbb_2195', '2,195 Diamonds', 'Diamonds', 2195, 400, 15, 28.00, 34.50, 'IN_STOCK', 'Moonton Direct API Gateway'],
      ['mlbb', 'Mobile Legends KH', 'mlbb_twilight', 'Twilight Pass', 'Pass', 0, 600, 20, 7.90, 9.80, 'IN_STOCK', 'Moonton Direct API Gateway'],

      // Free Fire
      ['freefire', 'Free Fire', 'ff_100', '100 Diamonds', 'Diamonds', 100, 2000, 50, 0.75, 0.95, 'IN_STOCK', 'Garena Direct Stock'],
      ['freefire', 'Free Fire', 'ff_weekly', 'Weekly Membership', 'Membership', 450, 1500, 40, 1.50, 1.90, 'IN_STOCK', 'Garena Direct Stock'],
      ['freefire', 'Free Fire', 'ff_310', '310 Diamonds', 'Diamonds', 310, 1200, 35, 2.25, 2.85, 'IN_STOCK', 'Garena Direct Stock'],
      ['freefire', 'Free Fire', 'ff_520', '520 Diamonds', 'Diamonds', 520, 1400, 35, 3.70, 4.65, 'IN_STOCK', 'Garena Direct Stock'],
      ['freefire', 'Free Fire', 'ff_monthly', 'Monthly Membership', 'Membership', 2600, 800, 20, 6.10, 7.60, 'IN_STOCK', 'Garena Direct Stock'],
      ['freefire', 'Free Fire', 'ff_1060', '1,060 Diamonds', 'Diamonds', 1060, 600, 20, 7.40, 9.20, 'IN_STOCK', 'Garena Direct Stock'],
      ['freefire', 'Free Fire', 'ff_2180', '2,180 Diamonds', 'Diamonds', 2180, 350, 15, 14.80, 18.50, 'IN_STOCK', 'Garena Direct Stock'],

      // PUBG Mobile
      ['pubgm', 'PUBG Mobile', 'pubg_60', '60 UC', 'UC', 60, 2500, 60, 0.75, 0.95, 'IN_STOCK', 'Midasbuy Level Infinite Gateway'],
      ['pubgm', 'PUBG Mobile', 'pubg_300', '325 UC (300+25)', 'UC', 325, 1600, 50, 3.80, 4.75, 'IN_STOCK', 'Midasbuy Level Infinite Gateway'],
      ['pubgm', 'PUBG Mobile', 'pubg_600', '660 UC (600+60)', 'UC', 660, 2100, 50, 7.50, 9.40, 'IN_STOCK', 'Midasbuy Level Infinite Gateway'],
      ['pubgm', 'PUBG Mobile', 'pubg_1500', '1,800 UC (1500+300)', 'UC', 1800, 500, 20, 19.00, 23.50, 'IN_STOCK', 'Midasbuy Level Infinite Gateway'],

      // Genshin Impact
      ['genshin', 'Genshin Impact', 'genshin_welkin', 'Blessing of Welkin Moon', 'Pass', 3000, 1000, 30, 3.85, 4.80, 'IN_STOCK', 'HoYoverse Direct Stock'],
      ['genshin', 'Genshin Impact', 'genshin_60', '60 Genesis Crystals', 'Crystals', 60, 1500, 50, 0.78, 0.98, 'IN_STOCK', 'HoYoverse Direct Stock'],
      ['genshin', 'Genshin Impact', 'genshin_300', '300+30 Genesis Crystals', 'Crystals', 330, 900, 30, 3.90, 4.85, 'IN_STOCK', 'HoYoverse Direct Stock'],
      ['genshin', 'Genshin Impact', 'genshin_980', '980+110 Genesis Crystals', 'Crystals', 1090, 600, 20, 12.50, 15.50, 'IN_STOCK', 'HoYoverse Direct Stock'],

      // Honor of Kings
      ['hok', 'Honor of Kings', 'hok_80', '80 Tokens', 'Tokens', 80, 1800, 50, 0.80, 1.00, 'IN_STOCK', 'Tencent Direct Stock'],
      ['hok', 'Honor of Kings', 'hok_240', '240+10 Tokens', 'Tokens', 250, 1100, 30, 2.40, 2.99, 'IN_STOCK', 'Tencent Direct Stock'],
      ['hok', 'Honor of Kings', 'hok_weekly', 'Weekly Card Plus', 'Card', 0, 1300, 40, 2.10, 2.69, 'IN_STOCK', 'Tencent Direct Stock'],

      // Valorant
      ['valorant', 'Valorant', 'val_475', '475 VP', 'VP', 475, 1200, 40, 3.95, 4.95, 'IN_STOCK', 'Riot Games Direct Stock'],
      ['valorant', 'Valorant', 'val_1000', '1,000 VP', 'VP', 1000, 950, 30, 8.00, 9.95, 'IN_STOCK', 'Riot Games Direct Stock']
    ];

    for (const item of stockItems) {
      await db.query(
        `INSERT INTO \`diamond_stock\`
         (game_id, game_name, package_id, package_name, currency_type, diamonds_amount, stock_quantity, min_stock_alert, cost_price, selling_price, status, supplier)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE stock_quantity = VALUES(stock_quantity), selling_price = VALUES(selling_price)`,
        item
      );
    }
    console.log(`  - Seeded ${stockItems.length} diamond stock items.`);
  }

  await db.end();
  console.log('🎉 Database initialization with Diamond Stock completed successfully!');
}

initDatabase().catch(err => {
  console.error('❌ Error during database initialization:', err);
  process.exit(1);
});

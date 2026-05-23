const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host:               process.env.DB_HOST     || '127.0.0.1',
  port:               parseInt(process.env.DB_PORT || '3306'),
  user:               process.env.DB_USER     || 'root',
  password:           process.env.DB_PASSWORD || '',
  database:           process.env.DB_NAME     || 'agri_db',
  charset:            'utf8mb4',
  timezone:           '+08:00',
  connectionLimit:    parseInt(process.env.DB_POOL_MAX || '10'),
  waitForConnections: true,
  queueLimit:         0,
  enableKeepAlive:    true,
  keepAliveInitialDelay: 10000,
});

// 启动时验证连接
pool.getConnection()
  .then(conn => {
    console.log('✅ MySQL 连接成功');
    conn.release();
  })
  .catch(err => {
    console.error('❌ MySQL 连接失败:', err.message);
    process.exit(1);
  });

module.exports = pool;

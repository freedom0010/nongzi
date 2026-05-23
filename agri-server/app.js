require('dotenv').config();
const express      = require('express');
const cors         = require('cors');
const helmet       = require('helmet');
const morgan       = require('morgan');
const compression  = require('compression');
const rateLimit    = require('express-rate-limit');
const routes       = require('./routes/index');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── 安全头 ────────────────────────────────────────────────
app.use(helmet());

// ── 跨域 ─────────────────────────────────────────────────
const allowedOrigins = (process.env.CORS_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
app.use(cors({
  origin: (origin, cb) => {
    // 无 origin（如 Postman/curl）或在白名单内均允许
    if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      cb(null, true);
    } else {
      cb(new Error(`CORS blocked: ${origin}`));
    }
  },
  credentials: true,
}));

// ── 压缩 + 解析 ───────────────────────────────────────────
app.use(compression());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// ── 日志 ─────────────────────────────────────────────────
app.use(morgan(process.env.LOG_FORMAT || 'dev'));

// ── 限流（防暴力破解） ─────────────────────────────────────
app.use('/api/auth/login', rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 20,
  message: { code: 429, message: '请求过于频繁，请15分钟后再试' },
}));

// 全局 API 限流
app.use('/api', rateLimit({
  windowMs: 60 * 1000, // 1分钟
  max: 300,
  message: { code: 429, message: '请求过于频繁' },
}));

// ── 路由 ─────────────────────────────────────────────────
app.use('/api', routes);

// ── 健康检查 ──────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString(), env: process.env.NODE_ENV });
});

// ── 404 ───────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ code: 404, message: `接口不存在: ${req.method} ${req.path}` });
});

// ── 全局错误处理 ──────────────────────────────────────────
app.use((err, req, res, _next) => {
  console.error('[UnhandledError]', err);
  res.status(500).json({ code: 500, message: process.env.NODE_ENV === 'development' ? err.message : '服务器错误' });
});

// ── 启动 ─────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 农资管理系统 API 启动成功`);
  console.log(`   端口: ${PORT}`);
  console.log(`   环境: ${process.env.NODE_ENV || 'development'}`);
  console.log(`   健康检查: http://localhost:${PORT}/health`);
});

module.exports = app;

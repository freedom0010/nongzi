const jwt = require('jsonwebtoken');

/**
 * 验证 JWT，解析后挂到 req.user
 */
function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ code: 401, message: '未登录，请先获取 token' });
  }

  const token = authHeader.slice(7);
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ code: 401, message: 'token 已过期，请重新登录' });
    }
    return res.status(401).json({ code: 401, message: 'token 无效' });
  }
}

/**
 * 仅管理员可访问
 */
function adminOnly(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ code: 403, message: '权限不足，仅管理员可操作' });
  }
  next();
}

module.exports = { authMiddleware, adminOnly };

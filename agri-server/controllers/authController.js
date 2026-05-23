const bcrypt  = require('bcrypt');
const jwt     = require('jsonwebtoken');
const db      = require('../config/db');
const { success, fail, serverError } = require('../utils/response');

/**
 * POST /api/auth/login
 * body: { username, password }
 */
async function login(req, res) {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return fail(res, '账号和密码不能为空');
    }

    const [rows] = await db.query(
      'SELECT id, username, password, real_name, role, is_active FROM users WHERE username = ? LIMIT 1',
      [username]
    );

    if (rows.length === 0) return fail(res, '账号或密码错误', 401);

    const user = rows[0];
    if (!user.is_active)  return fail(res, '账号已被禁用', 403);

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return fail(res, '账号或密码错误', 401);

    const token = jwt.sign(
      { id: user.id, username: user.username, real_name: user.real_name, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    return success(res, {
      token,
      user: { id: user.id, username: user.username, real_name: user.real_name, role: user.role }
    }, '登录成功');
  } catch (err) {
    return serverError(res, err);
  }
}

/**
 * GET /api/auth/me
 */
async function getMe(req, res) {
  try {
    const [rows] = await db.query(
      'SELECT id, username, real_name, role, phone, created_at FROM users WHERE id = ?',
      [req.user.id]
    );
    if (rows.length === 0) return fail(res, '用户不存在', 404);
    return success(res, rows[0]);
  } catch (err) {
    return serverError(res, err);
  }
}

/**
 * PUT /api/auth/password
 * body: { old_password, new_password }
 */
async function changePassword(req, res) {
  try {
    const { old_password, new_password } = req.body;
    if (!old_password || !new_password) return fail(res, '参数不完整');
    if (new_password.length < 6)         return fail(res, '新密码至少6位');

    const [rows] = await db.query('SELECT password FROM users WHERE id = ?', [req.user.id]);
    if (rows.length === 0) return fail(res, '用户不存在', 404);

    const valid = await bcrypt.compare(old_password, rows[0].password);
    if (!valid) return fail(res, '旧密码不正确');

    const hash = await bcrypt.hash(new_password, 10);
    await db.query('UPDATE users SET password = ? WHERE id = ?', [hash, req.user.id]);

    return success(res, null, '密码修改成功');
  } catch (err) {
    return serverError(res, err);
  }
}

module.exports = { login, getMe, changePassword };

// controllers/userController.js
const bcrypt = require('bcrypt')
const db     = require('../config/db')
const { success, paginated, fail, serverError, parsePaging } = require('../utils/response')

/**
 * GET /api/users
 * 员工列表（仅管理员）
 */
async function list(req, res) {
  try {
    const { page, pageSize, offset } = parsePaging(req.query)
    const { keyword } = req.query

    let where = []
    const params = []
    if (keyword) {
      where.push('(username LIKE ? OR real_name LIKE ? OR phone LIKE ?)')
      params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`)
    }
    const whereSQL = where.length ? 'WHERE ' + where.join(' AND ') : ''

    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total FROM users ${whereSQL}`, params
    )
    const [rows] = await db.query(
      `SELECT id, username, real_name, role, phone, is_active, created_at
       FROM users ${whereSQL}
       ORDER BY id ASC LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    )

    return paginated(res, rows, total, page, pageSize)
  } catch (err) { return serverError(res, err) }
}

/**
 * POST /api/users
 * 新增员工（仅管理员）
 */
async function create(req, res) {
  try {
    const { username, password, real_name, role, phone } = req.body
    if (!username || !password || !real_name) return fail(res, '账号、密码、姓名必填')
    if (password.length < 6)                  return fail(res, '密码至少6位')
    if (!['admin','staff'].includes(role))     return fail(res, 'role 只能是 admin 或 staff')

    // 检查账号唯一
    const [[exist]] = await db.query('SELECT id FROM users WHERE username=?', [username])
    if (exist) return fail(res, '该账号已存在')

    const hash = await bcrypt.hash(password, 10)
    const [r]  = await db.query(
      'INSERT INTO users (username,password,real_name,role,phone) VALUES (?,?,?,?,?)',
      [username, hash, real_name, role || 'staff', phone || null]
    )
    return success(res, { id: r.insertId }, '员工创建成功')
  } catch (err) { return serverError(res, err) }
}

/**
 * PUT /api/users/:id
 * 修改员工基础信息（仅管理员；不可修改自己的角色）
 */
async function update(req, res) {
  try {
    const targetId = parseInt(req.params.id)
    const { real_name, role, phone } = req.body

    if (!real_name) return fail(res, '姓名必填')
    if (role && !['admin','staff'].includes(role)) return fail(res, 'role 非法')

    // 不允许降级自己
    if (targetId === req.user.id && role && role !== req.user.role) {
      return fail(res, '不能修改自己的角色')
    }

    const [r] = await db.query(
      'UPDATE users SET real_name=?, role=?, phone=? WHERE id=?',
      [real_name, role || 'staff', phone || null, targetId]
    )
    if (r.affectedRows === 0) return fail(res, '用户不存在')
    return success(res, null, '更新成功')
  } catch (err) { return serverError(res, err) }
}

/**
 * PUT /api/users/:id/status
 * 启用/禁用员工（不可禁用自己）
 */
async function setStatus(req, res) {
  try {
    const targetId  = parseInt(req.params.id)
    const { active } = req.body  // true / false

    if (targetId === req.user.id) return fail(res, '不能禁用自己的账号')

    await db.query('UPDATE users SET is_active=? WHERE id=?', [active ? 1 : 0, targetId])
    return success(res, null, active ? '已启用' : '已禁用')
  } catch (err) { return serverError(res, err) }
}

/**
 * PUT /api/users/:id/reset-password
 * 管理员重置员工密码
 */
async function resetPassword(req, res) {
  try {
    const { new_password } = req.body
    if (!new_password || new_password.length < 6) return fail(res, '新密码至少6位')

    const hash = await bcrypt.hash(new_password, 10)
    const [r]  = await db.query('UPDATE users SET password=? WHERE id=?', [hash, req.params.id])
    if (r.affectedRows === 0) return fail(res, '用户不存在')
    return success(res, null, '密码已重置')
  } catch (err) { return serverError(res, err) }
}

/**
 * DELETE /api/users/:id
 * 删除员工（不可删除自己；不可删除最后一个管理员）
 */
async function remove(req, res) {
  try {
    const targetId = parseInt(req.params.id)
    if (targetId === req.user.id) return fail(res, '不能删除自己')

    // 检查是否最后一个管理员
    const [[target]]  = await db.query('SELECT role FROM users WHERE id=?', [targetId])
    if (!target)      return fail(res, '用户不存在')
    if (target.role === 'admin') {
      const [[{ cnt }]] = await db.query("SELECT COUNT(*) AS cnt FROM users WHERE role='admin' AND is_active=1")
      if (cnt <= 1) return fail(res, '不能删除最后一个管理员')
    }

    await db.query('DELETE FROM users WHERE id=?', [targetId])
    return success(res, null, '已删除')
  } catch (err) { return serverError(res, err) }
}

/**
 * GET /api/users/permissions
 * 获取当前用户权限清单
 */
async function getPermissions(req, res) {
  const isAdmin = req.user.role === 'admin'
  return success(res, {
    role:        req.user.role,
    permissions: {
      // 商品
      product_view:   true,
      product_create: true,
      product_edit:   true,
      product_delete: isAdmin,
      // 出入库
      stock_in:       true,
      stock_out:      true,
      // 记录
      record_view:    true,
      record_export:  isAdmin,
      // 供应商
      supplier_view:  true,
      supplier_edit:  isAdmin,
      // 分类
      category_edit:  isAdmin,
      // 用户管理
      user_manage:    isAdmin,
      // 报表
      report_view:    isAdmin,
    }
  })
}

module.exports = { list, create, update, setStatus, resetPassword, remove, getPermissions }

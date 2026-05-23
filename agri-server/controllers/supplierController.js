const db = require('../config/db');
const { success, fail, serverError } = require('../utils/response');

// ============================================================
// 供应商
// ============================================================

async function listSuppliers(req, res) {
  try {
    const [rows] = await db.query(
      'SELECT * FROM suppliers WHERE is_active=1 ORDER BY name ASC'
    );
    return success(res, rows);
  } catch (err) { return serverError(res, err); }
}

async function createSupplier(req, res) {
  try {
    const { name, contact, phone, address, remark } = req.body;
    if (!name) return fail(res, '供应商名称必填');
    const [r] = await db.query(
      'INSERT INTO suppliers (name,contact,phone,address,remark) VALUES (?,?,?,?,?)',
      [name, contact||null, phone||null, address||null, remark||null]
    );
    return success(res, { id: r.insertId }, '创建成功');
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return fail(res, '供应商名称已存在');
    return serverError(res, err);
  }
}

async function updateSupplier(req, res) {
  try {
    const { name, contact, phone, address, remark } = req.body;
    const [r] = await db.query(
      'UPDATE suppliers SET name=?,contact=?,phone=?,address=?,remark=? WHERE id=? AND is_active=1',
      [name, contact||null, phone||null, address||null, remark||null, req.params.id]
    );
    if (r.affectedRows === 0) return fail(res, '供应商不存在');
    return success(res, null, '更新成功');
  } catch (err) { return serverError(res, err); }
}

async function deleteSupplier(req, res) {
  try {
    await db.query('UPDATE suppliers SET is_active=0 WHERE id=?', [req.params.id]);
    return success(res, null, '删除成功');
  } catch (err) { return serverError(res, err); }
}

// ============================================================
// 分类
// ============================================================

async function listCategories(req, res) {
  try {
    const [rows] = await db.query('SELECT * FROM categories ORDER BY sort_order ASC');
    return success(res, rows);
  } catch (err) { return serverError(res, err); }
}

async function createCategory(req, res) {
  try {
    const { name, sort_order } = req.body;
    if (!name) return fail(res, '分类名称必填');
    const [r] = await db.query(
      'INSERT INTO categories (name,sort_order) VALUES (?,?)',
      [name, sort_order || 0]
    );
    return success(res, { id: r.insertId }, '创建成功');
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return fail(res, '分类名称已存在');
    return serverError(res, err);
  }
}

async function deleteCategory(req, res) {
  try {
    // 检查是否有商品使用该分类
    const [[{ cnt }]] = await db.query(
      'SELECT COUNT(*) AS cnt FROM products WHERE category_id=? AND is_active=1',
      [req.params.id]
    );
    if (cnt > 0) return fail(res, `该分类下还有 ${cnt} 个商品，无法删除`);
    await db.query('DELETE FROM categories WHERE id=?', [req.params.id]);
    return success(res, null, '删除成功');
  } catch (err) { return serverError(res, err); }
}

module.exports = {
  listSuppliers, createSupplier, updateSupplier, deleteSupplier,
  listCategories, createCategory, deleteCategory
};

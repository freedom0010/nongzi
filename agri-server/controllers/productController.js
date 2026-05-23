const db = require('../config/db');
const { success, paginated, fail, serverError, parsePaging } = require('../utils/response');

/**
 * GET /api/products
 * query: page, pageSize, keyword, category_id, warn_only
 */
async function list(req, res) {
  try {
    const { page, pageSize, offset } = parsePaging(req.query);
    const { keyword, category_id, warn_only } = req.query;

    let where = ['p.is_active = 1'];
    const params = [];

    if (keyword) {
      where.push('(p.name LIKE ? OR p.barcode LIKE ? OR p.spec LIKE ?)');
      params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
    }
    if (category_id) {
      where.push('p.category_id = ?');
      params.push(category_id);
    }
    if (warn_only === '1') {
      where.push('p.stock <= p.warn_stock');
    }

    const whereSQL = where.length ? 'WHERE ' + where.join(' AND ') : '';

    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total FROM products p ${whereSQL}`, params
    );

    const [rows] = await db.query(
      `SELECT p.id, p.barcode, p.name, p.spec, p.unit,
              p.cost_price, p.sale_price, p.stock, p.warn_stock,
              p.expire_date, p.remark,
              c.id AS category_id, c.name AS category_name,
              s.id AS supplier_id, s.name AS supplier_name,
              p.created_at, p.updated_at
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       LEFT JOIN suppliers  s ON p.supplier_id  = s.id
       ${whereSQL}
       ORDER BY p.id DESC
       LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );

    return paginated(res, rows, total, page, pageSize);
  } catch (err) {
    return serverError(res, err);
  }
}

/**
 * GET /api/products/barcode/:barcode
 * 扫码查询（核心接口）
 */
async function getByBarcode(req, res) {
  try {
    const { barcode } = req.params;
    const [rows] = await db.query(
      `SELECT p.*, c.name AS category_name, s.name AS supplier_name
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       LEFT JOIN suppliers  s ON p.supplier_id  = s.id
       WHERE p.barcode = ? AND p.is_active = 1 LIMIT 1`,
      [barcode]
    );
    if (rows.length === 0) return fail(res, '商品不存在', 404);
    return success(res, rows[0]);
  } catch (err) {
    return serverError(res, err);
  }
}

/**
 * GET /api/products/:id
 */
async function getOne(req, res) {
  try {
    const [rows] = await db.query(
      `SELECT p.*, c.name AS category_name, s.name AS supplier_name
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       LEFT JOIN suppliers  s ON p.supplier_id  = s.id
       WHERE p.id = ? AND p.is_active = 1 LIMIT 1`,
      [req.params.id]
    );
    if (rows.length === 0) return fail(res, '商品不存在', 404);
    return success(res, rows[0]);
  } catch (err) {
    return serverError(res, err);
  }
}

/**
 * POST /api/products
 */
async function create(req, res) {
  try {
    const { barcode, name, category_id, spec, unit, cost_price,
            sale_price, stock, warn_stock, supplier_id, expire_date, remark } = req.body;

    if (!barcode || !name) return fail(res, '条码和商品名称必填');

    // 检查条码唯一
    const [[exist]] = await db.query('SELECT id FROM products WHERE barcode = ?', [barcode]);
    if (exist) return fail(res, '该条码已存在');

    const [result] = await db.query(
      `INSERT INTO products
         (barcode, name, category_id, spec, unit, cost_price, sale_price,
          stock, warn_stock, supplier_id, expire_date, remark)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [barcode, name, category_id || null, spec || null, unit || '件',
       cost_price || 0, sale_price || 0, stock || 0, warn_stock || 10,
       supplier_id || null, expire_date || null, remark || null]
    );

    return success(res, { id: result.insertId }, '商品创建成功');
  } catch (err) {
    return serverError(res, err);
  }
}

/**
 * PUT /api/products/:id
 */
async function update(req, res) {
  try {
    const { name, category_id, spec, unit, cost_price, sale_price,
            warn_stock, supplier_id, expire_date, remark } = req.body;

    if (!name) return fail(res, '商品名称必填');

    const [result] = await db.query(
      `UPDATE products SET
         name=?, category_id=?, spec=?, unit=?, cost_price=?,
         sale_price=?, warn_stock=?, supplier_id=?, expire_date=?, remark=?
       WHERE id=? AND is_active=1`,
      [name, category_id || null, spec || null, unit || '件',
       cost_price || 0, sale_price || 0, warn_stock || 10,
       supplier_id || null, expire_date || null, remark || null,
       req.params.id]
    );

    if (result.affectedRows === 0) return fail(res, '商品不存在');
    return success(res, null, '更新成功');
  } catch (err) {
    return serverError(res, err);
  }
}

/**
 * DELETE /api/products/:id  (软删除)
 */
async function remove(req, res) {
  try {
    const [result] = await db.query(
      'UPDATE products SET is_active=0 WHERE id=? AND is_active=1',
      [req.params.id]
    );
    if (result.affectedRows === 0) return fail(res, '商品不存在');
    return success(res, null, '删除成功');
  } catch (err) {
    return serverError(res, err);
  }
}

/**
 * GET /api/products/warn/list  库存预警列表
 */
async function warnList(req, res) {
  try {
    const [rows] = await db.query('SELECT * FROM v_stock_warn');
    return success(res, rows);
  } catch (err) {
    return serverError(res, err);
  }
}

module.exports = { list, getByBarcode, getOne, create, update, remove, warnList };

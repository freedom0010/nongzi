const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');
const { success, paginated, fail, serverError, parsePaging } = require('../utils/response');

/**
 * POST /api/stock/in
 * 单条入库
 * body: { barcode, qty, unit_price, supplier, remark }
 */
async function stockIn(req, res) {
  const conn = await db.getConnection();
  try {
    const { barcode, qty, unit_price, supplier, remark } = req.body;
    if (!barcode)       return fail(res, '条码不能为空');
    if (!qty || qty < 1) return fail(res, '数量必须大于0');

    await conn.beginTransaction();

    // 查商品（加行锁）
    const [[product]] = await conn.query(
      'SELECT id, name, stock FROM products WHERE barcode=? AND is_active=1 FOR UPDATE',
      [barcode]
    );
    if (!product) { await conn.rollback(); return fail(res, '商品不存在，请先录入', 404); }

    const before = product.stock;
    const after  = before + Number(qty);
    const amount = unit_price ? (unit_price * qty) : null;

    // 更新库存
    await conn.query('UPDATE products SET stock=? WHERE id=?', [after, product.id]);

    // 写流水
    await conn.query(
      `INSERT INTO stock_records
         (type, product_id, barcode, product_name, qty, unit_price, total_amount,
          before_stock, after_stock, operator_id, operator_name, supplier, remark)
       VALUES ('in',?,?,?,?,?,?,?,?,?,?,?,?)`,
      [product.id, barcode, product.name, qty,
       unit_price || null, amount,
       before, after,
       req.user.id, req.user.real_name,
       supplier || null, remark || null]
    );

    await conn.commit();
    return success(res, { product_name: product.name, before_stock: before, after_stock: after }, '入库成功');
  } catch (err) {
    await conn.rollback();
    return serverError(res, err);
  } finally {
    conn.release();
  }
}

/**
 * POST /api/stock/out
 * 单条出库
 * body: { barcode, qty, unit_price, customer, remark }
 */
async function stockOut(req, res) {
  const conn = await db.getConnection();
  try {
    const { barcode, qty, unit_price, customer, remark } = req.body;
    if (!barcode)        return fail(res, '条码不能为空');
    if (!qty || qty < 1) return fail(res, '数量必须大于0');

    await conn.beginTransaction();

    const [[product]] = await conn.query(
      'SELECT id, name, stock FROM products WHERE barcode=? AND is_active=1 FOR UPDATE',
      [barcode]
    );
    if (!product) { await conn.rollback(); return fail(res, '商品不存在', 404); }
    if (product.stock < qty) {
      await conn.rollback();
      return fail(res, `库存不足，当前库存 ${product.stock} ${req.body.unit || '件'}`);
    }

    const before = product.stock;
    const after  = before - Number(qty);
    const amount = unit_price ? (unit_price * qty) : null;

    await conn.query('UPDATE products SET stock=? WHERE id=?', [after, product.id]);
    await conn.query(
      `INSERT INTO stock_records
         (type, product_id, barcode, product_name, qty, unit_price, total_amount,
          before_stock, after_stock, operator_id, operator_name, customer, remark)
       VALUES ('out',?,?,?,?,?,?,?,?,?,?,?,?)`,
      [product.id, barcode, product.name, qty,
       unit_price || null, amount,
       before, after,
       req.user.id, req.user.real_name,
       customer || null, remark || null]
    );

    await conn.commit();
    return success(res, { product_name: product.name, before_stock: before, after_stock: after }, '出库成功');
  } catch (err) {
    await conn.rollback();
    return serverError(res, err);
  } finally {
    conn.release();
  }
}

/**
 * POST /api/stock/batch
 * 批量入库或出库（扫码枪连续扫完后一次提交）
 * body: {
 *   type: 'in' | 'out',
 *   items: [{ barcode, qty, unit_price, remark }],
 *   customer, supplier   // 整批共用
 * }
 */
async function batchStock(req, res) {
  const conn = await db.getConnection();
  try {
    const { type, items, customer, supplier } = req.body;
    if (!['in','out'].includes(type))      return fail(res, 'type 必须是 in 或 out');
    if (!Array.isArray(items) || items.length === 0) return fail(res, 'items 不能为空');

    await conn.beginTransaction();

    const batchNo  = uuidv4().replace(/-/g,'').slice(0,16).toUpperCase();
    const results  = [];
    const failures = [];

    for (const item of items) {
      const { barcode, qty, unit_price, remark } = item;
      if (!barcode || !qty || qty < 1) { failures.push({ barcode, reason: '参数错误' }); continue; }

      const [[product]] = await conn.query(
        'SELECT id, name, stock FROM products WHERE barcode=? AND is_active=1 FOR UPDATE',
        [barcode]
      );
      if (!product) { failures.push({ barcode, reason: '商品不存在' }); continue; }

      if (type === 'out' && product.stock < qty) {
        failures.push({ barcode, product_name: product.name, reason: `库存不足(${product.stock})` });
        continue;
      }

      const before = product.stock;
      const after  = type === 'in' ? before + Number(qty) : before - Number(qty);
      const amount = unit_price ? (unit_price * qty) : null;

      await conn.query('UPDATE products SET stock=? WHERE id=?', [after, product.id]);
      await conn.query(
        `INSERT INTO stock_records
           (type, product_id, barcode, product_name, qty, unit_price, total_amount,
            before_stock, after_stock, operator_id, operator_name,
            batch_no, customer, supplier, remark)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [type, product.id, barcode, product.name, qty,
         unit_price || null, amount,
         before, after,
         req.user.id, req.user.real_name,
         batchNo,
         customer || null, supplier || null, remark || null]
      );

      results.push({ barcode, product_name: product.name, qty, before_stock: before, after_stock: after });
    }

    await conn.commit();
    return success(res, { batch_no: batchNo, success: results, failed: failures },
      `批量${type==='in'?'入':'出'}库完成，成功${results.length}条，失败${failures.length}条`);
  } catch (err) {
    await conn.rollback();
    return serverError(res, err);
  } finally {
    conn.release();
  }
}

/**
 * GET /api/stock/records
 * 流水查询
 * query: page, pageSize, type, keyword, start_date, end_date, operator_id
 */
async function records(req, res) {
  try {
    const { page, pageSize, offset } = parsePaging(req.query);
    const { type, keyword, start_date, end_date, operator_id, batch_no } = req.query;

    let where = [];
    const params = [];

    if (type && ['in','out'].includes(type)) {
      where.push('r.type = ?'); params.push(type);
    }
    if (keyword) {
      where.push('(r.product_name LIKE ? OR r.barcode LIKE ? OR r.customer LIKE ? OR r.supplier LIKE ?)');
      params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
    }
    if (start_date) { where.push('DATE(r.created_at) >= ?'); params.push(start_date); }
    if (end_date)   { where.push('DATE(r.created_at) <= ?'); params.push(end_date);   }
    if (operator_id){ where.push('r.operator_id = ?');       params.push(operator_id);}
    if (batch_no)   { where.push('r.batch_no = ?');          params.push(batch_no);   }

    const whereSQL = where.length ? 'WHERE ' + where.join(' AND ') : '';

    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total FROM stock_records r ${whereSQL}`, params
    );
    const [rows] = await db.query(
      `SELECT r.id, r.type, r.barcode, r.product_name, r.qty,
              r.unit_price, r.total_amount,
              r.before_stock, r.after_stock,
              r.operator_name, r.batch_no,
              r.customer, r.supplier, r.remark,
              r.created_at
       FROM stock_records r
       ${whereSQL}
       ORDER BY r.id DESC
       LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );

    return paginated(res, rows, total, page, pageSize);
  } catch (err) {
    return serverError(res, err);
  }
}

/**
 * GET /api/stock/stats
 * 今日/本月统计
 */
async function stats(req, res) {
  try {
    const [[today]]  = await db.query('SELECT * FROM v_today_stat');
    const [[month]]  = await db.query(`
      SELECT
        SUM(CASE WHEN type='in'  THEN qty ELSE 0 END) AS month_in_qty,
        SUM(CASE WHEN type='out' THEN qty ELSE 0 END) AS month_out_qty,
        SUM(CASE WHEN type='in'  THEN IFNULL(total_amount,0) ELSE 0 END) AS month_in_amount,
        SUM(CASE WHEN type='out' THEN IFNULL(total_amount,0) ELSE 0 END) AS month_out_amount
      FROM stock_records
      WHERE YEAR(created_at)=YEAR(NOW()) AND MONTH(created_at)=MONTH(NOW())
    `);
    const [[warnCnt]] = await db.query(
      'SELECT COUNT(*) AS cnt FROM products WHERE stock<=warn_stock AND is_active=1'
    );
    const [[totalProducts]] = await db.query(
      'SELECT COUNT(*) AS cnt FROM products WHERE is_active=1'
    );

    return success(res, { today, month, warn_count: warnCnt.cnt, total_products: totalProducts.cnt });
  } catch (err) {
    return serverError(res, err);
  }
}

module.exports = { stockIn, stockOut, batchStock, records, stats };

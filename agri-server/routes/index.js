const express = require('express');
const router  = express.Router();
const { authMiddleware, adminOnly } = require('../middleware/auth');

const authCtrl     = require('../controllers/authController');
const productCtrl  = require('../controllers/productController');
const stockCtrl    = require('../controllers/stockController');
const supplierCtrl = require('../controllers/supplierController');

// ============================================================
// 公开接口（无需登录）
// ============================================================
router.post('/auth/login', authCtrl.login);

// ============================================================
// 以下全部需要登录
// ============================================================
router.use(authMiddleware);

// 用户自身
router.get ('/auth/me',           authCtrl.getMe);
router.put ('/auth/password',     authCtrl.changePassword);

// ── 商品 ──────────────────────────────────────────────────
router.get ('/products',                productCtrl.list);
router.get ('/products/warn/list',      productCtrl.warnList);
router.get ('/products/barcode/:barcode', productCtrl.getByBarcode); // 扫码查询
router.get ('/products/:id',            productCtrl.getOne);
router.post('/products',                productCtrl.create);
router.put ('/products/:id',            productCtrl.update);
router.delete('/products/:id', adminOnly, productCtrl.remove);

// ── 出入库 ────────────────────────────────────────────────
router.post('/stock/in',       stockCtrl.stockIn);
router.post('/stock/out',      stockCtrl.stockOut);
router.post('/stock/batch',    stockCtrl.batchStock);   // 批量扫码提交
router.get ('/stock/records',  stockCtrl.records);
router.get ('/stock/stats',    stockCtrl.stats);

// ── 供应商 ────────────────────────────────────────────────
router.get   ('/suppliers',     supplierCtrl.listSuppliers);
router.post  ('/suppliers',     supplierCtrl.createSupplier);
router.put   ('/suppliers/:id', supplierCtrl.updateSupplier);
router.delete('/suppliers/:id', adminOnly, supplierCtrl.deleteSupplier);

// ── 分类 ─────────────────────────────────────────────────
router.get   ('/categories',     supplierCtrl.listCategories);
router.post  ('/categories',     adminOnly, supplierCtrl.createCategory);
router.delete('/categories/:id', adminOnly, supplierCtrl.deleteCategory);

// ── 用户/员工管理 ─────────────────────────────────────────
const userCtrl = require('../controllers/userController')
router.get ('/users/permissions',                   userCtrl.getPermissions)  // 必须在 /:id 前
router.get ('/users',                    adminOnly, userCtrl.list)
router.post('/users',                    adminOnly, userCtrl.create)
router.put ('/users/:id',                adminOnly, userCtrl.update)
router.put ('/users/:id/status',         adminOnly, userCtrl.setStatus)
router.put ('/users/:id/reset-password', adminOnly, userCtrl.resetPassword)
router.delete('/users/:id',              adminOnly, userCtrl.remove)

module.exports = router;

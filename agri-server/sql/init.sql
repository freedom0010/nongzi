-- ============================================================
-- 农资管理系统 数据库初始化脚本
-- MySQL 8.0+
-- ============================================================

CREATE DATABASE IF NOT EXISTS agri_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE agri_db;

-- ============================================================
-- 用户表
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  username    VARCHAR(50)  NOT NULL UNIQUE COMMENT '登录账号',
  password    VARCHAR(100) NOT NULL COMMENT 'bcrypt hash',
  real_name   VARCHAR(50)  NOT NULL COMMENT '真实姓名',
  role        ENUM('admin','staff') NOT NULL DEFAULT 'staff' COMMENT 'admin=管理员,staff=员工',
  phone       VARCHAR(20)  DEFAULT NULL,
  is_active   TINYINT(1)   NOT NULL DEFAULT 1,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB COMMENT='用户表';

-- 默认管理员账号 密码: admin123
INSERT INTO users (username, password, real_name, role)
VALUES ('admin', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin', 'admin')
ON DUPLICATE KEY UPDATE id=id;

-- ============================================================
-- 商品分类表
-- ============================================================
CREATE TABLE IF NOT EXISTS categories (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(50) NOT NULL UNIQUE COMMENT '分类名称',
  sort_order  INT         NOT NULL DEFAULT 0,
  created_at  DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB COMMENT='商品分类';

INSERT INTO categories (name, sort_order) VALUES
  ('农药', 1), ('化肥', 2), ('种子', 3), ('农膜', 4), ('其他', 99)
ON DUPLICATE KEY UPDATE sort_order=VALUES(sort_order);

-- ============================================================
-- 供应商表
-- ============================================================
CREATE TABLE IF NOT EXISTS suppliers (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(100) NOT NULL UNIQUE COMMENT '供应商名称',
  contact     VARCHAR(50)  DEFAULT NULL COMMENT '联系人',
  phone       VARCHAR(20)  DEFAULT NULL,
  address     VARCHAR(200) DEFAULT NULL,
  remark      VARCHAR(500) DEFAULT NULL,
  is_active   TINYINT(1)   NOT NULL DEFAULT 1,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB COMMENT='供应商表';

-- ============================================================
-- 商品表
-- ============================================================
CREATE TABLE IF NOT EXISTS products (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  barcode         VARCHAR(64)    NOT NULL UNIQUE COMMENT '条码（EAN/自编）',
  name            VARCHAR(100)   NOT NULL COMMENT '商品名称',
  category_id     INT UNSIGNED   DEFAULT NULL,
  spec            VARCHAR(100)   DEFAULT NULL COMMENT '规格，如 50kg/袋',
  unit            VARCHAR(20)    NOT NULL DEFAULT '件' COMMENT '单位',
  cost_price      DECIMAL(10,2)  NOT NULL DEFAULT 0.00 COMMENT '进价',
  sale_price      DECIMAL(10,2)  NOT NULL DEFAULT 0.00 COMMENT '售价',
  stock           INT            NOT NULL DEFAULT 0 COMMENT '当前库存',
  warn_stock      INT            NOT NULL DEFAULT 10  COMMENT '预警库存',
  supplier_id     INT UNSIGNED   DEFAULT NULL,
  expire_date     DATE           DEFAULT NULL COMMENT '效期（可选）',
  remark          VARCHAR(500)   DEFAULT NULL,
  is_active       TINYINT(1)     NOT NULL DEFAULT 1,
  created_at      DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_category (category_id),
  INDEX idx_supplier (supplier_id),
  INDEX idx_stock_warn (stock, warn_stock),
  FULLTEXT INDEX ft_name (name)
) ENGINE=InnoDB COMMENT='商品表';

-- ============================================================
-- 出入库流水表
-- ============================================================
CREATE TABLE IF NOT EXISTS stock_records (
  id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  type         ENUM('in','out') NOT NULL COMMENT 'in=入库 out=出库',
  product_id   INT UNSIGNED     NOT NULL,
  barcode      VARCHAR(64)      NOT NULL COMMENT '冗余条码，防商品被删后查不到',
  product_name VARCHAR(100)     NOT NULL COMMENT '冗余名称',
  qty          INT              NOT NULL COMMENT '数量（正整数）',
  unit_price   DECIMAL(10,2)    DEFAULT NULL COMMENT '本次单价',
  total_amount DECIMAL(12,2)    DEFAULT NULL COMMENT '本次金额',
  before_stock INT              NOT NULL COMMENT '操作前库存',
  after_stock  INT              NOT NULL COMMENT '操作后库存',
  operator_id  INT UNSIGNED     NOT NULL COMMENT '操作人',
  operator_name VARCHAR(50)     NOT NULL COMMENT '操作人姓名（冗余）',
  batch_no     VARCHAR(50)      DEFAULT NULL COMMENT '批次号（同一次扫码批量的标识）',
  customer     VARCHAR(100)     DEFAULT NULL COMMENT '客户/领用人（出库用）',
  supplier     VARCHAR(100)     DEFAULT NULL COMMENT '供应商（入库用）',
  remark       VARCHAR(500)     DEFAULT NULL,
  created_at   DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_product  (product_id),
  INDEX idx_type     (type),
  INDEX idx_created  (created_at),
  INDEX idx_batch    (batch_no),
  INDEX idx_operator (operator_id)
) ENGINE=InnoDB COMMENT='出入库流水';

-- ============================================================
-- 视图：库存预警
-- ============================================================
CREATE OR REPLACE VIEW v_stock_warn AS
SELECT
  p.id, p.barcode, p.name, p.spec, p.unit,
  p.stock, p.warn_stock,
  (p.warn_stock - p.stock) AS shortage,
  c.name AS category_name,
  s.name AS supplier_name
FROM products p
LEFT JOIN categories c ON p.category_id = c.id
LEFT JOIN suppliers  s ON p.supplier_id  = s.id
WHERE p.stock <= p.warn_stock AND p.is_active = 1
ORDER BY shortage DESC;

-- ============================================================
-- 视图：今日统计
-- ============================================================
CREATE OR REPLACE VIEW v_today_stat AS
SELECT
  SUM(CASE WHEN type='in'  THEN qty ELSE 0 END) AS today_in_qty,
  SUM(CASE WHEN type='out' THEN qty ELSE 0 END) AS today_out_qty,
  SUM(CASE WHEN type='in'  THEN total_amount ELSE 0 END) AS today_in_amount,
  SUM(CASE WHEN type='out' THEN total_amount ELSE 0 END) AS today_out_amount
FROM stock_records
WHERE DATE(created_at) = CURDATE();

-- ============================================================
-- 权限配置表（精细化控制，可扩展）
-- ============================================================
CREATE TABLE IF NOT EXISTS user_permissions (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id     INT UNSIGNED NOT NULL UNIQUE,
  -- 商品
  product_delete  TINYINT(1) DEFAULT 0,
  -- 出入库
  stock_in        TINYINT(1) DEFAULT 1,
  stock_out       TINYINT(1) DEFAULT 1,
  -- 记录导出
  record_export   TINYINT(1) DEFAULT 0,
  -- 供应商编辑
  supplier_edit   TINYINT(1) DEFAULT 0,
  -- 报表查看
  report_view     TINYINT(1) DEFAULT 0,
  -- 价格查看（员工可隐藏进价）
  price_view      TINYINT(1) DEFAULT 1,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_user (user_id)
) ENGINE=InnoDB COMMENT='员工精细化权限配置';

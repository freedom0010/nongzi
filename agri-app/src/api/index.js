// src/api/index.js
import http from '../utils/request.js'

// ── 认证 ─────────────────────────────────────────────────
export const authApi = {
  login:          (data)   => http.post('/auth/login', data),
  getMe:          ()       => http.get('/auth/me'),
  changePassword: (data)   => http.put('/auth/password', data),
}

// ── 商品 ─────────────────────────────────────────────────
export const productApi = {
  list:         (params) => http.get('/products', params),
  getByBarcode: (barcode)=> http.get(`/products/barcode/${barcode}`, {}, { silent: true }),
  getOne:       (id)     => http.get(`/products/${id}`),
  create:       (data)   => http.post('/products', data),
  update:       (id, d)  => http.put(`/products/${id}`, d),
  remove:       (id)     => http.delete(`/products/${id}`),
  warnList:     ()       => http.get('/products/warn/list'),
}

// ── 出入库 ────────────────────────────────────────────────
export const stockApi = {
  in:      (data) => http.post('/stock/in',    data),
  out:     (data) => http.post('/stock/out',   data),
  batch:   (data) => http.post('/stock/batch', data),
  records: (p)    => http.get('/stock/records', p),
  stats:   ()     => http.get('/stock/stats'),
}

// ── 供应商 / 分类 ─────────────────────────────────────────
export const supplierApi = {
  list:   ()      => http.get('/suppliers'),
  create: (data)  => http.post('/suppliers', data),
  update: (id, d) => http.put(`/suppliers/${id}`, d),
  remove: (id)    => http.delete(`/suppliers/${id}`),
}

export const categoryApi = {
  list:   ()     => http.get('/categories'),
  create: (data) => http.post('/categories', data),
  remove: (id)   => http.delete(`/categories/${id}`),
}

// ── 用户/员工管理 ─────────────────────────────────────────
export const userApi = {
  list:          (p)      => http.get('/users', p),
  create:        (data)   => http.post('/users', data),
  update:        (id, d)  => http.put(`/users/${id}`, d),
  setStatus:     (id, d)  => http.put(`/users/${id}/status`, d),
  resetPassword: (id, d)  => http.put(`/users/${id}/reset-password`, d),
  remove:        (id)     => http.delete(`/users/${id}`),
  permissions:   ()       => http.get('/users/permissions'),
}

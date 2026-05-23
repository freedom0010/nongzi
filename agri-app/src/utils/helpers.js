// src/utils/helpers.js
// 通用工具函数

/**
 * 金额格式化
 * 1234.5 → '1,234.50'
 */
export function fmtMoney(val, decimals = 2) {
  const num = Number(val) || 0
  return num.toLocaleString('zh-CN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

/**
 * 大数量格式化
 * 12000 → '1.2w'
 */
export function fmtQty(val) {
  const num = Number(val) || 0
  if (num >= 10000) return (num / 10000).toFixed(1) + 'w'
  return String(num)
}

/**
 * 日期格式化
 * new Date() → '2026-05-22'
 */
export function fmtDate(date) {
  const d = date ? new Date(date) : new Date()
  return d.toISOString().slice(0, 10)
}

/**
 * 相对时间
 * '2026-05-22 10:00:00' → '3小时前'
 */
export function timeAgo(dateStr) {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1)   return '刚刚'
  if (mins < 60)  return `${mins}分钟前`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)   return `${hrs}小时前`
  const days = Math.floor(hrs / 24)
  if (days < 30)  return `${days}天前`
  return dateStr.slice(0, 10)
}

/**
 * 效期距今天数
 * 返回负数表示已过期
 */
export function daysToExpire(expireDateStr) {
  if (!expireDateStr) return null
  return Math.floor((new Date(expireDateStr) - Date.now()) / 86400000)
}

/**
 * 效期状态
 */
export function expireStatus(expireDateStr) {
  const days = daysToExpire(expireDateStr)
  if (days === null)  return { label: '无效期', color: 'var(--text3)' }
  if (days < 0)       return { label: '已过期', color: 'var(--red)' }
  if (days <= 30)     return { label: `${days}天后到期`, color: 'var(--amber)' }
  return               { label: `${days}天后到期`, color: 'var(--green-mid)' }
}

/**
 * 库存状态
 */
export function stockStatus(stock, warnStock) {
  if (stock <= 0)          return { label: '已售罄', color: 'var(--red)',   badge: 'badge-warn' }
  if (stock <= warnStock)  return { label: '库存低', color: 'var(--amber)', badge: 'badge-warn' }
  return                          { label: '正常',   color: 'var(--green)', badge: 'badge-ok'   }
}

/**
 * 生成自编条码（13位）
 * 690 开头（中国商品条码前缀）
 */
export function genBarcode() {
  return '690' + Date.now().toString().slice(-10)
}

/**
 * 手机号校验
 */
export function isPhone(val) {
  return /^1[3-9]\d{9}$/.test(val)
}

/**
 * 深拷贝
 */
export function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj))
}

/**
 * 防抖
 */
export function debounce(fn, ms = 350) {
  let timer
  return function (...args) {
    clearTimeout(timer)
    timer = setTimeout(() => fn.apply(this, args), ms)
  }
}

/**
 * 振动反馈（扫码成功用）
 */
export function vibrate(type = 'short') {
  try {
    type === 'short' ? uni.vibrateShort({}) : uni.vibrateLong({})
  } catch {}
}

/**
 * 全局 Loading
 */
export const loading = {
  show(title = '处理中…') { uni.showLoading({ title, mask: true }) },
  hide()                  { uni.hideLoading() },
  async wrap(fn, title)   {
    loading.show(title)
    try { return await fn() } finally { loading.hide() }
  }
}

/**
 * 确认弹窗 Promise 版
 */
export function confirm(content, title = '确认操作') {
  return new Promise((resolve) => {
    uni.showModal({ title, content, success: (res) => resolve(res.confirm) })
  })
}

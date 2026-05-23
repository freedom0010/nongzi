// src/utils/offline.js
// 离线缓存 + 操作队列，适配农村弱网环境
// 策略：
//   GET  请求 → 先返回缓存，后台刷新
//   POST/PUT/DELETE → 网络正常直接发；断网则写入操作队列，联网后自动回放

const CACHE_PREFIX  = 'agri_cache_'
const QUEUE_KEY     = 'agri_offline_queue'
const CACHE_TTL_MS  = 10 * 60 * 1000   // GET 缓存10分钟

// ── 网络状态监听 ─────────────────────────────────────────
let isOnline = true

function initNetworkListener() {
  // 获取当前网络状态
  uni.getNetworkType({
    success(res) { isOnline = res.networkType !== 'none' }
  })
  // 监听变化
  uni.onNetworkStatusChange((res) => {
    const wasOffline = !isOnline
    isOnline = res.isConnected
    if (wasOffline && isOnline) {
      console.log('[Offline] 网络恢复，开始回放队列…')
      uni.showToast({ title: '网络已恢复，同步数据中…', icon: 'none', duration: 2000 })
      replayQueue()
    }
    if (!isOnline) {
      uni.showToast({ title: '当前离线，操作将在联网后同步', icon: 'none', duration: 2500 })
    }
  })
}

// ── GET 缓存 ─────────────────────────────────────────────
function getCacheKey(url, params) {
  const q = params ? JSON.stringify(params) : ''
  return CACHE_PREFIX + url + q
}

function readCache(url, params) {
  try {
    const raw  = uni.getStorageSync(getCacheKey(url, params))
    if (!raw) return null
    const obj  = JSON.parse(raw)
    if (Date.now() - obj.ts > CACHE_TTL_MS) return null
    return obj.data
  } catch { return null }
}

function writeCache(url, params, data) {
  try {
    uni.setStorageSync(getCacheKey(url, params), JSON.stringify({ ts: Date.now(), data }))
  } catch {}
}

// ── 操作队列（断网写入，联网回放） ────────────────────────
function readQueue() {
  try { return JSON.parse(uni.getStorageSync(QUEUE_KEY) || '[]') } catch { return [] }
}

function writeQueue(queue) {
  try { uni.setStorageSync(QUEUE_KEY, JSON.stringify(queue)) } catch {}
}

function enqueue(item) {
  const q = readQueue()
  q.push({ ...item, id: Date.now(), createdAt: new Date().toISOString() })
  writeQueue(q)
  console.log('[Offline] 操作已入队，共', q.length, '条待同步')
}

async function replayQueue() {
  const q = readQueue()
  if (q.length === 0) return

  const { http } = await import('./request.js')
  const failed = []

  for (const op of q) {
    try {
      await http[op.method.toLowerCase()](op.url, op.data)
      console.log('[Offline] 回放成功:', op.url)
    } catch (e) {
      console.warn('[Offline] 回放失败:', op.url, e.message)
      failed.push(op)
    }
  }

  writeQueue(failed)

  const succeed = q.length - failed.length
  if (succeed > 0) {
    uni.showToast({
      title: `同步完成：${succeed} 条，失败 ${failed.length} 条`,
      icon: 'none',
      duration: 3000
    })
  }
}

// ── 带离线支持的 HTTP 封装 ─────────────────────────────────
/**
 * GET：先读缓存立即返回，后台静默刷新缓存
 */
async function offlineGet(url, params = {}) {
  const { http } = await import('./request.js')
  const cached = readCache(url, params)

  if (cached) {
    // 后台刷新（不 await）
    http.get(url, params, { silent: true })
      .then(res => writeCache(url, params, res))
      .catch(() => {})
    return { data: cached, fromCache: true }
  }

  // 无缓存：正常请求
  const res = await http.get(url, params)
  writeCache(url, params, res.data ?? res)
  return { data: res.data ?? res, fromCache: false }
}

/**
 * 写操作（POST/PUT/DELETE）：有网直发，无网入队
 * @param {string} method  post|put|delete
 * @param {string} url
 * @param {object} data
 * @param {object} opts    { optimistic: fn }  乐观更新回调
 */
async function offlineWrite(method, url, data = {}, opts = {}) {
  const { http } = await import('./request.js')

  // 乐观更新：先在本地表现成功
  if (opts.optimistic) opts.optimistic()

  if (!isOnline) {
    enqueue({ method, url, data })
    return { queued: true }
  }

  try {
    const res = await http[method](url, data)
    return { data: res.data ?? res, queued: false }
  } catch (e) {
    // 请求失败也入队
    if (!isOnline) {
      enqueue({ method, url, data })
      return { queued: true }
    }
    throw e
  }
}

// ── 库存本地快照（扫码时无网可用） ───────────────────────
const SNAPSHOT_KEY = 'agri_product_snapshot'

function saveProductSnapshot(products) {
  try {
    uni.setStorageSync(SNAPSHOT_KEY, JSON.stringify({
      ts: Date.now(),
      data: products
    }))
  } catch {}
}

function getProductSnapshot() {
  try {
    const raw = uni.getStorageSync(SNAPSHOT_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch { return null }
}

function findProductInSnapshot(barcode) {
  const snap = getProductSnapshot()
  if (!snap) return null
  return snap.data?.find(p => p.barcode === barcode) || null
}

// ── 离线扫码入队（出入库在恢复后统一提交） ───────────────
function queueStockOperation(type, barcode, qty, extra = {}) {
  enqueue({
    method: 'POST',
    url:    `/stock/${type}`,
    data:   { barcode, qty, ...extra }
  })
}

// 检查待同步数量
function getPendingCount() {
  return readQueue().length
}

export {
  initNetworkListener,
  offlineGet,
  offlineWrite,
  replayQueue,
  saveProductSnapshot,
  getProductSnapshot,
  findProductInSnapshot,
  queueStockOperation,
  getPendingCount,
  isOnline,
}

// src/store/index.js
import { defineStore } from 'pinia'
import { authApi, stockApi, userApi } from '../api/index.js'

// ── 用户 Store ────────────────────────────────────────────
export const useUserStore = defineStore('user', {
  state: () => ({
    token:       uni.getStorageSync('token')       || '',
    userInfo:    uni.getStorageSync('userInfo')    || null,
    permissions: uni.getStorageSync('permissions') || null,
  }),
  getters: {
    isLoggedIn:  (s) => !!s.token,
    isAdmin:     (s) => s.userInfo?.role === 'admin',
    // 权限快捷判断（管理员拥有全部权限）
    can: (s) => (key) => {
      if (s.userInfo?.role === 'admin') return true
      return s.permissions?.[key] ?? true
    },
  },
  actions: {
    async login(username, password) {
      const { data } = await authApi.login({ username, password })
      this.token    = data.token
      this.userInfo = data.user
      uni.setStorageSync('token',    data.token)
      uni.setStorageSync('userInfo', data.user)
      // 登录后拉取权限
      await this.fetchPermissions()
    },
    async fetchPermissions() {
      try {
        const { data } = await userApi.permissions()
        this.permissions = data.permissions
        uni.setStorageSync('permissions', data.permissions)
      } catch {}
    },
    logout() {
      this.token       = ''
      this.userInfo    = null
      this.permissions = null
      uni.removeStorageSync('token')
      uni.removeStorageSync('userInfo')
      uni.removeStorageSync('permissions')
      uni.reLaunch({ url: '/pages/auth/login' })
    }
  }
})

// ── 统计 Store ────────────────────────────────────────────
export const useStatsStore = defineStore('stats', {
  state: () => ({
    stats:      null,
    warnList:   [],
    loading:    false,
  }),
  actions: {
    async fetchStats() {
      this.loading = true
      try {
        const { data } = await stockApi.stats()
        this.stats = data
      } finally {
        this.loading = false
      }
    }
  }
})

// ── 扫码批次 Store ────────────────────────────────────────
export const useScanStore = defineStore('scan', {
  state: () => ({
    mode:       'in',        // 'in' | 'out'
    batchItems: [],          // [{ barcode, name, qty, unit_price, remark }]
    lastProduct: null,       // 最近扫到的商品
  }),
  getters: {
    totalQty:   (s) => s.batchItems.reduce((a, b) => a + b.qty, 0),
    totalCount: (s) => s.batchItems.length,
  },
  actions: {
    setMode(mode)   { this.mode = mode; this.batchItems = []; this.lastProduct = null },
    addItem(product, qty = 1, unit_price = null, remark = '') {
      const exist = this.batchItems.find(i => i.barcode === product.barcode)
      if (exist) {
        exist.qty += qty
      } else {
        this.batchItems.push({
          barcode:    product.barcode,
          name:       product.name,
          spec:       product.spec,
          stock:      product.stock,
          qty,
          unit_price: unit_price ?? (this.mode === 'in' ? product.cost_price : product.sale_price),
          remark
        })
      }
      this.lastProduct = product
    },
    removeItem(barcode) {
      this.batchItems = this.batchItems.filter(i => i.barcode !== barcode)
    },
    updateQty(barcode, qty) {
      const item = this.batchItems.find(i => i.barcode === barcode)
      if (item) item.qty = Math.max(1, qty)
    },
    clear() { this.batchItems = []; this.lastProduct = null }
  }
})

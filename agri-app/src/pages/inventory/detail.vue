<template>
  <view class="page-container" v-if="product">
    <view class="detail-banner" :style="{ background: isWarn ? 'linear-gradient(135deg,#b71c1c,#c62828)' : 'linear-gradient(135deg,#1a5c2a,#2e7d32)' }">
      <view class="banner-top">
        <view class="cat-chip">{{ product.category_name || '未分类' }}</view>
        <view :class="['status-chip', isWarn ? 'chip-warn' : 'chip-ok']">{{ isWarn ? '⚠ 库存预警' : '✓ 正常' }}</view>
      </view>
      <text class="banner-name">{{ product.name }}</text>
      <text class="banner-barcode">{{ product.barcode }}</text>
      <view class="banner-stock-row">
        <view class="banner-stock">
          <text class="stock-big">{{ product.stock }}</text>
          <text class="stock-unit">{{ product.unit }}</text>
        </view>
        <view class="banner-btns">
          <button class="banner-btn" @tap="quickIn">📦 入库</button>
          <button class="banner-btn warn-btn" @tap="quickOut">🚚 出库</button>
        </view>
      </view>
    </view>

    <view class="stock-progress-card">
      <view class="progress-row">
        <text class="progress-label">库存充足度</text>
        <text class="progress-pct" :style="{ color: barColor }">{{ stockPct }}%</text>
      </view>
      <view class="progress-track">
        <view class="progress-fill" :style="{ width: stockPct + '%', background: barColor }" />
      </view>
      <view class="progress-tips">
        <text class="tip-text">预警值 {{ product.warn_stock }} {{ product.unit }}</text>
        <text class="tip-text">差 {{ Math.max(0, product.warn_stock - product.stock) }} {{ product.unit }} 触发预警</text>
      </view>
    </view>

    <view class="card price-card">
      <view class="price-item">
        <text class="price-label">进价</text>
        <text class="price-val" style="color:var(--text2)">¥{{ product.cost_price }}</text>
      </view>
      <view class="price-divider" />
      <view class="price-item">
        <text class="price-label">售价</text>
        <text class="price-val" style="color:var(--green-mid)">¥{{ product.sale_price }}</text>
      </view>
      <view class="price-divider" />
      <view class="price-item">
        <text class="price-label">毛利</text>
        <text class="price-val" :style="{ color: profit >= 0 ? 'var(--green-mid)' : 'var(--red)' }">¥{{ profit.toFixed(2) }}</text>
      </view>
    </view>

    <view class="card">
      <view class="card-title">商品信息</view>
      <view v-for="row in infoRows" :key="row.key" class="info-row">
        <text class="info-key">{{ row.key }}</text>
        <text class="info-val">{{ row.val }}</text>
      </view>
    </view>

    <view class="card">
      <view class="card-title">条码预览</view>
      <view class="barcode-wrap">
        <view class="barcode-bars">
          <view v-for="(b,i) in bars" :key="i" class="b-bar" :style="{ width: b.w + 'rpx', height: b.h + 'rpx' }" />
        </view>
        <text class="barcode-str">{{ product.barcode }}</text>
      </view>
      <view class="quick-ops">
        <view class="qop green-bg-op" @tap="quickIn"><text>📦</text><text class="qop-label">入库</text></view>
        <view class="qop amber-bg-op" @tap="quickOut"><text>🚚</text><text class="qop-label">出库</text></view>
        <view class="qop blue-bg-op"  @tap="shareProduct"><text>📤</text><text class="qop-label">复制</text></view>
        <view class="qop gray-bg-op"  @tap="goEdit"><text>✏️</text><text class="qop-label">编辑</text></view>
      </view>
    </view>

    <view class="card">
      <view class="card-title" style="justify-content:space-between">
        <text>近期流水</text>
        <text class="link-text" @tap="goRecords">全部 ›</text>
      </view>
      <view v-if="records.length === 0" class="empty-box" style="padding:40rpx 0"><text>暂无流水</text></view>
      <view v-for="r in records" :key="r.id" class="rec-item">
        <view :class="['rec-dot', r.type === 'in' ? 'dot-green' : 'dot-amber']" />
        <view class="rec-body">
          <view class="rec-top-row">
            <text class="rec-act">{{ r.type === 'in' ? '入库' : '出库' }}</text>
            <text :class="r.type === 'in' ? 'green-text' : 'amber-text'" style="font-size:28rpx;font-weight:700">
              {{ r.type === 'in' ? '+' : '-' }}{{ r.qty }}
            </text>
          </view>
          <text class="rec-meta">{{ r.created_at && r.created_at.slice(0,16) }} · {{ r.operator_name }}</text>
          <text class="stock-chg">{{ r.before_stock }} → {{ r.after_stock }} {{ product.unit }}</text>
        </view>
        <text v-if="r.total_amount" class="rec-amount">¥{{ r.total_amount }}</text>
      </view>
    </view>

    <view v-if="canDelete" class="card" style="border:2rpx solid var(--red-light)">
      <view class="card-title" style="color:var(--red)">危险操作</view>
      <button class="del-btn" @tap="deleteProduct">🗑 删除此商品</button>
      <text class="del-hint">删除后不可恢复，历史流水仍保留</text>
    </view>
    <view class="safe-bottom" />
  </view>
  <view v-else class="empty-box" style="min-height:100vh">
    <text>{{ loading ? '加载中…' : '商品不存在' }}</text>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useScanStore } from '../../store/index.js'
import { useUserStore }  from '../../store/index.js'
import { productApi, stockApi } from '../../api/index.js'

const scanStore   = useScanStore()
const userStore   = useUserStore()
const canDelete   = computed(() => userStore.can('product_delete'))
const product   = ref(null)
const records   = ref([])
const loading   = ref(true)

const isWarn   = computed(() => product.value && product.value.stock <= product.value.warn_stock)
const profit   = computed(() => Number(product.value?.sale_price||0) - Number(product.value?.cost_price||0))
const stockPct = computed(() => {
  if (!product.value) return 0
  return Math.min(100, Math.max(0, Math.round(product.value.stock / Math.max(product.value.warn_stock * 2, 1) * 100)))
})
const barColor = computed(() => {
  const p = stockPct.value
  return p < 30 ? '#c62828' : p < 60 ? '#f57c00' : '#1a5c2a'
})
const infoRows = computed(() => {
  if (!product.value) return []
  const p = product.value
  const rows = [
    { key: '规格', val: p.spec || '—' },
    { key: '单位', val: p.unit || '—' },
    { key: '供应商', val: p.supplier_name || '—' },
    { key: '效期', val: p.expire_date || '—' },
    { key: '录入时间', val: p.created_at ? p.created_at.slice(0,10) : '—' },
  ]
  if (p.remark) rows.push({ key: '备注', val: p.remark })
  return rows
})
const bars = computed(() => {
  if (!product.value) return []
  const code = product.value.barcode
  return Array.from({ length: code.length * 5 }, (_, i) => ({
    w: i % 3 === 0 ? 6 : 3,
    h: 60 + (code.charCodeAt(i % code.length) * (i + 1)) % 30
  }))
})

function quickIn()  { scanStore.setMode('in');  scanStore.addItem(product.value, 1); uni.switchTab({ url: '/pages/scan/index' }) }
function quickOut() {
  if (product.value.stock <= 0) return uni.showToast({ title: '库存为0，无法出库', icon: 'none' })
  scanStore.setMode('out'); scanStore.addItem(product.value, 1); uni.switchTab({ url: '/pages/scan/index' })
}
function goEdit()    { uni.navigateTo({ url: '/pages/inventory/add?id=' + product.value.id }) }
function goRecords() { uni.switchTab({ url: '/pages/records/index' }) }
function shareProduct() {
  const p = product.value
  uni.setClipboardData({
    data: '【' + p.name + '】条码：' + p.barcode + '  规格：' + (p.spec||'—') + '  售价：¥' + p.sale_price,
    success: () => uni.showToast({ title: '已复制商品信息', icon: 'success' })
  })
}
function deleteProduct() {
  uni.showModal({
    title: '确认删除',
    content: '删除「' + product.value.name + '」？此操作不可恢复。',
    confirmColor: '#c62828',
    async success(res) {
      if (!res.confirm) return
      await productApi.remove(product.value.id)
      uni.showToast({ title: '已删除', icon: 'success' })
      setTimeout(() => uni.navigateBack(), 1000)
    }
  })
}

onMounted(async () => {
  const pages = getCurrentPages()
  const id    = pages[pages.length - 1] && pages[pages.length - 1].options && pages[pages.length - 1].options.id
  if (!id) { loading.value = false; return }
  try {
    const res1 = await productApi.getOne(id)
    const res2 = await stockApi.records({ pageSize: 30 })
    product.value = res1.data
    records.value = (res2.data || []).filter(function(r) { return r.barcode === res1.data.barcode }).slice(0, 10)
  } catch (e) {
    product.value = null
  } finally {
    loading.value = false
  }
})
</script>

<style lang="scss">
.detail-banner { padding: 32rpx 32rpx 48rpx; color: #fff; }
.banner-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20rpx; }
.cat-chip { background: rgba(255,255,255,.2); color: #fff; font-size: 22rpx; padding: 6rpx 16rpx; border-radius: 20rpx; }
.status-chip { font-size: 22rpx; padding: 6rpx 16rpx; border-radius: 20rpx; font-weight: 600; }
.chip-ok   { background: rgba(255,255,255,.2); color: #fff; }
.chip-warn { background: #fff3e0; color: #f57c00; }
.banner-name    { font-size: 40rpx; font-weight: 700; color: #fff; display: block; margin-bottom: 8rpx; line-height: 1.3; }
.banner-barcode { font-size: 22rpx; color: rgba(255,255,255,.7); display: block; font-family: monospace; margin-bottom: 24rpx; }
.banner-stock-row { display: flex; justify-content: space-between; align-items: flex-end; }
.banner-stock { display: flex; align-items: baseline; gap: 8rpx; }
.stock-big  { font-size: 80rpx; font-weight: 700; color: #fff; line-height: 1; }
.stock-unit { font-size: 26rpx; color: rgba(255,255,255,.8); }
.banner-btns { display: flex; gap: 12rpx; }
.banner-btn { padding: 14rpx 28rpx; border-radius: 40rpx; font-size: 26rpx; background: rgba(255,255,255,.2); color: #fff; border: none; font-weight: 600; }
.banner-btn::after { border: none; }
.warn-btn { background: rgba(245,124,0,.4); }

.stock-progress-card { background: var(--white); margin: 0 24rpx; border-radius: var(--radius-lg); padding: 24rpx 32rpx; box-shadow: var(--shadow); margin-top: -24rpx; }
.progress-row { display: flex; justify-content: space-between; margin-bottom: 10rpx; }
.progress-label { font-size: 24rpx; color: var(--text2); }
.progress-pct { font-size: 26rpx; font-weight: 700; }
.progress-track { height: 10rpx; background: var(--gray-card); border-radius: 5rpx; overflow: hidden; }
.progress-fill { height: 100%; border-radius: 5rpx; transition: width .4s; }
.progress-tips { display: flex; justify-content: space-between; margin-top: 8rpx; }
.tip-text { font-size: 20rpx; color: var(--text3); }

.price-card { display: flex; align-items: center; padding: 24rpx 32rpx; }
.price-item { flex: 1; text-align: center; }
.price-label { display: block; font-size: 22rpx; color: var(--text3); margin-bottom: 6rpx; }
.price-val   { display: block; font-size: 36rpx; font-weight: 700; }
.price-divider { width: 1rpx; height: 60rpx; background: var(--border); }

.info-row { display: flex; align-items: flex-start; padding: 16rpx 0; border-bottom: 1rpx solid var(--border); }
.info-row:last-child { border-bottom: none; }
.info-key { width: 140rpx; font-size: 26rpx; color: var(--text3); flex-shrink: 0; }
.info-val { flex: 1; font-size: 28rpx; color: var(--text); line-height: 1.5; }

.barcode-wrap { background: var(--gray-card); border-radius: 12rpx; padding: 24rpx; text-align: center; margin-bottom: 24rpx; }
.barcode-bars { display: flex; align-items: flex-end; justify-content: center; gap: 2rpx; margin-bottom: 12rpx; }
.b-bar { background: #111; border-radius: 1rpx; }
.barcode-str { font-family: monospace; font-size: 26rpx; letter-spacing: 4rpx; color: var(--text); }

.quick-ops { display: grid; grid-template-columns: repeat(4,1fr); gap: 16rpx; }
.qop { display: flex; flex-direction: column; align-items: center; gap: 8rpx; padding: 20rpx 8rpx; border-radius: var(--radius-md); font-size: 36rpx; }
.qop-label { font-size: 22rpx; font-weight: 500; }
.green-bg-op { background: var(--green-light); .qop-label { color: var(--green-mid); } }
.amber-bg-op { background: var(--amber-light); .qop-label { color: var(--amber); } }
.blue-bg-op  { background: var(--blue-light);  .qop-label { color: var(--blue); } }
.gray-bg-op  { background: var(--gray-card);   .qop-label { color: var(--text2); } }

.rec-item { display: flex; align-items: flex-start; gap: 16rpx; padding: 20rpx 0; border-bottom: 1rpx solid var(--border); }
.rec-item:last-child { border-bottom: none; }
.rec-dot { width: 16rpx; height: 16rpx; border-radius: 50%; flex-shrink: 0; margin-top: 10rpx; }
.dot-green { background: var(--green); }
.dot-amber { background: var(--amber); }
.rec-body { flex: 1; }
.rec-top-row { display: flex; justify-content: space-between; margin-bottom: 6rpx; }
.rec-act  { font-size: 28rpx; font-weight: 600; color: var(--text); }
.rec-meta { font-size: 22rpx; color: var(--text3); display: block; margin-bottom: 4rpx; }
.stock-chg { font-size: 20rpx; color: var(--text3); display: block; }
.rec-amount { font-size: 26rpx; color: var(--green-mid); font-weight: 600; white-space: nowrap; }
.green-text { color: var(--green-mid); }
.amber-text { color: var(--amber); }
.link-text  { font-size: 26rpx; color: var(--green); }

.del-btn { background: var(--red-light); color: var(--red); border: none; height: 88rpx; border-radius: var(--radius-md); font-size: 30rpx; font-weight: 600; width: 100%; }
.del-btn::after { border: none; }
.del-hint { display: block; font-size: 22rpx; color: var(--text3); text-align: center; margin-top: 12rpx; }
</style>

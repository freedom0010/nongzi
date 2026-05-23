<template>
  <view class="page-container">
    <view class="mode-tabs">
      <view :class="['tab-item', mode==='in' ? 'tab-in-active' : '', !canIn ? 'tab-disabled' : '']"
        @tap="canIn && setMode('in')">📦 入库{{ !canIn ? '（无权限）' : '' }}</view>
      <view :class="['tab-item', mode==='out' ? 'tab-out-active' : '', !canOut ? 'tab-disabled' : '']"
        @tap="canOut && setMode('out')">🚚 出库{{ !canOut ? '（无权限）' : '' }}</view>
    </view>

    <view class="card scan-card">
      <view class="card-title" id="scan-title">扫描条码 — {{ mode==='in' ? '入库' : '出库' }}</view>
      <view class="scan-row">
        <input
          v-model="inputBarcode"
          class="input-box scan-input"
          placeholder="扫码枪扫描 或 输入条码"
          placeholder-style="color:#bbb;font-size:28rpx"
          confirm-type="search"
          :adjust-position="true"
          @confirm="handleInput"
        />
        <button class="btn btn-green scan-cam-btn" @tap="openScanner">📷</button>
      </view>
      <button class="btn btn-ghost btn-block" style="margin-top:16rpx" @tap="handleInput">确认查询</button>
      <view class="scan-tips">
        <text class="tip-line">💡 扫码枪（USB/蓝牙）：直接扫描自动识别</text>
        <text class="tip-line">📷 摄像头：点击右侧按钮调用相机扫码</text>
      </view>
    </view>

    <!-- 商品卡片 -->
    <view v-if="currentProduct" :class="['card product-card', mode==='in' ? 'card-in' : 'card-out']">
      <view class="product-header">
        <view class="product-info">
          <text class="product-name">{{ currentProduct.name }}</text>
          <text class="product-spec">{{ currentProduct.spec }} · {{ currentProduct.category_name }}</text>
          <text class="product-supplier">🏭 {{ currentProduct.supplier_name || '—' }}</text>
        </view>
        <view class="stock-chip" :style="{ background: currentProduct.stock <= currentProduct.warn_stock ? '#ffebee' : '#e8f5e9' }">
          <text :style="{ color: currentProduct.stock <= currentProduct.warn_stock ? '#c62828' : '#1a5c2a', fontSize: '22rpx', fontWeight: '600' }">
            库存 {{ currentProduct.stock }}
          </text>
        </view>
      </view>
      <view class="divider" style="margin:16rpx 0" />
      <view class="ctrl-row">
        <text class="ctrl-label">{{ mode==='in' ? '入库数量' : '出库数量' }}</text>
        <view class="qty-ctrl">
          <view class="qty-btn" @tap="adjustQty(-1)">−</view>
          <input v-model.number="qty" class="qty-input" type="number" :adjust-position="false" />
          <view class="qty-btn" @tap="adjustQty(1)">+</view>
        </view>
      </view>
      <view class="ctrl-row">
        <text class="ctrl-label">{{ mode==='in' ? '进价（元）' : '售价（元）' }}</text>
        <input v-model.number="unitPrice" class="input-box price-input" type="digit"
          :placeholder="mode==='in' ? String(currentProduct.cost_price||'') : String(currentProduct.sale_price||'')"
          placeholder-style="color:#bbb" :adjust-position="true" />
      </view>
      <view class="ctrl-row">
        <text class="ctrl-label">{{ mode==='in' ? '供应商' : '客户名称' }}</text>
        <input v-model="counterpart" class="input-box price-input" placeholder="可选"
          placeholder-style="color:#bbb" :adjust-position="true" />
      </view>
      <button :class="['btn btn-block', mode==='in' ? 'btn-green' : 'btn-amber']"
        style="margin-top:24rpx" @tap="addToBatch">
        {{ mode==='in' ? '✅ 加入入库清单' : '📤 加入出库清单' }}
      </button>
    </view>

    <!-- 未找到 -->
    <view v-if="notFound" class="card not-found-card">
      <text class="nf-bc">条码：{{ notFoundBarcode }}</text>
      <text class="nf-tip">该商品未录入系统</text>
      <button class="btn btn-green btn-block" style="margin-top:24rpx" @tap="goAdd">➕ 立即录入</button>
    </view>

    <!-- 批量清单 -->
    <view v-if="scanStore.batchItems.length > 0" class="card">
      <view class="card-title" style="justify-content:space-between">
        <text>{{ mode==='in' ? '入库' : '出库' }}清单（{{ scanStore.totalCount }}种 · {{ scanStore.totalQty }}件）</text>
        <text style="font-size:26rpx;color:var(--red)" @tap="scanStore.clear()">清空</text>
      </view>
      <view v-for="item in scanStore.batchItems" :key="item.barcode" class="batch-row">
        <view class="batch-info">
          <text class="batch-name">{{ item.name }}</text>
          <text class="batch-spec">{{ item.spec }}</text>
        </view>
        <view class="batch-qty-ctrl">
          <view class="qty-btn-sm" @tap="scanStore.updateQty(item.barcode, item.qty-1)">−</view>
          <text class="batch-qty-num">{{ item.qty }}</text>
          <view class="qty-btn-sm" @tap="scanStore.updateQty(item.barcode, item.qty+1)">+</view>
        </view>
        <text class="batch-del" @tap="scanStore.removeItem(item.barcode)">✕</text>
      </view>
      <view class="ctrl-row" style="margin-top:16rpx">
        <text class="ctrl-label">{{ mode==='in' ? '整批供应商' : '整批客户' }}</text>
        <input v-model="batchCounterpart" class="input-box price-input" placeholder="可选，整批共用"
          placeholder-style="color:#bbb" />
      </view>
      <button :class="['btn btn-block', mode==='in' ? 'btn-green' : 'btn-amber']"
        style="margin-top:24rpx" :loading="submitting" @tap="confirmBatch">
        确认提交{{ mode==='in' ? '入库' : '出库' }}
      </button>
    </view>

    <view class="safe-bottom" />
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useScanStore } from '../../store/index.js'
import { useUserStore }  from '../../store/index.js'
import { productApi, stockApi } from '../../api/index.js'
import { vibrate } from '../../utils/helpers.js'

const scanStore  = useScanStore()
const userStore  = useUserStore()
const canIn      = computed(() => userStore.can('stock_in'))
const canOut     = computed(() => userStore.can('stock_out'))
const mode             = computed(() => scanStore.mode)
const inputBarcode     = ref('')
const currentProduct   = ref(null)
const notFound         = ref(false)
const notFoundBarcode  = ref('')
const qty              = ref(1)
const unitPrice        = ref('')
const counterpart      = ref('')
const batchCounterpart = ref('')
const submitting       = ref(false)

function setMode(m) { scanStore.setMode(m); reset() }

function reset() {
  currentProduct.value = null; notFound.value = false
  notFoundBarcode.value = ''; inputBarcode.value = ''
  qty.value = 1; unitPrice.value = ''; counterpart.value = ''
}

// 统一扫码入口 - 自动区分 iOS / Android
function openScanner() {
  // #ifdef APP-PLUS
  const isIOS = uni.getSystemInfoSync().platform === 'ios'
  const formats = [
    plus.barcode.QR, plus.barcode.EAN13, plus.barcode.EAN8,
    plus.barcode.CODE128, plus.barcode.CODE39, plus.barcode.CODE93,
    plus.barcode.UPCA, plus.barcode.UPCE,
    ...(isIOS ? [plus.barcode.ITF, plus.barcode.DATAMATRIX] : [])
  ]
  plus.barcode.scan(
    (type, result) => {
      vibrate('short')
      inputBarcode.value = result
      lookupBarcode(result)
    },
    (err) => uni.showToast({ title: err?.message || '扫码取消', icon: 'none' }),
    formats,
    {
      frameColor:  '#1a5c2a',
      scanbarColor:'#1a5c2a',
      background:  '#000000',
    }
  )
  // #endif
  // #ifndef APP-PLUS
  uni.showToast({ title: '请在真机运行', icon: 'none' })
  // #endif
}

async function handleInput() {
  const code = inputBarcode.value.trim()
  if (!code) return uni.showToast({ title: '请输入或扫描条码', icon: 'none' })
  await lookupBarcode(code)
}

async function lookupBarcode(code) {
  uni.showLoading({ title: '查询中...' })
  try {
    const { data } = await productApi.getByBarcode(code)
    currentProduct.value = data; notFound.value = false
    qty.value = 1; unitPrice.value = ''
    vibrate('short')
  } catch (e) {
    if (e.message?.includes('不存在') || e.message?.includes('404')) {
      notFound.value = true; notFoundBarcode.value = code; currentProduct.value = null
    }
  } finally { uni.hideLoading() }
}

function adjustQty(delta) { qty.value = Math.max(1, (qty.value || 1) + delta) }

function addToBatch() {
  if (!currentProduct.value) return
  if (mode.value === 'out' && currentProduct.value.stock < qty.value) {
    return uni.showToast({ title: `库存不足（剩余 ${currentProduct.value.stock}）`, icon: 'none' })
  }
  scanStore.addItem(currentProduct.value, qty.value, unitPrice.value || null, counterpart.value)
  vibrate('short')
  uni.showToast({ title: '已加入清单', icon: 'success', duration: 800 })
  reset()
}

async function confirmBatch() {
  if (!scanStore.batchItems.length) return
  submitting.value = true
  try {
    const key = mode.value === 'in' ? 'supplier' : 'customer'
    const payload = {
      type: mode.value,
      items: scanStore.batchItems.map(i => ({ barcode: i.barcode, qty: i.qty, unit_price: i.unit_price || null })),
      [key]: batchCounterpart.value || undefined,
    }
    const { data } = await stockApi.batch(payload)
    const failed = data.failed?.length || 0
    vibrate('long')
    uni.showToast({
      title: failed > 0 ? `完成，${data.success.length}成功 ${failed}失败` : `${mode.value==='in'?'入':'出'}库成功 ✅`,
      icon: failed > 0 ? 'none' : 'success', duration: 2500
    })
    scanStore.clear(); batchCounterpart.value = ''
  } finally { submitting.value = false }
}

function goAdd() { uni.navigateTo({ url: '/pages/inventory/add?barcode=' + notFoundBarcode.value }) }
</script>

<style lang="scss">
.mode-tabs { display: flex; margin: 24rpx 24rpx 0; border-radius: var(--radius-md); overflow: hidden; border: 2rpx solid var(--border); background: #fff; }
.tab-item { flex: 1; text-align: center; padding: 24rpx; font-size: 30rpx; font-weight: 600; color: var(--text2); }
.tab-in-active { background: var(--green); color: #fff; }
.tab-out-active { background: var(--amber); color: #fff; }
.tab-disabled { opacity: 0.4; }
.scan-card { margin-top: 24rpx; }
.scan-row { display: flex; gap: 16rpx; }
.scan-input { flex: 1; font-size: 28rpx; }
.scan-cam-btn { width: 96rpx; flex-shrink: 0; font-size: 36rpx; }
.scan-tips { margin-top: 16rpx; padding: 16rpx; background: var(--gray-card); border-radius: 8rpx; }
.tip-line { display: block; font-size: 22rpx; color: var(--text3); line-height: 1.8; }
.product-card { margin-top: 24rpx; }
.card-in { border-top: 6rpx solid var(--green); }
.card-out { border-top: 6rpx solid var(--amber); }
.product-header { display: flex; justify-content: space-between; align-items: flex-start; }
.product-info { flex: 1; margin-right: 16rpx; }
.product-name { font-size: 34rpx; font-weight: 700; color: var(--text); display: block; }
.product-spec { font-size: 24rpx; color: var(--text3); display: block; margin-top: 6rpx; }
.product-supplier { font-size: 24rpx; color: var(--text3); display: block; margin-top: 4rpx; }
.stock-chip { padding: 10rpx 20rpx; border-radius: 40rpx; flex-shrink: 0; }
.ctrl-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20rpx; }
.ctrl-label { font-size: 28rpx; color: var(--text2); flex-shrink: 0; width: 180rpx; }
.qty-ctrl { display: flex; align-items: center; gap: 16rpx; }
.qty-btn { width: 64rpx; height: 64rpx; border-radius: 12rpx; background: var(--gray-card); display: flex; align-items: center; justify-content: center; font-size: 36rpx; font-weight: 700; color: var(--text); }
.qty-input { width: 120rpx; height: 64rpx; text-align: center; font-size: 36rpx; font-weight: 700; color: var(--text); background: var(--gray-card); border-radius: 12rpx; }
.price-input { flex: 1; height: 72rpx; font-size: 28rpx; }
.not-found-card { margin-top: 24rpx; text-align: center; }
.nf-bc { font-size: 26rpx; color: var(--text2); display: block; font-family: monospace; }
.nf-tip { font-size: 30rpx; color: var(--red); display: block; margin-top: 12rpx; font-weight: 600; }
.batch-row { display: flex; align-items: center; padding: 20rpx 0; border-bottom: 1rpx solid var(--border); }
.batch-info { flex: 1; }
.batch-name { font-size: 28rpx; color: var(--text); font-weight: 500; display: block; }
.batch-spec { font-size: 22rpx; color: var(--text3); display: block; margin-top: 4rpx; }
.batch-qty-ctrl { display: flex; align-items: center; gap: 12rpx; margin: 0 16rpx; }
.qty-btn-sm { width: 48rpx; height: 48rpx; border-radius: 8rpx; background: var(--gray-card); display: flex; align-items: center; justify-content: center; font-size: 28rpx; font-weight: 700; }
.batch-qty-num { font-size: 32rpx; font-weight: 700; min-width: 48rpx; text-align: center; }
.batch-del { font-size: 28rpx; color: var(--text3); padding: 8rpx 12rpx; }
</style>

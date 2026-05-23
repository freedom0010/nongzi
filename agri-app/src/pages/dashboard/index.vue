<template>
  <view class="page-container">
    <!-- 顶部用户欢迎栏 -->
    <view class="top-banner">
      <view class="banner-left">
        <text class="welcome">欢迎回来，{{ userStore.userInfo?.real_name }}</text>
        <text class="date">{{ today }}</text>
      </view>
      <view class="avatar" @tap="goProfile">
        <text>{{ avatarLetter }}</text>
      </view>
    </view>

    <!-- 统计卡片 -->
    <view class="stat-row">
      <view class="stat-card green">
        <text class="stat-num">{{ stats?.total_products ?? '--' }}</text>
        <text class="stat-lab">库存品类</text>
      </view>
      <view class="stat-card red" @tap="goWarnList">
        <text class="stat-num">{{ stats?.warn_count ?? '--' }}</text>
        <text class="stat-lab">库存预警</text>
      </view>
      <view class="stat-card blue">
        <text class="stat-num">{{ stats?.today?.today_in_qty ?? 0 }}</text>
        <text class="stat-lab">今日入库</text>
      </view>
      <view class="stat-card amber">
        <text class="stat-num">{{ stats?.today?.today_out_qty ?? 0 }}</text>
        <text class="stat-lab">今日出库</text>
      </view>
    </view>

    <!-- 预警提示条 -->
    <view v-if="stats?.warn_count > 0" class="warn-bar" @tap="goWarnList">
      <text class="warn-icon">⚠️</text>
      <text class="warn-text">{{ stats.warn_count }} 种商品库存不足，点击查看</text>
      <text class="warn-arrow">›</text>
    </view>

    <!-- 快捷功能 -->
    <view class="card">
      <view class="card-title">快捷操作</view>
      <view class="quick-grid">
        <view class="quick-item" @tap="goScan('in')">
          <view class="quick-icon green-bg">📦</view>
          <text class="quick-label">扫码入库</text>
        </view>
        <view class="quick-item" @tap="goScan('out')">
          <view class="quick-icon amber-bg">🚚</view>
          <text class="quick-label">扫码出库</text>
        </view>
        <view class="quick-item" @tap="goInventory">
          <view class="quick-icon blue-bg">📋</view>
          <text class="quick-label">库存查询</text>
        </view>
        <view class="quick-item" @tap="goRecords">
          <view class="quick-icon purple-bg">📊</view>
          <text class="quick-label">流水记录</text>
        </view>
        <view class="quick-item" @tap="goAddProduct">
          <view class="quick-icon teal-bg">➕</view>
          <text class="quick-label">新增商品</text>
        </view>
        <view class="quick-item" @tap="goSupplier">
          <view class="quick-icon gray-bg">🏭</view>
          <text class="quick-label">供应商</text>
        </view>
      </view>
    </view>

    <!-- 本月统计 -->
    <view class="card">
      <view class="card-title">本月统计</view>
      <view class="month-row">
        <view class="month-item">
          <text class="month-num green-text">{{ stats?.month?.month_in_qty ?? 0 }}</text>
          <text class="month-lab">入库件数</text>
        </view>
        <view class="month-divider" />
        <view class="month-item">
          <text class="month-num amber-text">{{ stats?.month?.month_out_qty ?? 0 }}</text>
          <text class="month-lab">出库件数</text>
        </view>
        <view class="month-divider" />
        <view class="month-item">
          <text class="month-num red-text">¥{{ fmtAmount(stats?.month?.month_out_amount) }}</text>
          <text class="month-lab">销售金额</text>
        </view>
      </view>
    </view>

    <!-- 今日动态 -->
    <view class="card">
      <view class="card-title" style="justify-content:space-between">
        <text>今日动态</text>
        <text class="more-link" @tap="goRecords">更多 ›</text>
      </view>
      <view v-if="todayRecords.length === 0" class="empty-box" style="padding:60rpx 0">
        <text>今日暂无出入库记录</text>
      </view>
      <view v-else>
        <view v-for="r in todayRecords" :key="r.id" class="list-item">
          <view :class="['dot', r.type === 'in' ? 'dot-green' : 'dot-amber']" />
          <view class="list-main">
            <text class="list-name">{{ r.product_name }}</text>
            <text class="list-meta">{{ r.created_at.slice(11,16) }} · {{ r.type==='in' ? r.supplier||'入库' : r.customer||'出库' }}</text>
          </view>
          <text :class="['list-qty', r.type==='in' ? 'green-text' : 'amber-text']">
            {{ r.type==='in' ? '+' : '-' }}{{ r.qty }}
          </text>
        </view>
      </view>
    </view>

    <view class="safe-bottom" />
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useUserStore, useScanStore } from '../../store/index.js'
import { stockApi } from '../../api/index.js'

const userStore  = useUserStore()
const scanStore  = useScanStore()

const stats        = ref(null)
const todayRecords = ref([])

const today = computed(() => {
  const d = new Date()
  return `${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日`
})
const avatarLetter = computed(() => (userStore.userInfo?.real_name || 'A').slice(0,1))

function fmtAmount(val) {
  if (!val) return '0'
  return Number(val) >= 10000 ? (Number(val)/10000).toFixed(1) + 'w' : Number(val).toFixed(0)
}

async function loadData() {
  try {
    const [s, r] = await Promise.all([
      stockApi.stats(),
      stockApi.records({ pageSize: 10, start_date: new Date().toISOString().slice(0,10) })
    ])
    stats.value        = s.data
    todayRecords.value = r.data || []
  } catch {}
}

function goScan(mode) {
  scanStore.setMode(mode)
  uni.switchTab({ url: '/pages/scan/index' })
}
function goInventory()  { uni.switchTab({ url: '/pages/inventory/index' }) }
function goRecords()    { uni.switchTab({ url: '/pages/records/index' }) }
function goProfile()    { uni.switchTab({ url: '/pages/profile/index' }) }
function goWarnList()   { uni.navigateTo({ url: '/pages/inventory/index?warn=1' }) }
function goAddProduct() { uni.navigateTo({ url: '/pages/inventory/add' }) }
function goSupplier()   { uni.navigateTo({ url: '/pages/supplier/index' }) }

onMounted(loadData)
</script>

<style lang="scss">
.top-banner {
  background: var(--green);
  padding: 24rpx 32rpx 40rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
  .welcome  { font-size: 32rpx; font-weight: 600; color: #fff; }
  .date     { font-size: 24rpx; color: rgba(255,255,255,.7); margin-top: 6rpx; display: block; }
}
.avatar {
  width: 80rpx; height: 80rpx; border-radius: 50%;
  background: rgba(255,255,255,.25);
  display: flex; align-items: center; justify-content: center;
  font-size: 36rpx; color: #fff; font-weight: 700;
}

.stat-row {
  display: flex; gap: 16rpx;
  padding: 0 24rpx;
  margin-top: -24rpx; margin-bottom: 0;
}
.stat-card {
  flex: 1; background: #fff;
  border-radius: var(--radius-lg);
  padding: 24rpx 12rpx;
  text-align: center;
  box-shadow: var(--shadow);
  border-top: 6rpx solid transparent;
  &.green { border-color: var(--green); }
  &.red   { border-color: var(--red); }
  &.blue  { border-color: var(--blue); }
  &.amber { border-color: var(--amber); }
}
.stat-num { display: block; font-size: 40rpx; font-weight: 700; color: var(--text); }
.stat-lab { display: block; font-size: 22rpx; color: var(--text3); margin-top: 4rpx; }

.warn-bar {
  display: flex; align-items: center; gap: 12rpx;
  margin: 24rpx 24rpx 0;
  background: var(--red-light); border: 2rpx solid #ef9a9a;
  border-radius: var(--radius-md); padding: 20rpx 24rpx;
  .warn-icon { font-size: 32rpx; }
  .warn-text { flex: 1; font-size: 26rpx; color: var(--red); }
  .warn-arrow { font-size: 32rpx; color: var(--red); }
}

.quick-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24rpx;
}
.quick-item {
  display: flex; flex-direction: column; align-items: center; gap: 12rpx;
}
.quick-icon {
  width: 96rpx; height: 96rpx; border-radius: 24rpx;
  display: flex; align-items: center; justify-content: center;
  font-size: 44rpx;
  &.green-bg  { background: var(--green-light); }
  &.amber-bg  { background: var(--amber-light); }
  &.blue-bg   { background: var(--blue-light); }
  &.purple-bg { background: #ede7f6; }
  &.teal-bg   { background: #e0f2f1; }
  &.gray-bg   { background: var(--gray-card); }
}
.quick-label { font-size: 24rpx; color: var(--text2); }

.month-row {
  display: flex; align-items: center;
}
.month-item { flex: 1; text-align: center; }
.month-num  { display: block; font-size: 40rpx; font-weight: 700; }
.month-lab  { display: block; font-size: 24rpx; color: var(--text3); margin-top: 4rpx; }
.month-divider { width: 1rpx; height: 80rpx; background: var(--border); }

.more-link { font-size: 26rpx; color: var(--green); }

.dot { width: 16rpx; height: 16rpx; border-radius: 50%; margin-right: 20rpx; flex-shrink: 0; }
.dot-green { background: var(--green); }
.dot-amber { background: var(--amber); }
.list-main { flex: 1; }
.list-name { font-size: 28rpx; color: var(--text); font-weight: 500; }
.list-meta { font-size: 24rpx; color: var(--text3); margin-top: 4rpx; display: block; }
.list-qty  { font-size: 30rpx; font-weight: 700; }

.green-text  { color: var(--green-mid); }
.amber-text  { color: var(--amber); }
.red-text    { color: var(--red); }
</style>

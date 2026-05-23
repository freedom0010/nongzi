<template>
  <view class="page-container">
    <!-- 搜索栏 -->
    <view class="search-bar">
      <view class="search-wrap">
        <text class="search-icon">🔍</text>
        <input
          v-model="keyword"
          class="search-input"
          placeholder="搜索商品名称、条码…"
          placeholder-style="color:#bbb;font-size:26rpx"
          @input="onSearch"
        />
        <text v-if="keyword" class="search-clear" @tap="clearSearch">✕</text>
      </view>
    </view>

    <!-- 分类筛选 -->
    <scroll-view class="filter-scroll" scroll-x>
      <view class="filter-row">
        <view
          v-for="f in filters"
          :key="f.value"
          :class="['filter-tag', activeFilter === f.value ? 'filter-active' : '']"
          @tap="setFilter(f.value)"
        >
          {{ f.label }}
        </view>
      </view>
    </scroll-view>

    <!-- 统计条 -->
    <view class="summary-bar">
      <text class="summary-text">共 {{ total }} 种商品</text>
      <button class="btn btn-green btn-sm" @tap="goAdd">+ 新增商品</button>
    </view>

    <!-- 商品列表 -->
    <view class="card" style="padding:0">
      <view v-if="loading && list.length===0" class="empty-box">
        <text>加载中…</text>
      </view>
      <view v-else-if="list.length===0" class="empty-box">
        <text>暂无商品</text>
      </view>
      <view
        v-for="item in list"
        :key="item.id"
        class="product-row"
        @tap="goDetail(item.id)"
      >
        <view class="pr-left">
          <view :class="['cat-dot', catColor(item.category_name)]" />
        </view>
        <view class="pr-main">
          <view class="pr-top">
            <text class="pr-name">{{ item.name }}</text>
            <view :class="['badge', item.stock <= item.warn_stock ? 'badge-warn' : 'badge-ok']">
              {{ item.stock <= item.warn_stock ? '库存低' : '正常' }}
            </view>
          </view>
          <view class="pr-mid">
            <text class="pr-meta">{{ item.spec }}</text>
            <text class="pr-meta"> · {{ item.category_name }}</text>
          </view>
          <view class="pr-bottom">
            <view class="stock-bar-wrap">
              <view
                class="stock-bar-fill"
                :style="stockBarStyle(item)"
              />
            </view>
            <text class="pr-stock" :style="{ color: item.stock <= item.warn_stock ? '#c62828' : '#1a5c2a' }">
              {{ item.stock }} {{ item.unit }}
            </text>
          </view>
        </view>
        <text class="pr-price">¥{{ item.sale_price }}</text>
        <text class="pr-arrow">›</text>
      </view>
    </view>

    <!-- 加载更多 -->
    <view v-if="hasMore" class="load-more" @tap="loadMore">
      <text>{{ loadingMore ? '加载中…' : '加载更多' }}</text>
    </view>

    <view class="safe-bottom" />
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { productApi } from '../../api/index.js'

const keyword      = ref('')
const activeFilter = ref('all')
const list         = ref([])
const total        = ref(0)
const page         = ref(1)
const loading      = ref(false)
const loadingMore  = ref(false)
const hasMore      = ref(false)
let   searchTimer  = null

const filters = [
  { label: '全部', value: 'all' },
  { label: '⚠️ 预警', value: 'warn' },
  { label: '农药', value: 'pesticide' },
  { label: '化肥', value: 'fertilizer' },
  { label: '种子', value: 'seed' },
  { label: '其他', value: 'other' },
]

async function loadData(reset = true) {
  if (reset) { page.value = 1; list.value = [] }
  loading.value = reset

  const params = {
    page: page.value, pageSize: 20,
    keyword: keyword.value || undefined,
    warn_only: activeFilter.value === 'warn' ? 1 : undefined,
    category_id: !['all','warn'].includes(activeFilter.value) ? activeFilter.value : undefined,
  }

  try {
    const res = await productApi.list(params)
    list.value  = reset ? res.data : [...list.value, ...res.data]
    total.value = res.total
    hasMore.value = list.value.length < res.total
  } finally {
    loading.value     = false
    loadingMore.value = false
  }
}

async function loadMore() {
  if (loadingMore.value || !hasMore.value) return
  loadingMore.value = true
  page.value++
  await loadData(false)
}

function onSearch() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => loadData(), 400)
}
function clearSearch() { keyword.value = ''; loadData() }
function setFilter(v)  { activeFilter.value = v; loadData() }
function goAdd()       { uni.navigateTo({ url: '/pages/inventory/add' }) }
function goDetail(id)  { uni.navigateTo({ url: `/pages/inventory/detail?id=${id}` }) }

function catColor(cat) {
  return { '农药':'dot-blue','化肥':'dot-green','种子':'dot-purple' }[cat] || 'dot-gray'
}

function stockBarStyle(item) {
  const pct = item.warn_stock > 0 ? Math.min(100, Math.round(item.stock / (item.warn_stock * 2) * 100)) : 100
  const color = pct < 30 ? '#c62828' : pct < 60 ? '#f57c00' : '#1a5c2a'
  return { width: pct + '%', background: color }
}

onShow(() => loadData())
</script>

<style lang="scss">
.search-bar {
  background: var(--green); padding: 16rpx 24rpx 24rpx;
}
.search-wrap {
  display: flex; align-items: center; gap: 12rpx;
  background: #fff; border-radius: 40rpx; padding: 16rpx 24rpx;
}
.search-icon  { font-size: 28rpx; }
.search-input { flex: 1; font-size: 28rpx; color: var(--text); }
.search-clear { font-size: 26rpx; color: var(--text3); padding: 4rpx 8rpx; }

.filter-scroll { background: #fff; border-bottom: 1rpx solid var(--border); }
.filter-row    { display: flex; gap: 0; padding: 16rpx 24rpx; white-space: nowrap; }
.filter-tag {
  padding: 12rpx 28rpx; border-radius: 40rpx;
  font-size: 26rpx; color: var(--text2); margin-right: 12rpx;
  background: var(--gray-card); white-space: nowrap;
}
.filter-active { background: var(--green); color: #fff; }

.summary-bar {
  display: flex; justify-content: space-between; align-items: center;
  padding: 16rpx 24rpx;
  .summary-text { font-size: 24rpx; color: var(--text3); }
}

.product-row {
  display: flex; align-items: center; padding: 24rpx 32rpx;
  border-bottom: 1rpx solid var(--border);
}
.pr-left  { margin-right: 16rpx; }
.pr-main  { flex: 1; min-width: 0; }
.pr-top   { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8rpx; }
.pr-name  { font-size: 30rpx; font-weight: 600; color: var(--text); flex: 1; margin-right: 12rpx; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.pr-mid   { margin-bottom: 10rpx; }
.pr-meta  { font-size: 24rpx; color: var(--text3); }
.pr-bottom { display: flex; align-items: center; gap: 12rpx; }

.stock-bar-wrap { flex: 1; height: 8rpx; background: var(--gray-card); border-radius: 4rpx; overflow: hidden; }
.stock-bar-fill { height: 100%; border-radius: 4rpx; transition: width .3s; }

.pr-stock { font-size: 24rpx; font-weight: 600; white-space: nowrap; }
.pr-price { font-size: 26rpx; color: var(--text2); margin: 0 16rpx; white-space: nowrap; }
.pr-arrow { font-size: 32rpx; color: var(--text3); }

.cat-dot  { width: 16rpx; height: 16rpx; border-radius: 50%; }
.dot-blue   { background: var(--blue); }
.dot-green  { background: var(--green); }
.dot-purple { background: #7b1fa2; }
.dot-gray   { background: var(--text3); }

.load-more {
  text-align: center; padding: 32rpx;
  font-size: 26rpx; color: var(--text3);
}
</style>

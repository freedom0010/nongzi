<template>
  <view class="page-container">

    <!-- 筛选栏 -->
    <view class="filter-bar">
      <view class="type-tabs">
        <view :class="['type-tab', typeFilter==='all' ? 'tab-active-gray':'']" @tap="setType('all')">全部</view>
        <view :class="['type-tab', typeFilter==='in'  ? 'tab-active-green':'']" @tap="setType('in')">入库</view>
        <view :class="['type-tab', typeFilter==='out' ? 'tab-active-amber':'']" @tap="setType('out')">出库</view>
      </view>
      <view class="date-row">
        <picker mode="date" :value="startDate" @change="e => { startDate=e.detail.value; loadData() }">
          <view class="date-btn">{{ startDate || '开始日期' }}</view>
        </picker>
        <text style="color:#999;margin:0 8rpx">—</text>
        <picker mode="date" :value="endDate" @change="e => { endDate=e.detail.value; loadData() }">
          <view class="date-btn">{{ endDate || '结束日期' }}</view>
        </picker>
        <view class="clear-date" @tap="clearDate">重置</view>
      </view>
      <view class="search-wrap" style="margin-top:12rpx">
        <text style="font-size:26rpx">🔍</text>
        <input v-model="keyword" class="search-input" placeholder="搜索商品名称…" @input="onSearch" />
      </view>
    </view>

    <!-- 合计条 -->
    <view class="summary-bar2">
      <view class="sum-item">
        <text class="sum-num green-text">+{{ totalIn }}</text>
        <text class="sum-lab">入库件</text>
      </view>
      <view class="sum-div" />
      <view class="sum-item">
        <text class="sum-num amber-text">-{{ totalOut }}</text>
        <text class="sum-lab">出库件</text>
      </view>
      <view class="sum-div" />
      <view class="sum-item">
        <text class="sum-num">{{ total }}</text>
        <text class="sum-lab">条记录</text>
      </view>
    </view>

    <!-- 记录列表 -->
    <view class="card" style="padding:0">
      <view v-if="loading && list.length===0" class="empty-box"><text>加载中…</text></view>
      <view v-else-if="list.length===0" class="empty-box"><text>暂无记录</text></view>
      <view v-for="r in list" :key="r.id" class="record-row">
        <view :class="['rec-type-bar', r.type==='in' ? 'bar-green':'bar-amber']" />
        <view class="rec-main">
          <view class="rec-top">
            <text class="rec-name">{{ r.product_name }}</text>
            <text :class="['rec-qty', r.type==='in'?'green-text':'amber-text']">
              {{ r.type==='in' ? '+' : '-' }}{{ r.qty }}
            </text>
          </view>
          <view class="rec-mid">
            <view :class="['badge', r.type==='in'?'badge-in':'badge-out']" style="margin-right:12rpx">
              {{ r.type==='in' ? '入库' : '出库' }}
            </view>
            <text class="rec-meta">{{ r.type==='in' ? r.supplier||'—' : r.customer||'—' }}</text>
          </view>
          <view class="rec-bottom">
            <text class="rec-time">{{ r.created_at?.slice(0,16) }}</text>
            <text class="rec-operator">{{ r.operator_name }}</text>
            <text v-if="r.total_amount" class="rec-amount">¥{{ r.total_amount }}</text>
          </view>
        </view>
      </view>
    </view>

    <view v-if="hasMore" class="load-more" @tap="loadMore">
      <text>{{ loadingMore ? '加载中…' : '上拉/点击加载更多' }}</text>
    </view>

    <view class="safe-bottom" />
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { stockApi } from '../../api/index.js'

const typeFilter  = ref('all')
const keyword     = ref('')
const startDate   = ref('')
const endDate     = ref('')
const list        = ref([])
const total       = ref(0)
const page        = ref(1)
const loading     = ref(false)
const loadingMore = ref(false)
const hasMore     = ref(false)
let   searchTimer = null

const totalIn  = computed(() => list.value.filter(r=>r.type==='in').reduce((a,b)=>a+b.qty,0))
const totalOut = computed(() => list.value.filter(r=>r.type==='out').reduce((a,b)=>a+b.qty,0))

async function loadData(reset = true) {
  if (reset) { page.value = 1; list.value = [] }
  loading.value = reset
  try {
    const res = await stockApi.records({
      page: page.value, pageSize: 20,
      type:       typeFilter.value !== 'all' ? typeFilter.value : undefined,
      keyword:    keyword.value || undefined,
      start_date: startDate.value || undefined,
      end_date:   endDate.value   || undefined,
    })
    list.value   = reset ? res.data : [...list.value, ...res.data]
    total.value  = res.total
    hasMore.value = list.value.length < res.total
  } finally {
    loading.value     = false
    loadingMore.value = false
  }
}

async function loadMore() {
  if (loadingMore.value || !hasMore.value) return
  loadingMore.value = true; page.value++
  await loadData(false)
}

function setType(t)  { typeFilter.value = t; loadData() }
function onSearch()  { clearTimeout(searchTimer); searchTimer = setTimeout(() => loadData(), 400) }
function clearDate() { startDate.value = ''; endDate.value = ''; loadData() }

onShow(() => loadData())
</script>

<style lang="scss">
.filter-bar {
  background: #fff; padding: 16rpx 24rpx; border-bottom: 1rpx solid var(--border);
}
.type-tabs { display: flex; gap: 12rpx; margin-bottom: 12rpx; }
.type-tab  {
  padding: 10rpx 24rpx; border-radius: 40rpx;
  font-size: 26rpx; color: var(--text2); background: var(--gray-card);
}
.tab-active-gray  { background: var(--text2); color: #fff; }
.tab-active-green { background: var(--green); color: #fff; }
.tab-active-amber { background: var(--amber); color: #fff; }

.date-row { display: flex; align-items: center; }
.date-btn {
  padding: 10rpx 20rpx; background: var(--gray-card);
  border-radius: 8rpx; font-size: 24rpx; color: var(--text2);
}
.clear-date {
  margin-left: 16rpx; font-size: 24rpx; color: var(--green); padding: 10rpx;
}
.search-wrap {
  display: flex; align-items: center; gap: 12rpx;
  background: var(--gray-card); border-radius: 40rpx; padding: 12rpx 24rpx;
}
.search-input { flex: 1; font-size: 26rpx; color: var(--text); }

.summary-bar2 {
  display: flex; background: #fff;
  padding: 16rpx 24rpx; border-bottom: 1rpx solid var(--border);
}
.sum-item { flex: 1; text-align: center; }
.sum-num  { display: block; font-size: 36rpx; font-weight: 700; }
.sum-lab  { display: block; font-size: 22rpx; color: var(--text3); margin-top: 4rpx; }
.sum-div  { width: 1rpx; background: var(--border); margin: 8rpx 0; }

.record-row {
  display: flex; border-bottom: 1rpx solid var(--border);
  &:last-child { border-bottom: none; }
}
.rec-type-bar { width: 8rpx; flex-shrink: 0; }
.bar-green { background: var(--green); }
.bar-amber { background: var(--amber); }
.rec-main { flex: 1; padding: 20rpx 24rpx; }
.rec-top  { display: flex; justify-content: space-between; margin-bottom: 8rpx; }
.rec-name { font-size: 30rpx; font-weight: 600; color: var(--text); flex:1; margin-right:12rpx; }
.rec-qty  { font-size: 32rpx; font-weight: 700; }
.rec-mid  { display: flex; align-items: center; margin-bottom: 8rpx; }
.rec-meta { font-size: 24rpx; color: var(--text2); }
.rec-bottom { display: flex; align-items: center; gap: 16rpx; }
.rec-time     { font-size: 22rpx; color: var(--text3); }
.rec-operator { font-size: 22rpx; color: var(--text3); }
.rec-amount   { font-size: 24rpx; color: var(--green-mid); margin-left: auto; font-weight: 600; }

.green-text { color: var(--green-mid); }
.amber-text { color: var(--amber); }
.load-more  { text-align: center; padding: 32rpx; font-size: 26rpx; color: var(--text3); }
</style>

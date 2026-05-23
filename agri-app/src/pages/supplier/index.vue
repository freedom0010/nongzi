<template>
  <view class="page-container">

    <view class="card" style="margin-bottom:0">
      <button class="btn btn-green btn-block" @tap="openAdd">+ 新增供应商</button>
    </view>

    <view class="card" style="padding:0;margin-top:16rpx">
      <view v-if="list.length===0" class="empty-box"><text>暂无供应商</text></view>
      <view v-for="s in list" :key="s.id" class="sup-row">
        <view class="sup-main">
          <text class="sup-name">{{ s.name }}</text>
          <text class="sup-meta">{{ s.contact || '—' }} {{ s.phone ? '· '+s.phone : '' }}</text>
          <text v-if="s.address" class="sup-addr">{{ s.address }}</text>
        </view>
        <view class="sup-actions">
          <view class="action-btn" @tap="openEdit(s)">编辑</view>
          <view class="action-btn red-text" @tap="remove(s)">删除</view>
        </view>
      </view>
    </view>

    <!-- 新增/编辑弹窗 -->
    <uni-popup :show="showModal" type="bottom" @close="showModal=false">
      <view class="popup-sheet">
        <view class="popup-title">{{ editItem ? '编辑供应商' : '新增供应商' }}</view>
        <view class="form-item">
          <view class="form-label form-required">供应商名称</view>
          <input v-model="form.name" class="input-box" placeholder="如：绿丰农资" />
        </view>
        <view class="form-item">
          <view class="form-label">联系人</view>
          <input v-model="form.contact" class="input-box" placeholder="可选" />
        </view>
        <view class="form-item">
          <view class="form-label">电话</view>
          <input v-model="form.phone" class="input-box" type="tel" placeholder="可选" />
        </view>
        <view class="form-item">
          <view class="form-label">地址</view>
          <input v-model="form.address" class="input-box" placeholder="可选" />
        </view>
        <view class="popup-btns">
          <button class="btn btn-ghost" style="flex:1" @tap="showModal=false">取消</button>
          <button class="btn btn-green" style="flex:2;margin-left:16rpx" :loading="saving" @tap="save">保存</button>
        </view>
        <view class="safe-bottom" />
      </view>
    </uni-popup>

    <view class="safe-bottom" />
  </view>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { supplierApi } from '../../api/index.js'

const list      = ref([])
const showModal = ref(false)
const saving    = ref(false)
const editItem  = ref(null)
const form = reactive({ name: '', contact: '', phone: '', address: '' })

async function load() {
  const { data } = await supplierApi.list()
  list.value = data || []
}

function openAdd() {
  editItem.value = null
  Object.assign(form, { name: '', contact: '', phone: '', address: '' })
  showModal.value = true
}
function openEdit(s) {
  editItem.value = s
  Object.assign(form, { name: s.name, contact: s.contact||'', phone: s.phone||'', address: s.address||'' })
  showModal.value = true
}

async function save() {
  if (!form.name.trim()) return uni.showToast({ title: '请输入供应商名称', icon: 'none' })
  saving.value = true
  try {
    if (editItem.value) {
      await supplierApi.update(editItem.value.id, form)
      uni.showToast({ title: '更新成功', icon: 'success' })
    } else {
      await supplierApi.create(form)
      uni.showToast({ title: '创建成功', icon: 'success' })
    }
    showModal.value = false
    load()
  } finally {
    saving.value = false
  }
}

function remove(s) {
  uni.showModal({
    title: '确认删除',
    content: `确定删除供应商「${s.name}」吗？`,
    async success(res) {
      if (res.confirm) {
        await supplierApi.remove(s.id)
        uni.showToast({ title: '已删除', icon: 'success' })
        load()
      }
    }
  })
}

onMounted(load)
</script>

<style lang="scss">
.sup-row {
  display: flex; align-items: center; padding: 28rpx 32rpx;
  border-bottom: 1rpx solid var(--border);
  &:last-child { border-bottom: none; }
}
.sup-main    { flex: 1; }
.sup-name    { font-size: 30rpx; font-weight: 600; color: var(--text); display: block; }
.sup-meta    { font-size: 24rpx; color: var(--text3); display: block; margin-top: 6rpx; }
.sup-addr    { font-size: 22rpx; color: var(--text3); display: block; margin-top: 4rpx; }
.sup-actions { display: flex; gap: 16rpx; margin-left: 16rpx; }
.action-btn  { font-size: 26rpx; color: var(--green); padding: 8rpx 16rpx; background: var(--green-light); border-radius: 8rpx; }
.red-text    { color: var(--red) !important; background: var(--red-light) !important; }

.popup-sheet { background: #fff; border-radius: 32rpx 32rpx 0 0; padding: 40rpx 32rpx 0; }
.popup-title { font-size: 34rpx; font-weight: 700; margin-bottom: 32rpx; text-align: center; }
.popup-btns  { display: flex; margin-top: 16rpx; padding-bottom: 24rpx; }
.popup-btns .btn { height: 96rpx; font-size: 30rpx; }
</style>

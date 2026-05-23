<template>
  <view class="page-container">

    <!-- 仅管理员可见提示 -->
    <view v-if="!isAdmin" class="no-perm-card">
      <text class="no-perm-icon">🔒</text>
      <text class="no-perm-title">权限不足</text>
      <text class="no-perm-sub">员工管理仅管理员可操作</text>
    </view>

    <view v-else>
      <!-- 顶部统计 -->
      <view class="stat-row">
        <view class="stat-card green">
          <text class="s-num">{{ total }}</text>
          <text class="s-lab">员工总数</text>
        </view>
        <view class="stat-card blue">
          <text class="s-num">{{ activeCount }}</text>
          <text class="s-lab">在职</text>
        </view>
        <view class="stat-card amber">
          <text class="s-num">{{ adminCount }}</text>
          <text class="s-lab">管理员</text>
        </view>
        <view class="stat-card gray">
          <text class="s-num">{{ disabledCount }}</text>
          <text class="s-lab">已禁用</text>
        </view>
      </view>

      <!-- 新增按钮 -->
      <view style="padding:0 24rpx 16rpx">
        <button class="btn btn-green btn-block" @tap="openAdd">
          ＋ 新增员工账号
        </button>
      </view>

      <!-- 员工列表 -->
      <view class="card" style="padding:0">
        <view v-if="list.length === 0" class="empty-box">
          <text>暂无员工数据</text>
        </view>
        <view v-for="user in list" :key="user.id" class="user-row">
          <!-- 头像 -->
          <view :class="['user-avatar', user.role === 'admin' ? 'avatar-admin' : 'avatar-staff']">
            <text class="avatar-letter">{{ user.real_name.slice(0,1) }}</text>
          </view>

          <!-- 信息 -->
          <view class="user-info">
            <view class="user-name-row">
              <text class="user-name">{{ user.real_name }}</text>
              <view :class="['role-badge', user.role === 'admin' ? 'badge-admin' : 'badge-staff']">
                {{ user.role === 'admin' ? '👑 管理员' : '👤 员工' }}
              </view>
            </view>
            <text class="user-account">账号：{{ user.username }}</text>
            <text v-if="user.phone" class="user-phone">📱 {{ user.phone }}</text>
            <view class="user-status-row">
              <view :class="['status-dot', user.is_active ? 'dot-active' : 'dot-inactive']" />
              <text class="status-text">{{ user.is_active ? '正常' : '已禁用' }}</text>
              <text class="join-date">{{ user.created_at?.slice(0,10) }} 加入</text>
            </view>
          </view>

          <!-- 操作菜单 -->
          <view class="user-menu" @tap="openMenu(user)">
            <text class="menu-dots">⋯</text>
          </view>
        </view>
      </view>
    </view>

    <!-- ── 新增/编辑员工弹窗 ── -->
    <uni-popup ref="formPopup" :show="showForm" type="bottom" @close="showForm=false">
      <view class="popup-sheet">
        <view class="popup-handle" />
        <view class="popup-head">
          <text class="popup-title">{{ editUser ? '编辑员工' : '新增员工' }}</text>
          <text class="popup-close" @tap="showForm=false">✕</text>
        </view>

        <view class="form-item">
          <view class="form-label form-required">登录账号</view>
          <input
            v-model="form.username"
            class="input-box"
            placeholder="字母+数字，4-20位"
            :disabled="!!editUser"
            placeholder-style="color:#bbb"
          />
        </view>

        <view v-if="!editUser" class="form-item">
          <view class="form-label form-required">初始密码</view>
          <input
            v-model="form.password"
            class="input-box"
            :password="showPwd ? false : true"
            placeholder="至少6位"
            placeholder-style="color:#bbb"
          />
          <text class="pwd-toggle" @tap="showPwd=!showPwd">{{ showPwd ? '隐藏' : '显示' }}</text>
        </view>

        <view class="form-item">
          <view class="form-label form-required">员工姓名</view>
          <input
            v-model="form.real_name"
            class="input-box"
            placeholder="真实姓名"
            placeholder-style="color:#bbb"
          />
        </view>

        <view class="form-item">
          <view class="form-label">手机号</view>
          <input
            v-model="form.phone"
            class="input-box"
            type="tel"
            placeholder="可选"
            placeholder-style="color:#bbb"
          />
        </view>

        <view class="form-item">
          <view class="form-label">角色</view>
          <view class="role-picker">
            <view
              :class="['role-opt', form.role === 'staff' ? 'role-opt-active' : '']"
              @tap="form.role = 'staff'"
            >
              <text class="role-opt-icon">👤</text>
              <view>
                <text class="role-opt-name">普通员工</text>
                <text class="role-opt-desc">可入库、出库、查库存</text>
              </view>
            </view>
            <view
              :class="['role-opt', form.role === 'admin' ? 'role-opt-active role-admin-active' : '']"
              @tap="form.role = 'admin'"
            >
              <text class="role-opt-icon">👑</text>
              <view>
                <text class="role-opt-name">管理员</text>
                <text class="role-opt-desc">全部权限，含员工管理</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 员工精细权限（仅 staff 角色可配置） -->
        <view v-if="form.role === 'staff'" class="perm-section">
          <view class="perm-title">精细权限设置</view>
          <view class="perm-list">
            <view class="perm-item" v-for="p in permOptions" :key="p.key">
              <view class="perm-info">
                <text class="perm-name">{{ p.label }}</text>
                <text class="perm-desc">{{ p.desc }}</text>
              </view>
              <switch
                :checked="form.permissions[p.key]"
                color="#1a5c2a"
                @change="e => form.permissions[p.key] = e.detail.value"
              />
            </view>
          </view>
        </view>

        <view class="popup-btns">
          <button class="btn btn-ghost" style="flex:1" @tap="showForm=false">取消</button>
          <button
            class="btn btn-green"
            style="flex:2;margin-left:16rpx"
            :loading="saving"
            @tap="saveUser"
          >
            {{ editUser ? '保存修改' : '创建账号' }}
          </button>
        </view>
        <view class="safe-bottom" />
      </view>
    </uni-popup>

    <!-- ── 操作菜单弹窗 ── -->
    <uni-popup ref="menuPopup" :show="showMenu" type="bottom" @close="showMenu=false">
      <view class="popup-sheet" v-if="menuUser">
        <view class="popup-handle" />
        <view class="menu-user-header">
          <view :class="['user-avatar-sm', menuUser.role === 'admin' ? 'avatar-admin' : 'avatar-staff']">
            <text>{{ menuUser.real_name.slice(0,1) }}</text>
          </view>
          <view>
            <text class="menu-user-name">{{ menuUser.real_name }}</text>
            <text class="menu-user-account">{{ menuUser.username }}</text>
          </view>
        </view>

        <view class="menu-actions">
          <view class="menu-action-item" @tap="openEdit(menuUser)">
            <text class="ma-icon">✏️</text>
            <text class="ma-label">编辑信息 / 权限</text>
            <text class="ma-arrow">›</text>
          </view>
          <view class="menu-action-item" @tap="doResetPwd(menuUser)">
            <text class="ma-icon">🔑</text>
            <text class="ma-label">重置密码</text>
            <text class="ma-arrow">›</text>
          </view>
          <view
            class="menu-action-item"
            :class="{ 'item-disable': !menuUser.is_active }"
            @tap="doToggleStatus(menuUser)"
          >
            <text class="ma-icon">{{ menuUser.is_active ? '🚫' : '✅' }}</text>
            <text class="ma-label">{{ menuUser.is_active ? '禁用账号' : '启用账号' }}</text>
            <text class="ma-arrow">›</text>
          </view>
          <view
            v-if="menuUser.id !== currentUser?.id"
            class="menu-action-item item-danger"
            @tap="doDelete(menuUser)"
          >
            <text class="ma-icon">🗑</text>
            <text class="ma-label">删除账号</text>
            <text class="ma-arrow">›</text>
          </view>
        </view>

        <button class="btn btn-ghost btn-block" style="margin:16rpx 0" @tap="showMenu=false">
          取消
        </button>
        <view class="safe-bottom" />
      </view>
    </uni-popup>

    <!-- 重置密码弹窗 -->
    <uni-popup ref="resetPopup" :show="showReset" type="center" @close="showReset=false">
      <view class="center-popup">
        <view class="center-title">重置密码</view>
        <text class="center-sub">为「{{ menuUser?.real_name }}」设置新密码</text>
        <input
          v-model="newPwd"
          class="input-box"
          style="margin:24rpx 0"
          :password="true"
          placeholder="新密码，至少6位"
          placeholder-style="color:#bbb"
        />
        <view class="center-btns">
          <button class="btn btn-ghost" style="flex:1" @tap="showReset=false">取消</button>
          <button
            class="btn btn-green"
            style="flex:1;margin-left:16rpx"
            :loading="resetting"
            @tap="confirmResetPwd"
          >确认重置</button>
        </view>
      </view>
    </uni-popup>

    <view class="safe-bottom" />
  </view>
</template>

<script setup>
import { ref, computed, reactive, onMounted } from 'vue'
import { useUserStore } from '../../store/index.js'
import { http } from '../../utils/request.js'

const userStore   = useUserStore()
const isAdmin     = computed(() => userStore.isAdmin)
const currentUser = computed(() => userStore.userInfo)

// ── 列表数据 ─────────────────────────────────────────────
const list    = ref([])
const total   = ref(0)
const loading = ref(false)

const activeCount   = computed(() => list.value.filter(u => u.is_active).length)
const adminCount    = computed(() => list.value.filter(u => u.role === 'admin').length)
const disabledCount = computed(() => list.value.filter(u => !u.is_active).length)

// ── 精细权限选项 ─────────────────────────────────────────
const permOptions = [
  { key: 'stock_in',      label: '入库操作',   desc: '允许执行入库' },
  { key: 'stock_out',     label: '出库操作',   desc: '允许执行出库' },
  { key: 'product_delete',label: '删除商品',   desc: '允许删除库存商品' },
  { key: 'record_export', label: '导出记录',   desc: '允许导出出入库数据' },
  { key: 'supplier_edit', label: '编辑供应商', desc: '允许增改供应商信息' },
  { key: 'report_view',   label: '查看报表',   desc: '允许查看销售统计报表' },
  { key: 'price_view',    label: '查看价格',   desc: '允许查看进价和售价' },
]

const defaultPerms = () => ({
  stock_in: true, stock_out: true, product_delete: false,
  record_export: false, supplier_edit: false,
  report_view: false, price_view: true,
})

// ── 表单状态 ─────────────────────────────────────────────
const showForm  = ref(false)
const showMenu  = ref(false)
const showReset = ref(false)
const showPwd   = ref(false)
const saving    = ref(false)
const resetting = ref(false)
const editUser  = ref(null)
const menuUser  = ref(null)
const newPwd    = ref('')

const form = reactive({
  username: '', password: '', real_name: '',
  phone: '', role: 'staff',
  permissions: defaultPerms(),
})

// ── 加载数据 ─────────────────────────────────────────────
async function loadList() {
  if (!isAdmin.value) return
  loading.value = true
  try {
    const res  = await http.get('/users', { pageSize: 100 })
    list.value  = res.data  || []
    total.value = res.total || list.value.length
  } finally { loading.value = false }
}

// ── 打开新增 ─────────────────────────────────────────────
function openAdd() {
  editUser.value = null
  Object.assign(form, { username: '', password: '', real_name: '', phone: '', role: 'staff' })
  form.permissions = defaultPerms()
  showPwd.value  = false
  showForm.value = true
}

// ── 打开编辑 ─────────────────────────────────────────────
function openEdit(user) {
  showMenu.value = false
  editUser.value = user
  Object.assign(form, {
    username:  user.username,
    real_name: user.real_name,
    phone:     user.phone || '',
    role:      user.role,
  })
  form.permissions = defaultPerms()
  showForm.value = true
}

// ── 打开操作菜单 ─────────────────────────────────────────
function openMenu(user) {
  menuUser.value = user
  showMenu.value = true
}

// ── 保存员工 ─────────────────────────────────────────────
async function saveUser() {
  if (!form.username.trim())  return uni.showToast({ title: '请填写账号', icon: 'none' })
  if (!form.real_name.trim()) return uni.showToast({ title: '请填写姓名', icon: 'none' })
  if (!editUser.value && form.password.length < 6) {
    return uni.showToast({ title: '密码至少6位', icon: 'none' })
  }

  saving.value = true
  try {
    if (editUser.value) {
      await http.put(`/users/${editUser.value.id}`, {
        real_name: form.real_name, role: form.role, phone: form.phone,
      })
    } else {
      await http.post('/users', {
        username:  form.username,
        password:  form.password,
        real_name: form.real_name,
        role:      form.role,
        phone:     form.phone,
      })
    }
    uni.showToast({ title: editUser.value ? '修改成功' : '账号已创建', icon: 'success' })
    showForm.value = false
    loadList()
  } finally { saving.value = false }
}

// ── 重置密码 ─────────────────────────────────────────────
function doResetPwd(user) {
  menuUser.value  = user
  newPwd.value    = ''
  showMenu.value  = false
  showReset.value = true
}

async function confirmResetPwd() {
  if (newPwd.value.length < 6) return uni.showToast({ title: '密码至少6位', icon: 'none' })
  resetting.value = true
  try {
    await http.put(`/users/${menuUser.value.id}/reset-password`, { new_password: newPwd.value })
    uni.showToast({ title: '密码已重置', icon: 'success' })
    showReset.value = false
  } finally { resetting.value = false }
}

// ── 启用/禁用 ─────────────────────────────────────────────
function doToggleStatus(user) {
  showMenu.value = false
  const action   = user.is_active ? '禁用' : '启用'
  uni.showModal({
    title:   `确认${action}`,
    content: `确定${action}账号「${user.real_name}」吗？`,
    async success(res) {
      if (!res.confirm) return
      await http.put(`/users/${user.id}/status`, { active: !user.is_active })
      uni.showToast({ title: `已${action}`, icon: 'success' })
      loadList()
    }
  })
}

// ── 删除 ─────────────────────────────────────────────────
function doDelete(user) {
  showMenu.value = false
  uni.showModal({
    title:        '确认删除',
    content:      `删除账号「${user.real_name}」后不可恢复，确定吗？`,
    confirmColor: '#c62828',
    async success(res) {
      if (!res.confirm) return
      await http.delete(`/users/${user.id}`)
      uni.showToast({ title: '已删除', icon: 'success' })
      loadList()
    }
  })
}

onMounted(loadList)
</script>

<style lang="scss">
/* ── 无权限 ── */
.no-perm-card {
  display: flex; flex-direction: column; align-items: center;
  justify-content: center; min-height: 60vh;
}
.no-perm-icon  { font-size: 96rpx; margin-bottom: 24rpx; }
.no-perm-title { font-size: 36rpx; font-weight: 700; color: var(--text); margin-bottom: 12rpx; }
.no-perm-sub   { font-size: 28rpx; color: var(--text3); }

/* ── 统计行 ── */
.stat-row {
  display: grid; grid-template-columns: repeat(4,1fr);
  gap: 12rpx; padding: 24rpx 24rpx 16rpx;
}
.stat-card {
  background: var(--white); border-radius: var(--radius-md);
  padding: 20rpx 12rpx; text-align: center;
  box-shadow: var(--shadow); border-top: 6rpx solid transparent;
  &.green { border-color: var(--green); }
  &.blue  { border-color: var(--blue);  }
  &.amber { border-color: var(--amber); }
  &.gray  { border-color: var(--text3); }
}
.s-num { display: block; font-size: 40rpx; font-weight: 700; color: var(--text); }
.s-lab { display: block; font-size: 20rpx; color: var(--text3); margin-top: 4rpx; }

/* ── 员工列表 ── */
.user-row {
  display: flex; align-items: center;
  padding: 28rpx 32rpx; border-bottom: 1rpx solid var(--border);
  &:last-child { border-bottom: none; }
}

.user-avatar {
  width: 88rpx; height: 88rpx; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0; margin-right: 24rpx;
}
.avatar-admin { background: linear-gradient(135deg,#f57c00,#ff9800); }
.avatar-staff { background: linear-gradient(135deg,#1a5c2a,#2e7d32); }
.avatar-letter { font-size: 40rpx; color: #fff; font-weight: 700; }

.user-info   { flex: 1; min-width: 0; }
.user-name-row {
  display: flex; align-items: center; gap: 12rpx; margin-bottom: 8rpx;
}
.user-name    { font-size: 32rpx; font-weight: 700; color: var(--text); }
.role-badge   {
  font-size: 20rpx; padding: 4rpx 12rpx;
  border-radius: 20rpx; font-weight: 600; flex-shrink: 0;
}
.badge-admin { background: #fff3e0; color: var(--amber); }
.badge-staff { background: var(--green-light); color: var(--green-mid); }

.user-account { font-size: 24rpx; color: var(--text3); display: block; margin-bottom: 4rpx; }
.user-phone   { font-size: 24rpx; color: var(--text3); display: block; margin-bottom: 8rpx; }

.user-status-row {
  display: flex; align-items: center; gap: 8rpx;
}
.status-dot { width: 12rpx; height: 12rpx; border-radius: 50%; }
.dot-active   { background: var(--green); }
.dot-inactive { background: var(--text3); }
.status-text { font-size: 22rpx; color: var(--text2); }
.join-date   { font-size: 20rpx; color: var(--text3); margin-left: auto; }

.user-menu   { padding: 16rpx; }
.menu-dots   { font-size: 40rpx; color: var(--text3); letter-spacing: 2rpx; }

/* ── 弹窗 ── */
.popup-sheet {
  background: #fff; border-radius: 32rpx 32rpx 0 0;
  padding: 0 32rpx 0; max-height: 90vh; overflow-y: auto;
}
.popup-handle {
  width: 80rpx; height: 8rpx; background: var(--border);
  border-radius: 4rpx; margin: 16rpx auto 0;
}
.popup-head {
  display: flex; justify-content: space-between; align-items: center;
  padding: 24rpx 0 16rpx;
}
.popup-title { font-size: 34rpx; font-weight: 700; color: var(--text); }
.popup-close { font-size: 32rpx; color: var(--text3); padding: 8rpx; }

.pwd-toggle {
  display: block; text-align: right; font-size: 24rpx;
  color: var(--green); margin-top: 8rpx;
}

/* ── 角色选择 ── */
.role-picker { display: flex; flex-direction: column; gap: 16rpx; }
.role-opt {
  display: flex; align-items: center; gap: 20rpx;
  padding: 24rpx; border-radius: var(--radius-md);
  border: 2rpx solid var(--border); background: var(--white);
}
.role-opt-active       { border-color: var(--green); background: var(--green-light); }
.role-admin-active     { border-color: var(--amber); background: #fff8f0; }
.role-opt-icon         { font-size: 48rpx; flex-shrink: 0; }
.role-opt-name         { font-size: 30rpx; font-weight: 600; color: var(--text); display: block; }
.role-opt-desc         { font-size: 22rpx; color: var(--text3); display: block; margin-top: 4rpx; }

/* ── 精细权限 ── */
.perm-section { margin-top: 8rpx; }
.perm-title {
  font-size: 26rpx; font-weight: 600; color: var(--text2);
  padding: 16rpx 0 12rpx; border-top: 1rpx solid var(--border);
}
.perm-list   { }
.perm-item   {
  display: flex; align-items: center; justify-content: space-between;
  padding: 18rpx 0; border-bottom: 1rpx solid var(--border);
  &:last-child { border-bottom: none; }
}
.perm-info   { flex: 1; }
.perm-name   { font-size: 28rpx; color: var(--text); font-weight: 500; display: block; }
.perm-desc   { font-size: 22rpx; color: var(--text3); display: block; margin-top: 4rpx; }

.popup-btns  {
  display: flex; padding: 24rpx 0 16rpx;
  .btn { height: 96rpx; font-size: 30rpx; }
}

/* ── 操作菜单 ── */
.menu-user-header {
  display: flex; align-items: center; gap: 20rpx;
  padding: 24rpx 0 20rpx; border-bottom: 1rpx solid var(--border);
}
.user-avatar-sm {
  width: 72rpx; height: 72rpx; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 32rpx; color: #fff; font-weight: 700;
}
.menu-user-name    { font-size: 32rpx; font-weight: 700; color: var(--text); display: block; }
.menu-user-account { font-size: 24rpx; color: var(--text3); display: block; margin-top: 4rpx; }

.menu-actions { padding: 8rpx 0; }
.menu-action-item {
  display: flex; align-items: center; gap: 16rpx;
  padding: 28rpx 0; border-bottom: 1rpx solid var(--border);
  &:last-child { border-bottom: none; }
}
.ma-icon  { font-size: 36rpx; flex-shrink: 0; }
.ma-label { flex: 1; font-size: 30rpx; color: var(--text); }
.ma-arrow { font-size: 32rpx; color: var(--text3); }
.item-disable .ma-label { color: var(--green-mid); }
.item-danger  .ma-label { color: var(--red); }

/* ── 重置密码弹窗 ── */
.center-popup {
  background: #fff; border-radius: 24rpx;
  padding: 40rpx 32rpx; width: 620rpx; margin: 0 auto;
}
.center-title { font-size: 34rpx; font-weight: 700; text-align: center; margin-bottom: 12rpx; }
.center-sub   { font-size: 26rpx; color: var(--text3); text-align: center; display: block; }
.center-btns  { display: flex; gap: 16rpx; margin-top: 8rpx;
  .btn { flex: 1; height: 88rpx; font-size: 28rpx; }
}
</style>

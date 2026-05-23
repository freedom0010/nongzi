<template>
  <view class="page-container">

    <!-- 用户信息头部 -->
    <view class="profile-header">
      <view class="avatar-lg">{{ avatarLetter }}</view>
      <view class="profile-info">
        <text class="profile-name">{{ user?.real_name }}</text>
        <view class="role-badge">{{ user?.role === 'admin' ? '👑 管理员' : '👤 员工' }}</view>
        <text class="profile-account">账号：{{ user?.username }}</text>
      </view>
    </view>

    <!-- 功能菜单 -->
    <view class="card" style="padding:0;margin-top:24rpx">
      <view v-if="userStore.isAdmin" class="menu-item" @tap="goUsers">
        <text class="menu-icon">👥</text>
        <text class="menu-label">员工账号管理</text>
        <text class="menu-arrow">›</text>
      </view>
      <view class="menu-item" @tap="goSupplier">
        <text class="menu-icon">🏭</text>
        <text class="menu-label">供应商管理</text>
        <text class="menu-arrow">›</text>
      </view>
      <view class="menu-item" @tap="goCategory">
        <text class="menu-icon">📂</text>
        <text class="menu-label">商品分类管理</text>
        <text class="menu-arrow">›</text>
      </view>
      <view class="menu-item" @tap="goWarn">
        <text class="menu-icon">⚠️</text>
        <text class="menu-label">库存预警设置</text>
        <text class="menu-sub">{{ warnCount }} 种商品预警中</text>
        <text class="menu-arrow">›</text>
      </view>
    </view>

    <view class="card" style="padding:0;margin-top:24rpx">
      <view class="menu-item" @tap="showPwdModal = true">
        <text class="menu-icon">🔒</text>
        <text class="menu-label">修改密码</text>
        <text class="menu-arrow">›</text>
      </view>
      <view class="menu-item" @tap="showAbout">
        <text class="menu-icon">ℹ️</text>
        <text class="menu-label">关于 / 版本</text>
        <text class="menu-sub">v1.0.0</text>
        <text class="menu-arrow">›</text>
      </view>
    </view>

    <view style="padding:24rpx">
      <button class="btn btn-outline btn-block" @tap="handleLogout">退出登录</button>
    </view>

    <!-- 修改密码弹窗 -->
    <uni-popup ref="pwdPopup" :show="showPwdModal" type="bottom" @close="showPwdModal=false">
      <view class="popup-sheet">
        <view class="popup-title">修改密码</view>
        <view class="form-item">
          <view class="form-label">旧密码</view>
          <input v-model="pwdForm.old_password" class="input-box" :password="true" placeholder="请输入旧密码" />
        </view>
        <view class="form-item">
          <view class="form-label">新密码</view>
          <input v-model="pwdForm.new_password" class="input-box" :password="true" placeholder="至少6位" />
        </view>
        <view class="form-item">
          <view class="form-label">确认新密码</view>
          <input v-model="pwdForm.confirm" class="input-box" :password="true" placeholder="再次输入新密码" />
        </view>
        <view class="popup-btns">
          <button class="btn btn-ghost" style="flex:1" @tap="showPwdModal=false">取消</button>
          <button class="btn btn-green" style="flex:2;margin-left:16rpx" :loading="savingPwd" @tap="changePwd">确认修改</button>
        </view>
        <view class="safe-bottom" />
      </view>
    </uni-popup>

    <view class="safe-bottom" />
  </view>
</template>

<script setup>
import { ref, computed, reactive, onMounted } from 'vue'
import { useUserStore } from '../../store/index.js'
import { authApi, productApi } from '../../api/index.js'

const userStore    = useUserStore()
const user         = computed(() => userStore.userInfo)
const avatarLetter = computed(() => (user.value?.real_name || 'A').slice(0,1))

const showPwdModal = ref(false)
const savingPwd    = ref(false)
const warnCount    = ref(0)

const pwdForm = reactive({ old_password: '', new_password: '', confirm: '' })

async function changePwd() {
  if (!pwdForm.old_password) return uni.showToast({ title: '请输入旧密码', icon: 'none' })
  if (pwdForm.new_password.length < 6) return uni.showToast({ title: '新密码至少6位', icon: 'none' })
  if (pwdForm.new_password !== pwdForm.confirm) return uni.showToast({ title: '两次密码不一致', icon: 'none' })

  savingPwd.value = true
  try {
    await authApi.changePassword({ old_password: pwdForm.old_password, new_password: pwdForm.new_password })
    uni.showToast({ title: '密码修改成功', icon: 'success' })
    showPwdModal.value = false
    Object.assign(pwdForm, { old_password: '', new_password: '', confirm: '' })
  } finally {
    savingPwd.value = false
  }
}

function handleLogout() {
  uni.showModal({
    title: '确认退出',
    content: '确定要退出登录吗？',
    success(res) {
      if (res.confirm) userStore.logout()
    }
  })
}

function showAbout() {
  uni.showModal({
    title: '农资管家 v1.0.0',
    content: '农资进出库扫码管理系统\n技术支持：Node.js + MySQL + uni-app',
    showCancel: false
  })
}

function goSupplier()  { uni.navigateTo({ url: '/pages/supplier/index' }) }
function goUsers()     { uni.navigateTo({ url: '/pages/users/index' }) }
function goCategory()  { uni.navigateTo({ url: '/pages/supplier/index?tab=category' }) }
function goWarn()      { uni.navigateTo({ url: '/pages/inventory/index?warn=1' }) }

onMounted(async () => {
  try {
    const { data } = await productApi.warnList()
    warnCount.value = data?.length || 0
  } catch {}
})
</script>

<style lang="scss">
.profile-header {
  background: var(--green);
  padding: 40rpx 32rpx 48rpx;
  display: flex; align-items: center; gap: 28rpx;
}
.avatar-lg {
  width: 120rpx; height: 120rpx; border-radius: 50%;
  background: rgba(255,255,255,0.25);
  display: flex; align-items: center; justify-content: center;
  font-size: 56rpx; color: #fff; font-weight: 700; flex-shrink: 0;
}
.profile-info { flex: 1; }
.profile-name    { font-size: 40rpx; font-weight: 700; color: #fff; display: block; }
.role-badge      { display: inline-block; background: rgba(255,255,255,.2); color: #fff; font-size: 24rpx; padding: 4rpx 16rpx; border-radius: 20rpx; margin: 8rpx 0; }
.profile-account { font-size: 24rpx; color: rgba(255,255,255,.7); display: block; }

.menu-item {
  display: flex; align-items: center; padding: 32rpx;
  border-bottom: 1rpx solid var(--border);
  &:last-child { border-bottom: none; }
}
.menu-icon  { font-size: 36rpx; margin-right: 20rpx; }
.menu-label { flex: 1; font-size: 30rpx; color: var(--text); }
.menu-sub   { font-size: 24rpx; color: var(--text3); margin-right: 8rpx; }
.menu-arrow { font-size: 32rpx; color: var(--text3); }

.popup-sheet {
  background: #fff; border-radius: 32rpx 32rpx 0 0;
  padding: 40rpx 32rpx 0;
}
.popup-title {
  font-size: 34rpx; font-weight: 700; color: var(--text);
  margin-bottom: 32rpx; text-align: center;
}
.popup-btns { display: flex; margin-top: 16rpx; padding-bottom: 24rpx; }
.popup-btns .btn { height: 96rpx; font-size: 30rpx; }
</style>

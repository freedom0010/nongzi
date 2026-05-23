<template>
  <view class="login-page">
    <!-- 顶部Logo区 -->
    <view class="logo-area">
      <view class="logo-icon">🌱</view>
      <text class="logo-title">农资管家</text>
      <text class="logo-sub">农资进出库扫码管理系统</text>
    </view>

    <!-- 登录表单 -->
    <view class="form-card">
      <view class="form-item">
        <view class="input-wrap">
          <text class="input-icon">👤</text>
          <input
            v-model="form.username"
            class="login-input"
            placeholder="请输入账号"
            placeholder-style="color:#bbb"
            maxlength="50"
            @confirm="focusPassword"
          />
        </view>
      </view>

      <view class="form-item" style="margin-bottom: 48rpx">
        <view class="input-wrap">
          <text class="input-icon">🔒</text>
          <input
            ref="pwdRef"
            v-model="form.password"
            class="login-input"
            placeholder="请输入密码"
            placeholder-style="color:#bbb"
            :password="true"
            maxlength="50"
            @confirm="handleLogin"
          />
        </view>
      </view>

      <button class="btn btn-green btn-block login-btn" :loading="loading" @tap="handleLogin">
        登 录
      </button>

      <view class="tips">默认账号 admin / admin123，登录后请修改密码</view>
    </view>

    <!-- 版本号 -->
    <text class="version">v1.0.0</text>
  </view>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useUserStore } from '../../store/index.js'

const userStore = useUserStore()
const loading   = ref(false)
const pwdRef    = ref(null)

const form = reactive({ username: '', password: '' })

function focusPassword() { pwdRef.value?.focus?.() }

async function handleLogin() {
  if (!form.username.trim()) return uni.showToast({ title: '请输入账号', icon: 'none' })
  if (!form.password.trim()) return uni.showToast({ title: '请输入密码', icon: 'none' })

  loading.value = true
  try {
    await userStore.login(form.username.trim(), form.password)
    uni.switchTab({ url: '/pages/dashboard/index' })
  } catch (e) {
    // 错误已在 request.js 统一弹出
  } finally {
    loading.value = false
  }
}
</script>

<style lang="scss">
.login-page {
  min-height: 100vh;
  background: linear-gradient(160deg, #1a5c2a 0%, #2e7d32 45%, #f0f2f0 45%);
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 120rpx 48rpx 0;
}

.logo-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 80rpx;
  .logo-icon  { font-size: 100rpx; margin-bottom: 16rpx; }
  .logo-title { font-size: 52rpx; font-weight: 700; color: #fff; letter-spacing: 4rpx; }
  .logo-sub   { font-size: 26rpx; color: rgba(255,255,255,0.8); margin-top: 8rpx; }
}

.form-card {
  width: 100%;
  background: #fff;
  border-radius: 32rpx;
  padding: 60rpx 48rpx 48rpx;
  box-shadow: 0 8rpx 40rpx rgba(0,0,0,0.12);
}

.form-item { margin-bottom: 32rpx; }

.input-wrap {
  display: flex;
  align-items: center;
  background: #f5f7f5;
  border-radius: 16rpx;
  padding: 0 28rpx;
  height: 96rpx;
  border: 2rpx solid transparent;
  &:focus-within { border-color: var(--green); }
}

.input-icon { font-size: 36rpx; margin-right: 16rpx; }

.login-input {
  flex: 1;
  font-size: 30rpx;
  color: #212121;
  height: 100%;
}

.login-btn {
  height: 96rpx;
  font-size: 34rpx;
  border-radius: 16rpx;
  letter-spacing: 4rpx;
}

.tips {
  text-align: center;
  font-size: 24rpx;
  color: #bbb;
  margin-top: 28rpx;
}

.version {
  margin-top: 48rpx;
  font-size: 24rpx;
  color: #bbb;
}
</style>

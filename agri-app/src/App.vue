<script setup>
import { onLaunch, onShow } from '@dcloudio/uni-app'
import { useUserStore } from './store/index.js'
import { initNetworkListener, replayQueue } from './utils/offline.js'

onLaunch(async () => {
  const userStore = useUserStore()
  if (!userStore.isLoggedIn) {
    uni.reLaunch({ url: '/pages/auth/login' })
    return
  }
  initNetworkListener()
  // #ifdef APP-PLUS
  const platform = uni.getSystemInfoSync().platform
  if (platform === 'ios') {
    initIOS()
  } else {
    initAndroid()
  }
  // #endif
})

onShow(() => {
  // #ifdef APP-PLUS
  replayQueue().catch(() => {})
  // #endif
})

function initIOS() {
  // #ifdef APP-PLUS
  // 设置状态栏为白色文字（配合绿色导航栏）
  try {
    plus.navigator.setStatusBarStyle('light')
    plus.navigator.setStatusBarBackground('#1a5c2a')
  } catch(e) {}
  // 检查摄像头权限
  try {
    const AVCaptureDevice = plus.ios.import('AVCaptureDevice')
    const status = AVCaptureDevice.authorizationStatusForMediaType('vide')
    if (status === 2) { // 已拒绝
      uni.showModal({
        title: '需要摄像头权限',
        content: '扫码功能需要摄像头权限，请在「设置 > 隐私 > 相机」中开启',
        confirmText: '去设置',
        cancelText: '忽略',
        success: function(res) {
          if (res.confirm) {
            var url = plus.ios.import('NSURL').URLWithString('app-settings:')
            plus.ios.import('UIApplication').sharedApplication().openURL(url)
          }
        }
      })
    }
  } catch(e) {}
  // #endif
}

function initAndroid() {
  // #ifdef APP-PLUS
  try {
    plus.android.requestPermissions(
      ['android.permission.CAMERA'],
      function() {},
      function(err) { console.warn('摄像头权限', err) }
    )
  } catch(e) {}
  // #endif
}
</script>
<style lang="scss">
@import './app.scss';
</style>

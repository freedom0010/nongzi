// src/utils/request.js  v2
const BASE_URL = 'https://你的域名/api'

function request(method, url, data = {}, options = {}) {
  return new Promise((resolve, reject) => {
    const token = uni.getStorageSync('token')
    const header = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    }
    if (!options.silent) uni.showNavigationBarLoading?.()
    uni.request({
      url: BASE_URL + url,
      method: method.toUpperCase(),
      data,
      header,
      timeout: 12000,
      success(res) {
        const { code, message, data: resData, total, page, pageSize } = res.data ?? {}
        if (code === 200) { resolve({ data: resData, total, page, pageSize }); return }
        if (code === 401) {
          uni.removeStorageSync('token'); uni.removeStorageSync('userInfo')
          uni.reLaunch({ url: '/pages/auth/login' }); return
        }
        if (!options.silent) uni.showToast({ title: message || '操作失败', icon: 'none', duration: 2000 })
        reject(new Error(message ?? '请求失败'))
      },
      fail(err) {
        const msg = err.errMsg?.includes('timeout') ? '请求超时' : '网络异常'
        if (!options.silent) uni.showToast({ title: msg, icon: 'none', duration: 2000 })
        reject(new Error(msg))
      },
      complete() { uni.hideNavigationBarLoading?.() },
    })
  })
}

export const http = {
  get:    (url, p = {}, o = {}) => request('GET',    url, p, o),
  post:   (url, d = {}, o = {}) => request('POST',   url, d, o),
  put:    (url, d = {}, o = {}) => request('PUT',    url, d, o),
  delete: (url, d = {}, o = {}) => request('DELETE', url, d, o),
}
export default http

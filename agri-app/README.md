# 农资管家 · 前端 APP

## 技术栈
- **框架**: uni-app 3 + Vue 3 Composition API
- **状态**: Pinia
- **UI**: 自定义组件 + uni-ui
- **编译目标**: Android APP + iOS APP（一套代码）

## 目录结构
```
src/
├── main.js                     # 应用入口
├── App.vue                     # 根组件 + 全局路由守卫
├── app.scss                    # 全局样式变量
├── manifest.json               # APP配置（权限/图标/Bundle ID）
├── pages.json                  # 页面路由 + TabBar
├── api/
│   └── index.js                # 所有 API 接口定义
├── utils/
│   └── request.js              # HTTP请求封装（token/错误/loading）
├── store/
│   └── index.js                # Pinia 状态（用户/统计/扫码批次）
└── pages/
    ├── auth/login.vue           # 登录页
    ├── dashboard/index.vue      # 首页看板
    ├── scan/index.vue           # 扫码入/出库（核心）
    ├── inventory/
    │   ├── index.vue            # 库存列表
    │   ├── detail.vue           # 商品详情
    │   └── add.vue              # 新增/编辑商品
    ├── records/index.vue        # 出入库记录
    ├── supplier/index.vue       # 供应商管理
    └── profile/index.vue        # 我的/改密/退出
```

---

## 开发环境搭建

### 1. 安装 HBuilderX（推荐，uni-app 官方IDE）
- 下载地址：https://www.dcloud.io/hbuilderx.html
- 下载 **正式版**，不要 Alpha 版

### 2. 导入项目
```
HBuilderX → 文件 → 导入 → 从本地目录导入
选择 agri-app/ 文件夹
```

### 3. 修改 API 地址
```js
// src/utils/request.js 第3行
const BASE_URL = 'https://你的域名/api'
// 开发阶段可先用服务器 IP：
const BASE_URL = 'http://你的服务器IP:3000/api'
```

### 4. 安装依赖
```bash
cd agri-app
npm install
```

---

## 编译运行

### Android 真机调试
```
HBuilderX → 运行 → 运行到手机或模拟器 → 选择 Android 设备
```
- 手机开启「开发者模式」和「USB 调试」
- 用 USB 数据线连接电脑

### iOS 真机调试（需要 Mac + Xcode）
```
HBuilderX → 运行 → 运行到手机或模拟器 → 选择 iOS 设备
```
- 需要 Apple 开发者账号（免费账号可真机调试，但 App 7天失效）

### H5 浏览器调试（快速验证）
```
HBuilderX → 运行 → 运行到浏览器 → Chrome
```

---

## 打包发布

### Android 打包（.apk）
```
HBuilderX → 发行 → 原生 App-云打包
→ 选择 Android
→ 使用公共测试证书（测试用）或自有证书（上线用）
→ 提交打包（约5-10分钟）
→ 下载 .apk 安装包
```

**安装到手机：**
```bash
# 用 adb 安装（手机连电脑）
adb install agri-app-release.apk

# 或直接发给用户，手机打开文件安装
```

### iOS 打包（.ipa）
```
HBuilderX → 发行 → 原生 App-云打包
→ 选择 iOS
→ 需要：
   - Apple 开发者账号（99美元/年）
   - Bundle ID: com.agri.manager
   - 证书 (.p12) + 描述文件 (.mobileprovision)
→ 打包完成后通过 Xcode 或 TestFlight 安装
```

---

## 扫码功能说明

### 扫码枪（USB/蓝牙）
- 直接连接手机/平板，扫码枪输入内容自动填入输入框
- 无需任何额外配置，即插即用

### 手机摄像头扫码
```js
// scan/index.vue 中调用原生扫码 API
plus.barcode.scan(successCallback, errorCallback, [条码类型])
```
- 支持格式：EAN-13、EAN-8、Code-128、Code-39、QR码、UPC-A
- Android + iOS 均支持，调用系统原生摄像头，速度快

---

## 权限配置说明（manifest.json）

| 权限 | 平台 | 用途 |
|------|------|------|
| CAMERA | Android | 摄像头扫码 |
| INTERNET | Android | 网络请求 |
| VIBRATE | Android | 扫码震动反馈 |
| NSCameraUsageDescription | iOS | 摄像头权限说明（App Store 必须） |

---

## 离线缓存说明

当前版本：请求失败时显示 Toast 提示。

如需离线支持（农村弱网环境），可在 `utils/request.js` 中添加：
```js
// 失败时读取 uni.getStorageSync('cache_' + url)
// 成功时写入 uni.setStorageSync('cache_' + url, data)
```

---

## 常见问题

**Q: 扫码后提示「商品不存在」**
A: 该条码未录入系统，页面会出现「立即录入」按钮，填完信息即可继续扫

**Q: 网络请求失败**
A: 检查 `request.js` 中 BASE_URL 是否正确；服务器防火墙是否开放 80/443 端口

**Q: iOS 打包需要什么**
A: 需要 Apple 开发者账号（$99/年），在 developer.apple.com 创建 App ID、证书和描述文件

**Q: Android apk 安装提示「未知来源」**
A: 手机设置 → 安全 → 允许安装未知来源应用

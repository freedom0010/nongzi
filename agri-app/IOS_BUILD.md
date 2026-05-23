# ============================================================
# iOS 打包完整指南
# 农资管家 · uni-app → iOS IPA
# ============================================================

## 前置条件

| 条件 | 说明 |
|------|------|
| Apple 开发者账号 | 99美元/年，developer.apple.com 注册 |
| Mac 电脑 | 云打包可不需要，本地打包需要 |
| Xcode 15+ | 本地打包时需要 |
| HBuilderX 正式版 | 云打包入口 |

---

## 方式一：HBuilderX 云打包（推荐，无需 Mac）

### Step 1 — 在 Apple Developer 创建 App ID
1. 登录 https://developer.apple.com/account
2. 进入 Certificates, Identifiers & Profiles
3. Identifiers → 点击 + → App IDs → App
4. Bundle ID 填写：`com.agri.manager`
5. Capabilities 勾选：无需特殊能力，直接继续

### Step 2 — 创建发布证书（Distribution Certificate）
1. Certificates → 点击 +
2. 选择 `iOS Distribution (App Store and Ad Hoc)`
3. 按提示用 Mac 的钥匙串生成 CSR 文件（Certificate Signing Request）
   ```
   Mac → 钥匙串访问 → 菜单 → 证书助理 → 从证书颁发机构请求证书
   填写邮箱，选择「存储到磁盘」
   ```
4. 上传 CSR，下载 .cer 证书
5. 双击导入到 Mac 钥匙串
6. 导出为 .p12 文件（右键证书 → 导出 → 格式选 .p12，设置密码）

### Step 3 — 创建描述文件（Provisioning Profile）
1. Profiles → 点击 +
2. 选择类型：
   - `Ad Hoc`：安装到指定设备测试（最多100台）
   - `App Store`：上架用
3. 选择刚才创建的 App ID：`com.agri.manager`
4. 选择证书
5. (Ad Hoc) 添加测试设备 UDID
6. 下载 .mobileprovision 文件

### Step 4 — HBuilderX 云打包
```
HBuilderX → 发行 → 原生 App-云打包
→ 选择 iOS
→ Bundle ID：com.agri.manager
→ 证书私钥（.p12）：选择文件
→ 私钥密码：p12 导出时设置的密码
→ 描述文件（.mobileprovision）：选择文件
→ 点击「打包」
→ 约 5-10 分钟后下载 .ipa 文件
```

---

## 方式二：本地打包（需要 Mac + Xcode）

```bash
# 1. HBuilderX 生成本地打包资源
HBuilderX → 发行 → 生成本地打包 App 资源

# 2. 下载 uni-app iOS 离线 SDK
https://nativesupport.dcloud.net.cn/AppDocs/download/ios.html

# 3. 将 App 资源复制到 SDK 项目
cp -r unpackage/resources/HBuilder/ HBuilder-Hello/HBuilder/

# 4. 修改 Bundle ID
Xcode → 项目设置 → General → Bundle Identifier → com.agri.manager

# 5. 选择证书和 Profile（Xcode 会自动管理）
Xcode → Signing & Capabilities → Team 选择你的账号

# 6. 打包 IPA
Xcode → Product → Archive → Distribute App
```

---

## 安装测试（不上架）

### TestFlight 内测（推荐）
```
1. App Store Connect → 我的 App → 新建 App
   Bundle ID: com.agri.manager
   SKU: agri-manager
   语言: 简体中文

2. 上传 ipa
   Xcode → Organizer → 选择 Archive → Distribute → App Store Connect

3. 等待处理（约10-30分钟）

4. TestFlight → 邀请内部/外部测试员（发送邮件或链接）

5. 测试员：App Store 搜索 TestFlight 安装 → 用链接加入测试
```

### 直接安装（Ad Hoc，需提前添加 UDID）
```bash
# 获取设备 UDID
iTunes → 点击设备序列号切换到 UDID → 复制

# 或用 ideviceinfo 命令（Mac）
brew install libimobiledevice
idevice_id -l

# 将 UDID 添加到 Apple Developer → Devices
# 重新生成 Ad Hoc 描述文件 → 重新打包

# 安装 ipa（数据线连接 Mac）
xcrun deviceinstaller install 农资管家.ipa

# 或使用 Apple Configurator 2（Mac App Store 免费）
```

---

## 上架 App Store

```
1. App Store Connect → 新版本 → 1.0

2. 填写信息：
   名称：农资管家
   副标题：农资进出库扫码管理
   分类：商务
   关键词：农资,库存管理,扫码,进出库
   描述：农资门店专用库存管理系统，支持扫码入出库...

3. 截图要求（必须提供）：
   iPhone 6.5寸：1242×2688（iPhone 11 Pro Max）
   iPhone 5.5寸：1242×2208（iPhone 8 Plus）
   可用模拟器截图

4. 隐私政策 URL（必填）：可以在服务器放一个简单的 HTML 页面

5. 提交审核（约 1-3 个工作日）

6. 常见拒绝原因：
   - 隐私说明不完整（在 manifest.json 已配置）
   - 功能不完善
   - 登录不可用（审核员需要测试账号，提供 admin/admin123）
```

---

## 常见问题

**Q: 提示「未受信任的企业级开发者」**
A: 设置 → 通用 → VPN与设备管理 → 信任该开发者证书

**Q: 扫码黑屏**
A: 检查 Info.plist 是否有 NSCameraUsageDescription（已在 manifest.json 配置）

**Q: 网络请求失败（HTTP）**
A: iOS 默认需要 HTTPS。临时解决：在 manifest.json ios 节点加：
```json
"NSAppTransportSecurity": {
  "NSAllowsArbitraryLoads": true
}
```
正式上线必须配置 HTTPS + SSL 证书（Let's Encrypt 免费）

**Q: 证书过期**
A: 重新在 Apple Developer 生成证书和描述文件，重新打包

**Q: Bundle ID 被占用**
A: 改为 com.你的名字.agrimanager，同步修改 manifest.json 中的 bundleid

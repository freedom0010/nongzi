# ============================================================
# 安卓打包配置说明
# 使用 HBuilderX 云打包 或 本地打包
# ============================================================

# 【一】HBuilderX 云打包步骤（推荐，无需安装 Android SDK）
# 1. 打开 HBuilderX → 发行 → 原生App-云打包
# 2. 选择 Android
# 3. 证书配置：
#    - 测试：使用公共测试证书（免费，仅内测用）
#    - 正式：使用自有证书（见下方生成方法）
# 4. 填写 包名 (AppID)：com.agri.manager
# 5. 点击打包，等待5-10分钟下载 .apk

# 【二】生成正式签名证书
# 需要 Java 环境（安装 JDK 即可）
#
# keytool -genkey -alias agri-app \
#   -keyalg RSA -keysize 2048 \
#   -validity 36500 \
#   -keystore agri-app.keystore
#
# 参数说明：
#   -alias      证书别名（记住，打包时用）
#   -validity   有效期天数（36500 = 100年）
#   -keystore   输出文件名
#
# 生成后在 HBuilderX 填入：
#   证书文件路径：agri-app.keystore
#   证书别名：agri-app
#   证书密码：你设置的密码

# 【三】本地打包（需要 Android Studio）
# 1. HBuilderX → 发行 → 生成本地打包App资源
# 2. 将资源放入 Android 离线SDK
# 3. Android Studio 打包签名 APK

# 【四】apk 安装到手机
# 方法1：微信发给自己，手机点击安装
# 方法2：adb 命令安装
#   adb install agri-app-release.apk
# 方法3：上传至蒲公英/fir.im，生成二维码扫码安装

# 【五】上架应用市场（可选）
# 华为应用市场：https://developer.huawei.com/
# 小米应用市场：https://dev.mi.com/
# OPPO 应用商店：https://open.oppomobile.com/
# vivo 开发者：https://dev.vivo.com.cn/
# 注：各市场需要软件著作权 + 营业执照

# ============================================================
# 常见问题
# ============================================================
# Q: 安装时提示"解析软件包时出现问题"
# A: apk 可能损坏，重新下载或换 USB 传输
#
# Q: 提示"未知来源"无法安装
# A: 手机设置 → 安全/隐私 → 允许安装未知来源
#
# Q: 扫码功能黑屏
# A: 检查摄像头权限是否已授予（设置 → 应用 → 农资管家 → 权限）
#
# Q: 网络请求失败
# A: 检查手机网络；确认服务器地址填写正确（request.js 第3行）
#    注意：Android 9+ 默认不允许 HTTP 明文请求，需配置 HTTPS
#    或在 manifest.json 的 android 节点加：
#    "android:usesCleartextTraffic": true（仅内网测试用）

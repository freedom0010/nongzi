# 农资管家 · 完整安装部署流程

> 适用系统：Ubuntu 22.04 LTS（腾讯云/阿里云轻量服务器）

---

## 一、目录结构总览

```
agri-server/          ← 服务器端（本文件夹）
agri-app/             ← 手机端 uni-app 代码
agri-admin/           ← PC 管理后台（单 HTML 文件）
```

---

## 二、服务器准备

### 2.1 购买服务器
- 推荐：腾讯云轻量应用服务器，2核2G，约 24 元/月（首年）
- 系统镜像：**Ubuntu 22.04 LTS**
- 地区：上海 或 广州

### 2.2 登录服务器
```bash
ssh root@你的服务器IP
```

---

## 三、一键部署后端（推荐）

```bash
# 1. 在本地把代码上传到服务器
scp -r agri-server/* root@你的服务器IP:/opt/agri-server/

# 2. SSH 登录服务器
ssh root@你的服务器IP

# 3. 执行一键部署脚本（自动安装 Node.js / MySQL / Nginx / PM2）
chmod +x /opt/agri-server/deploy.sh
sudo bash /opt/agri-server/deploy.sh

# 脚本会依次询问：
#   MySQL root 密码    → 自己设一个，如 MyRoot@2026
#   数据库用户密码     → 自己设一个，如 AgriDB@2026
#   JWT 密钥           → 随机长字符串，如 agri_jwt_secret_2026_xkf92jd
#   域名（可选）       → 有域名填域名，没有直接回车跳过

# 4. 验证部署结果
curl http://你的服务器IP/health
# 返回 {"status":"ok"} 表示成功
```

---

## 四、手动部署后端（逐步操作）

如果一键脚本失败，按以下步骤手动执行：

### 4.1 安装 Node.js 20
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs
node -v   # 确认版本 v20.x
```

### 4.2 安装 MySQL 8
```bash
apt-get install -y mysql-server
systemctl start mysql
systemctl enable mysql

# 设置 root 密码
mysql -e "ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'MyRoot@2026'; FLUSH PRIVILEGES;"

# 创建数据库和应用账号
mysql -uroot -pMyRoot@2026 <<SQL
CREATE DATABASE IF NOT EXISTS agri_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'agri_user'@'localhost' IDENTIFIED BY 'AgriDB@2026';
GRANT ALL PRIVILEGES ON agri_db.* TO 'agri_user'@'localhost';
FLUSH PRIVILEGES;
SQL
```

### 4.3 初始化数据库表
```bash
mysql -uagri_user -pAgriDB@2026 agri_db < /opt/agri-server/sql/init.sql
# 成功无输出，失败会提示错误
```

### 4.4 安装项目依赖
```bash
cd /opt/agri-server
npm install --production
```

### 4.5 创建环境配置
```bash
cp /opt/agri-server/.env.example /opt/agri-server/.env
nano /opt/agri-server/.env
```

修改以下内容：
```env
DB_PASSWORD=AgriDB@2026
JWT_SECRET=agri_jwt_secret_2026_xkf92jd
NODE_ENV=production
```

### 4.6 安装 PM2 并启动服务
```bash
npm install -g pm2
cd /opt/agri-server
pm2 start app.js --name agri-server --max-memory-restart 400M
pm2 save
pm2 startup   # 复制输出的命令并执行，设置开机自启
```

### 4.7 安装 Nginx 并配置反向代理
```bash
apt-get install -y nginx
systemctl enable nginx

cat > /etc/nginx/sites-available/agri << 'NGINX'
server {
    listen 80;
    server_name _;

    location /api {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /health {
        proxy_pass http://127.0.0.1:3000;
    }

    location / {
        root /opt/agri-web/dist;
        try_files $uri $uri/ /index.html;
    }
}
NGINX

ln -sf /etc/nginx/sites-available/agri /etc/nginx/sites-enabled/agri
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
```

### 4.8 配置防火墙
```bash
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
```

### 4.9 验证后端正常
```bash
# 健康检查
curl http://localhost/health
# 返回 {"status":"ok"} ✅

# 测试登录接口
curl -X POST http://localhost/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
# 返回含 token 的 JSON ✅
```

---

## 五、配置 HTTPS（有域名时必做）

iOS 客户端要求 HTTPS，强烈建议配置。

```bash
# 前提：域名已解析到服务器 IP（DNS 生效需等 5-30 分钟）

# 安装 Certbot
apt-get install -y certbot python3-certbot-nginx

# 申请免费 SSL 证书（替换为你的域名）
certbot --nginx -d your-domain.com

# 证书自动续期（每90天）
certbot renew --dry-run   # 测试续期
# Certbot 安装时已自动添加定时任务，无需额外操作
```

---

## 六、员工管理模块（新增）

员工管理同时涉及服务器端和手机端，两端均需更新。

### 6.1 更新服务器端文件
```bash
# 上传新增/修改的服务器端文件
scp agri-server/controllers/userController.js  root@你的服务器IP:/opt/agri-server/controllers/
scp agri-server/routes/index.js                root@你的服务器IP:/opt/agri-server/routes/
scp agri-server/sql/init.sql                   root@你的服务器IP:/opt/agri-server/sql/

# 登录服务器，追加新数据库表（已有表不受影响）
ssh root@你的服务器IP
mysql -uagri_user -pAgriDB@2026 agri_db < /opt/agri-server/sql/init.sql

# 重启服务生效
pm2 restart agri-server
```

### 6.2 更新手机端文件
将以下文件替换到 agri-app 对应路径，重新用 HBuilderX 打包即可：
```
agri-app/src/pages/users/index.vue       ← 新增：员工管理页面
agri-app/src/pages/profile/index.vue     ← 修改：加了员工管理入口
agri-app/src/pages/scan/index.vue        ← 修改：加了权限控制
agri-app/src/pages/inventory/detail.vue  ← 修改：删除按钮加权限控制
agri-app/src/store/index.js              ← 修改：加了权限状态
agri-app/src/api/index.js                ← 修改：加了 userApi
agri-app/src/pages.json                  ← 修改：加了员工页面路由
```

---

## 七、手机端打包

### 7.1 修改 API 地址（必做）
```js
// agri-app/src/utils/request.js  第3行
const BASE_URL = 'https://你的域名/api'
// 没有域名时用 IP：
const BASE_URL = 'http://你的服务器IP:3000/api'
```

### 7.2 打包 Android APK
```
HBuilderX → 导入 agri-app 项目
→ 发行 → 原生 App-云打包
→ Android
→ 使用公共测试证书（内测）或自有证书（正式）
→ 提交打包 → 约5分钟 → 下载 .apk
→ 发给手机安装（需开启「允许安装未知来源」）
```

### 7.3 打包 iOS IPA
```
→ 同上，选择 iOS
→ 需要 Apple 开发者账号（99美元/年）
→ 填写 Bundle ID：com.agri.manager
→ 填写证书（.p12）和描述文件（.mobileprovision）
→ 详细步骤见 IOS_BUILD.md
```

---

## 八、PC 管理后台

PC 后台是单个 HTML 文件，无需部署，直接用浏览器打开。

```bash
# 修改 API 地址（agri-admin/index.html 第一行）
const API = 'https://你的域名/api'

# 打开方式
# 方法1：直接双击 index.html 用浏览器打开
# 方法2：放到服务器 /opt/agri-web/dist/ 通过 Nginx 访问
cp agri-admin/index.html /opt/agri-web/dist/index.html
```

---

## 九、常用运维命令

```bash
# 查看服务状态
pm2 status

# 查看实时日志
pm2 logs agri-server

# 重启服务
pm2 restart agri-server

# 查看 MySQL 状态
systemctl status mysql

# 手动备份数据库
mysqldump -uagri_user -pAgriDB@2026 agri_db > backup_$(date +%Y%m%d).sql

# 更新代码后重启
cd /opt/agri-server && npm install --production && pm2 restart agri-server
```

---

## 十、默认账号

| 账号  | 密码     | 角色   |
|-------|----------|--------|
| admin | admin123 | 管理员 |

**上线后立即在「我的 → 修改密码」改掉默认密码！**

---

## 十一、权限说明

| 权限项     | 管理员 | 普通员工默认 |
|------------|--------|--------------|
| 入库操作   | ✅     | ✅（可关闭） |
| 出库操作   | ✅     | ✅（可关闭） |
| 删除商品   | ✅     | ❌（可开启） |
| 导出记录   | ✅     | ❌（可开启） |
| 编辑供应商 | ✅     | ❌（可开启） |
| 查看报表   | ✅     | ❌（可开启） |
| 员工管理   | ✅     | ❌           |

权限在「我的 → 员工账号管理」中对每个员工单独配置。

---

## 十二、常见问题

**Q: 手机 APP 提示「网络异常」**
A: 检查 `request.js` 中的 API 地址；服务器防火墙是否开放 80/443 端口；iOS 需要 HTTPS。

**Q: 扫码黑屏**
A: 进入手机设置，找到「农资管家」，开启摄像头权限。

**Q: MySQL 连接失败**
A: 检查 `.env` 中的 `DB_PASSWORD` 是否与创建用户时的密码一致。

**Q: pm2 restart 后接口还是旧版本**
A: 执行 `pm2 delete agri-server && pm2 start app.js --name agri-server` 强制重启。

**Q: 证书续期失败**
A: 确保 80 端口没有被其他程序占用，执行 `certbot renew --force-renewal`。

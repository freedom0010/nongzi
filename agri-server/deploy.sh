#!/bin/bash
# ============================================================
# 农资管理系统 服务器一键部署脚本
# 适用：Ubuntu 22.04 LTS（腾讯云/阿里云轻量服务器）
# 用法：chmod +x deploy.sh && sudo bash deploy.sh
# ============================================================

set -e
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
log()  { echo -e "${GREEN}[INFO]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
err()  { echo -e "${RED}[ERR]${NC}  $1"; exit 1; }

# ── 0. 收集配置 ───────────────────────────────────────────
echo -e "\n${GREEN}====== 农资管理系统 部署向导 ======${NC}\n"
read -p "请输入 MySQL root 密码（将设置为此密码）: " MYSQL_ROOT_PASS
read -p "请输入数据库用户密码（agri_user）:        " DB_PASS
read -p "请输入 JWT 密钥（随机字符串，越长越安全）: " JWT_SECRET
read -p "请输入你的域名（无则直接回车跳过）:        " DOMAIN

APP_DIR="/opt/agri-server"

# ── 1. 系统更新 ───────────────────────────────────────────
log "更新系统软件包..."
apt-get update -qq && apt-get upgrade -y -qq

# ── 2. 安装 Node.js 20 LTS ────────────────────────────────
log "安装 Node.js 20 LTS..."
if ! command -v node &>/dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi
log "Node.js 版本: $(node -v)"

# ── 3. 安装 MySQL 8 ───────────────────────────────────────
log "安装 MySQL 8..."
if ! command -v mysql &>/dev/null; then
  apt-get install -y mysql-server
  systemctl start mysql
  systemctl enable mysql
  # 设置 root 密码
  mysql -e "ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY '${MYSQL_ROOT_PASS}'; FLUSH PRIVILEGES;"
fi

# 创建数据库和用户
log "初始化数据库..."
mysql -uroot -p"${MYSQL_ROOT_PASS}" <<SQL
CREATE DATABASE IF NOT EXISTS agri_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'agri_user'@'localhost' IDENTIFIED BY '${DB_PASS}';
GRANT ALL PRIVILEGES ON agri_db.* TO 'agri_user'@'localhost';
FLUSH PRIVILEGES;
SQL

# ── 4. 安装 Nginx ─────────────────────────────────────────
log "安装 Nginx..."
if ! command -v nginx &>/dev/null; then
  apt-get install -y nginx
  systemctl enable nginx
fi

# ── 5. 安装 PM2 ───────────────────────────────────────────
log "安装 PM2..."
npm install -g pm2 --quiet
pm2 startup systemd -u root --hp /root | tail -1 | bash || true

# ── 6. 部署应用代码 ───────────────────────────────────────
log "部署应用..."
mkdir -p "${APP_DIR}"
# 如果已有代码则跳过（后续用 git pull 更新）
if [ ! -f "${APP_DIR}/app.js" ]; then
  warn "请将项目代码上传到 ${APP_DIR} 后，再继续执行后续步骤"
  warn "上传命令（本地执行）: scp -r ./agri-server/* root@服务器IP:${APP_DIR}/"
fi

# ── 7. 写入 .env ──────────────────────────────────────────
log "生成 .env 配置..."
cat > "${APP_DIR}/.env" <<ENV
PORT=3000
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=agri_user
DB_PASSWORD=${DB_PASS}
DB_NAME=agri_db
DB_POOL_MIN=2
DB_POOL_MAX=10
JWT_SECRET=${JWT_SECRET}
JWT_EXPIRES_IN=7d
CORS_ORIGINS=http://localhost:5173
LOG_FORMAT=combined
NODE_ENV=production
ENV

# ── 8. 安装依赖 ───────────────────────────────────────────
if [ -f "${APP_DIR}/package.json" ]; then
  log "安装 npm 依赖..."
  cd "${APP_DIR}" && npm install --production --quiet
fi

# ── 9. 初始化数据库表 ─────────────────────────────────────
if [ -f "${APP_DIR}/sql/init.sql" ]; then
  log "执行数据库初始化 SQL..."
  mysql -uagri_user -p"${DB_PASS}" agri_db < "${APP_DIR}/sql/init.sql"
fi

# ── 10. PM2 启动 ──────────────────────────────────────────
log "PM2 启动服务..."
cd "${APP_DIR}"
pm2 delete agri-server 2>/dev/null || true
pm2 start app.js --name agri-server --max-memory-restart 400M
pm2 save

# ── 11. Nginx 配置 ────────────────────────────────────────
log "配置 Nginx 反向代理..."
NGINX_CONF="/etc/nginx/sites-available/agri"
if [ -n "${DOMAIN}" ]; then
  SERVER_NAME="${DOMAIN}"
else
  SERVER_NAME="_"
fi

cat > "${NGINX_CONF}" <<NGINX
server {
    listen 80;
    server_name ${SERVER_NAME};

    # API 反向代理
    location /api {
        proxy_pass         http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade \$http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   Host \$host;
        proxy_set_header   X-Real-IP \$remote_addr;
        proxy_set_header   X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 60s;
    }

    # 健康检查
    location /health {
        proxy_pass http://127.0.0.1:3000;
    }

    # 前端静态文件（后续放这里）
    location / {
        root  /opt/agri-web/dist;
        index index.html;
        try_files \$uri \$uri/ /index.html;
    }

    # 隐藏 Nginx 版本
    server_tokens off;

    # 上传大小限制
    client_max_body_size 10M;
}
NGINX

ln -sf "${NGINX_CONF}" /etc/nginx/sites-enabled/agri
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# ── 12. 自动备份 MySQL（每天凌晨3点） ────────────────────
log "配置每日自动备份..."
mkdir -p /opt/agri-backup
cat > /etc/cron.d/agri-backup <<CRON
0 3 * * * root mysqldump -uagri_user -p'${DB_PASS}' agri_db | gzip > /opt/agri-backup/agri_\$(date +\%Y\%m\%d).sql.gz && find /opt/agri-backup -name "*.sql.gz" -mtime +30 -delete
CRON

# ── 13. 防火墙 ───────────────────────────────────────────
log "配置防火墙..."
ufw allow 22/tcp   comment 'SSH'    2>/dev/null || true
ufw allow 80/tcp   comment 'HTTP'   2>/dev/null || true
ufw allow 443/tcp  comment 'HTTPS'  2>/dev/null || true
ufw --force enable 2>/dev/null || true

# ── 完成 ──────────────────────────────────────────────────
echo ""
echo -e "${GREEN}====== 部署完成 ======${NC}"
echo -e "API 地址:  http://$(curl -s ifconfig.me)/api"
echo -e "健康检查:  http://$(curl -s ifconfig.me)/health"
echo -e "查看日志:  pm2 logs agri-server"
echo -e "重启服务:  pm2 restart agri-server"
echo -e "备份目录:  /opt/agri-backup/"
echo ""
if [ -n "${DOMAIN}" ]; then
  echo -e "${YELLOW}下一步：申请免费 SSL 证书${NC}"
  echo -e "  apt install certbot python3-certbot-nginx -y"
  echo -e "  certbot --nginx -d ${DOMAIN}"
fi

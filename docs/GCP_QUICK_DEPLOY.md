# 🚀 GCP 快速部署脚本（30分钟完成）

这个脚本将帮助您快速在GCP上部署测试环境

## 前提条件
- Google Cloud账户（有$300免费额度）
- gcloud CLI已安装

## 第一步：GCP 初始化（5分钟）

```bash
# 1. 登录GCP
gcloud auth login

# 2. 创建项目（替换为你的项目ID）
export PROJECT_ID="akuriru-stand-$(date +%s)"
gcloud projects create $PROJECT_ID --name="Akuriru Stand Test"

# 3. 设置当前项目
gcloud config set project $PROJECT_ID

# 4. 启用计费（在浏览器中完成）
echo "请在浏览器中为项目启用计费："
echo "https://console.cloud.google.com/billing/linkedaccount?project=$PROJECT_ID"
read -p "启用计费后按Enter继续..."

# 5. 启用必要的API（一次性）
echo "正在启用必要的API..."
gcloud services enable \
    run.googleapis.com \
    sqladmin.googleapis.com \
    secretmanager.googleapis.com \
    cloudbuild.googleapis.com

echo "✅ GCP初始化完成！项目ID: $PROJECT_ID"
```

## 第二步：创建Cloud SQL（10分钟）

```bash
# 1. 创建MySQL实例（小型，适合测试）
echo "正在创建Cloud SQL实例..."
gcloud sql instances create akuriru-db \
    --database-version=MYSQL_8_0 \
    --tier=db-f1-micro \
    --region=asia-northeast1 \
    --root-password="TempPassword123!" \
    --database-flags=character_set_server=utf8mb4

# 2. 创建数据库
gcloud sql databases create acrylic_stand \
    --instance=akuriru-db

# 3. 创建用户
gcloud sql users create stand_user \
    --instance=akuriru-db \
    --password="StandPass123!"

# 4. 保存连接信息
export SQL_CONNECTION=$(gcloud sql instances describe akuriru-db --format="value(connectionName)")
echo "SQL连接名: $SQL_CONNECTION"

echo "✅ Cloud SQL创建完成！"
```

## 第三步：上传数据库初始化脚本（5分钟）

```bash
# 1. 使用Cloud SQL Proxy连接
# 下载proxy（如果还没有）
curl -o cloud-sql-proxy https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.8.0/cloud-sql-proxy.windows.amd64.exe

# 2. 在后台启动proxy
./cloud-sql-proxy $SQL_CONNECTION &
PROXY_PID=$!

# 等待连接建立
sleep 5

# 3. 导入初始化脚本
mysql -h 127.0.0.1 -u stand_user -pStandPass123! acrylic_stand < database/init.sql

echo "✅ 数据库初始化完成！"

# 停止proxy
kill $PROXY_PID
```

## 第四步：部署到Cloud Run（10分钟）

```bash
# 1. 配置Docker认证
gcloud auth configure-docker

# 2. 构建并推送镜像
docker build -t gcr.io/$PROJECT_ID/akuriru-stand:latest .
docker push gcr.io/$PROJECT_ID/akuriru-stand:latest

# 3. 部署到Cloud Run
gcloud run deploy akuriru-stand \
    --image=gcr.io/$PROJECT_ID/akuriru-stand:latest \
    --platform=managed \
    --region=asia-northeast1 \
    --allow-unauthenticated \
    --set-env-vars="APP_ENV=gcp,DEBUG_MODE=true,DB_NAME=acrylic_stand,DB_USER=stand_user,DB_PASS=StandPass123!" \
    --add-cloudsql-instances=$SQL_CONNECTION \
    --memory=512Mi \
    --timeout=60s

# 4. 获取URL
export SERVICE_URL=$(gcloud run services describe akuriru-stand \
    --platform=managed \
    --region=asia-northeast1 \
    --format="value(status.url)")

echo "🎉 部署完成！"
echo "访问地址: $SERVICE_URL"
echo "健康检查: $SERVICE_URL/health.php"

# 5. 测试
curl $SERVICE_URL/health.php
```

## 保存配置信息

```bash
# 将配置保存到文件
cat > .env.gcp.local <<EOF
GCP_PROJECT_ID=$PROJECT_ID
SQL_CONNECTION=$SQL_CONNECTION
SERVICE_URL=$SERVICE_URL
DB_USER=stand_user
DB_PASS=StandPass123!
EOF

echo "✅ 配置已保存到 .env.gcp.local"
```

## 快速更新代码

每次修改代码后：

```bash
# 1. 构建新镜像
docker build -t gcr.io/$PROJECT_ID/akuriru-stand:latest .

# 2. 推送
docker push gcr.io/$PROJECT_ID/akuriru-stand:latest

# 3. 部署新版本
gcloud run deploy akuriru-stand \
    --image=gcr.io/$PROJECT_ID/akuriru-stand:latest \
    --platform=managed \
    --region=asia-northeast1

# 大约2-3分钟完成
```

## 查看日志

```bash
# 实时查看应用日志
gcloud run services logs read akuriru-stand \
    --region=asia-northeast1 \
    --limit=50 \
    --follow
```

## 成本估算

- Cloud SQL (db-f1-micro): 约 ¥120/月
- Cloud Run (低流量): 约 ¥0-50/月
- **总计**: 约 ¥150-200/月

## 故障排除

### Cloud SQL连接失败
```bash
# 检查实例状态
gcloud sql instances describe akuriru-db

# 重启实例
gcloud sql instances restart akuriru-db
```

### Cloud Run部署失败
```bash
# 查看构建日志
gcloud builds list --limit=5

# 查看服务日志
gcloud run services logs read akuriru-stand --region=asia-northeast1
```

---

**预计总时间**: 30-45分钟
**之后每次更新**: 2-3分钟

现在就开始吧！

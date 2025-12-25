# GCP 快速部署脚本 (PowerShell版本)
# 适用于 Windows 用户

# 颜色输出函数
function Write-Success { param($msg) Write-Host "✅ $msg" -ForegroundColor Green }
function Write-Info { param($msg) Write-Host "ℹ️  $msg" -ForegroundColor Cyan }
function Write-Warning { param($msg) Write-Host "⚠️  $msg" -ForegroundColor Yellow }
function Write-Error { param($msg) Write-Host "❌ $msg" -ForegroundColor Red }

Write-Host @"
╔═══════════════════════════════════════════════════════╗
║   アクリルスタンド工房 - GCP 快速部署脚本              ║
║   预计时间: 30-45分钟                                 ║
╚═══════════════════════════════════════════════════════╝
"@ -ForegroundColor Cyan

# 检查前提条件
Write-Info "检查前提条件..."

# 检查 gcloud CLI
if (-not (Get-Command gcloud -ErrorAction SilentlyContinue)) {
    Write-Error "未找到 gcloud CLI"
    Write-Info "请访问: https://cloud.google.com/sdk/docs/install"
    exit 1
}

# 检查 Docker
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Error "未找到 Docker"
    Write-Info "请安装 Docker Desktop: https://www.docker.com/products/docker-desktop"
    exit 1
}

Write-Success "前提条件检查通过"

# ============================================
# 第一步：GCP 项目设置
# ============================================

Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Yellow
Write-Host "第 1 步: GCP 项目设置" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor Yellow

# 生成唯一项目ID
$timestamp = [int][double]::Parse((Get-Date -UFormat %s))
$PROJECT_ID = "akuriru-stand-$timestamp"

Write-Info "项目ID: $PROJECT_ID"

$response = Read-Host "是否创建新项目? (y/n)"
if ($response -eq 'y') {
    Write-Info "正在创建项目..."
    gcloud projects create $PROJECT_ID --name="Akuriru Stand Test"
    
    Write-Info "设置当前项目..."
    gcloud config set project $PROJECT_ID
    
    Write-Warning "请在浏览器中为项目启用计费"
    Write-Info "URL: https://console.cloud.google.com/billing/linkedaccount?project=$PROJECT_ID"
    Start-Process "https://console.cloud.google.com/billing/linkedaccount?project=$PROJECT_ID"
    Read-Host "启用计费后按 Enter 继续"
    
    Write-Info "正在启用必要的API（这需要几分钟）..."
    gcloud services enable run.googleapis.com
    gcloud services enable sqladmin.googleapis.com
    gcloud services enable secretmanager.googleapis.com
    gcloud services enable cloudbuild.googleapis.com
    
    Write-Success "项目设置完成"
} else {
    $PROJECT_ID = Read-Host "请输入现有项目ID"
    gcloud config set project $PROJECT_ID
}

# ============================================
# 第二步：Cloud SQL 设置
# ============================================

Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Yellow
Write-Host "第 2 步: Cloud SQL 数据库设置" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor Yellow

$createDB = Read-Host "是否创建新的Cloud SQL实例? (y/n)"
if ($createDB -eq 'y') {
    Write-Info "正在创建 Cloud SQL 实例（这需要5-10分钟）..."
    
    gcloud sql instances create akuriru-db `
        --database-version=MYSQL_8_0 `
        --tier=db-f1-micro `
        --region=asia-northeast1 `
        --root-password="TempPassword123!" `
        --database-flags=character_set_server=utf8mb4,collation_server=utf8mb4_unicode_ci
    
    Write-Info "创建数据库..."
    gcloud sql databases create acrylic_stand --instance=akuriru-db
    
    Write-Info "创建用户..."
    gcloud sql users create stand_user `
        --instance=akuriru-db `
        --password="StandPass123!"
    
    Write-Success "Cloud SQL 创建完成"
}

# 获取连接信息
$SQL_CONNECTION = gcloud sql instances describe akuriru-db --format="value(connectionName)"
Write-Info "SQL连接名: $SQL_CONNECTION"

# ============================================
# 第三步：初始化数据库
# ============================================

Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Yellow
Write-Host "第 3 步: 初始化数据库" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor Yellow

$initDB = Read-Host "是否导入数据库初始化脚本? (y/n)"
if ($initDB -eq 'y') {
    Write-Info "下载 Cloud SQL Proxy..."
    
    if (-not (Test-Path "cloud-sql-proxy.exe")) {
        Invoke-WebRequest -Uri "https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.8.0/cloud-sql-proxy.windows.amd64.exe" -OutFile "cloud-sql-proxy.exe"
    }
    
    Write-Info "启动 Cloud SQL Proxy..."
    $proxyProcess = Start-Process -FilePath ".\cloud-sql-proxy.exe" -ArgumentList $SQL_CONNECTION -PassThru -NoNewWindow
    
    Start-Sleep -Seconds 5
    
    Write-Info "导入数据库脚本..."
    Get-Content "database\init.sql" | mysql -h 127.0.0.1 -u stand_user -pStandPass123! acrylic_stand
    
    Write-Success "数据库初始化完成"
    
    # 停止 proxy
    Stop-Process -Id $proxyProcess.Id
}

# ============================================
# 第四步：构建 Docker 镜像
# ============================================

Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Yellow
Write-Host "第 4 步: 构建并部署应用" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor Yellow

$deploy = Read-Host "是否构建并部署到 Cloud Run? (y/n)"
if ($deploy -eq 'y') {
    Write-Info "配置 Docker 认证..."
    gcloud auth configure-docker
    
    Write-Info "构建 Docker 镜像（这需要几分钟）..."
    docker build -t "gcr.io/$PROJECT_ID/akuriru-stand:latest" .
    
    Write-Info "推送镜像到 GCR..."
    docker push "gcr.io/$PROJECT_ID/akuriru-stand:latest"
    
    Write-Info "部署到 Cloud Run..."
    gcloud run deploy akuriru-stand `
        --image="gcr.io/$PROJECT_ID/akuriru-stand:latest" `
        --platform=managed `
        --region=asia-northeast1 `
        --allow-unauthenticated `
        --set-env-vars="APP_ENV=gcp,DEBUG_MODE=true,DB_NAME=acrylic_stand,DB_USER=stand_user,DB_PASS=StandPass123!" `
        --add-cloudsql-instances=$SQL_CONNECTION `
        --memory=512Mi `
        --timeout=60s
    
    Write-Success "部署完成！"
}

# ============================================
# 第五步：获取访问信息
# ============================================

Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Yellow
Write-Host "部署信息" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor Yellow

$SERVICE_URL = gcloud run services describe akuriru-stand `
    --platform=managed `
    --region=asia-northeast1 `
    --format="value(status.url)"

Write-Host @"

🎉 部署成功！

📍 访问地址:
   $SERVICE_URL

🔍 健康检查:
   $SERVICE_URL/health.php

📊 查看日志:
   gcloud run services logs read akuriru-stand --region=asia-northeast1 --limit=50

📦 快速更新代码:
   1. docker build -t gcr.io/$PROJECT_ID/akuriru-stand:latest .
   2. docker push gcr.io/$PROJECT_ID/akuriru-stand:latest
   3. gcloud run deploy akuriru-stand --image=gcr.io/$PROJECT_ID/akuriru-stand:latest --region=asia-northeast1

💾 配置信息已保存到: .env.gcp.local

"@ -ForegroundColor Green

# 保存配置
@"
GCP_PROJECT_ID=$PROJECT_ID
SQL_CONNECTION=$SQL_CONNECTION
SERVICE_URL=$SERVICE_URL
DB_USER=stand_user
DB_PASS=StandPass123!
"@ | Out-File -FilePath ".env.gcp.local" -Encoding UTF8

# 打开浏览器测试
$openBrowser = Read-Host "是否在浏览器中打开应用? (y/n)"
if ($openBrowser -eq 'y') {
    Start-Process $SERVICE_URL
}

Write-Host "`n✅ 全部完成！现在可以开始快速迭代开发了。" -ForegroundColor Green

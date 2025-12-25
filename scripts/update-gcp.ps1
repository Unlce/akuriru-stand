# GCP 快速更新脚本 (PowerShell)
# 用于快速推送代码更新到 GCP Cloud Run

param(
    [string]$Message = "Quick update"
)

# 颜色输出
function Write-Success { param($msg) Write-Host "✅ $msg" -ForegroundColor Green }
function Write-Info { param($msg) Write-Host "ℹ️  $msg" -ForegroundColor Cyan }
function Write-Error { param($msg) Write-Host "❌ $msg" -ForegroundColor Red }

Write-Host @"
╔═══════════════════════════════════════════════════════╗
║   快速更新到 GCP Cloud Run                             ║
║   预计时间: 2-3分钟                                    ║
╚═══════════════════════════════════════════════════════╝
"@ -ForegroundColor Cyan

# 读取配置
if (-not (Test-Path ".env.gcp.local")) {
    Write-Error "未找到 .env.gcp.local 配置文件"
    Write-Info "请先运行: .\scripts\deploy-gcp-quick.ps1"
    exit 1
}

$config = Get-Content ".env.gcp.local" | ConvertFrom-StringData
$PROJECT_ID = $config.GCP_PROJECT_ID

Write-Info "项目: $PROJECT_ID"
Write-Info "更新说明: $Message"

# 设置项目
gcloud config set project $PROJECT_ID

# 计时开始
$startTime = Get-Date

# 1. 构建镜像
Write-Info "[1/3] 构建 Docker 镜像..."
docker build -t "gcr.io/$PROJECT_ID/akuriru-stand:latest" . -q
if ($LASTEXITCODE -ne 0) {
    Write-Error "Docker 构建失败"
    exit 1
}

# 2. 推送镜像
Write-Info "[2/3] 推送镜像到 GCR..."
docker push "gcr.io/$PROJECT_ID/akuriru-stand:latest" -q
if ($LASTEXITCODE -ne 0) {
    Write-Error "推送失败"
    exit 1
}

# 3. 部署到 Cloud Run
Write-Info "[3/3] 部署到 Cloud Run..."
gcloud run deploy akuriru-stand `
    --image="gcr.io/$PROJECT_ID/akuriru-stand:latest" `
    --platform=managed `
    --region=asia-northeast1 `
    --quiet

if ($LASTEXITCODE -ne 0) {
    Write-Error "部署失败"
    exit 1
}

# 计时结束
$endTime = Get-Date
$duration = ($endTime - $startTime).TotalSeconds

Write-Success "更新完成！耗时: $([math]::Round($duration, 1)) 秒"

# 获取URL
$SERVICE_URL = gcloud run services describe akuriru-stand `
    --platform=managed `
    --region=asia-northeast1 `
    --format="value(status.url)"

Write-Host "`n访问地址: $SERVICE_URL" -ForegroundColor Green

# 可选：打开浏览器
$open = Read-Host "是否在浏览器中打开? (y/n)"
if ($open -eq 'y') {
    Start-Process $SERVICE_URL
}

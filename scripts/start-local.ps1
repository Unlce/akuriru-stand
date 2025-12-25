# 本地开发环境一键启动脚本
# 适用于 Windows + Docker Desktop

# 颜色输出函数
function Write-Success { param($msg) Write-Host "✅ $msg" -ForegroundColor Green }
function Write-Info { param($msg) Write-Host "ℹ️  $msg" -ForegroundColor Cyan }
function Write-Warning { param($msg) Write-Host "⚠️  $msg" -ForegroundColor Yellow }
function Write-Error { param($msg) Write-Host "❌ $msg" -ForegroundColor Red }
function Write-Step { param($msg) Write-Host "`n━━━ $msg ━━━" -ForegroundColor Yellow }

Write-Host @"

╔═══════════════════════════════════════════════════════╗
║   アクリルスタンド工房 - ローカル開発環境起動          ║
║   Acrylic Stand Workshop - Local Development         ║
╚═══════════════════════════════════════════════════════╝

"@ -ForegroundColor Cyan

# ============================================
# 前提条件チェック
# ============================================

Write-Step "前提条件をチェック中..."

# Docker のチェック
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Error "Docker が見つかりません"
    Write-Info "Docker Desktop をインストールしてください："
    Write-Info "https://www.docker.com/products/docker-desktop"
    Write-Info ""
    Write-Info "詳細な手順: .\docs\INSTALL_DOCKER.md"
    exit 1
}

Write-Success "Docker が見つかりました"

# Docker が起動しているかチェック
try {
    docker ps > $null 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Docker Desktop が起動していません"
        Write-Info "Docker Desktop を起動してから、もう一度実行してください"
        exit 1
    }
    Write-Success "Docker Desktop が起動しています"
} catch {
    Write-Error "Docker との通信に失敗しました"
    exit 1
}

# ============================================
# 環境変数ファイルの確認
# ============================================

Write-Step ".env ファイルをチェック中..."

if (-not (Test-Path ".env")) {
    Write-Info ".env ファイルが見つかりません。作成します..."
    Copy-Item ".env.example" ".env"
    Write-Success ".env ファイルを作成しました"
} else {
    Write-Success ".env ファイルが存在します"
}

# ============================================
# Docker コンテナの起動
# ============================================

Write-Step "Docker コンテナを起動中..."

Write-Info "コンテナをビルドして起動します（初回は5-10分かかります）..."

docker-compose up -d --build

if ($LASTEXITCODE -ne 0) {
    Write-Error "コンテナの起動に失敗しました"
    Write-Info "ログを確認してください："
    Write-Info "  docker-compose logs"
    exit 1
}

Write-Success "コンテナが起動しました"

# ============================================
# 起動待機
# ============================================

Write-Step "サービスの起動を待機中..."

Write-Info "MySQL の起動を待っています（最大60秒）..."

$maxRetries = 60
$retries = 0
$mysqlReady = $false

while ($retries -lt $maxRetries) {
    $mysqlStatus = docker-compose exec -T mysql mysqladmin ping -h localhost -u root -proot_password 2>&1
    if ($mysqlStatus -match "mysqld is alive") {
        $mysqlReady = $true
        break
    }
    Start-Sleep -Seconds 1
    $retries++
    if ($retries % 10 -eq 0) {
        Write-Info "待機中... ($retries 秒)"
    }
}

if ($mysqlReady) {
    Write-Success "MySQL が起動しました"
} else {
    Write-Warning "MySQL の起動確認がタイムアウトしました"
    Write-Info "コンテナが起動中の可能性があります。数分待ってから確認してください。"
}

Start-Sleep -Seconds 3

# ============================================
# 動作確認
# ============================================

Write-Step "動作確認中..."

Write-Info "コンテナの状態を確認..."
docker-compose ps

# ============================================
# 完了メッセージ
# ============================================

Write-Host @"

╔═══════════════════════════════════════════════════════╗
║   🎉 起動完了！                                        ║
╚═══════════════════════════════════════════════════════╝

📍 アクセスURL：
   🌐 Webアプリ:          http://localhost:8000
   🗄️  phpMyAdmin:        http://localhost:8080
   📧 MailHog (メール):    http://localhost:8025

📊 データベース情報：
   ホスト:     mysql (コンテナ内) / localhost:3306 (外部)
   DB名:       acrylic_stand
   ユーザー:   stand_user
   パスワード: stand_password

🔧 便利なコマンド：
   docker-compose logs -f          # ログをリアルタイム表示
   docker-compose stop             # コンテナ停止
   docker-compose restart          # コンテナ再起動
   docker-compose down             # コンテナ削除

📝 開発の流れ：
   1. コードを編集（自動的に反映されます）
   2. ブラウザで http://localhost:8000 を確認
   3. 問題があれば logs で確認

💾 データベース管理：
   .\scripts\backup-db.ps1         # バックアップ
   .\scripts\restore-db.ps1        # リストア

📚 ドキュメント：
   docs\LOCAL_SETUP.md             # 詳細な使い方
   docs\architecture.md            # システム構成

"@ -ForegroundColor Green

# ブラウザで開く
$openBrowser = Read-Host "`nブラウザで開きますか？ (y/n)"
if ($openBrowser -eq 'y') {
    Write-Info "ブラウザを起動中..."
    Start-Process "http://localhost:8000"
    Start-Sleep -Seconds 2
    Start-Process "http://localhost:8080"
}

Write-Host "`n✨ 開発を楽しんでください！" -ForegroundColor Cyan
Write-Host "問題がある場合は、'docker-compose logs' でログを確認してください。`n" -ForegroundColor Gray

#!/bin/bash
# GCP Cloud Run デプロイメントスクリプト
# Deployment script for akuriru-stand to Google Cloud Run

set -e  # エラーが発生したら即座に終了

# 色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ロゴ表示
echo -e "${BLUE}"
echo "╔════════════════════════════════════════════════════════╗"
echo "║     アクリルスタンド工房 - GCP Cloud Run デプロイ      ║"
echo "║     Akuriru Stand - GCP Cloud Run Deployment          ║"
echo "╚════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# 設定値（必要に応じて変更してください）
PROJECT_ID="${GCP_PROJECT_ID:-}"
REGION="${GCP_REGION:-asia-northeast1}"
SERVICE_NAME="${SERVICE_NAME:-akuriru-stand}"
CLOUD_SQL_CONNECTION_NAME="${CLOUD_SQL_CONNECTION_NAME:-}"

# プロジェクトIDが設定されていない場合は入力を求める
if [ -z "$PROJECT_ID" ]; then
    echo -e "${YELLOW}GCP プロジェクトIDを入力してください:${NC}"
    read -r PROJECT_ID
fi

# 確認
echo -e "${BLUE}デプロイ設定:${NC}"
echo "  プロジェクトID: $PROJECT_ID"
echo "  リージョン: $REGION"
echo "  サービス名: $SERVICE_NAME"
echo ""

# 確認プロンプト
echo -e "${YELLOW}この設定でデプロイを開始しますか? (y/N)${NC}"
read -r CONFIRM
if [[ ! "$CONFIRM" =~ ^[Yy]$ ]]; then
    echo -e "${RED}デプロイをキャンセルしました${NC}"
    exit 1
fi

# GCP プロジェクトを設定
echo -e "${BLUE}[1/6] GCP プロジェクトを設定中...${NC}"
gcloud config set project "$PROJECT_ID"

# 必要な API を有効化
echo -e "${BLUE}[2/6] 必要な GCP API を有効化中...${NC}"
gcloud services enable cloudbuild.googleapis.com \
    run.googleapis.com \
    containerregistry.googleapis.com \
    secretmanager.googleapis.com \
    sqladmin.googleapis.com \
    storage.googleapis.com

# Dockerイメージをビルド
echo -e "${BLUE}[3/6] Dockerイメージをビルド中...${NC}"
docker build -t gcr.io/"$PROJECT_ID"/"$SERVICE_NAME":latest .

# Container Registryにプッシュ
echo -e "${BLUE}[4/6] Container Registryにイメージをプッシュ中...${NC}"
docker push gcr.io/"$PROJECT_ID"/"$SERVICE_NAME":latest

# Cloud Runにデプロイ
echo -e "${BLUE}[5/6] Cloud Runにデプロイ中...${NC}"

# 基本的なデプロイコマンド
DEPLOY_CMD=(
    gcloud run deploy "$SERVICE_NAME"
    --image="gcr.io/$PROJECT_ID/$SERVICE_NAME:latest"
    --region="$REGION"
    --platform=managed
    --allow-unauthenticated
    --memory=512Mi
    --cpu=1
    --min-instances=0
    --max-instances=10
    --timeout=60s
    --set-env-vars="APP_ENV=gcp,USE_CLOUD_STORAGE=false,GCP_PROJECT_ID=$PROJECT_ID,GCP_REGION=$REGION"
)

# Cloud SQL接続が設定されている場合は追加
if [ -n "$CLOUD_SQL_CONNECTION_NAME" ]; then
    DEPLOY_CMD+=(--add-cloudsql-instances="$CLOUD_SQL_CONNECTION_NAME")
    echo -e "${GREEN}Cloud SQL接続を追加: $CLOUD_SQL_CONNECTION_NAME${NC}"
fi

# デプロイ実行
"${DEPLOY_CMD[@]}"

# デプロイ結果の確認
echo -e "${BLUE}[6/6] デプロイ結果を確認中...${NC}"
SERVICE_URL=$(gcloud run services describe "$SERVICE_NAME" --region="$REGION" --format="value(status.url)")

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║            デプロイが完成しました！ ✓                  ║${NC}"
echo -e "${GREEN}║            Deployment Successful! ✓                   ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}サービスURL:${NC} ${GREEN}$SERVICE_URL${NC}"
echo ""
echo -e "${YELLOW}次のステップ:${NC}"
echo "  1. ブラウザでサービスURLにアクセス"
echo "  2. 画像アップロード機能をテスト"
echo "  3. 切り抜き機能をテスト"
echo "  4. 台座編集機能をテスト"
echo "  5. 注文機能をテスト"
echo ""
echo -e "${BLUE}ログを確認:${NC}"
echo "  gcloud run services logs read $SERVICE_NAME --region=$REGION --limit=50"
echo ""
echo -e "${BLUE}サービスを削除する場合:${NC}"
echo "  gcloud run services delete $SERVICE_NAME --region=$REGION"
echo ""

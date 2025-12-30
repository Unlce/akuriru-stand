# GCP Cloud Run デプロイメントガイド
# GCP Cloud Run Deployment Guide

このガイドでは、アクリルスタンド工房アプリケーションをGoogle Cloud Platform (GCP) のCloud Runにデプロイする手順を説明します。

## 目次

1. [前提条件](#前提条件)
2. [初期設定](#初期設定)
3. [デプロイ方法](#デプロイ方法)
4. [デプロイ後の確認](#デプロイ後の確認)
5. [トラブルシューティング](#トラブルシューティング)

---

## 前提条件

### 必要なツール

- **Google Cloud SDK (gcloud CLI)** - [インストール方法](https://cloud.google.com/sdk/docs/install)
- **Docker** - [インストール方法](https://docs.docker.com/get-docker/)
- **Git** - バージョン管理用

### GCPアカウントとプロジェクト

1. GCPアカウントを作成（無料トライアルあり）: https://cloud.google.com/
2. 新しいGCPプロジェクトを作成
3. 課金アカウントを有効化（無料枠内でも課金設定が必要）

---

## 初期設定

### 1. Google Cloud SDK のインストールと認証

```bash
# gcloud CLIのインストール（まだの場合）
# macOS
brew install google-cloud-sdk

# Ubuntu/Debian
sudo apt-get install google-cloud-sdk

# Windows
# https://cloud.google.com/sdk/docs/install からインストーラーをダウンロード

# 認証
gcloud auth login

# アプリケーションのデフォルト認証情報を設定
gcloud auth application-default login
```

### 2. プロジェクトの設定

```bash
# プロジェクトIDを設定（YOUR_PROJECT_IDを実際のプロジェクトIDに置き換える）
export GCP_PROJECT_ID="your-project-id"
gcloud config set project $GCP_PROJECT_ID

# デフォルトリージョンを設定
gcloud config set run/region asia-northeast1
```

### 3. 必要なGCP APIの有効化

```bash
gcloud services enable \
    cloudbuild.googleapis.com \
    run.googleapis.com \
    containerregistry.googleapis.com \
    secretmanager.googleapis.com \
    sqladmin.googleapis.com \
    storage.googleapis.com
```

---

## デプロイ方法

### 方法1: 自動デプロイスクリプトを使用（推奨）

最も簡単な方法です。

```bash
# リポジトリのルートディレクトリで実行
./deploy-to-gcp.sh
```

スクリプトが以下を自動的に実行します：
- ✅ プロジェクトの設定
- ✅ 必要なAPIの有効化
- ✅ Dockerイメージのビルド
- ✅ Container Registryへのプッシュ
- ✅ Cloud Runへのデプロイ

### 方法2: Cloud Build を使用（CI/CD）

より本番向けの方法です。

```bash
# Cloud Buildでビルドとデプロイ
gcloud builds submit --config cloudbuild.yaml

# 初回デプロイ時はCloud SQL接続名の設定が必要
gcloud builds submit --config cloudbuild.yaml \
    --substitutions=_CLOUD_SQL_CONNECTION_NAME="your-project:asia-northeast1:acrylic-stand-db"
```

### 方法3: 手動デプロイ

ステップバイステップで理解したい場合。

```bash
# 1. Dockerイメージをビルド
docker build -t gcr.io/$GCP_PROJECT_ID/akuriru-stand:latest .

# 2. Container Registryにプッシュ
docker push gcr.io/$GCP_PROJECT_ID/akuriru-stand:latest

# 3. Cloud Runにデプロイ
gcloud run deploy akuriru-stand \
    --image=gcr.io/$GCP_PROJECT_ID/akuriru-stand:latest \
    --region=asia-northeast1 \
    --platform=managed \
    --allow-unauthenticated \
    --memory=512Mi \
    --cpu=1 \
    --min-instances=0 \
    --max-instances=10 \
    --timeout=60s \
    --set-env-vars="APP_ENV=gcp,USE_CLOUD_STORAGE=false,GCP_PROJECT_ID=$GCP_PROJECT_ID,GCP_REGION=asia-northeast1"
```

---

## デプロイ後の確認

### 1. サービスURLの取得

```bash
gcloud run services describe akuriru-stand \
    --region=asia-northeast1 \
    --format="value(status.url)"
```

### 2. 動作確認

デプロイ完了後、以下の機能をテストしてください：

- [ ] ✅ トップページが表示される
- [ ] ✅ 画像がアップロードできる
- [ ] ✅ 基本編集機能が動作する
- [ ] ✅ フィルター機能が動作する
- [ ] ✅ **切り抜き機能が動作する** ← 今回修正した機能
- [ ] ✅ **台座編集機能が動作する** ← 今回修正した機能
- [ ] ✅ 注文確認画面が表示される

### 3. ログの確認

```bash
# リアルタイムログの確認
gcloud run services logs read akuriru-stand \
    --region=asia-northeast1 \
    --limit=50 \
    --format="table(timestamp,severity,textPayload)"

# ストリーミングログ（継続的に表示）
gcloud run services logs tail akuriru-stand \
    --region=asia-northeast1
```

### 4. ヘルスチェック

```bash
# ヘルスチェックエンドポイントを確認
curl https://YOUR_SERVICE_URL/health.php
```

期待される応答:
```json
{"status":"healthy","timestamp":1234567890}
```

---

## トラブルシューティング

### 問題1: JavaScriptの切り抜き機能が動作しない

**症状:** `cropping.js:94 Uncaught SyntaxError: Invalid or unexpected token`

**原因:** ブラウザキャッシュに古いJavaScriptファイルが残っている

**解決方法:**
1. ブラウザでハードリフレッシュ: `Ctrl+Shift+R` (Win) / `Cmd+Shift+R` (Mac)
2. キャッシュをクリア
3. 最新のコードには cache-busting パラメータ `?v=20251230` が追加済み

### 問題2: デプロイが失敗する

```bash
# ビルドログを確認
gcloud builds list --limit=5

# 特定のビルドの詳細を確認
gcloud builds log <BUILD_ID>
```

### 問題3: メモリ不足エラー

Cloud Runのメモリを増やす:

```bash
gcloud run services update akuriru-stand \
    --region=asia-northeast1 \
    --memory=1Gi
```

### 問題4: タイムアウトエラー

タイムアウト時間を延長:

```bash
gcloud run services update akuriru-stand \
    --region=asia-northeast1 \
    --timeout=300s
```

### 問題5: 画像アップロードが失敗する

アップロードサイズ制限を確認:

```bash
# Cloud Runのリクエストサイズは最大32MBまで
# それ以上の場合はCloud Storageを使用してください
```

---

## 環境変数の設定

### 基本的な環境変数

| 変数名 | 説明 | デフォルト値 |
|--------|------|------------|
| `APP_ENV` | 実行環境 | `gcp` |
| `DEBUG_MODE` | デバッグモード | `false` |
| `USE_CLOUD_STORAGE` | Cloud Storage使用 | `false` |
| `GCP_PROJECT_ID` | GCPプロジェクトID | - |
| `GCP_REGION` | GCPリージョン | `asia-northeast1` |

### 環境変数の更新

```bash
gcloud run services update akuriru-stand \
    --region=asia-northeast1 \
    --set-env-vars="DEBUG_MODE=true"
```

---

## Cloud SQLの設定（オプション）

データベースが必要な場合:

### 1. Cloud SQLインスタンスの作成

```bash
gcloud sql instances create acrylic-stand-db \
    --database-version=MYSQL_8_0 \
    --tier=db-f1-micro \
    --region=asia-northeast1 \
    --root-password=YOUR_ROOT_PASSWORD
```

### 2. データベースの作成

```bash
gcloud sql databases create akuriru_stand \
    --instance=acrylic-stand-db
```

### 3. Cloud Runサービスに接続

```bash
gcloud run services update akuriru-stand \
    --region=asia-northeast1 \
    --add-cloudsql-instances="$GCP_PROJECT_ID:asia-northeast1:acrylic-stand-db"
```

---

## Cloud Storageの設定（オプション）

画像保存用のCloud Storageバケット:

### 1. バケットの作成

```bash
gsutil mb -l asia-northeast1 gs://$GCP_PROJECT_ID-akuriru-uploads
```

### 2. 公開アクセスの設定

```bash
gsutil iam ch allUsers:objectViewer gs://$GCP_PROJECT_ID-akuriru-uploads
```

### 3. CORS設定

```bash
cat > cors.json <<EOF
[
  {
    "origin": ["*"],
    "method": ["GET", "HEAD", "PUT", "POST", "DELETE"],
    "responseHeader": ["Content-Type"],
    "maxAgeSeconds": 3600
  }
]
EOF

gsutil cors set cors.json gs://$GCP_PROJECT_ID-akuriru-uploads
```

---

## コスト管理

### 無料枠

Cloud Runの無料枠（月間）:
- 200万リクエスト
- 36万GB秒のメモリ
- 18万vCPU秒のCPU時間

### コストの監視

```bash
# 課金情報の確認
gcloud billing accounts list

# 予算アラートの設定（推奨）
# GCPコンソールで設定: https://console.cloud.google.com/billing/budgets
```

---

## サービスの削除

不要になった場合:

```bash
# Cloud Runサービスの削除
gcloud run services delete akuriru-stand --region=asia-northeast1

# Dockerイメージの削除
gcloud container images delete gcr.io/$GCP_PROJECT_ID/akuriru-stand:latest

# Cloud SQLインスタンスの削除（作成した場合）
gcloud sql instances delete acrylic-stand-db

# Cloud Storageバケットの削除（作成した場合）
gsutil rm -r gs://$GCP_PROJECT_ID-akuriru-uploads
```

---

## 参考リンク

- [Cloud Run公式ドキュメント](https://cloud.google.com/run/docs)
- [Cloud Build公式ドキュメント](https://cloud.google.com/build/docs)
- [Container Registry](https://cloud.google.com/container-registry/docs)
- [Cloud SQL](https://cloud.google.com/sql/docs)
- [Cloud Storage](https://cloud.google.com/storage/docs)

---

## サポート

問題が発生した場合:

1. このドキュメントのトラブルシューティングセクションを確認
2. GitHubのIssuesで報告: https://github.com/Unlce/akuriru-stand/issues
3. GCP公式サポートに問い合わせ

---

**最終更新:** 2025-12-30
**バージョン:** 1.0

# GCP Cloud Run + Cloud SQL デプロイメントガイド

このドキュメントでは、アクリルスタンド工房を Google Cloud Platform (GCP) にデプロイする手順を説明します。

## 📋 目次

1. [前提条件](#前提条件)
2. [GCP プロジェクトのセットアップ](#gcp-プロジェクトのセットアップ)
3. [Cloud SQL のセットアップ](#cloud-sql-のセットアップ)
4. [Cloud Storage のセットアップ](#cloud-storage-のセットアップ)
5. [Secret Manager の設定](#secret-manager-の設定)
6. [Cloud Run へのデプロイ](#cloud-run-へのデプロイ)
7. [GitHub Actions の設定](#github-actions-の設定)
8. [カスタムドメインの設定](#カスタムドメインの設定)
9. [コスト見積もり](#コスト見積もり)
10. [トラブルシューティング](#トラブルシューティング)

---

## 🎯 前提条件

### 必要なもの
- ✅ Google Cloud アカウント
- ✅ GCP プロジェクト（請求先アカウント有効）
- ✅ gcloud CLI インストール済み
- ✅ Docker インストール済み（ローカルテスト用）
- ✅ GitHub アカウント（CI/CD用）

### 必要な権限
- プロジェクトオーナーまたは編集者
- Cloud Run 管理者
- Cloud SQL 管理者
- Secret Manager 管理者

---

## 🚀 GCP プロジェクトのセットアップ

### ステップ 1: プロジェクトの作成

```bash
# GCP にログイン
gcloud auth login

# 新しいプロジェクトを作成
gcloud projects create acrylic-stand-prod --name="Acrylic Stand Workshop"

# プロジェクトを設定
gcloud config set project acrylic-stand-prod

# プロジェクトIDを確認
gcloud config get-value project
```

### ステップ 2: 必要なAPIを有効化

```bash
# 必要なAPIを一括で有効化
gcloud services enable \
    run.googleapis.com \
    sqladmin.googleapis.com \
    compute.googleapis.com \
    storage.googleapis.com \
    secretmanager.googleapis.com \
    cloudbuild.googleapis.com \
    containerregistry.googleapis.com \
    cloudresourcemanager.googleapis.com
```

### ステップ 3: リージョンの設定

```bash
# デフォルトリージョンを東京に設定
gcloud config set run/region asia-northeast1
gcloud config set compute/region asia-northeast1
gcloud config set compute/zone asia-northeast1-a
```

---

## 💾 Cloud SQL のセットアップ

### ステップ 1: Cloud SQL インスタンスの作成

```bash
# MySQL 8.0 インスタンスを作成（開発/テスト環境）
gcloud sql instances create acrylic-stand-db \
    --database-version=MYSQL_8_0 \
    --tier=db-f1-micro \
    --region=asia-northeast1 \
    --network=default \
    --database-flags=character_set_server=utf8mb4,collation_server=utf8mb4_unicode_ci \
    --backup-start-time=03:00 \
    --enable-bin-log \
    --retained-backups-count=7 \
    --retained-transaction-log-days=7

# 本番環境用（高可用性）
# gcloud sql instances create acrylic-stand-db-prod \
#     --database-version=MYSQL_8_0 \
#     --tier=db-n1-standard-1 \
#     --region=asia-northeast1 \
#     --availability-type=REGIONAL \
#     --database-flags=character_set_server=utf8mb4,collation_server=utf8mb4_unicode_ci \
#     --backup-start-time=03:00 \
#     --enable-bin-log \
#     --retained-backups-count=30
```

### ステップ 2: データベースとユーザーの作成

```bash
# データベースを作成
gcloud sql databases create acrylic_stand \
    --instance=acrylic-stand-db \
    --charset=utf8mb4 \
    --collation=utf8mb4_unicode_ci

# ユーザーを作成
gcloud sql users create stand_user \
    --instance=acrylic-stand-db \
    --password=<SECURE_PASSWORD>

# パスワードは Secret Manager に保存することを推奨
```

### ステップ 3: データベースの初期化

```bash
# ローカルから Cloud SQL に接続
gcloud sql connect acrylic-stand-db --user=root

# MySQL プロンプトで初期化スクリプトを実行
mysql> USE acrylic_stand;
mysql> SOURCE /path/to/database/init.sql;
mysql> SHOW TABLES;
mysql> EXIT;
```

または、Cloud SQL Proxy を使用：

```bash
# Cloud SQL Proxy をダウンロード（Mac/Linux）
curl -o cloud-sql-proxy https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.8.0/cloud-sql-proxy.darwin.amd64
chmod +x cloud-sql-proxy

# プロキシを起動
./cloud-sql-proxy acrylic-stand-prod:asia-northeast1:acrylic-stand-db &

# 別のターミナルで MySQL に接続
mysql -u stand_user -p -h 127.0.0.1 acrylic_stand < database/init.sql
```

### ステップ 4: Cloud SQL インスタンス情報の確認

```bash
# インスタンス接続名を取得（Cloud Run で使用）
gcloud sql instances describe acrylic-stand-db \
    --format="value(connectionName)"

# 出力例: acrylic-stand-prod:asia-northeast1:acrylic-stand-db
```

---

## 📦 Cloud Storage のセットアップ

### ステップ 1: バケットの作成

```bash
# 画像アップロード用バケットを作成
gcloud storage buckets create gs://acrylic-stand-uploads-prod \
    --location=asia-northeast1 \
    --uniform-bucket-level-access

# CORS 設定（ブラウザからの直接アップロード用）
cat > cors-config.json <<EOF
[
  {
    "origin": ["https://zyniqo.co.jp", "https://www.zyniqo.co.jp"],
    "method": ["GET", "POST", "PUT", "DELETE"],
    "responseHeader": ["Content-Type"],
    "maxAgeSeconds": 3600
  }
]
EOF

gcloud storage buckets update gs://acrylic-stand-uploads-prod \
    --cors-file=cors-config.json
```

### ステップ 2: アクセス権限の設定

```bash
# Cloud Run サービスアカウントに権限を付与
PROJECT_NUMBER=$(gcloud projects describe acrylic-stand-prod --format="value(projectNumber)")

gcloud storage buckets add-iam-policy-binding gs://acrylic-stand-uploads-prod \
    --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
    --role="roles/storage.objectAdmin"
```

---

## 🔐 Secret Manager の設定

### ステップ 1: シークレットの作成

```bash
# データベースパスワード
echo -n "YOUR_SECURE_DB_PASSWORD" | \
    gcloud secrets create db-password --data-file=-

# Stripe API キー（決済用）
echo -n "sk_live_..." | \
    gcloud secrets create stripe-secret-key --data-file=-

# SendGrid API キー（メール送信用）
echo -n "SG...." | \
    gcloud secrets create sendgrid-api-key --data-file=-
```

### ステップ 2: Cloud Run にアクセス権限を付与

```bash
PROJECT_NUMBER=$(gcloud projects describe acrylic-stand-prod --format="value(projectNumber)")

# 各シークレットへのアクセスを許可
gcloud secrets add-iam-policy-binding db-password \
    --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding stripe-secret-key \
    --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding sendgrid-api-key \
    --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"
```

---

## 🐳 Cloud Run へのデプロイ

### 方法 1: ローカルからデプロイ（初回）

```bash
# プロジェクトルートディレクトリで実行

# Docker イメージをビルド
docker build -t gcr.io/acrylic-stand-prod/acrylic-stand:latest .

# GCR にプッシュ
docker push gcr.io/acrylic-stand-prod/acrylic-stand:latest

# Cloud Run にデプロイ
gcloud run deploy acrylic-stand-app \
    --image=gcr.io/acrylic-stand-prod/acrylic-stand:latest \
    --platform=managed \
    --region=asia-northeast1 \
    --allow-unauthenticated \
    --set-env-vars="APP_ENV=gcp,DEBUG_MODE=false" \
    --set-secrets="DB_PASS=db-password:latest" \
    --add-cloudsql-instances=acrylic-stand-prod:asia-northeast1:acrylic-stand-db \
    --memory=512Mi \
    --cpu=1 \
    --min-instances=0 \
    --max-instances=10 \
    --timeout=60s \
    --concurrency=80

# デプロイ完了後、URLが表示されます
# 例: https://acrylic-stand-app-xxxxx-an.a.run.app
```

### 方法 2: Cloud Build を使用

```bash
# cloud build 設定ファイルを作成（既に .github/workflows にあります）

# Cloud Build でビルド＆デプロイ
gcloud builds submit \
    --config=cloudbuild.yaml \
    --substitutions=_REGION=asia-northeast1,_SERVICE_NAME=acrylic-stand-app
```

### デプロイ後の確認

```bash
# サービスのURLを取得
SERVICE_URL=$(gcloud run services describe acrylic-stand-app \
    --platform=managed \
    --region=asia-northeast1 \
    --format="value(status.url)")

echo "Service URL: $SERVICE_URL"

# ヘルスチェック
curl $SERVICE_URL/health.php

# API 接続テスト
curl $SERVICE_URL/api/check_db.php
```

---

## 🤖 GitHub Actions の設定

### ステップ 1: Workload Identity Federation の設定

```bash
# Workload Identity Pool を作成
gcloud iam workload-identity-pools create github-pool \
    --location=global \
    --display-name="GitHub Actions Pool"

# Workload Identity Provider を作成
gcloud iam workload-identity-pools providers create-oidc github-provider \
    --location=global \
    --workload-identity-pool=github-pool \
    --display-name="GitHub Provider" \
    --attribute-mapping="google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.repository=assertion.repository" \
    --issuer-uri="https://token.actions.githubusercontent.com"

# サービスアカウントを作成
gcloud iam service-accounts create github-actions \
    --display-name="GitHub Actions Service Account"

# 必要な権限を付与
gcloud projects add-iam-policy-binding acrylic-stand-prod \
    --member="serviceAccount:github-actions@acrylic-stand-prod.iam.gserviceaccount.com" \
    --role="roles/run.admin"

gcloud projects add-iam-policy-binding acrylic-stand-prod \
    --member="serviceAccount:github-actions@acrylic-stand-prod.iam.gserviceaccount.com" \
    --role="roles/storage.admin"

# Workload Identity User ロールを付与
gcloud iam service-accounts add-iam-policy-binding \
    github-actions@acrylic-stand-prod.iam.gserviceaccount.com \
    --role="roles/iam.workloadIdentityUser" \
    --member="principalSet://iam.googleapis.com/projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/github-pool/attribute.repository/YOUR_GITHUB_USER/akuriru-stand"
```

### ステップ 2: GitHub Secrets の設定

GitHub リポジトリの Settings > Secrets and variables > Actions で以下を追加：

```
GCP_PROJECT_ID=acrylic-stand-prod
GCP_WORKLOAD_IDENTITY_PROVIDER=projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/github-pool/providers/github-provider
GCP_SERVICE_ACCOUNT=github-actions@acrylic-stand-prod.iam.gserviceaccount.com
CLOUD_SQL_INSTANCE=acrylic-stand-prod:asia-northeast1:acrylic-stand-db
```

### ステップ 3: デプロイテスト

```bash
# develop ブランチにプッシュしてテスト
git checkout -b develop
git add .
git commit -m "Setup GCP deployment"
git push origin develop

# GitHub Actions のログを確認
# https://github.com/YOUR_USERNAME/akuriru-stand/actions
```

---

## 🌐 カスタムドメインの設定

### ステップ 1: ドメインマッピング

```bash
# カスタムドメインをマッピング
gcloud run domain-mappings create \
    --service=acrylic-stand-app \
    --domain=app.zyniqo.co.jp \
    --region=asia-northeast1

# DNS レコード情報を取得
gcloud run domain-mappings describe \
    --domain=app.zyniqo.co.jp \
    --region=asia-northeast1
```

### ステップ 2: DNS 設定（Lolipop または Cloudflare）

取得した情報を元に、DNS プロバイダーで以下を設定：

```
タイプ: CNAME
名前: app
値: ghs.googlehosted.com
```

または A レコード：

```
タイプ: A
名前: app
値: 216.239.32.21, 216.239.34.21, 216.239.36.21, 216.239.38.21
```

---

## 💰 コスト見積もり

### 開発/テスト環境（月額）

| サービス | 仕様 | 月額料金 |
|---------|------|---------|
| Cloud Run | 100万リクエスト/月 | ¥0 - ¥500 |
| Cloud SQL (db-f1-micro) | 0.6GB RAM, 3GB ストレージ | ¥1,200 |
| Cloud Storage | 5GB ストレージ, 10GB転送 | ¥200 |
| Cloud Build | 120分/日 | ¥0（無料枠内） |
| **合計** | | **約 ¥1,900/月** |

### 本番環境（小〜中規模、月額）

| サービス | 仕様 | 月額料金 |
|---------|------|---------|
| Cloud Run | 1000万リクエスト/月 | ¥2,000 - ¥5,000 |
| Cloud SQL (db-n1-standard-1) | 3.75GB RAM, 10GB SSD | ¥9,000 |
| Cloud Storage | 50GB ストレージ, 100GB転送 | ¥1,500 |
| **合計** | | **約 ¥12,500 - ¥15,500/月** |

### コスト削減のヒント
- ✅ Cloud Run の最小インスタンスを 0 に設定
- ✅ Cloud SQL のバックアップ保持期間を調整
- ✅ Cloud Storage のライフサイクルポリシー設定
- ✅ 使用していない環境のこまめな削除

---

## 🔧 トラブルシューティング

### Cloud SQL 接続エラー

```bash
# 接続テスト
gcloud sql connect acrylic-stand-db --user=stand_user

# エラー: "Access denied"
# → パスワードを確認、Secret Manager の値を確認

# エラー: "Failed to connect"
# → Cloud SQL Admin API が有効か確認
gcloud services list --enabled | grep sqladmin
```

### Cloud Run デプロイエラー

```bash
# ログを確認
gcloud run services logs read acrylic-stand-app \
    --region=asia-northeast1 \
    --limit=50

# コンテナが起動しない場合
# → Dockerfile の CMD が正しいか確認
# → health.php が存在するか確認

# 環境変数の確認
gcloud run services describe acrylic-stand-app \
    --region=asia-northeast1 \
    --format="value(spec.template.spec.containers[0].env)"
```

### データベース接続エラー

```php
// config.php でデバッグ情報を有効化
define('DEBUG_MODE', true);

// ログを確認
error_log('DB_HOST: ' . DB_HOST);
error_log('DB_NAME: ' . DB_NAME);
```

### GitHub Actions エラー

```bash
# Workload Identity 権限確認
gcloud iam service-accounts get-iam-policy \
    github-actions@acrylic-stand-prod.iam.gserviceaccount.com

# シークレットの確認
gcloud secrets versions access latest --secret="db-password"
```

---

## 📚 参考リンク

- [Cloud Run ドキュメント](https://cloud.google.com/run/docs)
- [Cloud SQL ドキュメント](https://cloud.google.com/sql/docs)
- [Secret Manager ドキュメント](https://cloud.google.com/secret-manager/docs)
- [Workload Identity Federation](https://cloud.google.com/iam/docs/workload-identity-federation)
- [Cloud Run 料金計算ツール](https://cloud.google.com/products/calculator)

---

## ✅ チェックリスト

デプロイ前に確認：

- [ ] GCP プロジェクト作成済み
- [ ] 必要な API 有効化済み
- [ ] Cloud SQL インスタンス作成済み
- [ ] データベース初期化完了
- [ ] Secret Manager にパスワード保存済み
- [ ] GitHub Secrets 設定済み
- [ ] ローカルで Docker イメージビルド成功
- [ ] .env ファイルが .gitignore に含まれている
- [ ] 本番環境のパスワード変更済み

デプロイ後に確認：

- [ ] ヘルスチェック成功 (/health.php)
- [ ] データベース接続成功 (/api/check_db.php)
- [ ] 画像アップロード動作確認
- [ ] 注文作成テスト
- [ ] メール送信テスト
- [ ] カスタムドメイン動作確認
- [ ] HTTPS 動作確認
- [ ] ログ出力確認

---

*最終更新: 2025-12-29*
*バージョン: 1.0.0*

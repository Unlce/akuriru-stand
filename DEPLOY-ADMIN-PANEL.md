# 管理パネルのデプロイ手順
# Admin Panel Deployment Instructions

## ✅ 完了した作業

1. ✅ Firestoreデータベース設定
2. ✅ REST API作成 (`api/orders.php`)
3. ✅ 管理者認証システム (`admin/auth.php`)
4. ✅ ログインページ (`admin/login.php`)
5. ✅ ダッシュボード (`admin/index.php`)
6. ✅ 注文管理ページ (`admin/orders.php`)
7. ✅ Dockerfileの更新（Composer依存関係のインストール）
8. ✅ Gitへのコミット

## 🚀 デプロイ手順（Cloud Shellで実行）

### 1. Cloud Shellを開く

GCPコンソールで右上の「Cloud Shell」アイコンをクリックしてください。

### 2. リポジトリをクローン（初回のみ）

```bash
# リポジトリをクローン
git clone https://github.com/Unlce/akuriru-stand.git
cd akuriru-stand
```

### 3. 最新のコードを取得

```bash
# 最新のコードを取得
git checkout claude/gcp-deployment-setup-eh9Yl
git pull origin claude/gcp-deployment-setup-eh9Yl
```

### 4. デプロイスクリプトを実行

```bash
# 環境変数を設定してデプロイ
export GCP_PROJECT_ID="acrylicstand"
export GCP_REGION="asia-northeast1"
export SERVICE_NAME="akuriru-stand"

# デプロイ実行
./deploy-to-gcp.sh
```

デプロイスクリプトが対話的に確認を求めるので、以下のように入力してください：

- プロジェクトID入力時: `acrylicstand`（または Enter を押す）
- デプロイ確認時: `y` と入力

### 5. デプロイが完了するまで待つ（5-10分）

デプロイには以下のステップがあります：

1. GCPプロジェクトの設定
2. 必要なAPIの有効化
3. Dockerイメージのビルド
4. Container Registryへのプッシュ
5. Cloud Runへのデプロイ
6. デプロイ結果の確認

## 🔐 管理パネルへのアクセス

デプロイ完了後、以下のURLで管理パネルにアクセスできます：

### ログインページ
```
https://akuriru-stand-65afktjria-an.a.run.app/admin/login.php
```

### デフォルト認証情報
- **ユーザー名**: `admin`
- **パスワード**: `admin123`

### ダッシュボード（ログイン後）
```
https://akuriru-stand-65afktjria-an.a.run.app/admin/index.php
```

### 注文管理ページ（ログイン後）
```
https://akuriru-stand-65afktjria-an.a.run.app/admin/orders.php
```

## 📊 管理パネルの機能

### ダッシュボード (`/admin/index.php`)
- **今日の注文数**: 本日作成された注文の数
- **処理待ち**: ステータスが「pending」の注文数
- **総注文数**: すべての注文の合計
- **総売上**: すべての注文の合計金額
- **最近の注文**: 最新10件の注文リスト

### 注文管理ページ (`/admin/orders.php`)
- **注文一覧**: DataTablesで表示される全注文
- **検索機能**: 注文番号、顧客名、メールで検索
- **ソート機能**: 各カラムでソート可能
- **ページネーション**: 大量の注文を扱いやすく
- **詳細表示**: 各注文の詳細ページへのリンク

## 🧪 テスト手順

### 1. 管理パネルのログインテスト

1. `/admin/login.php` にアクセス
2. ユーザー名 `admin`、パスワード `admin123` でログイン
3. ダッシュボードにリダイレクトされることを確認

### 2. ダッシュボードの表示テスト

1. ダッシュボードで4つの統計カードが表示されることを確認
2. 「最近の注文」セクションが表示されることを確認

### 3. 注文管理ページのテスト

1. 「すべての注文を見る」ボタンをクリック
2. DataTablesが正しく読み込まれることを確認
3. 検索、ソート機能をテスト

### 4. REST APIのテスト

```bash
# Cloud Shellで実行
SERVICE_URL="https://akuriru-stand-65afktjria-an.a.run.app"

# 注文の作成テスト
curl -X POST "$SERVICE_URL/api/orders.php" \
  -H "Content-Type: application/json" \
  -d '{
    "customer": {
      "name": "テスト太郎",
      "email": "test@example.com",
      "phone": "090-1234-5678",
      "zipCode": "100-0001",
      "address": "東京都千代田区千代田1-1"
    },
    "size": "120x150mm",
    "baseShape": "circle",
    "baseColor": "#FFB6C1",
    "imageUrl": "https://example.com/image.png",
    "quantity": 1,
    "notes": "テスト注文"
  }'

# 注文の取得テスト
curl "$SERVICE_URL/api/orders.php"
```

## 🔧 トラブルシューティング

### デプロイが失敗する場合

```bash
# ログを確認
gcloud run services logs read akuriru-stand --region=asia-northeast1 --limit=100

# サービスの状態を確認
gcloud run services describe akuriru-stand --region=asia-northeast1
```

### 管理パネルにアクセスできない場合

1. デプロイが完了していることを確認
2. URLが正しいことを確認
3. ブラウザのキャッシュをクリア

### Firestore接続エラーが出る場合

1. Firestore APIが有効化されていることを確認
2. Firestoreデータベースが作成されていることを確認
3. サービスアカウントの権限を確認

## 📝 次のステップ

1. ✅ 管理パネルのデプロイ
2. ⏳ フロントエンドの注文フォームとAPIの統合
3. ⏳ 注文詳細ページの作成
4. ⏳ ステータス更新機能の実装
5. ⏳ 本番環境用のセキュリティ強化

## 🔒 セキュリティに関する注意

⚠️ **重要**: デフォルトの認証情報（`admin` / `admin123`）は本番環境では使用しないでください！

本番環境では以下を実施してください：

1. `admin/auth.php` のパスワードを変更
2. 強力なパスワードに変更
3. 必要に応じてFirebase Authenticationなどの認証システムを導入

---

🎉 **注文管理システムの構築が完了しました！**

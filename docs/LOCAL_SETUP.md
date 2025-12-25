# アクリルスタンド工房 - ローカル開発環境セットアップガイド

このガイドでは、Docker を使用したローカル開発環境のセットアップ方法を説明します。

## 📋 前提条件

- Docker Desktop がインストールされていること
- Git がインストールされていること
- テキストエディタ（VS Code 推奨）

## 🚀 クイックスタート

### 1. リポジトリのクローン

```bash
git clone https://github.com/YOUR_USERNAME/akuriru-stand.git
cd akuriru-stand
```

### 2. 環境変数ファイルの作成

```bash
# .env ファイルを作成
cp .env.example .env

# 必要に応じて .env を編集
# ローカル開発環境では、デフォルト設定で動作します
```

### 3. Docker コンテナの起動

```bash
# コンテナをビルドして起動
docker-compose up -d

# ログを確認
docker-compose logs -f
```

### 4. データベースの初期化

データベースは自動的に初期化されますが、手動で確認する場合：

```bash
# MySQL コンテナに接続
docker exec -it acrylic-stand-mysql mysql -ustand_user -pstand_password acrylic_stand

# テーブルを確認
SHOW TABLES;
```

### 5. アプリケーションにアクセス

- **Webアプリ**: http://localhost:8000
- **phpMyAdmin**: http://localhost:8080
- **MailHog** (メールテスト): http://localhost:8025

## 🛠️ 開発ワークフロー

### コードの編集

プロジェクトディレクトリのファイルを編集すると、自動的にコンテナ内に反映されます。

```bash
# ファイルを編集
code .

# ブラウザで http://localhost:8000 を開いて確認
```

### Docker コマンド

```bash
# コンテナの起動
docker-compose up -d

# コンテナの停止
docker-compose stop

# コンテナの削除
docker-compose down

# コンテナの再構築
docker-compose up -d --build

# ログの確認
docker-compose logs -f web
docker-compose logs -f mysql

# コンテナに入る
docker exec -it acrylic-stand-web bash
docker exec -it acrylic-stand-mysql bash
```

### データベース操作

```bash
# バックアップ
bash scripts/backup-db.sh

# リストア
bash scripts/restore-db.sh --latest

# 本番環境からデータ同期（要認証情報）
bash scripts/sync-db.sh
```

## 🔧 トラブルシューティング

### ポートが既に使用されている

```bash
# 使用中のポートを確認（Windows）
netstat -ano | findstr :8000
netstat -ano | findstr :3306

# docker-compose.yml のポート番号を変更
# 例: "8000:80" → "8001:80"
```

### データベース接続エラー

```bash
# MySQL コンテナが起動しているか確認
docker-compose ps

# MySQL のログを確認
docker-compose logs mysql

# データベースを再作成
docker-compose down -v  # ボリュームも削除
docker-compose up -d
```

### コンテナが起動しない

```bash
# エラーログを確認
docker-compose logs

# イメージを再ビルド
docker-compose build --no-cache
docker-compose up -d
```

## 📝 次のステップ

1. [GCP へのデプロイ](DEPLOYMENT_GCP.md)
2. [アーキテクチャドキュメント](architecture.md)
3. [開発進捗記録](progress.md)

---

*最終更新: 2025-12-29*

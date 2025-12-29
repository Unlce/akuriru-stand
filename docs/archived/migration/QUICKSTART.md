# 🚀 クイックスタートガイド

このガイドでは、アクリルスタンド工房のマルチ環境デプロイメントシステムを最短で起動する方法を説明します。

## 📦 今すぐ始める（3ステップ）

### ステップ 1: 環境変数の設定

```bash
# .env ファイルを作成
cp .env.example .env

# 内容はデフォルトのままでOK（ローカル開発）
```

### ステップ 2: Docker 起動

```bash
# コンテナをビルド＆起動
docker-compose up -d

# 起動確認（30秒ほど待つ）
docker-compose ps
```

### ステップ 3: ブラウザでアクセス

- **Webアプリ**: http://localhost:8000
- **phpMyAdmin**: http://localhost:8080
- **MailHog**: http://localhost:8025

🎉 **完了！** これでローカル開発環境が使えます。

---

## 🌟 各環境へのデプロイ

### 📍 ローカル開発環境（完了済み）

```bash
# すでに起動しています！
open http://localhost:8000
```

### 📍 GCP テスト環境へのデプロイ

```bash
# 1. GCP プロジェクトをセットアップ（初回のみ）
# docs/DEPLOYMENT_GCP.md を参照

# 2. developブランチにプッシュ
git checkout -b develop
git add .
git commit -m "Initial commit with deployment setup"
git push origin develop

# 3. GitHub Actionsが自動デプロイ
# https://github.com/YOUR_USERNAME/akuriru-stand/actions
```

### 📍 Lolipop 本番環境（既存維持）

既存のLolipop環境は変更なしで稼働を継続します。

将来的に新しい設定システムに移行する場合：

```bash
# 1. api/config.php を api/config.new.php に置き換え
cp api/config.new.php api/config.php

# 2. FTPでアップロード
# 従来通りの手順でデプロイ
```

---

## 📚 詳細ガイド

### 開発作業の流れ

```bash
# 1. 機能開発
code .  # VS Code で編集

# 2. ローカルでテスト
open http://localhost:8000

# 3. コミット＆プッシュ
git add .
git commit -m "Add new feature"
git push origin develop

# 4. GitHub Actions が自動的に GCP テスト環境にデプロイ
# 5. テスト環境で動作確認
# 6. 問題なければ main ブランチにマージ
```

### よく使うコマンド

```bash
# Docker コンテナの操作
docker-compose up -d      # 起動
docker-compose stop       # 停止
docker-compose restart    # 再起動
docker-compose logs -f    # ログ確認
docker-compose down       # 削除

# データベース操作
bash scripts/backup-db.sh          # バックアップ
bash scripts/restore-db.sh --list  # バックアップ一覧
bash scripts/restore-db.sh --latest # 最新をリストア

# 本番データの同期（開発用）
export LOLIPOP_DB_PASS="your_password"
bash scripts/sync-db.sh
```

---

## 🔧 トラブルシューティング

### ポート競合エラー

```bash
# 使用中のポートを確認
netstat -ano | findstr :8000

# docker-compose.yml でポート番号を変更
# "8000:80" → "8001:80"
```

### データベース接続エラー

```bash
# コンテナの状態確認
docker-compose ps

# ログ確認
docker-compose logs mysql

# 再起動
docker-compose restart mysql
```

### コンテナが起動しない

```bash
# クリーンビルド
docker-compose down -v
docker-compose build --no-cache
docker-compose up -d
```

---

## 📖 次に読むべきドキュメント

1. **ローカル開発**: [docs/LOCAL_SETUP.md](docs/LOCAL_SETUP.md)
2. **GCP デプロイ**: [docs/DEPLOYMENT_GCP.md](docs/DEPLOYMENT_GCP.md)
3. **アーキテクチャ**: [docs/architecture.md](docs/architecture.md)
4. **開発進捗**: [docs/progress.md](docs/progress.md)

---

## ✅ チェックリスト

### 初回セットアップ
- [ ] Docker Desktop インストール済み
- [ ] .env ファイル作成済み
- [ ] docker-compose up -d 実行済み
- [ ] http://localhost:8000 にアクセスできる

### GCP デプロイ準備
- [ ] GCP アカウント作成済み
- [ ] gcloud CLI インストール済み
- [ ] GitHub アカウント連携済み
- [ ] GitHub Secrets 設定済み

### 開発開始前
- [ ] ローカル環境で動作確認済み
- [ ] データベースにテストデータ投入済み
- [ ] Git ブランチ作成済み

---

## 💡 ヒント

- **初めての方**: まずはローカル環境で動作確認しましょう
- **急ぐ方**: `docker-compose up -d` だけで開発開始できます
- **本番デプロイ**: 段階的に進めましょう（Local → GCP Test → 本番）

---

**質問や問題がある場合**: [Issues](https://github.com/YOUR_USERNAME/akuriru-stand/issues) で報告してください

*最終更新: 2025-12-29*

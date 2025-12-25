# システムアーキテクチャドキュメント

## 📋 目次
1. [概要](#概要)
2. [現在のアーキテクチャ](#現在のアーキテクチャ)
3. [提案する新アーキテクチャ](#提案する新アーキテクチャ)
4. [技術スタック](#技術スタック)
5. [データベース設計](#データベース設計)
6. [API設計](#api設計)
7. [セキュリティ](#セキュリティ)
8. [デプロイメント戦略](#デプロイメント戦略)

---

## 📖 概要

**アクリルスタンド工房**は、ユーザーが独自の画像をアップロードし、カスタムアクリルスタンドを注文できるウェブアプリケーションです。

### ビジネス要件
- 画像アップロード・編集機能
- オンライン注文・決済
- 注文管理（管理者画面）
- 顧客通知（メール）
- 製造パートナーへの発注データ送信

---

## 🏗️ 現在のアーキテクチャ

### システム構成図

```
┌─────────────────────────────────────────────┐
│            クライアント (Browser)             │
│   HTML5 + CSS3 + Vanilla JavaScript         │
└───────────────┬─────────────────────────────┘
                │ HTTP/HTTPS
                ▼
┌─────────────────────────────────────────────┐
│         Lolipop 共有ホスティング             │
│  ┌─────────────────────────────────────┐   │
│  │     Apache + PHP 7.4                │   │
│  │  ┌──────────────────────────────┐   │   │
│  │  │  API Endpoints (15 files)     │   │   │
│  │  │  - upload.php                 │   │   │
│  │  │  - orders.php                 │   │   │
│  │  │  - create-payment.php         │   │   │
│  │  │  - order-detail.php           │   │   │
│  │  │  - update-status.php          │   │   │
│  │  │  - contact.php                │   │   │
│  │  │  - etc...                     │   │   │
│  │  └──────────────────────────────┘   │   │
│  │                                      │   │
│  │  ┌──────────────────────────────┐   │   │
│  │  │  Admin Interface             │   │   │
│  │  │  - admin/index.php           │   │   │
│  │  └──────────────────────────────┘   │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │  MySQL Database                     │   │
│  │  - customers                        │   │
│  │  - orders                           │   │
│  │  - order_details                    │   │
│  │  - uploads                          │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │  File Storage: uploads/             │   │
│  │  - 画像ファイル保存                  │   │
│  └─────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

### 現在のフロー

#### 1. 注文フロー
```
ユーザー → 画像アップロード → upload.php
         → 画像編集 (クライアント側)
         → 注文情報入力
         → orders.php → DB保存
         → create-payment.php → 決済処理
         → 確認メール送信
```

#### 2. 管理フロー
```
管理者 → admin/index.php
       → 注文一覧表示
       → 詳細確認 (order-detail.php)
       → ステータス更新 (update-status.php)
       → 印刷データダウンロード (download-print-data.php)
```

### 課題

#### インフラ面
- ❌ **環境分離なし**: 開発・テスト・本番が同一環境
- ❌ **スケーラビリティ**: 共有ホスティングのリソース制限
- ❌ **モニタリング**: ログ・メトリクスの可視化なし
- ❌ **バックアップ**: 自動バックアップの仕組みなし

#### 開発面
- ❌ **ローカル開発環境**: 統一されたセットアップ手順なし
- ❌ **設定管理**: データベース情報がハードコード
- ❌ **CI/CD**: デプロイが手動（FTP）
- ❌ **コンテナ化**: Docker未使用

#### セキュリティ面
- ⚠️ **認証情報**: config.phpに平文保存
- ⚠️ **環境変数**: 一部対応済み（メール設定）だが不完全
- ✅ **SQL Injection**: PDOプリペアドステートメント使用で対策済み
- ✅ **ファイルアップロード**: バリデーション実装済み

---

## 🚀 提案する新アーキテクチャ

### マルチ環境戦略

```
┌──────────────────────────────────────────────────────────┐
│                    開発者のマシン                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │  Docker Compose                                    │  │
│  │  - PHP Container (Apache + PHP)                   │  │
│  │  - MySQL Container                                │  │
│  │  - phpMyAdmin Container (optional)                │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────┬───────────────────────────────────────┘
                   │ git push
                   ▼
         ┌─────────────────────┐
         │   GitHub Repository │
         └──────────┬──────────┘
                    │ GitHub Actions (CI/CD)
         ┌──────────┴──────────┐
         │                     │
         ▼                     ▼
┌────────────────┐    ┌──────────────────┐
│  GCP (Test)    │    │ Lolipop (Prod)   │
│                │    │                  │
│ Cloud Run      │    │ 既存環境          │
│ Cloud SQL      │    │ (安定稼働)        │
│ Cloud Storage  │    │                  │
└────────────────┘    └──────────────────┘
```

### 環境別設定

| 環境 | ホスティング | データベース | ストレージ | 用途 |
|------|------------|-------------|-----------|------|
| **Local** | Docker (localhost) | MySQL (Docker) | ローカルディスク | 開発・デバッグ |
| **Test/Staging** | GCP Cloud Run | Cloud SQL | Cloud Storage | テスト・プレビュー |
| **Production** | Lolipop (当面) | Lolipop MySQL | Lolipopストレージ | 本番運用 |
| **Production (将来)** | GCP Cloud Run | Cloud SQL | Cloud Storage | スケール後 |

---

## 🛠️ 技術スタック

### フロントエンド
- **言語**: HTML5, CSS3, JavaScript (ES6+)
- **ライブラリ**: なし（Vanilla JS）
- **ビルドツール**: なし（静的ファイル）
- **デザイン**: グラスモーフィズム、レスポンシブ

### バックエンド
- **言語**: PHP 7.4+ (8.0以上推奨)
- **Webサーバー**: Apache 2.4
- **フレームワーク**: なし（ネイティブPHP）
- **データベースアクセス**: PDO (MySQL)

### データベース
- **DBMS**: MySQL 5.7+ / MariaDB 10.x
- **文字セット**: utf8mb4 (日本語完全対応)
- **ストレージエンジン**: InnoDB (トランザクション対応)

### インフラ (提案)

#### ローカル開発
- **Docker**: コンテナ化
- **Docker Compose**: マルチコンテナ管理

#### テスト環境 (GCP)
- **Cloud Run**: サーバーレスコンテナ実行
- **Cloud SQL**: マネージドMySQL
- **Cloud Storage**: 画像ファイル保存
- **Secret Manager**: 認証情報管理

#### 本番環境 (現在)
- **Lolipop**: 共有ホスティング

---

## 📊 データベース設計

### ER図

```
┌─────────────────────┐
│     customers       │
├─────────────────────┤
│ id (PK)             │
│ name                │
│ email               │
│ phone               │
│ address             │
│ created_at          │
│ updated_at          │
└──────────┬──────────┘
           │
           │ 1:N
           │
           ▼
┌─────────────────────┐       ┌─────────────────────┐
│      orders         │       │   order_details     │
├─────────────────────┤       ├─────────────────────┤
│ id (PK)             │───┐   │ id (PK)             │
│ order_number (UK)   │   │   │ order_id (FK)       │
│ customer_id (FK) ───┼───┘   │ size                │
│ status              │       │ quantity            │
│ tracking_number     │   └──▶│ price               │
│ shipping_company    │       │ image_path          │
│ shipped_at          │       │ image_filename      │
│ created_at          │       │ base_type           │
│ updated_at          │       │ created_at          │
└─────────────────────┘       └─────────────────────┘
                                       │
                                       │ 1:1
                                       ▼
                              ┌─────────────────────┐
                              │      uploads        │
                              ├─────────────────────┤
                              │ id (PK)             │
                              │ order_detail_id(FK) │
                              │ filename            │
                              │ original_filename   │
                              │ file_size           │
                              │ mime_type           │
                              │ created_at          │
                              └─────────────────────┘
```

### テーブル詳細

#### 1. customers (顧客テーブル)
| カラム | 型 | 制約 | 説明 |
|--------|---|------|------|
| id | INT UNSIGNED | PK, AUTO_INCREMENT | 顧客ID |
| name | VARCHAR(255) | NOT NULL | 顧客名 |
| email | VARCHAR(255) | NOT NULL | メールアドレス |
| phone | VARCHAR(50) | NOT NULL | 電話番号 |
| address | TEXT | NOT NULL | 配送先住所 |
| created_at | DATETIME | NOT NULL | 作成日時 |
| updated_at | DATETIME | NULL | 更新日時 |

**インデックス**: email, created_at

#### 2. orders (注文テーブル)
| カラム | 型 | 制約 | 説明 |
|--------|---|------|------|
| id | INT UNSIGNED | PK, AUTO_INCREMENT | 注文ID |
| order_number | VARCHAR(50) | UNIQUE, NOT NULL | 注文番号 (AS-YYYYMMDD-XXXX) |
| customer_id | INT UNSIGNED | FK, NOT NULL | 顧客ID |
| status | ENUM | NOT NULL | 注文状態 |
| tracking_number | VARCHAR(100) | NULL | 追跡番号 |
| shipping_company | VARCHAR(50) | NULL | 配送会社 |
| shipped_at | DATETIME | NULL | 発送日時 |
| created_at | DATETIME | NOT NULL | 作成日時 |
| updated_at | DATETIME | NOT NULL | 更新日時 |

**ステータス**: pending, paid, processing, shipped, completed, cancelled
**インデックス**: order_number, customer_id, status, tracking_number, created_at

#### 3. order_details (注文詳細テーブル)
| カラム | 型 | 制約 | 説明 |
|--------|---|------|------|
| id | INT UNSIGNED | PK, AUTO_INCREMENT | 詳細ID |
| order_id | INT UNSIGNED | FK, NOT NULL | 注文ID |
| size | VARCHAR(50) | NOT NULL | サイズ |
| quantity | INT | NOT NULL | 数量 |
| price | DECIMAL(10,2) | NOT NULL | 単価 |
| image_path | VARCHAR(500) | NOT NULL | 画像パス |
| image_filename | VARCHAR(255) | NOT NULL | ファイル名 |
| base_type | VARCHAR(50) | NOT NULL | 台座タイプ |
| created_at | DATETIME | NOT NULL | 作成日時 |

**インデックス**: order_id

#### 4. uploads (アップロードファイル管理)
| カラム | 型 | 制約 | 説明 |
|--------|---|------|------|
| id | INT UNSIGNED | PK, AUTO_INCREMENT | ID |
| order_detail_id | INT UNSIGNED | FK, UNIQUE, NULL | 注文詳細ID |
| filename | VARCHAR(255) | NOT NULL | 保存ファイル名 |
| original_filename | VARCHAR(255) | NOT NULL | 元のファイル名 |
| file_size | INT UNSIGNED | NOT NULL | ファイルサイズ |
| mime_type | VARCHAR(100) | NOT NULL | MIMEタイプ |
| created_at | DATETIME | NOT NULL | 作成日時 |

**インデックス**: order_detail_id, created_at

---

## 🔌 API設計

### エンドポイント一覧

| メソッド | エンドポイント | 説明 | 認証 |
|---------|---------------|------|------|
| POST | `/api/upload.php` | 画像アップロード | 不要 |
| POST | `/api/orders.php` | 注文作成 | 不要 |
| GET | `/api/orders.php` | 注文一覧取得 | 必要 |
| GET | `/api/order-detail.php?id={id}` | 注文詳細取得 | 必要 |
| PUT | `/api/update-status.php` | 注文ステータス更新 | 必要 |
| POST | `/api/create-payment.php` | 決済作成 | 不要 |
| POST | `/api/payment-webhook.php` | 決済Webhook | 署名検証 |
| POST | `/api/contact.php` | お問い合わせ | 不要 |
| GET | `/api/download-print-data.php` | 印刷データDL | 必要 |
| GET | `/api/check_db.php` | DB接続確認 | 不要 |
| GET | `/api/check_all_tables.php` | テーブル確認 | 不要 |

### 共通レスポンス形式

#### 成功時
```json
{
  "success": true,
  "data": { ... }
}
```

#### エラー時
```json
{
  "success": false,
  "error": "エラーメッセージ"
}
```

---

## 🔐 セキュリティ

### 実装済み対策
- ✅ **SQL Injection**: PDO プリペアドステートメント
- ✅ **ファイルアップロード検証**: MIME type, 拡張子, ファイルサイズ
- ✅ **XSS対策**: htmlspecialchars() によるサニタイズ
- ✅ **ディレクトリトラバーサル**: .htaccess による uploads/ 保護
- ✅ **CORS設定**: Access-Control-Allow-Origin 設定済み

### 追加すべき対策
- ⚠️ **CSRF対策**: トークン実装（csrf.phpは存在するが未統合）
- ⚠️ **レート制限**: rate-limit.phpは存在するが未統合
- ⚠️ **認証・認可**: 管理画面にBasic認証のみ
- ⚠️ **HTTPS強制**: 証明書設定による暗号化通信
- ⚠️ **環境変数**: 認証情報の外部化（一部のみ対応済み）

---

## 🚢 デプロイメント戦略

### フェーズ1: ローカル開発環境構築（今回実装）
- Docker Compose セットアップ
- 環境変数ベースの設定管理
- データベースマイグレーションスクリプト

### フェーズ2: GCP テスト環境構築
- Cloud SQL インスタンス作成
- Cloud Run サービスデプロイ
- Cloud Storage バケット設定
- GitHub Actions CI/CD パイプライン

### フェーズ3: ハイブリッド運用
- Lolipop (本番) + GCP (テスト)
- DNS による環境切り替え
- データ同期ツール

### フェーズ4: 完全移行（将来）
- GCP へ本番環境移行
- 自動スケーリング設定
- モニタリング・アラート設定

---

## 📈 パフォーマンス考慮事項

### 現在の制約
- Lolipop共有リソース
- 同時接続数制限
- ストレージ容量制限

### 最適化案
- 画像の自動リサイズ・圧縮
- CDN導入 (Cloudflare)
- データベースクエリ最適化
- キャッシング戦略

---

*最終更新: 2025-12-29*
*バージョン: 1.0.0*

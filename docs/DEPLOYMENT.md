# Lolipop デプロイメントガイド

このドキュメントは、アクリルスタンド工房のウェブアプリケーションを Lolipop 共有ホスティングにデプロイする手順を説明します。

## 目次

1. [前提条件](#前提条件)
2. [データベースのセットアップ](#データベースのセットアップ)
3. [ファイルのアップロード](#ファイルのアップロード)
4. [データベース接続設定](#データベース接続設定)
5. [データベースの初期化](#データベースの初期化)
6. [ディレクトリパーミッションの設定](#ディレクトリパーミッションの設定)
7. [動作確認](#動作確認)
8. [トラブルシューティング](#トラブルシューティング)
9. [セキュリティ設定](#セキュリティ設定)

---

## 前提条件

- Lolipop のアカウント（スタンダードプラン以上推奨）
- FTP クライアント（FileZilla など）または Lolipop のファイルマネージャーへのアクセス
- MySQL データベースが利用可能なプラン
- PHP 7.4 以上が利用可能

---

## データベースのセットアップ

### ステップ 1: Lolipop にログイン

1. [Lolipop ユーザー専用ページ](https://user.lolipop.jp/) にアクセス
2. アカウント名とパスワードでログイン

### ステップ 2: データベースの作成

1. 左メニューから **「サーバーの管理・設定」** → **「データベース」** をクリック
2. **「データベース作成」** ボタンをクリック
3. 以下の情報を入力：
   - **データベース名**: `acrylic_stand`（または任意の名前）
   - **接続パスワード**: 安全なパスワードを設定（記録しておいてください）
4. **「作成」** ボタンをクリック

### ステップ 3: データベース情報の確認

作成後、以下の情報が表示されます。**必ずメモしておいてください**：

```
データベースサーバー: mysql000.lolipop.jp (例)
データベース名: LAA0000000-acrylic_stand (例)
ユーザー名: LAA0000000 (例)
パスワード: （設定したパスワード）
```

---

## ファイルのアップロード

### 方法 1: FTP クライアントを使用

#### FileZilla の設定例：

1. FileZilla を起動
2. 以下の情報を入力して接続：
   ```
   ホスト: ftp.lolipop.jp
   ユーザー名: （Lolipop のアカウント名）
   パスワード: （Lolipop のパスワード）
   ポート: 21
   ```
3. 接続後、リモートサイトのルートディレクトリに移動
4. プロジェクトのすべてのファイルをアップロード：
   ```
   ├── index.html
   ├── css/
   ├── js/
   ├── api/
   ├── uploads/
   ├── database/
   ├── admin/
   └── docs/
   ```

### 方法 2: Lolipop のファイルマネージャーを使用

1. ユーザー専用ページの左メニューから **「ロリポップ！FTP」** をクリック
2. ファイルをドラッグ＆ドロップでアップロード
3. フォルダ構造が正しく保たれていることを確認

### 重要な注意事項：

- `.htaccess` ファイルもアップロードしてください（隠しファイルのため注意）
- `uploads/` ディレクトリは空でも作成してください
- アップロード後、ファイルの文字コードが UTF-8 であることを確認

---

## データベース接続設定

### ステップ 1: config.php の編集

`api/config.php` ファイルを開き、以下の部分を編集します：

```php
// 変更前（デフォルト）
define('DB_HOST', 'mysql000.lolipop.jp');
define('DB_NAME', 'LAA0000000-yourdbname');
define('DB_USER', 'LAA0000000');
define('DB_PASS', 'your_database_password');

// 変更後（実際の情報を入力）
define('DB_HOST', 'mysql123.lolipop.jp');        // ← 実際のホスト名
define('DB_NAME', 'LAA1234567-acrylic_stand');   // ← 実際のデータベース名
define('DB_USER', 'LAA1234567');                 // ← 実際のユーザー名
define('DB_PASS', 'your_secure_password_here');  // ← 設定したパスワード
```

### ステップ 2: ファイルの保存とアップロード

1. 変更を保存
2. FTP で `api/config.php` を再度アップロード（上書き）

---

## データベースの初期化

### ステップ 1: phpMyAdmin へアクセス

1. Lolipop ユーザー専用ページの左メニューから **「データベース」** をクリック
2. 作成したデータベースの **「操作する」** ボタンをクリック
3. phpMyAdmin が新しいタブで開きます

### ステップ 2: SQL の実行

1. phpMyAdmin の上部メニューから **「SQL」** タブをクリック
2. `database/init.sql` ファイルの内容をコピー
3. SQL ボックスに貼り付け
4. 右下の **「実行」** ボタンをクリック

### ステップ 3: テーブルの確認

1. 左側のデータベース名をクリック
2. 以下の 5 つのテーブルが作成されていることを確認：
   - `customers` (顧客情報)
   - `orders` (注文)
   - `order_details` (注文詳細)
   - `payments` (支払い)
   - `order_analytics` (分析データ)

3. サンプルデータが挿入されているか確認：
   ```sql
   SELECT * FROM orders;
   ```
   1 件のサンプル注文が表示されれば成功です。

### サンプルデータの削除（本番運用時）

本番環境で使用する前に、サンプルデータを削除してください：

```sql
DELETE FROM order_analytics;
DELETE FROM payments;
DELETE FROM order_details;
DELETE FROM orders;
DELETE FROM customers;
```

---

## ディレクトリパーミッションの設定

### FTP クライアントでのパーミッション設定

1. `uploads/` ディレクトリを右クリック → **「ファイルの属性」** を選択
2. パーミッションを **`755`** に設定
   - 所有者: 読み取り、書き込み、実行
   - グループ: 読み取り、実行
   - その他: 読み取り、実行
3. **「サブディレクトリへ再帰」** にチェックを入れて適用

### Lolipop FTP でのパーミッション設定

1. `uploads/` ディレクトリを選択
2. 上部メニューの **「属性変更」** をクリック
3. `755` と入力して **「OK」** をクリック

### 確認が必要なディレクトリ：

- `uploads/` → `755` (書き込み可能)
- `api/` → `755` (実行可能)
- `admin/` → `755` (実行可能)

---

## 動作確認

### 1. API エンドポイントのテスト

#### 方法 1: ブラウザでアクセス

データベース接続が正しいか確認：

```
https://yourdomain.com/api/orders.php?order_number=AS-20240101-0001
```

**期待される結果**：
```json
{
  "success": true,
  "order": {
    "id": 1,
    "order_number": "AS-20240101-0001",
    "status": "pending",
    ...
  }
}
```

#### 方法 2: curl コマンドでテスト

```bash
# 注文状態の確認
curl "https://yourdomain.com/api/orders.php?order_number=AS-20240101-0001"

# 新規注文の作成（テスト）
curl -X POST https://yourdomain.com/api/orders.php \
  -H "Content-Type: application/json" \
  -d '{
    "customer": {
      "name": "テスト太郎",
      "email": "test@example.com",
      "phone": "090-1234-5678",
      "address": "東京都渋谷区1-2-3"
    },
    "order_details": {
      "product_size": "card",
      "base_design": "default",
      "quantity": 1,
      "price": 1000
    },
    "analytics": {
      "device_type": "desktop",
      "browser": "Chrome",
      "session_duration": 300,
      "pages_viewed": 5
    }
  }'
```

### 2. 画像アップロードのテスト

#### ブラウザから index.html にアクセス

```
https://yourdomain.com/index.html
```

1. 画像をアップロード
2. 編集を行う
3. 注文フォームを送信
4. 正常に完了メッセージが表示されることを確認

### 3. 管理画面の確認

```
https://yourdomain.com/admin/index.php
```

1. デフォルトパスワード `admin123` でログイン
2. 注文一覧が表示されることを確認

**重要**: 本番環境では必ずパスワードを変更してください！

---

## トラブルシューティング

### 問題 1: データベース接続エラー

**エラーメッセージ**: "データベース接続エラー"

**解決方法**:
1. `api/config.php` のデータベース情報を再確認
2. Lolipop のデータベース情報と一致しているか確認
3. phpMyAdmin で直接データベースにアクセスできるか確認

### 問題 2: 500 Internal Server Error

**考えられる原因**:
1. PHP のバージョンが古い
2. `.htaccess` の設定が正しくない
3. ファイルのパーミッションが正しくない

**解決方法**:
1. Lolipop の PHP バージョンを確認（7.4 以上必要）
2. エラーログを確認：
   - ユーザー専用ページ → 「ログ」 → 「エラーログ」
3. `.htaccess` ファイルが正しくアップロードされているか確認

### 問題 3: 画像がアップロードできない

**解決方法**:
1. `uploads/` ディレクトリのパーミッションを確認（755）
2. PHP の `upload_max_filesize` と `post_max_size` を確認
3. `api/.htaccess` で設定を上書き：
   ```apache
   php_value upload_max_filesize 10M
   php_value post_max_size 12M
   ```

### 問題 4: CORS エラー

**エラーメッセージ**: "Access to fetch at ... has been blocked by CORS policy"

**解決方法**:
`api/config.php` の CORS 設定を確認：
```php
header('Access-Control-Allow-Origin: *');
```

特定のドメインのみ許可する場合：
```php
header('Access-Control-Allow-Origin: https://yourdomain.com');
```

### 問題 5: 日本語が文字化けする

**解決方法**:
1. データベースの文字セットを確認：
   ```sql
   SHOW VARIABLES LIKE 'character_set%';
   ```
2. すべて `utf8mb4` になっているか確認
3. ファイル自体が UTF-8 で保存されているか確認

---

## セキュリティ設定

### 1. 管理画面のパスワード変更

`admin/index.php` の以下の行を変更：

```php
// 変更前
define('ADMIN_PASSWORD', 'admin123');

// 変更後
define('ADMIN_PASSWORD', 'your_strong_password_here');
```

### 2. データベースパスワードの強化

- 英数字記号を含む 12 文字以上のパスワードを使用
- 定期的に変更する

### 3. HTTPS の有効化

1. Lolipop ユーザー専用ページで「独自 SSL 証明書導入」を設定
2. HTTP から HTTPS へのリダイレクトを `.htaccess` に追加：

```apache
# ルートディレクトリの .htaccess に追加
RewriteEngine On
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [R=301,L]
```

### 4. ファイルアップロードのセキュリティ

`uploads/.htaccess` が正しく配置されていることを確認：
- PHP スクリプトの実行を禁止
- 画像ファイルのみ許可

### 5. SQL インジェクション対策

- PDO のプリペアドステートメントを使用（実装済み）
- ユーザー入力は必ずサニタイズ（実装済み）

### 6. エラー表示の無効化（本番環境）

`api/.htaccess` に追加：

```apache
php_flag display_errors off
php_flag display_startup_errors off
php_flag log_errors on
```

---

## メンテナンス

### データベースのバックアップ

#### 方法 1: phpMyAdmin から

1. phpMyAdmin にアクセス
2. データベースを選択
3. 「エクスポート」タブをクリック
4. 「実行」ボタンをクリックして SQL ファイルをダウンロード

#### 方法 2: 自動バックアップ

Lolipop の「バックアップオプション」を利用（有料）

### ログの確認

定期的にエラーログを確認：
- Lolipop ユーザー専用ページ → 「ログ」 → 「エラーログ」

### パフォーマンス最適化

1. 画像の最適化：
   - アップロードされた画像を定期的に最適化
   - 不要な大きさの画像は削除

2. データベースの最適化：
   ```sql
   OPTIMIZE TABLE customers, orders, order_details, payments, order_analytics;
   ```

---

## サポート情報

### Lolipop サポート

- [Lolipop マニュアル](https://lolipop.jp/manual/)
- [よくある質問](https://lolipop.jp/faq/)
- メールサポート: support@lolipop.jp

### このプロジェクトについて

問題が発生した場合は、以下を確認してください：
1. このドキュメントのトラブルシューティングセクション
2. Lolipop のエラーログ
3. ブラウザのコンソール（開発者ツール）

---

## チェックリスト

デプロイ前に以下を確認してください：

- [ ] データベースを作成した
- [ ] データベース情報を `api/config.php` に正しく入力した
- [ ] すべてのファイルをアップロードした（`.htaccess` を含む）
- [ ] データベースを初期化した（`init.sql` を実行）
- [ ] `uploads/` ディレクトリのパーミッションを設定した（755）
- [ ] API エンドポイントが正しく動作することを確認した
- [ ] 画像アップロードをテストした
- [ ] 管理画面にアクセスできることを確認した
- [ ] 管理画面のパスワードを変更した
- [ ] HTTPS を有効化した
- [ ] サンプルデータを削除した（本番環境の場合）
- [ ] エラーログを確認した
- [ ] バックアップ方法を理解した

すべてのチェックが完了したら、デプロイ完了です！🎉

---

## 更新履歴

- 2024-12-21: 初版作成

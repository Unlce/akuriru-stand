# セキュリティガイド

このドキュメントでは、アクリルスタンド工房を安全に運用するためのセキュリティ設定とベストプラクティスを説明します。

## 🔒 必須のセキュリティ設定

### 1. 管理画面パスワードの変更

**重要度: 最高**

デフォルトのパスワード `admin123` は**必ず変更**してください。

#### 方法 1: パスワードを直接変更（簡易）

`admin/index.php` の 22 行目を編集：

```php
// 変更前
define('ADMIN_PASSWORD', 'admin123');

// 変更後（強力なパスワードに）
define('ADMIN_PASSWORD', 'Xy9#mK2@pL5$qR8!');
```

**強力なパスワードの条件:**
- 16 文字以上
- 大文字、小文字、数字、記号を含む
- 辞書にない文字列
- 他のサービスで使用していないもの

#### 方法 2: ハッシュ化したパスワードを使用（推奨）

より安全な方法として、パスワードをハッシュ化して保存：

```php
// パスワードハッシュの生成（一度だけ実行）
$hashedPassword = password_hash('your_strong_password', PASSWORD_DEFAULT);
// 生成されたハッシュをコピー

// admin/index.php に保存
define('ADMIN_PASSWORD_HASH', '$2y$10$...');  // 生成したハッシュを貼り付け

// ログイン検証を変更
if (password_verify($_POST['password'], ADMIN_PASSWORD_HASH)) {
    $_SESSION['admin_logged_in'] = true;
    header('Location: index.php');
    exit();
}
```

#### 方法 3: .htpasswd で保護（最も推奨）

Apache の .htpasswd を使用して管理画面全体を保護：

1. .htpasswd ファイルを生成：
   ```bash
   htpasswd -c /path/to/.htpasswd admin
   ```

2. `admin/.htaccess` を作成：
   ```apache
   AuthType Basic
   AuthName "Admin Area"
   AuthUserFile /path/to/.htpasswd
   Require valid-user
   ```

### 2. データベースパスワードの強化

**重要度: 最高**

`api/config.php` のデータベースパスワードを強力なものに変更：

```php
define('DB_PASS', 'Xy9#mK2@pL5$qR8!');  // 強力なパスワード
```

Lolipop のデータベース管理画面からパスワードを変更できます。

### 3. HTTPS の有効化

**重要度: 最高**

すべての通信を暗号化するため、HTTPS を有効化してください。

#### Lolipop での設定方法：

1. ユーザー専用ページにログイン
2. 「セキュリティ」→「独自SSL証明書購入」
3. 無料の Let's Encrypt SSL を選択
4. ドメインを選択して証明書を有効化

#### HTTP から HTTPS へのリダイレクト

ルートディレクトリの `.htaccess` に追加：

```apache
# HTTPS リダイレクト
RewriteEngine On
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [R=301,L]
```

### 4. エラー表示の無効化

**重要度: 高**

本番環境ではエラーメッセージを表示しないように設定：

`api/.htaccess` に追加：

```apache
php_flag display_errors off
php_flag display_startup_errors off
php_flag log_errors on
php_value error_log /path/to/php-error.log
```

### 5. ファイルパーミッションの設定

**重要度: 高**

適切なパーミッションを設定：

```bash
# ディレクトリ
chmod 755 api/
chmod 755 admin/
chmod 755 uploads/
chmod 755 database/

# PHP ファイル
chmod 644 api/*.php
chmod 644 admin/*.php

# .htaccess ファイル
chmod 644 api/.htaccess
chmod 644 uploads/.htaccess

# 設定ファイル（より厳格に）
chmod 600 api/config.php
```

## 🛡️ 追加のセキュリティ対策

### 6. CORS の制限

**重要度: 中**

特定のドメインからのみアクセスを許可：

`api/config.php` を編集：

```php
// すべてのドメインを許可（開発時のみ）
header('Access-Control-Allow-Origin: *');

// 特定のドメインのみ許可（本番環境）
header('Access-Control-Allow-Origin: https://yourdomain.com');
```

### 7. IP アドレス制限

**重要度: 中**

管理画面へのアクセスを特定の IP アドレスに制限：

`admin/.htaccess` を作成：

```apache
# 管理画面のIP制限
Order Deny,Allow
Deny from all
Allow from 123.456.789.0  # あなたのIPアドレス
Allow from 192.168.1.0/24  # ローカルネットワーク
```

### 8. SQL インジェクション対策

**重要度: 最高**（実装済み）

✅ すでに実装されている対策：
- PDO のプリペアドステートメントを使用
- すべてのユーザー入力をバインドパラメータで処理
- `sanitizeInput()` 関数で追加のサニタイズ

### 9. XSS 対策

**重要度: 最高**（実装済み）

✅ すでに実装されている対策：
- `htmlspecialchars()` による出力のエスケープ
- X-XSS-Protection ヘッダーの設定
- Content-Security-Policy ヘッダーの設定

### 10. ファイルアップロードセキュリティ

**重要度: 最高**（実装済み）

✅ すでに実装されている対策：
- ファイルタイプの検証（MIME タイプ）
- ファイルサイズの制限（10MB）
- 安全なファイル名の生成
- `.htaccess` によるスクリプト実行の禁止

## 🔍 セキュリティ監査

### 定期的なチェック項目

#### 毎週
- [ ] エラーログを確認
- [ ] 不審なアクセスがないか確認
- [ ] データベースのバックアップ

#### 毎月
- [ ] PHP のバージョンを確認（セキュリティアップデート）
- [ ] MySQL のバージョンを確認
- [ ] 不要なファイルを削除
- [ ] パスワードの強度を再確認

#### 四半期ごと
- [ ] 全セキュリティ設定を再確認
- [ ] ペネトレーションテストの実施（可能であれば）
- [ ] パスワードの変更

### セキュリティログの確認方法

#### Lolipop のエラーログ

1. ユーザー専用ページにログイン
2. 「ログ」→「エラーログ」を選択
3. 不審なエラーやアクセスをチェック

#### 不審なアクセスの例

- 大量の 404 エラー（スキャン攻撃）
- SQL インジェクションの試み
- ファイルアップロードの異常なリクエスト
- 管理画面への繰り返しのログイン失敗

## 🚨 インシデント対応

### セキュリティ侵害が疑われる場合

1. **即座に対応**
   - サイトを一時的にオフラインにする
   - すべてのパスワードを変更
   - データベースのバックアップを取得

2. **調査**
   - エラーログを詳細に確認
   - 不正なファイルがないか確認
   - データベースの整合性をチェック

3. **復旧**
   - 侵害されたファイルを削除
   - クリーンなバックアップから復元
   - セキュリティパッチを適用

4. **事後対応**
   - セキュリティ設定を強化
   - アクセス制限を追加
   - 監視を強化

## 📋 セキュリティチェックリスト

デプロイ前に必ず確認：

### 必須項目（最高優先度）
- [ ] 管理画面のパスワードを変更
- [ ] データベースパスワードを強化
- [ ] HTTPS を有効化
- [ ] エラー表示を無効化
- [ ] ファイルパーミッションを設定

### 推奨項目（高優先度）
- [ ] .htpasswd で管理画面を保護
- [ ] CORS を制限
- [ ] バックアップを設定
- [ ] エラーログの監視を開始

### オプション項目（中優先度）
- [ ] IP アドレス制限を設定
- [ ] ホットリンク防止を有効化
- [ ] セキュリティヘッダーを追加

## 📚 参考リソース

- [OWASP Top 10](https://owasp.org/www-project-top-ten/) - Web アプリケーションのセキュリティリスク
- [PHP セキュリティガイド](https://www.php.net/manual/ja/security.php)
- [MySQL セキュリティガイド](https://dev.mysql.com/doc/refman/8.0/ja/security.html)
- [Lolipop セキュリティ設定](https://lolipop.jp/manual/user/ssl/)

## 💡 まとめ

セキュリティは継続的なプロセスです。定期的な監視、更新、監査を行うことで、安全なサービスを維持できます。

**重要な3つのポイント:**

1. **すべてのデフォルトパスワードを変更**
2. **HTTPS を有効化**
3. **定期的にログを確認**

これらを実施することで、基本的なセキュリティは確保できます。

---

疑問点や不明点がある場合は、セキュリティ専門家に相談することをお勧めします。

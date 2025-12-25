# 要件定義書（アクリルスタンド工房）

## 1. 目的とスコープ
- ユーザーが画像をアップロードし、オリジナルアクリルスタンドを作成・注文できるようにする。
- 注文情報を店舗（運営）と下請け（製造・発送パートナー）に確実に連携する。
- 現在の実装範囲：
  - 画像編集（フィルター、切り抜き、デコレーション）
  - 注文作成、注文管理（管理画面）
  - ステータス更新、メール通知（顧客・運営・下請け・発送通知）
  - 決済統合（Stripe/PayPay）
  - 注文追跡システム
  - 印刷用データダウンロード
- 非スコープ（将来検討）：在庫管理、領収書自動発行。

## 2. 関係者
- エンドユーザー（購入者）：画像アップロード、デザイン編集、注文・支払い情報入力。
- 店舗運営（ショップ）：注文受付、顧客対応、ステータス更新、売上管理、印刷データダウンロード。
- 下請け（製造・発送パートナー）：決済確認後の製造・発送対応。通知先メールは `SUBCONTRACT_EMAIL`。
- 配送業者：ヤマト運輸、佐川急便、日本郵便など。

## 3. ユースケース概要
1) ユーザーが画像をアップロードし、フィルター・切り抜き・デコレーションを適用。
2) サイズ・台座デザインを選択。
3) 支払い情報フォームに名前・メール・電話・住所を入力し、決済方法（PayPay/Stripe/後払い）を選択。
4) 注文送信後、決済プロセスに進む（PayPay QRコード、Stripe Checkout、または後払い）。
5) バックエンドが注文を保存し、顧客・店舗へメール送信。
6) 管理画面で注文一覧・詳細を確認し、ステータスを更新。
7) ステータスが `paid` になったら下請けへ自動メール通知（製造依頼）。
8) ステータスが `shipped` になったら顧客へ発送通知メール（追跡番号付き）。
9) 顧客は注文追跡ページで配送状況を確認。

## 4. 機能要件

### 4.1 画像編集
- 画像アップロード（JPG/PNG/GIF/WEBP, 最大10MB）
- 基本編集：回転、拡大縮小、台座デザイン選択
- フィルター機能：
  - プリセット（モノクロ、セピア、ビンテージ、反転、明るく、暗く、高コントラスト、ぼかし）
  - 詳細調整（明るさ、コントラスト、彩度、ぼかし）
  - 背景除去（自動）
- 切り抜き機能：フリーハンド、ポリゴン、ブラシ
- デコレーション：花、ハート、星、リボン、エフェクト
- プレビュー表示

### 4.2 注文作成（フロントエンド `js/payment.js` → API `api/orders.php`）
- 必須入力: 名前・メール・電話・住所、サイズ、数量、価格、決済方法
- 画像データのアップロード (`api/upload.php`) とパス保存
- 分析データ送信（デバイス、ブラウザ、滞在時間、ページビュー）

### 4.3 決済統合
- 対応決済方法：
  - PayPay（QRコード、ディープリンク）
  - Stripe（クレジットカード）
  - 後払い（銀行振込）
- 決済セッション作成API: `api/create-payment.php`
- Webhook処理: `api/payment-webhook.php`
  - Stripe: checkout.session.completed, payment_intent.succeeded
  - PayPay: COMPLETED, FAILED, CANCELED
- 自動ステータス更新（決済完了時に `paid` へ）

### 4.4 注文管理 / 照会
- `GET api/orders.php?order_number=...` で注文取得
- `GET api/order-detail.php?query=...` で注文番号またはメールアドレスで検索
- 管理画面 `admin/index.php`:
  - 一覧・詳細表示
  - 統計ダッシュボード（総注文数、売上、ステータス別件数）
  - フィルター（日付範囲、検索、ステータス）
  - CSVエクスポート
  - 一括操作（ステータス変更）
  - 印刷用データダウンロード

### 4.5 ステータス更新
- `POST api/update-status.php` で以下のステータスに更新：
  - `pending` → `paid` → `processing` → `shipped` → `completed`
  - `cancelled`（キャンセル）
- ステータス変更時の自動処理：
  - `paid`: 下請けへ製造依頼メール
  - `shipped`: 顧客へ発送通知メール（追跡番号付き）

### 4.6 メール通知
- **注文作成時**：顧客宛・運営宛
- **決済確認時（status=paid）**：下請け宛（製造依頼）
- **発送時（status=shipped）**：顧客宛（追跡番号、配送会社情報、追跡リンク）
- 送信元/宛先設定：
  - `SHOP_ADMIN_EMAIL`（運営, デフォルト `info@zyniqo.co.jp`）
  - `SHOP_FROM_EMAIL`（送信元, デフォルト `info@zyniqo.co.jp`）
  - `SUBCONTRACT_EMAIL`（下請け, 環境変数で指定）
- `mb_send_mail` が無い環境では `mail()` にフォールバック

### 4.7 注文追跡
- 追跡ページ: `tracking.html`
- 注文番号またはメールアドレスで検索
- タイムライン表示（pending → paid → processing → shipped → completed）
- 配送業者リンク（ヤマト運輸、佐川急便、日本郵便）
- 追跡番号・配送会社情報の表示

### 4.8 印刷用データダウンロード
- API: `api/download-print-data.php?order_id=...&format=...`
- フォーマット：
  - `json`: 注文データJSON
  - `image`: 高解像度画像のみ
  - `pdf`: 製造指示書（テキスト形式）
- 含まれる情報：
  - 注文番号、顧客情報、製品仕様（サイズ、台座、数量）
  - 画像データ、価格、製造メモ

### 4.9 法的ページ
- 利用規約: `terms.html`
- プライバシーポリシー: `privacy.html`
- 特定商取引法に基づく表記: `tokushoho.html`

### 4.10 セキュリティ
- 入力サニタイズ、PDOプリペアドステートメント、CORS許可（GET/POST/OPTIONS）
- `uploads/.htaccess` によるスクリプト実行禁止
- Webhook署名検証（Stripe HMAC、PayPay HMAC）

## 5. 非機能要件
- パフォーマンス: 通常トラフィックで1リクエスト<1s（画像アップロード除く）
- 可用性: 99.9%稼働率を目指す
- ログ: エラーは `error_log` へ記録、Webhook受信ログ
- スケーラビリティ: 画像データはBase64とファイルパス両対応

## 6. データベーススキーマ
- **customers**: 顧客情報
- **orders**: 注文主テーブル（order_number, status, tracking_number, shipping_company, shipped_at）
- **order_details**: 注文詳細（product_size, base_design, quantity, price, image_path, image_data）
- **payments**: 決済情報（payment_status, transaction_id, amount, payment_method, payment_session_id）
- **order_analytics**: 分析データ（device_type, browser, session_duration, referrer, pages_viewed）

## 7. 現状の制約・注意事項
- 下請けメール送信先 `SUBCONTRACT_EMAIL` は未設定の場合スキップ。
- 画像データはアップロードAPI経由で保存するが、長期保存/バックアップの方針は運用で決定。
- 管理画面認証はパスワード `admin123`（本番環境では変更必須）。

## 8. 今後の拡張候補 / ToDo
- 再注文機能: 過去の注文から同じデザインで再注文
- 数量割引: 10個以上で割引適用
- 送料計算: 地域別、数量別
- 認証強化: 管理画面JWT認証、2FA
- 通知強化: メールテンプレートHTML化、プッシュ通知
- 在庫管理: 材料の残数管理
- 売上レポート: 日別、月別レポート

## 9. 環境変数・設定
- `SHOP_ADMIN_EMAIL` : 運営宛先（デフォルト `info@zyniqo.co.jp`）
- `SHOP_FROM_EMAIL` : 送信元（SPF/DKIM済み推奨, デフォルト `info@zyniqo.co.jp`）
- `SUBCONTRACT_EMAIL` : 下請け宛先（必ず設定）
- `SITE_URL` : サイトURL（追跡リンク生成用）
- `STRIPE_SECRET_KEY`, `STRIPE_PUBLIC_KEY`, `STRIPE_WEBHOOK_SECRET` : Stripe設定
- `PAYPAY_API_KEY`, `PAYPAY_API_SECRET`, `PAYPAY_MERCHANT_ID` : PayPay設定
- DB接続: `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASS`, `DB_CHARSET`

## 10. API一覧
- `POST api/orders.php` : 新規注文作成（JSON）
- `GET api/orders.php?order_number=...` : 注文取得
- `POST api/update-status.php` : ステータス更新
- `POST api/upload.php` : 画像アップロード
- `GET api/order-detail.php?query=...` : 注文詳細取得（注文番号/メール検索）
- `POST api/create-payment.php` : 決済セッション作成
- `POST api/payment-webhook.php?provider=stripe|paypay` : 決済Webhook
- `GET api/download-print-data.php?order_id=...&format=json|image|pdf` : 印刷データダウンロード

## 11. テスト観点
- 正常系: 注文作成→決済→メール送信→`paid`更新→下請け通知→`shipped`更新→発送通知
- 入力バリデーション: メール/電話/必須項目未入力時のエラー
- 決済: Stripe/PayPay決済フロー、Webhook処理
- メール: 宛先未設定時にスキップ、失敗しても注文処理が成功
- 追跡: 注文番号/メールアドレスで正しく検索できること
- セキュリティ: SQLインジェクション防止、アップロード拡張子制限、CORS確認
- 管理画面: ステータス更新の反映、フィルタリング、CSVエクスポート、一括操作

## 12. 運用手順メモ
- デプロイ時に環境変数を設定（メール、決済、DB）
- 決済Webhook URLを決済サービスに登録
  - Stripe: `https://yourdomain.com/api/payment-webhook.php?provider=stripe`
  - PayPay: `https://yourdomain.com/api/payment-webhook.php?provider=paypay`
- 管理画面パスワード変更（`admin/index.php`の`ADMIN_PASSWORD`）
- メールが届かない場合はサーバーの `sendmail`/SMTP 設定とドメイン認証を確認
- 追跡番号入力時は配送会社も同時に登録すること

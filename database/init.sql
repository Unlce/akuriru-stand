-- ================================
-- アクリルスタンド工房 データベース初期化スクリプト
-- ================================
-- 
-- このスクリプトは Lolipop の phpMyAdmin で実行してください
-- MySQL 5.7+ / MariaDB 10.x 互換
-- UTF-8 (utf8mb4) 対応

-- ================================
-- 1. 顧客テーブル (customers)
-- ================================
CREATE TABLE IF NOT EXISTS `customers` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(255) NOT NULL COMMENT '顧客名',
    `email` VARCHAR(255) NOT NULL COMMENT 'メールアドレス',
    `phone` VARCHAR(50) NOT NULL COMMENT '電話番号',
    `address` TEXT NOT NULL COMMENT '配送先住所',
    `created_at` DATETIME NOT NULL COMMENT '作成日時',
    `updated_at` DATETIME NULL COMMENT '更新日時',
    INDEX `idx_email` (`email`),
    INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='顧客情報';

-- ================================
-- 2. 注文テーブル (orders)
-- ================================
CREATE TABLE IF NOT EXISTS `orders` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `order_number` VARCHAR(50) NOT NULL UNIQUE COMMENT '注文番号 (AS-YYYYMMDD-XXXX)',
    `customer_id` INT UNSIGNED NOT NULL COMMENT '顧客ID',
    `status` ENUM('pending', 'processing', 'completed', 'cancelled') NOT NULL DEFAULT 'pending' COMMENT '注文状態',
    `created_at` DATETIME NOT NULL COMMENT '作成日時',
    `updated_at` DATETIME NOT NULL COMMENT '更新日時',
    INDEX `idx_order_number` (`order_number`),
    INDEX `idx_customer_id` (`customer_id`),
    INDEX `idx_status` (`status`),
    INDEX `idx_created_at` (`created_at`),
    FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='注文主テーブル';

-- ================================
-- 3. 注文詳細テーブル (order_details)
-- ================================
CREATE TABLE IF NOT EXISTS `order_details` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `order_id` INT UNSIGNED NOT NULL COMMENT '注文ID',
    `product_size` ENUM('card', 'postcard', 'a5', 'a4') NOT NULL COMMENT '商品サイズ',
    `base_design` VARCHAR(50) NOT NULL DEFAULT 'default' COMMENT '台座デザイン',
    `quantity` INT UNSIGNED NOT NULL DEFAULT 1 COMMENT '数量',
    `price` DECIMAL(10, 2) NOT NULL COMMENT '単価',
    `image_path` VARCHAR(500) NULL COMMENT '画像ファイルパス',
    `image_data` LONGTEXT NULL COMMENT '画像データ (Base64)',
    `created_at` DATETIME NOT NULL COMMENT '作成日時',
    INDEX `idx_order_id` (`order_id`),
    INDEX `idx_product_size` (`product_size`),
    FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='注文詳細';

-- ================================
-- 4. 支払いテーブル (payments)
-- ================================
CREATE TABLE IF NOT EXISTS `payments` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `order_id` INT UNSIGNED NOT NULL COMMENT '注文ID',
    `payment_status` ENUM('pending', 'completed', 'failed', 'refunded') NOT NULL DEFAULT 'pending' COMMENT '支払い状態',
    `transaction_id` VARCHAR(255) NULL COMMENT 'PayPay取引ID',
    `amount` DECIMAL(10, 2) NOT NULL COMMENT '支払い金額',
    `created_at` DATETIME NOT NULL COMMENT '作成日時',
    `updated_at` DATETIME NULL COMMENT '更新日時',
    INDEX `idx_order_id` (`order_id`),
    INDEX `idx_payment_status` (`payment_status`),
    INDEX `idx_transaction_id` (`transaction_id`),
    FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='支払い記録';

-- ================================
-- 5. 分析データテーブル (order_analytics)
-- ================================
CREATE TABLE IF NOT EXISTS `order_analytics` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `order_id` INT UNSIGNED NOT NULL COMMENT '注文ID',
    `device_type` VARCHAR(50) NULL COMMENT 'デバイスタイプ (mobile, tablet, desktop)',
    `browser` VARCHAR(100) NULL COMMENT 'ブラウザ情報',
    `session_duration` INT UNSIGNED NULL COMMENT 'セッション時間 (秒)',
    `referrer` VARCHAR(500) NULL COMMENT 'リファラURL',
    `pages_viewed` INT UNSIGNED NULL COMMENT '閲覧ページ数',
    `created_at` DATETIME NOT NULL COMMENT '作成日時',
    INDEX `idx_order_id` (`order_id`),
    INDEX `idx_device_type` (`device_type`),
    INDEX `idx_created_at` (`created_at`),
    FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='注文分析データ';

-- ================================
-- サンプルデータ（テスト用、本番環境では削除可）
-- ================================

-- サンプル顧客
INSERT INTO `customers` (`name`, `email`, `phone`, `address`, `created_at`) VALUES
('山田 太郎', 'yamada@example.com', '090-1234-5678', '〒123-4567 東京都渋谷区1-2-3', NOW());

-- サンプル注文
SET @customer_id = LAST_INSERT_ID();
INSERT INTO `orders` (`order_number`, `customer_id`, `status`, `created_at`, `updated_at`) VALUES
(CONCAT('AS-', DATE_FORMAT(NOW(), '%Y%m%d'), '-0001'), @customer_id, 'pending', NOW(), NOW());

-- サンプル注文詳細
SET @order_id = LAST_INSERT_ID();
INSERT INTO `order_details` (`order_id`, `product_size`, `base_design`, `quantity`, `price`, `created_at`) VALUES
(@order_id, 'card', 'default', 1, 1000.00, NOW());

-- サンプル支払い
INSERT INTO `payments` (`order_id`, `payment_status`, `amount`, `created_at`) VALUES
(@order_id, 'pending', 1000.00, NOW());

-- サンプル分析データ
INSERT INTO `order_analytics` (`order_id`, `device_type`, `browser`, `session_duration`, `pages_viewed`, `created_at`) VALUES
(@order_id, 'desktop', 'Chrome', 300, 5, NOW());

-- ================================
-- データベース初期化完了
-- ================================
-- 
-- 確認クエリ:
-- SELECT * FROM customers;
-- SELECT * FROM orders;
-- SELECT * FROM order_details;
-- SELECT * FROM payments;
-- SELECT * FROM order_analytics;

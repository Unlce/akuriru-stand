<?php
/**
 * データベーステーブル構造確認
 */

require_once __DIR__ . '/config.php';

echo "<h2>データベース構造確認</h2>";

try {
    $pdo = getDbConnection();
    
    echo "<h3>接続先データベース: " . DB_NAME . "</h3>";
    
    // order_details テーブルの構造を確認
    echo "<h3>order_details テーブル構造:</h3>";
    echo "<pre>";
    
    $stmt = $pdo->query("DESCRIBE order_details");
    $columns = $stmt->fetchAll();
    
    echo "カラム一覧:\n";
    echo str_pad("Field", 20) . str_pad("Type", 20) . str_pad("Null", 6) . "Key\n";
    echo str_repeat("-", 60) . "\n";
    
    $hasImageData = false;
    foreach ($columns as $col) {
        echo str_pad($col['Field'], 20) . str_pad($col['Type'], 20) . str_pad($col['Null'], 6) . $col['Key'] . "\n";
        if ($col['Field'] === 'image_data') {
            $hasImageData = true;
        }
    }
    
    echo "\n";
    echo "image_data カラム: " . ($hasImageData ? "✅ 存在します" : "❌ 存在しません") . "\n";
    
    echo "</pre>";
    
    // 全テーブル一覧
    echo "<h3>データベース内の全テーブル:</h3>";
    echo "<pre>";
    $stmt = $pdo->query("SHOW TABLES");
    $tables = $stmt->fetchAll(PDO::FETCH_COLUMN);
    foreach ($tables as $table) {
        echo "- " . $table . "\n";
    }
    echo "</pre>";
    
} catch (Exception $e) {
    echo "<p style='color:red'>エラー: " . $e->getMessage() . "</p>";
}

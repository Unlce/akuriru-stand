<?php
/**
 * 全テーブル構造確認
 */

require_once __DIR__ . '/config.php';

echo "<h2>全テーブル構造確認</h2>";
echo "<style>table{border-collapse:collapse;margin:10px 0}td,th{border:1px solid #ccc;padding:5px 10px}th{background:#f5f5f5}</style>";

try {
    $pdo = getDbConnection();
    
    $tables = ['customers', 'orders', 'order_details', 'payments', 'order_analytics'];
    
    foreach ($tables as $tableName) {
        echo "<h3>{$tableName}</h3>";
        
        // テーブルが存在するか確認
        $stmt = $pdo->query("SHOW TABLES LIKE '{$tableName}'");
        if ($stmt->rowCount() === 0) {
            echo "<p style='color:red'>❌ テーブルが存在しません</p>";
            continue;
        }
        
        // 構造を取得
        $stmt = $pdo->query("DESCRIBE `{$tableName}`");
        $columns = $stmt->fetchAll();
        
        echo "<table>";
        echo "<tr><th>Field</th><th>Type</th><th>Null</th><th>Key</th><th>Default</th><th>Extra</th></tr>";
        
        foreach ($columns as $col) {
            $highlight = '';
            if ($col['Field'] === 'id' && strpos($col['Extra'], 'auto_increment') === false) {
                $highlight = 'style="background:#ffcccc"'; // IDがauto_incrementでない場合は警告
            }
            echo "<tr {$highlight}>";
            echo "<td>{$col['Field']}</td>";
            echo "<td>{$col['Type']}</td>";
            echo "<td>{$col['Null']}</td>";
            echo "<td>{$col['Key']}</td>";
            echo "<td>{$col['Default']}</td>";
            echo "<td>{$col['Extra']}</td>";
            echo "</tr>";
        }
        echo "</table>";
        
        // レコード数
        $stmt = $pdo->query("SELECT COUNT(*) as cnt FROM `{$tableName}`");
        $count = $stmt->fetch()['cnt'];
        echo "<p>レコード数: {$count}</p>";
    }
    
    // 外部キー制約を確認
    echo "<h3>外部キー制約</h3>";
    $stmt = $pdo->query("
        SELECT 
            TABLE_NAME,
            COLUMN_NAME,
            CONSTRAINT_NAME,
            REFERENCED_TABLE_NAME,
            REFERENCED_COLUMN_NAME
        FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
        WHERE REFERENCED_TABLE_SCHEMA = '" . DB_NAME . "'
        AND REFERENCED_TABLE_NAME IS NOT NULL
    ");
    $fks = $stmt->fetchAll();
    
    if (count($fks) > 0) {
        echo "<table>";
        echo "<tr><th>テーブル</th><th>カラム</th><th>参照先テーブル</th><th>参照先カラム</th></tr>";
        foreach ($fks as $fk) {
            echo "<tr>";
            echo "<td>{$fk['TABLE_NAME']}</td>";
            echo "<td>{$fk['COLUMN_NAME']}</td>";
            echo "<td>{$fk['REFERENCED_TABLE_NAME']}</td>";
            echo "<td>{$fk['REFERENCED_COLUMN_NAME']}</td>";
            echo "</tr>";
        }
        echo "</table>";
    } else {
        echo "<p>外部キー制約はありません</p>";
    }
    
} catch (Exception $e) {
    echo "<p style='color:red'>エラー: " . $e->getMessage() . "</p>";
}

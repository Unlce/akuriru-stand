<?php
/**
 * PHPUnit Bootstrap File
 * Sets up the testing environment
 */

// Set error reporting
error_reporting(E_ALL);
ini_set('display_errors', '1');

// Define test constants
define('TEST_MODE', true);
define('ROOT_PATH', dirname(__DIR__));

// Mock database configuration for tests
$GLOBALS['test_db_config'] = [
    'host' => getenv('TEST_DB_HOST') ?: 'localhost',
    'database' => getenv('TEST_DB_NAME') ?: 'test_acrylic_stand',
    'username' => getenv('TEST_DB_USER') ?: 'test_user',
    'password' => getenv('TEST_DB_PASS') ?: 'test_pass'
];

// Helper function to get test database connection
function getTestDbConnection() {
    static $conn = null;
    if ($conn === null) {
        try {
            $config = $GLOBALS['test_db_config'];
            $conn = new PDO(
                "mysql:host={$config['host']};dbname={$config['database']};charset=utf8mb4",
                $config['username'],
                $config['password'],
                [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES => false
                ]
            );
        } catch (PDOException $e) {
            // If test database not available, return mock connection
            $conn = false;
        }
    }
    return $conn;
}

// Load composer autoloader if available
if (file_exists(ROOT_PATH . '/vendor/autoload.php')) {
    require_once ROOT_PATH . '/vendor/autoload.php';
}

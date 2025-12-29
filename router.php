<?php
// Development router with no-cache headers
$uri = $_SERVER['REQUEST_URI'];
$path = parse_url($uri, PHP_URL_PATH);

// Remove query string for file lookup
$file = __DIR__ . $path;

// If requesting root, serve index.html
if ($path === '/') {
    $file = __DIR__ . '/index.html';
}

// Check if file exists
if (is_file($file)) {
    // Set no-cache headers for HTML files
    if (pathinfo($file, PATHINFO_EXTENSION) === 'html') {
        header('Cache-Control: no-cache, no-store, must-revalidate');
        header('Pragma: no-cache');
        header('Expires: 0');
    }

    // Set no-cache for JavaScript files
    if (pathinfo($file, PATHINFO_EXTENSION) === 'js') {
        header('Cache-Control: no-cache, must-revalidate');
        header('Content-Type: application/javascript');
    }

    return false; // Let PHP built-in server handle the file
} else {
    http_response_code(404);
    echo "File not found: " . htmlspecialchars($path);
}

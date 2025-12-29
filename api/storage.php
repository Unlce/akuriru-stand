<?php
/**
 * Storage Adapter
 * Handles file storage for both local filesystem and Google Cloud Storage
 */

/**
 * Check if Cloud Storage should be used
 */
function useCloudStorage() {
    return getenv('USE_CLOUD_STORAGE') === 'true' && !empty(getenv('GCS_BUCKET'));
}

/**
 * Upload file to storage (local or GCS)
 *
 * @param array $file $_FILES array entry
 * @param string $destination Relative destination path (e.g., "2025/01/15/filename.jpg")
 * @return array ['success' => bool, 'path' => string, 'url' => string|null, 'error' => string|null]
 */
function uploadToStorage($file, $destination) {
    if (useCloudStorage()) {
        return uploadToGcs($file, $destination);
    } else {
        return uploadToLocal($file, $destination);
    }
}

/**
 * Upload file to local filesystem
 */
function uploadToLocal($file, $destination) {
    $uploadDir = __DIR__ . '/../uploads/';
    $fullPath = $uploadDir . $destination;
    $directory = dirname($fullPath);

    // Create directory if it doesn't exist
    if (!file_exists($directory)) {
        if (!mkdir($directory, 0755, true)) {
            return [
                'success' => false,
                'path' => null,
                'url' => null,
                'error' => 'Failed to create upload directory'
            ];
        }
    }

    // Move uploaded file
    if (!move_uploaded_file($file['tmp_name'], $fullPath)) {
        return [
            'success' => false,
            'path' => null,
            'url' => null,
            'error' => 'Failed to move uploaded file'
        ];
    }

    return [
        'success' => true,
        'path' => 'uploads/' . $destination,
        'url' => getBaseUrl() . '/uploads/' . $destination,
        'error' => null
    ];
}

/**
 * Upload file to Google Cloud Storage
 */
function uploadToGcs($file, $destination) {
    try {
        // Check if GCS library is available
        if (!class_exists('Google\Cloud\Storage\StorageClient')) {
            error_log('GCS: Google Cloud Storage SDK not installed. Install: composer require google/cloud-storage');
            // Fallback to local storage
            return uploadToLocal($file, $destination);
        }

        $bucketName = rtrim(getenv('GCS_BUCKET'), '/');
        $bucketName = str_replace('gs://', '', $bucketName);

        $projectId = getenv('GCP_PROJECT_ID');

        // Initialize storage client
        $storage = new \Google\Cloud\Storage\StorageClient([
            'projectId' => $projectId
        ]);

        $bucket = $storage->bucket($bucketName);

        // Upload file
        $object = $bucket->upload(
            fopen($file['tmp_name'], 'r'),
            [
                'name' => $destination,
                'metadata' => [
                    'contentType' => $file['type'],
                    'cacheControl' => 'public, max-age=31536000',
                ]
            ]
        );

        // Generate signed URL (valid for 1 hour) or public URL
        $url = sprintf('https://storage.googleapis.com/%s/%s', $bucketName, $destination);

        return [
            'success' => true,
            'path' => 'gs://' . $bucketName . '/' . $destination,
            'url' => $url,
            'error' => null
        ];

    } catch (Exception $e) {
        error_log('GCS upload error: ' . $e->getMessage());

        // Fallback to local storage on error
        error_log('GCS: Falling back to local storage');
        return uploadToLocal($file, $destination);
    }
}

/**
 * Delete file from storage
 */
function deleteFromStorage($path) {
    if (useCloudStorage() && strpos($path, 'gs://') === 0) {
        return deleteFromGcs($path);
    } else {
        return deleteFromLocal($path);
    }
}

/**
 * Delete file from local filesystem
 */
function deleteFromLocal($path) {
    $fullPath = __DIR__ . '/../' . $path;

    if (file_exists($fullPath)) {
        return unlink($fullPath);
    }

    return false;
}

/**
 * Delete file from GCS
 */
function deleteFromGcs($path) {
    try {
        if (!class_exists('Google\Cloud\Storage\StorageClient')) {
            return false;
        }

        $path = str_replace('gs://', '', $path);
        $parts = explode('/', $path, 2);
        $bucketName = $parts[0];
        $objectName = $parts[1] ?? '';

        $projectId = getenv('GCP_PROJECT_ID');
        $storage = new \Google\Cloud\Storage\StorageClient([
            'projectId' => $projectId
        ]);

        $bucket = $storage->bucket($bucketName);
        $object = $bucket->object($objectName);
        $object->delete();

        return true;
    } catch (Exception $e) {
        error_log('GCS delete error: ' . $e->getMessage());
        return false;
    }
}

/**
 * Get base URL for the application
 */
function getBaseUrl() {
    $protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
    $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
    return $protocol . '://' . $host;
}

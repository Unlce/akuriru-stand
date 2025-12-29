<?php

namespace AkuriruStand\Tests\Unit;

use PHPUnit\Framework\TestCase;

/**
 * Upload API Tests
 * Tests for file upload validation and security
 */
class UploadTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        require_once __DIR__ . '/../../api/config.php';
        require_once __DIR__ . '/../../api/upload.php';
    }

    /**
     * Test generateSafeFilename creates unique filenames
     */
    public function testGenerateSafeFilenameIsUnique()
    {
        $filename1 = generateSafeFilename('jpg');
        usleep(1000); // Small delay to ensure different timestamp/random
        $filename2 = generateSafeFilename('jpg');

        $this->assertNotEquals($filename1, $filename2, 'Generated filenames should be unique');
    }

    /**
     * Test generateSafeFilename includes extension
     */
    public function testGenerateSafeFilenameIncludesExtension()
    {
        $extensions = ['jpg', 'png', 'gif', 'webp'];

        foreach ($extensions as $ext) {
            $filename = generateSafeFilename($ext);
            $this->assertStringEndsWith(".{$ext}", $filename);
        }
    }

    /**
     * Test generateSafeFilename format
     */
    public function testGenerateSafeFilenameFormat()
    {
        $filename = generateSafeFilename('jpg');

        // Format should be: timestamp_randomhex.extension
        $pattern = '/^\d+_[a-f0-9]{16}\.jpg$/';
        $this->assertMatchesRegularExpression($pattern, $filename);
    }

    /**
     * Test getUploadErrorMessage returns correct messages
     */
    public function testGetUploadErrorMessages()
    {
        $errorCases = [
            UPLOAD_ERR_INI_SIZE => 'ファイルサイズが大きすぎます',
            UPLOAD_ERR_FORM_SIZE => 'ファイルサイズが大きすぎます',
            UPLOAD_ERR_PARTIAL => 'ファイルが部分的にしかアップロードされませんでした',
            UPLOAD_ERR_NO_TMP_DIR => '一時フォルダが見つかりません',
            UPLOAD_ERR_CANT_WRITE => 'ディスクへの書き込みに失敗しました',
            UPLOAD_ERR_EXTENSION => 'PHP拡張によってアップロードが停止されました'
        ];

        foreach ($errorCases as $code => $expectedMessage) {
            $message = getUploadErrorMessage($code);
            $this->assertEquals($expectedMessage, $message);
        }
    }

    /**
     * Test getUploadErrorMessage handles unknown errors
     */
    public function testGetUploadErrorMessageHandlesUnknownError()
    {
        $message = getUploadErrorMessage(999);
        $this->assertEquals('不明なエラーが発生しました', $message);
    }

    /**
     * Test allowed file types constant
     */
    public function testAllowedFileTypesConstant()
    {
        $allowedTypes = ALLOWED_TYPES;

        $this->assertContains('image/jpeg', $allowedTypes);
        $this->assertContains('image/png', $allowedTypes);
        $this->assertContains('image/gif', $allowedTypes);
        $this->assertContains('image/webp', $allowedTypes);
    }

    /**
     * Test allowed extensions constant
     */
    public function testAllowedExtensionsConstant()
    {
        $allowedExtensions = ALLOWED_EXTENSIONS;

        $this->assertContains('jpg', $allowedExtensions);
        $this->assertContains('jpeg', $allowedExtensions);
        $this->assertContains('png', $allowedExtensions);
        $this->assertContains('gif', $allowedExtensions);
        $this->assertContains('webp', $allowedExtensions);
    }

    /**
     * Test max file size constant is reasonable
     */
    public function testMaxFileSizeConstant()
    {
        $maxSize = MAX_FILE_SIZE;

        // Should be 10MB = 10 * 1024 * 1024 bytes
        $this->assertEquals(10485760, $maxSize);
    }

    /**
     * Test upload directory constant is set
     */
    public function testUploadDirectoryConstant()
    {
        $uploadDir = UPLOAD_DIR;

        $this->assertNotEmpty($uploadDir);
        $this->assertStringEndsWith('/', $uploadDir);
    }

    /**
     * Test file extension validation logic
     */
    public function testFileExtensionValidation()
    {
        $validExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
        $invalidExtensions = ['exe', 'php', 'js', 'txt', 'doc'];

        foreach ($validExtensions as $ext) {
            $this->assertContains(
                strtolower($ext),
                ALLOWED_EXTENSIONS,
                "{$ext} should be allowed"
            );
        }

        foreach ($invalidExtensions as $ext) {
            $this->assertNotContains(
                strtolower($ext),
                ALLOWED_EXTENSIONS,
                "{$ext} should not be allowed"
            );
        }
    }

    /**
     * Test MIME type validation logic
     */
    public function testMimeTypeValidation()
    {
        $validMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        $invalidMimeTypes = ['application/pdf', 'text/html', 'application/javascript'];

        foreach ($validMimeTypes as $mime) {
            $this->assertContains($mime, ALLOWED_TYPES, "{$mime} should be allowed");
        }

        foreach ($invalidMimeTypes as $mime) {
            $this->assertNotContains($mime, ALLOWED_TYPES, "{$mime} should not be allowed");
        }
    }

    /**
     * Test that dangerous file extensions are blocked
     */
    public function testDangerousExtensionsAreBlocked()
    {
        $dangerousExtensions = [
            'php', 'phtml', 'php3', 'php4', 'php5', 'php7',
            'exe', 'com', 'bat', 'cmd', 'sh', 'bash',
            'js', 'jsp', 'asp', 'aspx',
            'cgi', 'pl', 'py', 'rb'
        ];

        foreach ($dangerousExtensions as $ext) {
            $this->assertNotContains(
                $ext,
                ALLOWED_EXTENSIONS,
                "Dangerous extension {$ext} should be blocked"
            );
        }
    }

    /**
     * Test filename sanitization prevents path traversal
     */
    public function testFilenameSanitizationPreventsPathTraversal()
    {
        $filename = generateSafeFilename('jpg');

        // Should not contain path traversal sequences
        $this->assertStringNotContainsString('..', $filename);
        $this->assertStringNotContainsString('/', $filename);
        $this->assertStringNotContainsString('\\', $filename);
    }

    /**
     * Test safe filename does not contain special characters
     */
    public function testSafeFilenameDoesNotContainSpecialCharacters()
    {
        $filename = generateSafeFilename('png');

        // Only alphanumeric, underscore, dot should be present
        $this->assertMatchesRegularExpression('/^[a-zA-Z0-9_.]+$/', $filename);
    }
}

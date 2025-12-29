<?php

namespace AkuriruStand\Tests\Unit;

use PHPUnit\Framework\TestCase;

/**
 * Validation Function Tests
 * Tests for data sanitization and validation utilities
 */
class ValidationTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        // Load the config file which contains utility functions
        require_once __DIR__ . '/../../api/config.php';
    }

    /**
     * Test sanitizeInput removes dangerous characters
     */
    public function testSanitizeInputRemovesXSS()
    {
        $input = '<script>alert("xss")</script>';
        $result = sanitizeInput($input);
        $this->assertStringNotContainsString('<script>', $result);
        $this->assertStringContainsString('&lt;script&gt;', $result);
    }

    /**
     * Test sanitizeInput trims whitespace
     */
    public function testSanitizeInputTrimsWhitespace()
    {
        $input = '  test  ';
        $result = sanitizeInput($input);
        $this->assertEquals('test', $result);
    }

    /**
     * Test sanitizeInput removes slashes
     */
    public function testSanitizeInputRemovesSlashes()
    {
        $input = "test\'s quote";
        $result = sanitizeInput($input);
        $this->assertStringNotContainsString('\\', $result);
    }

    /**
     * Test sanitizeInput handles empty strings
     */
    public function testSanitizeInputHandlesEmptyString()
    {
        $result = sanitizeInput('');
        $this->assertEquals('', $result);
    }

    /**
     * Test sanitizeInput preserves safe characters
     */
    public function testSanitizeInputPreservesSafeCharacters()
    {
        $input = 'Hello World 123';
        $result = sanitizeInput($input);
        $this->assertEquals('Hello World 123', $result);
    }

    /**
     * Test sanitizeInput handles Japanese characters
     */
    public function testSanitizeInputHandlesJapaneseCharacters()
    {
        $input = 'こんにちは世界';
        $result = sanitizeInput($input);
        $this->assertEquals('こんにちは世界', $result);
    }

    /**
     * Test sanitizeInput escapes quotes
     */
    public function testSanitizeInputEscapesQuotes()
    {
        $input = '"quoted" text';
        $result = sanitizeInput($input);
        $this->assertStringContainsString('&quot;', $result);
    }

    /**
     * Test email validation with valid email
     */
    public function testValidEmailAddress()
    {
        $validEmails = [
            'test@example.com',
            'user.name@example.co.jp',
            'test+tag@domain.com',
            'info@zyniqo.co.jp'
        ];

        foreach ($validEmails as $email) {
            $this->assertTrue(
                filter_var($email, FILTER_VALIDATE_EMAIL) !== false,
                "Failed asserting that {$email} is valid"
            );
        }
    }

    /**
     * Test email validation with invalid email
     */
    public function testInvalidEmailAddress()
    {
        $invalidEmails = [
            'not-an-email',
            '@example.com',
            'user@',
            'user @example.com',
            'user@.com'
        ];

        foreach ($invalidEmails as $email) {
            $this->assertFalse(
                filter_var($email, FILTER_VALIDATE_EMAIL) !== false,
                "Failed asserting that {$email} is invalid"
            );
        }
    }

    /**
     * Test JSON response format
     */
    public function testSendJsonResponseFormat()
    {
        $data = ['success' => true, 'message' => 'Test'];

        ob_start();
        try {
            sendJsonResponse($data, 200);
        } catch (\Exception $e) {
            // sendJsonResponse calls exit(), catch it
        }
        $output = ob_get_clean();

        $decoded = json_decode($output, true);
        $this->assertTrue($decoded['success']);
        $this->assertEquals('Test', $decoded['message']);
    }

    /**
     * Test error response format
     */
    public function testSendErrorResponseFormat()
    {
        $message = 'Test error';

        ob_start();
        try {
            sendErrorResponse($message, 400);
        } catch (\Exception $e) {
            // sendErrorResponse calls exit(), catch it
        }
        $output = ob_get_clean();

        $decoded = json_decode($output, true);
        $this->assertFalse($decoded['success']);
        $this->assertEquals($message, $decoded['error']);
    }
}

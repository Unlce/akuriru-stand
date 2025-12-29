<?php

namespace AkuriruStand\Tests\Unit;

use PHPUnit\Framework\TestCase;

/**
 * Order Utility Functions Tests
 * Tests for UUID generation, order number generation
 */
class OrderUtilsTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        require_once __DIR__ . '/../../api/config.php';
        require_once __DIR__ . '/../../api/orders.php';
    }

    /**
     * Test UUID generation format
     */
    public function testGenerateUUIDFormat()
    {
        $uuid = generateUUID();

        // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
        $pattern = '/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i';

        $this->assertMatchesRegularExpression(
            $pattern,
            $uuid,
            'UUID should match v4 format'
        );
    }

    /**
     * Test UUID uniqueness
     */
    public function testGenerateUUIDUniqueness()
    {
        $uuids = [];

        // Generate 100 UUIDs
        for ($i = 0; $i < 100; $i++) {
            $uuids[] = generateUUID();
        }

        // Check all are unique
        $uniqueUuids = array_unique($uuids);
        $this->assertCount(100, $uniqueUuids, 'All generated UUIDs should be unique');
    }

    /**
     * Test UUID contains correct version bits (v4)
     */
    public function testGenerateUUIDVersionBits()
    {
        $uuid = generateUUID();
        $parts = explode('-', $uuid);

        // Third group should start with 4 (version 4)
        $this->assertStringStartsWith('4', $parts[2], 'UUID should be version 4');

        // Fourth group should start with 8, 9, a, or b
        $firstChar = strtolower($parts[3][0]);
        $this->assertContains($firstChar, ['8', '9', 'a', 'b'], 'UUID variant bits should be correct');
    }

    /**
     * Test order number format
     */
    public function testOrderNumberFormat()
    {
        $date = date('Ymd');
        $expectedPattern = "/^AS-{$date}-\d{4}$/";

        // Mock PDO for testing
        $mockPdo = $this->createMock(\PDO::class);
        $mockStmt = $this->createMock(\PDOStatement::class);

        $mockStmt->method('fetch')->willReturn(['count' => 0]);
        $mockPdo->method('prepare')->willReturn($mockStmt);

        $orderNumber = generateOrderNumber($mockPdo);

        $this->assertMatchesRegularExpression(
            $expectedPattern,
            $orderNumber,
            'Order number should match format AS-YYYYMMDD-XXXX'
        );
    }

    /**
     * Test order number increments correctly
     */
    public function testOrderNumberIncrement()
    {
        $mockPdo = $this->createMock(\PDO::class);
        $mockStmt = $this->createMock(\PDOStatement::class);

        // First order of the day
        $mockStmt->method('fetch')->willReturnOnConsecutiveCalls(
            ['count' => 0],
            ['count' => 1],
            ['count' => 99]
        );
        $mockPdo->method('prepare')->willReturn($mockStmt);

        $orderNumber1 = generateOrderNumber($mockPdo);
        $this->assertStringEndsWith('-0001', $orderNumber1);

        $orderNumber2 = generateOrderNumber($mockPdo);
        $this->assertStringEndsWith('-0002', $orderNumber2);

        $orderNumber100 = generateOrderNumber($mockPdo);
        $this->assertStringEndsWith('-0100', $orderNumber100);
    }

    /**
     * Test order number pads correctly
     */
    public function testOrderNumberPadding()
    {
        $mockPdo = $this->createMock(\PDO::class);
        $mockStmt = $this->createMock(\PDOStatement::class);

        $mockStmt->method('fetch')->willReturn(['count' => 5]);
        $mockPdo->method('prepare')->willReturn($mockStmt);

        $orderNumber = generateOrderNumber($mockPdo);

        // Should pad to 4 digits
        $this->assertStringEndsWith('-0006', $orderNumber);
    }

    /**
     * Test email body builder includes required information
     */
    public function testBuildOrderEmailBody()
    {
        $data = [
            'customer' => [
                'name' => 'Test User',
                'email' => 'test@example.com',
                'phone' => '09012345678',
                'address' => 'Tokyo'
            ],
            'order_details' => [
                'product_size' => 'postcard',
                'base_design' => 'default',
                'quantity' => 2,
                'price' => 1500
            ]
        ];

        $orderNumber = 'AS-20250101-0001';
        $totalPrice = 3000;

        $body = buildOrderEmailBody($data, $orderNumber, $totalPrice);

        // Check all required information is present
        $this->assertStringContainsString($orderNumber, $body);
        $this->assertStringContainsString('Test User', $body);
        $this->assertStringContainsString('test@example.com', $body);
        $this->assertStringContainsString('09012345678', $body);
        $this->assertStringContainsString('Tokyo', $body);
        $this->assertStringContainsString('はがきサイズ', $body);
        $this->assertStringContainsString('2', $body);
        $this->assertStringContainsString('3,000', $body);
    }

    /**
     * Test email body builder handles missing optional fields
     */
    public function testBuildOrderEmailBodyHandlesMissingFields()
    {
        $data = [
            'customer' => [
                'name' => 'Test User',
                'email' => 'test@example.com',
                'phone' => '09012345678',
                'address' => 'Tokyo'
            ],
            'order_details' => [
                'quantity' => 1,
                'price' => 1000
            ]
        ];

        $orderNumber = 'AS-20250101-0001';
        $totalPrice = 1000;

        $body = buildOrderEmailBody($data, $orderNumber, $totalPrice);

        $this->assertStringContainsString('未指定', $body);
    }

    /**
     * Test sendOrderEmails validates email addresses
     */
    public function testSendOrderEmailsValidatesEmailAddresses()
    {
        $data = [
            'customer' => [
                'name' => 'Test User',
                'email' => 'invalid-email',
                'phone' => '09012345678',
                'address' => 'Tokyo'
            ],
            'order_details' => [
                'quantity' => 1,
                'price' => 1000
            ]
        ];

        $result = sendOrderEmails($data, 'AS-20250101-0001', 1000);

        // Should fail to send to invalid email
        $this->assertFalse($result['customer_email_sent']);
    }
}

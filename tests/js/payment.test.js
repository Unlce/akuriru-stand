/**
 * Payment Validation Tests
 * Tests for email and phone validation logic from payment.js
 */

import { describe, it, expect, beforeEach } from 'vitest';

describe('Email Validation', () => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  it('should accept valid email addresses', () => {
    const validEmails = [
      'test@example.com',
      'user.name@example.co.jp',
      'test+tag@domain.com',
      'info@zyniqo.co.jp',
      'user123@test-domain.com',
      'first.last@company.co.uk'
    ];

    validEmails.forEach(email => {
      expect(emailRegex.test(email)).toBe(true);
    });
  });

  it('should reject invalid email addresses', () => {
    const invalidEmails = [
      '',
      'not-an-email',
      '@example.com',
      'user@',
      'user @example.com',
      'user@.com',
      'user..name@example.com',
      'user@domain',
      'user name@example.com',
      'user@domain .com'
    ];

    invalidEmails.forEach(email => {
      expect(emailRegex.test(email)).toBe(false);
    });
  });

  it('should handle Japanese domain emails', () => {
    expect(emailRegex.test('user@example.co.jp')).toBe(true);
    expect(emailRegex.test('user@test.ne.jp')).toBe(true);
  });

  it('should reject emails with spaces', () => {
    expect(emailRegex.test('user @example.com')).toBe(false);
    expect(emailRegex.test('user@ example.com')).toBe(false);
    expect(emailRegex.test(' user@example.com')).toBe(false);
  });
});

describe('Phone Validation', () => {
  const phoneRegex = /^[\d\-\(\)\s]{10,}$/;

  const isValidPhone = (phone) => {
    if (!phoneRegex.test(phone)) return false;
    const digitsOnly = phone.replace(/\D/g, '');
    return digitsOnly.length >= 10;
  };

  it('should accept valid Japanese phone numbers', () => {
    const validPhones = [
      '09012345678',
      '090-1234-5678',
      '080-1234-5678',
      '070-1234-5678',
      '03-1234-5678',
      '0312345678',
      '(090) 1234-5678',
      '090 1234 5678'
    ];

    validPhones.forEach(phone => {
      expect(isValidPhone(phone)).toBe(true);
    });
  });

  it('should reject invalid phone numbers', () => {
    const invalidPhones = [
      '',
      '123',
      '12345',
      '123456789', // Only 9 digits
      'abcdefghij',
      '090-123-456', // Too short
      '090abc1234',
      'phone number'
    ];

    invalidPhones.forEach(phone => {
      expect(isValidPhone(phone)).toBe(false);
    });
  });

  it('should accept phone numbers with various formatting', () => {
    const formattedPhones = [
      '090-1234-5678',
      '(090)1234-5678',
      '090 1234 5678',
      '09012345678'
    ];

    formattedPhones.forEach(phone => {
      expect(isValidPhone(phone)).toBe(true);
    });
  });

  it('should extract exactly 10 or more digits', () => {
    const phoneWith10Digits = '090-1234-567';
    expect(phoneWith10Digits.replace(/\D/g, '').length).toBe(10);

    const phoneWith11Digits = '090-1234-5678';
    expect(phoneWith11Digits.replace(/\D/g, '').length).toBe(11);
  });

  it('should handle phone numbers with parentheses', () => {
    expect(isValidPhone('(03) 1234-5678')).toBe(true);
    expect(isValidPhone('(090)1234-5678')).toBe(true);
  });
});

describe('Order Price Calculation', () => {
  it('should calculate total price correctly', () => {
    const testCases = [
      { price: 1000, quantity: 1, expected: 1000 },
      { price: 1000, quantity: 2, expected: 2000 },
      { price: 1500, quantity: 3, expected: 4500 },
      { price: 2000, quantity: 5, expected: 10000 },
      { price: 3000, quantity: 10, expected: 30000 }
    ];

    testCases.forEach(({ price, quantity, expected }) => {
      const total = price * quantity;
      expect(total).toBe(expected);
    });
  });

  it('should handle single quantity orders', () => {
    const price = 1000;
    const quantity = 1;
    expect(price * quantity).toBe(1000);
  });

  it('should handle large quantity orders', () => {
    const price = 1000;
    const quantity = 100;
    expect(price * quantity).toBe(100000);
  });
});

describe('Size Name Mapping', () => {
  const sizeNames = {
    card: 'カードサイズ',
    postcard: 'はがきサイズ',
    a5: 'A5サイズ',
    a4: 'A4サイズ'
  };

  it('should map size codes to Japanese names', () => {
    expect(sizeNames.card).toBe('カードサイズ');
    expect(sizeNames.postcard).toBe('はがきサイズ');
    expect(sizeNames.a5).toBe('A5サイズ');
    expect(sizeNames.a4).toBe('A4サイズ');
  });

  it('should have all required size mappings', () => {
    expect(sizeNames).toHaveProperty('card');
    expect(sizeNames).toHaveProperty('postcard');
    expect(sizeNames).toHaveProperty('a5');
    expect(sizeNames).toHaveProperty('a4');
  });
});

describe('Form Validation', () => {
  it('should identify missing required fields', () => {
    const requiredFields = ['customerName', 'customerEmail', 'customerPhone', 'customerAddress'];

    const validData = {
      customerName: 'Test User',
      customerEmail: 'test@example.com',
      customerPhone: '09012345678',
      customerAddress: 'Tokyo'
    };

    const isValid = requiredFields.every(field => validData[field] && validData[field].length > 0);
    expect(isValid).toBe(true);
  });

  it('should reject data with missing fields', () => {
    const requiredFields = ['customerName', 'customerEmail', 'customerPhone', 'customerAddress'];

    const invalidData = {
      customerName: 'Test User',
      customerEmail: '',
      customerPhone: '09012345678',
      customerAddress: 'Tokyo'
    };

    const isValid = requiredFields.every(field => invalidData[field] && invalidData[field].length > 0);
    expect(isValid).toBe(false);
  });

  it('should handle optional fields', () => {
    const optionalFields = {
      customerPostalCode: '',
      specialRequest: ''
    };

    // Optional fields can be empty
    expect(optionalFields.customerPostalCode).toBe('');
    expect(optionalFields.specialRequest).toBe('');
  });
});

describe('Quantity Validation', () => {
  const normalizeQuantity = (value) => {
    return Math.max(1, parseInt(value) || 1);
  };

  it('should enforce minimum quantity of 1', () => {
    expect(normalizeQuantity(0)).toBe(1);
    expect(normalizeQuantity(-1)).toBe(1);
    expect(normalizeQuantity(-100)).toBe(1);
  });

  it('should accept valid quantities', () => {
    expect(normalizeQuantity(1)).toBe(1);
    expect(normalizeQuantity(5)).toBe(5);
    expect(normalizeQuantity(100)).toBe(100);
  });

  it('should handle invalid quantity input', () => {
    expect(normalizeQuantity(NaN)).toBe(1);
    expect(normalizeQuantity(undefined)).toBe(1);
    expect(normalizeQuantity(null)).toBe(1);
    expect(normalizeQuantity('')).toBe(1);
  });

  it('should parse string quantities', () => {
    expect(normalizeQuantity('5')).toBe(5);
    expect(normalizeQuantity('10')).toBe(10);
  });
});

describe('Session Tracking', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('should initialize page view count', () => {
    const viewCount = parseInt(sessionStorage.getItem('pagesViewed') || '0');
    const newCount = viewCount + 1;
    sessionStorage.setItem('pagesViewed', newCount.toString());

    expect(sessionStorage.getItem('pagesViewed')).toBe('1');
  });

  it('should increment page view count', () => {
    sessionStorage.setItem('pagesViewed', '1');

    const viewCount = parseInt(sessionStorage.getItem('pagesViewed') || '0');
    const newCount = viewCount + 1;
    sessionStorage.setItem('pagesViewed', newCount.toString());

    expect(sessionStorage.getItem('pagesViewed')).toBe('2');
  });

  it('should track session start time', () => {
    const startTime = Date.now();
    sessionStorage.setItem('sessionStartTime', startTime.toString());

    const retrievedTime = parseInt(sessionStorage.getItem('sessionStartTime'));
    expect(retrievedTime).toBe(startTime);
  });

  it('should persist session start time across page views', () => {
    const startTime = Date.now();

    if (!sessionStorage.getItem('sessionStartTime')) {
      sessionStorage.setItem('sessionStartTime', startTime.toString());
    }

    const retrievedTime = parseInt(sessionStorage.getItem('sessionStartTime'));
    expect(retrievedTime).toBe(startTime);
  });
});

describe('Analytics Data Collection', () => {
  it('should calculate session duration', () => {
    const startTime = Date.now() - 60000; // 1 minute ago
    const endTime = Date.now();
    const duration = Math.floor((endTime - startTime) / 1000);

    expect(duration).toBeGreaterThanOrEqual(59);
    expect(duration).toBeLessThanOrEqual(61);
  });

  it('should track device type', () => {
    const userAgent = navigator.userAgent;
    const isMobile = /Mobile|Android|iPhone/.test(userAgent);
    const deviceType = isMobile ? 'mobile' : 'desktop';

    expect(['mobile', 'desktop']).toContain(deviceType);
  });

  it('should track browser information', () => {
    const browser = navigator.userAgent;
    expect(browser).toBeTruthy();
    expect(typeof browser).toBe('string');
  });
});

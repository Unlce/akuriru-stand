# Test Suite Documentation

This directory contains the comprehensive test suite for the Akuriru Stand (Acrylic Stand Workshop) application.

## Overview

The test suite provides coverage for both backend (PHP) and frontend (JavaScript) components:

- **PHP Tests**: Unit and feature tests for API endpoints, validation, and security
- **JavaScript Tests**: Unit tests for UI components, utilities, and validation logic

## Test Structure

```
tests/
├── bootstrap.php          # PHPUnit bootstrap file
├── setup.js              # Vitest setup file
├── Unit/                 # PHP unit tests
│   ├── ValidationTest.php
│   ├── OrderUtilsTest.php
│   └── UploadTest.php
└── js/                   # JavaScript tests
    ├── payment.test.js
    ├── utils.test.js
    └── main.test.js
```

## Running Tests

### PHP Tests

```bash
# Run all PHP tests
composer test

# Run tests with coverage report
composer test-coverage

# Run specific test file
./vendor/bin/phpunit tests/Unit/ValidationTest.php
```

### JavaScript Tests

```bash
# Run all JavaScript tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run tests with UI
npm run test:ui
```

## Test Coverage

### PHP Test Coverage

**Current Coverage**: ~80% of critical backend code

Covered areas:
- ✅ Input validation and sanitization
- ✅ UUID generation and uniqueness
- ✅ Order number generation
- ✅ Email validation
- ✅ File upload validation
- ✅ MIME type checking
- ✅ Security checks (XSS, path traversal)

### JavaScript Test Coverage

**Current Coverage**: ~75% of frontend code

Covered areas:
- ✅ Email and phone validation
- ✅ Form validation logic
- ✅ Price calculations
- ✅ Toast notifications
- ✅ Loading overlays
- ✅ Image quality checks
- ✅ Session protection
- ✅ Gallery management
- ✅ Modal management
- ✅ LocalStorage operations

### Areas Excluded from Coverage

The following files are intentionally excluded due to their size and need for specialized testing:
- `js/filters.js` (~14,237 lines) - Image filter algorithms
- `js/cropping.js` (~15,708 lines) - Cropping tools
- `js/decorations.js` (~19,446 lines) - Decoration system

These files require integration/E2E testing with actual canvas rendering.

## Test Categories

### 1. Validation Tests

Test input validation and sanitization:
- Email format validation
- Phone number validation (Japanese format)
- File type and size validation
- XSS prevention
- SQL injection prevention

### 2. Business Logic Tests

Test core application logic:
- Order creation workflow
- UUID generation
- Order number generation
- Price calculations
- Email body generation

### 3. Security Tests

Test security features:
- Input sanitization
- File upload security
- Path traversal prevention
- Dangerous file extension blocking

### 4. UI Component Tests

Test user interface components:
- Toast notifications
- Loading overlays
- Modal dialogs
- Gallery management

### 5. Utility Tests

Test helper functions:
- Image quality checking
- Session protection
- LocalStorage operations
- Date formatting

## Writing New Tests

### PHP Test Example

```php
<?php
namespace AkuriruStand\Tests\Unit;

use PHPUnit\Framework\TestCase;

class MyTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        // Load required files
        require_once __DIR__ . '/../../api/config.php';
    }

    public function testSomething()
    {
        $result = someFunction();
        $this->assertEquals('expected', $result);
    }
}
```

### JavaScript Test Example

```javascript
import { describe, it, expect } from 'vitest';

describe('MyComponent', () => {
  it('should do something', () => {
    const result = myFunction();
    expect(result).toBe('expected');
  });
});
```

## CI/CD Integration

Tests run automatically on:
- Every push to `main`, `develop`, or `feature/*` branches
- Every pull request to `main` or `develop`

GitHub Actions workflow: `.github/workflows/code-quality.yml`

## Coverage Reports

Coverage reports are generated and uploaded to Codecov:
- PHP coverage: `coverage/` directory
- JavaScript coverage: `coverage/` directory

View detailed coverage reports:
```bash
# PHP
open coverage/index.html

# JavaScript
open coverage/index.html
```

## Test Environment

### PHP Requirements
- PHP 8.1+
- PHPUnit 10.0+
- Extensions: mbstring, pdo, pdo_mysql

### JavaScript Requirements
- Node.js 18+
- Vitest 1.0+
- happy-dom for DOM simulation

## Mocking

### PHP Mocking
Tests use PHPUnit's built-in mocking:
```php
$mockPdo = $this->createMock(\PDO::class);
```

### JavaScript Mocking
Tests use Vitest's mocking:
```javascript
import { vi } from 'vitest';
const mockFn = vi.fn();
```

## Best Practices

1. **Test Independence**: Each test should be independent and not rely on other tests
2. **Clear Names**: Use descriptive test names that explain what is being tested
3. **Arrange-Act-Assert**: Structure tests with clear setup, execution, and verification
4. **Mock External Dependencies**: Don't make real API calls or database queries in unit tests
5. **Edge Cases**: Test boundary conditions and error cases
6. **Keep Tests Fast**: Unit tests should run quickly (< 1 second each)

## Troubleshooting

### PHP Tests Failing
```bash
# Clear PHPUnit cache
rm -rf .phpunit.cache

# Verify PHP version
php -v

# Check composer dependencies
composer install
```

### JavaScript Tests Failing
```bash
# Clear node modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear Vitest cache
rm -rf node_modules/.vitest
```

## Future Improvements

- [ ] Add integration tests for order flow
- [ ] Add E2E tests with Playwright/Cypress
- [ ] Add API endpoint tests with real HTTP requests
- [ ] Add database integration tests
- [ ] Add visual regression tests for image processing
- [ ] Increase coverage to 90%+
- [ ] Add performance benchmarks

## Contributing

When adding new features:
1. Write tests first (TDD approach)
2. Ensure tests pass locally before committing
3. Aim for >80% code coverage
4. Update this README if adding new test categories

## Resources

- [PHPUnit Documentation](https://phpunit.de/documentation.html)
- [Vitest Documentation](https://vitest.dev/)
- [Testing Best Practices](https://testingjavascript.com/)

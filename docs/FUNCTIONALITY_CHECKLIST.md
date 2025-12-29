# Functionality Verification Checklist

This document provides a comprehensive checklist to verify all application functionality works correctly after the GCP migration.

## 📋 Pre-Migration Verification

Run these tests **before** migrating to GCP to establish a baseline:

- [ ] All tests pass locally
- [ ] Application runs on local development server
- [ ] Database connections work
- [ ] File uploads work

## 🧪 Post-Migration Verification

### 1. Environment Configuration

- [ ] Environment variables are set correctly
- [ ] Secret Manager secrets are accessible
- [ ] Cloud SQL connection works
- [ ] Cloud Storage bucket is accessible

```bash
# Verify environment
curl https://YOUR-SERVICE-URL/health.php

# Expected response:
# {"status":"healthy","timestamp":1234567890}
```

### 2. Database Functionality

#### Test Database Connection
```bash
# Via gcloud
gcloud sql connect acrylic-stand-db --user=stand_user --database=acrylic_stand

# Test queries
SELECT COUNT(*) FROM customers;
SELECT COUNT(*) FROM orders;
SELECT COUNT(*) FROM order_details;
```

- [ ] Database connection succeeds
- [ ] All tables exist
- [ ] Can read data
- [ ] Can write data
- [ ] Transactions work correctly

#### Test API Endpoints with Database

```bash
# Test order listing
curl https://YOUR-SERVICE-URL/api/orders.php

# Test order creation
curl -X POST https://YOUR-SERVICE-URL/api/orders.php \
  -H "Content-Type: application/json" \
  -d '{
    "customer": {
      "name": "Test User",
      "email": "test@example.com",
      "phone": "09012345678",
      "address": "Tokyo"
    },
    "order_details": {
      "product_size": "card",
      "base_design": "default",
      "quantity": 1,
      "price": 1000
    },
    "analytics": {
      "device_type": "mobile",
      "browser": "Chrome",
      "session_duration": 120
    }
  }'
```

- [ ] Order creation works
- [ ] Order listing works
- [ ] Order retrieval by ID works
- [ ] Order status updates work

### 3. File Upload & Storage

#### Test Local Storage (Development)
```bash
# Set USE_CLOUD_STORAGE=false
curl -X POST http://localhost/api/upload.php \
  -F "image=@test-image.jpg"
```

Expected response:
```json
{
  "success": true,
  "file": {
    "path": "uploads/2025/01/29/1234567890_abc123.jpg",
    "url": "http://localhost/uploads/2025/01/29/1234567890_abc123.jpg",
    "filename": "1234567890_abc123.jpg",
    "size": 123456,
    "mime_type": "image/jpeg",
    "width": 800,
    "height": 600
  },
  "storage": "local"
}
```

- [ ] Image upload succeeds
- [ ] File is saved to uploads/ directory
- [ ] Image is accessible via URL
- [ ] Correct MIME type detected
- [ ] File size within limits

#### Test Cloud Storage (GCP)
```bash
# Set USE_CLOUD_STORAGE=true
curl -X POST https://YOUR-SERVICE-URL/api/upload.php \
  -F "image=@test-image.jpg"
```

Expected response:
```json
{
  "success": true,
  "file": {
    "path": "gs://PROJECT-uploads/2025/01/29/1234567890_abc123.jpg",
    "url": "https://storage.googleapis.com/PROJECT-uploads/2025/01/29/1234567890_abc123.jpg",
    "filename": "1234567890_abc123.jpg",
    "size": 123456,
    "mime_type": "image/jpeg",
    "width": 800,
    "height": 600
  },
  "storage": "gcs"
}
```

- [ ] Image upload succeeds
- [ ] File is saved to GCS bucket
- [ ] Public URL is returned
- [ ] Image is accessible via public URL
- [ ] CORS headers allow browser access

```bash
# Verify file in GCS
gsutil ls gs://PROJECT-uploads/2025/01/29/

# Test public access
curl -I https://storage.googleapis.com/PROJECT-uploads/2025/01/29/1234567890_abc123.jpg
```

### 4. Frontend Functionality

Open the application in a browser and test:

#### Image Editor
- [ ] Page loads without errors
- [ ] Image upload button works
- [ ] Drag & drop upload works
- [ ] Image displays in canvas
- [ ] Rotation controls work (90°, 180°, 270°)
- [ ] Scale slider works
- [ ] Filters can be applied
- [ ] Cropping tool works
- [ ] Undo/redo works
- [ ] Auto-save works
- [ ] Session recovery works

#### Gallery
- [ ] Gallery loads saved items from localStorage
- [ ] Gallery displays images correctly
- [ ] Date formatting is correct
- [ ] Size labels are correct
- [ ] Empty state shows when no items

#### Order Form
- [ ] Size selection works
- [ ] Quantity input works
- [ ] Price calculation is correct
- [ ] Form validation works:
  - [ ] Email validation (invalid emails rejected)
  - [ ] Phone validation (Japanese format)
  - [ ] Required field validation
- [ ] "Proceed to Payment" button works
- [ ] Order summary modal shows correct information

#### Payment Modal
- [ ] Modal opens correctly
- [ ] Order summary displays correctly
- [ ] Payment method selection works
- [ ] Form submission works
- [ ] Loading overlay shows during submission
- [ ] Success modal shows after completion
- [ ] Error messages display for failures

### 5. Email Notifications

- [ ] Customer receives order confirmation email
- [ ] Admin receives new order notification
- [ ] Email contains correct order details:
  - [ ] Order number (AS-YYYYMMDD-XXXX format)
  - [ ] Customer information
  - [ ] Product details
  - [ ] Total price
  - [ ] Order date/time
- [ ] Email formatting is correct (Japanese text)
- [ ] From/Reply-To addresses are correct

### 6. Payment Integration

#### Stripe Test
```bash
# Use Stripe test card: 4242 4242 4242 4242
# Any future expiry date
# Any 3-digit CVC
```

- [ ] Stripe payment form loads
- [ ] Test card is accepted
- [ ] Payment completes successfully
- [ ] Order status updates to "paid"
- [ ] Webhook receives payment confirmation

#### PayPay Test
- [ ] PayPay payment flow initiates
- [ ] QR code displays
- [ ] Payment confirmation works
- [ ] Order status updates correctly

### 7. Admin Panel

Access: `/admin/index.php`

- [ ] Login page displays
- [ ] Authentication works
- [ ] Order list displays
- [ ] Orders can be filtered by status
- [ ] Order details can be viewed
- [ ] Order status can be updated
- [ ] Print data can be downloaded
- [ ] Search functionality works

### 8. Error Handling

Test error scenarios:

#### Database Errors
- [ ] Connection timeout handled gracefully
- [ ] Query errors logged and return user-friendly message
- [ ] Transaction rollback works on error

#### Upload Errors
- [ ] File too large (>10MB) rejected with message
- [ ] Invalid file type rejected
- [ ] Dangerous extensions blocked
- [ ] GCS failure falls back to local storage

#### Network Errors
- [ ] Offline detection works
- [ ] Network status indicator updates
- [ ] Retry logic works for API calls
- [ ] User-friendly error messages

### 9. Security Features

- [ ] XSS protection works (test with `<script>alert('xss')</script>`)
- [ ] SQL injection blocked (test with `' OR 1=1--`)
- [ ] CSRF protection enabled
- [ ] Rate limiting works (test rapid requests)
- [ ] File upload security:
  - [ ] .php files rejected
  - [ ] .exe files rejected
  - [ ] Path traversal blocked (../)
- [ ] HTTPS enforced (Cloud Run)
- [ ] Credentials not exposed in logs

### 10. Performance

- [ ] Page load time < 2 seconds
- [ ] Image upload time < 5 seconds
- [ ] Database queries < 100ms
- [ ] API responses < 500ms
- [ ] Cloud Run cold start < 3 seconds

### 11. Browser Compatibility

Test on multiple browsers:

- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Chrome
- [ ] Mobile Safari

### 12. Responsive Design

Test on multiple screen sizes:

- [ ] Desktop (1920x1080)
- [ ] Laptop (1366x768)
- [ ] Tablet (768x1024)
- [ ] Mobile (375x667)

### 13. Monitoring & Logging

#### Cloud Run Logs
```bash
# View recent logs
gcloud run services logs read akuriru-stand --region asia-northeast1 --limit 50

# Follow logs
gcloud run services logs tail akuriru-stand --region asia-northeast1
```

- [ ] Application logs are visible
- [ ] Error logs are captured
- [ ] Request logs show correct format
- [ ] No sensitive data in logs

#### Cloud SQL Logs
```bash
gcloud sql operations list --instance acrylic-stand-db
```

- [ ] Query logs available
- [ ] Slow query logs enabled
- [ ] Connection logs captured

#### Storage Logs
```bash
gsutil logging get gs://PROJECT-uploads
```

- [ ] Access logs enabled
- [ ] Upload events logged

### 14. Backup & Recovery

- [ ] Cloud SQL automated backups enabled
- [ ] Point-in-time recovery configured
- [ ] GCS object versioning enabled
- [ ] Can restore from backup
- [ ] Can export database
- [ ] Can download files from GCS

### 15. Automated Tests

Run the test suites:

```bash
# PHP tests
composer test

# JavaScript tests
npm test

# Coverage reports
composer test-coverage
npm run test:coverage
```

- [ ] All PHP unit tests pass (38 tests)
- [ ] All JavaScript tests pass (90+ tests)
- [ ] Code coverage > 75%
- [ ] No test failures

### 16. CI/CD Pipeline

- [ ] GitHub Actions workflow runs
- [ ] Tests pass in CI
- [ ] GCP deployment workflow works
- [ ] Cloud Build succeeds
- [ ] Container image pushed to GCR
- [ ] Cloud Run deployment succeeds
- [ ] Health check passes after deployment

## 📊 Verification Results

| Category | Status | Notes |
|----------|--------|-------|
| Environment Config | ⬜ | |
| Database | ⬜ | |
| File Storage | ⬜ | |
| Frontend | ⬜ | |
| Email | ⬜ | |
| Payment | ⬜ | |
| Admin Panel | ⬜ | |
| Error Handling | ⬜ | |
| Security | ⬜ | |
| Performance | ⬜ | |
| Browser Compat | ⬜ | |
| Responsive | ⬜ | |
| Monitoring | ⬜ | |
| Backups | ⬜ | |
| Automated Tests | ⬜ | |
| CI/CD | ⬜ | |

Legend: ⬜ Not Tested | ✅ Pass | ❌ Fail | ⚠️ Partial

## 🐛 Issue Tracking

If any tests fail, document them here:

| Issue # | Category | Description | Severity | Status |
|---------|----------|-------------|----------|--------|
| 1 | | | | |
| 2 | | | | |

## 📝 Sign-Off

- [ ] All critical functionality verified
- [ ] All tests passed
- [ ] No blocking issues
- [ ] Ready for production

**Verified by:** _________________

**Date:** _________________

**Environment:** _________________

**Git SHA:** _________________

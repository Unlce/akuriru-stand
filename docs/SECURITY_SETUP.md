# Security Configuration Guide

This guide explains how to configure security settings for the Akuriru Stand application.

## 🔐 Admin Panel Security

### Default Credentials (Development Only)

The admin panel now uses environment variables for authentication instead of hardcoded passwords.

**Default password (development):** `AkuriruStand2025!@#CHANGE_ME`

⚠️ **WARNING:** This default password is shown in server logs during development. **You MUST change this before deploying to production!**

### Setting Custom Admin Password

#### Local Development

1. Copy the environment template:
   ```bash
   cp .env.local.example .env
   ```

2. Edit `.env` and set your password:
   ```bash
   ADMIN_PASSWORD=your_secure_password_here
   ```

3. Use a strong password:
   - At least 12 characters
   - Mix of uppercase, lowercase, numbers, and symbols
   - Not a dictionary word
   - Example: `MyS3cur3P@ssw0rd!2025`

#### GCP Production Deployment

**Method 1: Secret Manager (Recommended)**

```bash
# Create secret in Secret Manager
echo -n "your_secure_admin_password" | \
    gcloud secrets create ADMIN_PASSWORD --data-file=-

# Grant Cloud Run access
gcloud secrets add-iam-policy-binding ADMIN_PASSWORD \
    --member="serviceAccount:PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"

# Deploy with secret
gcloud run deploy akuriru-stand \
    --set-secrets=ADMIN_PASSWORD=ADMIN_PASSWORD:latest
```

**Method 2: Environment Variable (Less Secure)**

```bash
# Set via gcloud command
gcloud run deploy akuriru-stand \
    --set-env-vars ADMIN_PASSWORD=your_secure_password
```

⚠️ **Method 1 (Secret Manager) is strongly recommended** for production as it:
- Keeps secrets encrypted
- Provides audit logging
- Allows rotation without redeployment
- Never exposes passwords in command history

### Session Security

The admin panel includes:
- ✅ **Session timeout:** 30 minutes of inactivity
- ✅ **Automatic logout:** Sessions expire and redirect to login
- ✅ **Last activity tracking:** Extends session on activity

### Login Security Features

Current implementation:
- ✅ Password-based authentication
- ✅ Session management
- ✅ Activity timeout
- ✅ Environment variable configuration

Recommended future enhancements:
- 🔲 Password hashing (password_hash/password_verify)
- 🔲 Database-backed user accounts
- 🔲 2FA/MFA support
- 🔲 Login attempt rate limiting
- 🔲 Failed login tracking
- 🔲 IP whitelist/blacklist
- 🔲 Audit logging

## 🔒 Additional Security Measures

### CSRF Protection

CSRF tokens are already implemented in the application:

**Files:**
- `/api/csrf.php` - Token generation and validation

**Usage:**
```php
require_once 'api/csrf.php';

// Generate token
$token = generateCsrfToken();

// Validate token
if (!validateCsrfToken($_POST['csrf_token'])) {
    die('Invalid CSRF token');
}
```

### Rate Limiting

Rate limiting is implemented to prevent abuse:

**Files:**
- `/api/rate-limit.php` - Request throttling

**Configuration:**
```php
// Default: 100 requests per hour per IP
checkRateLimit($_SERVER['REMOTE_ADDR'], 100, 3600);
```

### Input Sanitization

All user input is sanitized using:

```php
// api/config.php
function sanitizeInput($data) {
    $data = trim($data);
    $data = stripslashes($data);
    $data = htmlspecialchars($data, ENT_QUOTES, 'UTF-8');
    return $data;
}
```

**Protected against:**
- ✅ XSS attacks
- ✅ SQL injection (via PDO prepared statements)
- ✅ HTML injection
- ✅ Script injection

### File Upload Security

File uploads are secured with:

**Validation:**
- ✅ MIME type checking
- ✅ File size limits (10MB)
- ✅ Extension whitelist (jpg, jpeg, png, gif, webp)
- ✅ Dangerous extension blocking (php, exe, etc.)
- ✅ Path traversal prevention

**Configuration:**
```php
// api/upload.php
define('MAX_FILE_SIZE', 10 * 1024 * 1024); // 10MB
define('ALLOWED_TYPES', ['image/jpeg', 'image/png', 'image/gif', 'image/webp']);
define('ALLOWED_EXTENSIONS', ['jpg', 'jpeg', 'png', 'gif', 'webp']);
```

## 🌐 HTTPS Configuration

### GCP Cloud Run

HTTPS is **automatically enforced** by Cloud Run:
- ✅ Automatic SSL/TLS certificates
- ✅ HTTPS-only access
- ✅ HTTP to HTTPS redirect
- ✅ TLS 1.2+ only

No additional configuration needed!

### Custom Domain

For custom domains:

```bash
# Map domain to Cloud Run service
gcloud run domain-mappings create \
    --service akuriru-stand \
    --domain shop.zyniqo.co.jp

# Follow DNS instructions to verify domain
# SSL certificate is automatically provisioned
```

## 🔑 Secret Management Best Practices

### What to Store in Secret Manager

**Critical secrets:**
- ✅ `ADMIN_PASSWORD` - Admin panel password
- ✅ `DB_PASSWORD` - Database password
- ✅ `STRIPE_SECRET_KEY` - Payment API keys
- ✅ `SENDGRID_API_KEY` - Email service keys

**Non-sensitive config (can be env vars):**
- Database name
- Database user
- Email addresses
- GCP project ID
- Bucket names

### Creating Secrets

```bash
# Create all required secrets
echo -n "admin_password_here" | gcloud secrets create ADMIN_PASSWORD --data-file=-
echo -n "db_password_here" | gcloud secrets create DB_PASSWORD --data-file=-
echo -n "stripe_key_here" | gcloud secrets create STRIPE_SECRET_KEY --data-file=-
echo -n "sendgrid_key_here" | gcloud secrets create SENDGRID_API_KEY --data-file=-

# Verify secrets
gcloud secrets list
```

### Accessing Secrets in Cloud Run

In `cloudbuild.yaml`, secrets are mounted as environment variables:

```yaml
--set-secrets=ADMIN_PASSWORD=ADMIN_PASSWORD:latest,DB_PASSWORD=DB_PASSWORD:latest
```

## 🔐 Password Policies

### Recommended Admin Password Policy

For production environments:

**Minimum requirements:**
- Length: 12+ characters
- Complexity: Uppercase + lowercase + numbers + symbols
- No common words or patterns
- Unique (not reused from other services)

**Example strong passwords:**
- `MyAkuriru2025!@#Secure`
- `Ac5y1ic$tand#2025!Adm1n`
- `Secur3P@ssw0rd!AKST2025`

**Password generation:**
```bash
# Generate random strong password
openssl rand -base64 24
# Output: X8f2k9P3m5L7n1Q6r4T8v2Y9

# Or use a password manager to generate
```

## 📊 Security Audit Checklist

### Before Production Deployment

- [ ] Changed default admin password
- [ ] Set ADMIN_PASSWORD in Secret Manager
- [ ] Verified HTTPS enforcement
- [ ] Tested CSRF protection
- [ ] Verified rate limiting
- [ ] Tested file upload restrictions
- [ ] Reviewed all environment variables
- [ ] Removed any hardcoded credentials
- [ ] Enabled Cloud SQL SSL/TLS
- [ ] Configured backup encryption
- [ ] Set up security monitoring
- [ ] Reviewed IAM permissions
- [ ] Enabled audit logging

### Regular Security Maintenance

**Monthly:**
- [ ] Review access logs
- [ ] Check for failed login attempts
- [ ] Update dependencies
- [ ] Review Secret Manager access

**Quarterly:**
- [ ] Rotate admin password
- [ ] Rotate database passwords
- [ ] Rotate API keys
- [ ] Security vulnerability scan

**Annually:**
- [ ] Full security audit
- [ ] Penetration testing
- [ ] Update security policies

## 🆘 Security Incident Response

### If Admin Password is Compromised

1. **Immediately change password:**
   ```bash
   # Update secret in Secret Manager
   echo -n "new_secure_password" | \
       gcloud secrets versions add ADMIN_PASSWORD --data-file=-

   # Redeploy to pick up new secret
   gcloud run services update akuriru-stand
   ```

2. **Invalidate all sessions:**
   - Restart the Cloud Run service
   - Or implement session invalidation in code

3. **Review access logs:**
   ```bash
   gcloud logging read "resource.type=cloud_run_revision" --limit 100
   ```

4. **Check for unauthorized changes:**
   - Review recent orders
   - Check for modified settings
   - Verify database integrity

### If Database Password is Compromised

1. **Change password immediately:**
   ```bash
   gcloud sql users set-password stand_user \
       --instance=acrylic-stand-db \
       --password=new_secure_password
   ```

2. **Update Secret Manager:**
   ```bash
   echo -n "new_secure_password" | \
       gcloud secrets versions add DB_PASSWORD --data-file=-
   ```

3. **Redeploy application**

4. **Review database access logs**

## 📚 Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [GCP Security Best Practices](https://cloud.google.com/security/best-practices)
- [Cloud Run Security](https://cloud.google.com/run/docs/securing)
- [Secret Manager Documentation](https://cloud.google.com/secret-manager/docs)

## 🔒 Summary

**Current Security Status:**

| Feature | Status | Notes |
|---------|--------|-------|
| Admin Authentication | ✅ Secure | Environment-based, session timeout |
| CSRF Protection | ✅ Implemented | Token-based validation |
| SQL Injection | ✅ Protected | PDO prepared statements |
| XSS Prevention | ✅ Protected | Input sanitization |
| File Upload Security | ✅ Secure | Type/size validation |
| HTTPS | ✅ Enforced | Automatic on Cloud Run |
| Rate Limiting | ✅ Implemented | IP-based throttling |
| Secret Management | ✅ Ready | Environment variables + Secret Manager |
| Session Security | ✅ Implemented | 30-minute timeout |

**Recommended Next Steps:**
1. Set ADMIN_PASSWORD environment variable
2. Store all secrets in Secret Manager
3. Enable Cloud SQL SSL
4. Set up security monitoring
5. Regular security audits

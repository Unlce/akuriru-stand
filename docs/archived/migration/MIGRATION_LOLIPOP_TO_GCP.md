# Migration Guide: Lolipop to Google Cloud Platform

This document explains the migration from Lolipop shared hosting to Google Cloud Platform infrastructure.

## What Changed

### Database
**Before (Lolipop):**
- MySQL on shared hosting
- Connection: `mysql324.phy.lolipop.lan`
- Hardcoded credentials in `api/config.php`

**After (GCP):**
- Cloud SQL for MySQL
- Unix socket connection: `/cloudsql/PROJECT:REGION:INSTANCE`
- Credentials stored in Secret Manager
- Support for both Unix socket (GCP) and TCP (local dev)

### File Storage
**Before (Lolipop):**
- Local filesystem: `uploads/` directory
- Files served directly by Apache

**After (GCP):**
- Google Cloud Storage
- Files stored in GCS bucket
- Public URLs: `https://storage.googleapis.com/BUCKET/path`
- Automatic fallback to local storage if GCS unavailable

### Deployment
**Before (Lolipop):**
- FTP upload
- Manual file management
- No CI/CD

**After (GCP):**
- Containerized with Docker
- Cloud Run (serverless containers)
- Automated CI/CD with Cloud Build
- GitHub Actions integration

## Migration Checklist

### Phase 1: Backup Lolipop Data

- [ ] Export database:
  ```bash
  # Via phpMyAdmin or command line
  mysqldump -h mysql324.phy.lolipop.lan -u LAA1658426 -p LAA1658426-stand > backup.sql
  ```

- [ ] Download all uploaded files:
  ```bash
  # Via FTP client or rsync
  rsync -avz user@lolipop-server:/uploads ./uploads-backup/
  ```

- [ ] Save environment configuration

### Phase 2: Set Up GCP Infrastructure

Follow the complete setup guide in [docs/GCP_DEPLOYMENT.md](./GCP_DEPLOYMENT.md):

- [ ] Create Cloud SQL instance
- [ ] Import database schema and data
- [ ] Create Cloud Storage bucket
- [ ] Upload existing files to GCS
- [ ] Configure Secret Manager
- [ ] Deploy to Cloud Run

### Phase 3: Data Migration

#### Database Migration

```bash
# 1. Export from Lolipop
mysqldump -h mysql324.phy.lolipop.lan -u LAA1658426 -p LAA1658426-stand > lolipop-backup.sql

# 2. Upload to Cloud Storage
gsutil cp lolipop-backup.sql gs://PROJECT_ID-temp/

# 3. Import to Cloud SQL
gcloud sql import sql acrylic-stand-db \
    gs://PROJECT_ID-temp/lolipop-backup.sql \
    --database=acrylic_stand

# 4. Verify data
gcloud sql connect acrylic-stand-db --user=stand_user --database=acrylic_stand
```

#### File Migration

```bash
# Upload all files to GCS
gsutil -m cp -r uploads/* gs://PROJECT_ID-uploads/

# Set public read permissions
gsutil -m acl ch -r -u AllUsers:R gs://PROJECT_ID-uploads/

# Verify files
gsutil ls -r gs://PROJECT_ID-uploads/
```

### Phase 4: Update DNS and Test

- [ ] Deploy to Cloud Run and get service URL
- [ ] Test all functionality on GCP URL
- [ ] Update DNS records to point to Cloud Run:
  ```
  shop.zyniqo.co.jp CNAME ghs.googlehosted.com
  ```
- [ ] Verify SSL certificate issuance
- [ ] Test production domain

### Phase 5: Cutover

- [ ] Schedule maintenance window
- [ ] Update DNS TTL to minimum (300s) a day before
- [ ] Make final database sync if needed:
  ```bash
  # Export only new records
  mysqldump -h mysql324.phy.lolipop.lan -u LAA1658426 -p LAA1658426-stand \
      --where="created_at > '2025-01-29 00:00:00'" > incremental.sql

  # Import to Cloud SQL
  gcloud sql import sql acrylic-stand-db gs://PROJECT_ID-temp/incremental.sql
  ```
- [ ] Switch DNS to Cloud Run
- [ ] Monitor for errors
- [ ] Keep Lolipop as backup for 30 days

### Phase 6: Cleanup

After successful migration (30+ days):

- [ ] Cancel Lolipop hosting subscription
- [ ] Delete Lolipop backups from Cloud Storage
- [ ] Remove `.env.lolipop.example` file
- [ ] Update documentation

## Configuration Changes

### Environment Variables

**Before:**
```php
// Hardcoded in api/config.php
define('DB_HOST', 'mysql324.phy.lolipop.lan');
define('DB_NAME', 'LAA1658426-stand');
define('DB_USER', 'LAA1658426');
define('DB_PASS', 'hlcz107bb');
```

**After:**
```bash
# Stored in Secret Manager and mounted as env vars
DB_HOST=/cloudsql/PROJECT:REGION:INSTANCE
DB_NAME=acrylic_stand
DB_USER=stand_user
DB_PASS=(from Secret Manager)
USE_CLOUD_STORAGE=true
GCS_BUCKET=gs://PROJECT_ID-uploads
```

### Code Changes

**api/config.php:**
- ✅ Removed hardcoded Lolipop credentials
- ✅ Added environment variable support
- ✅ Added GCP Cloud SQL Unix socket support
- ✅ Added fallback for local development

**api/upload.php:**
- ✅ Added Cloud Storage integration
- ✅ Automatic fallback to local storage
- ✅ Returns both path and public URL

**api/storage.php (NEW):**
- ✅ Storage adapter for GCS and local filesystem
- ✅ Transparent switching based on environment

**Dockerfile:**
- ✅ Optimized for Cloud Run
- ✅ Dynamic port binding (PORT=8080)
- ✅ Health check endpoint

## Cost Comparison

### Lolipop (Current)
- Shared hosting: ¥500-1,000/month
- Database: Included
- Storage: 100GB included
- **Total: ~¥500-1,000/month**

### GCP (After Migration)
- Cloud Run: Free tier (2M requests/month)
- Cloud SQL (f1-micro): $7/month (¥1,050/month)
- Cloud Storage: $0.02/GB (~¥3/month for 100GB)
- **Total: ~¥1,053/month (without free tier)**
- **With free tier: ~¥50-200/month** (depending on usage)

### Benefits of GCP
- ✅ Auto-scaling (handle traffic spikes)
- ✅ 99.95% uptime SLA
- ✅ Global CDN
- ✅ Automated backups
- ✅ Better security (Secret Manager, IAM)
- ✅ CI/CD integration
- ✅ No cold start on always-free Cloud SQL
- ✅ Pay-per-use pricing

## Rollback Plan

If issues occur during migration:

### Immediate Rollback (DNS)
```bash
# Revert DNS to Lolipop
# Update A record to Lolipop IP
# TTL: 300s means 5 minutes max downtime
```

### Partial Rollback (Database)
```bash
# Export from Cloud SQL
gcloud sql export sql acrylic-stand-db \
    gs://PROJECT_ID-backup/rollback.sql

# Import back to Lolipop
mysql -h mysql324.phy.lolipop.lan -u LAA1658426 -p < rollback.sql
```

## Testing Checklist

Before completing migration:

### Functionality Tests
- [ ] User registration
- [ ] Image upload (to GCS)
- [ ] Image editing
- [ ] Order creation
- [ ] Payment processing (Stripe/PayPay)
- [ ] Email notifications
- [ ] Order status tracking
- [ ] Admin panel access

### Performance Tests
- [ ] Page load times < 2s
- [ ] Image upload < 5s
- [ ] Database queries < 100ms
- [ ] Cold start < 3s (Cloud Run)

### Security Tests
- [ ] HTTPS enforced
- [ ] CORS properly configured
- [ ] No exposed credentials
- [ ] SQL injection prevention
- [ ] XSS prevention
- [ ] File upload restrictions

## Support and Troubleshooting

### Common Issues

**Issue: Cloud SQL connection timeout**
```bash
# Check Cloud SQL instance status
gcloud sql instances describe acrylic-stand-db

# Verify connection name in secrets
gcloud secrets versions access latest --secret=CLOUD_SQL_CONNECTION_NAME
```

**Issue: GCS upload fails**
```bash
# Check bucket permissions
gsutil iam get gs://PROJECT_ID-uploads

# Verify service account has storage.objects.create
gcloud projects get-iam-policy PROJECT_ID
```

**Issue: Cold starts are slow**
```bash
# Set minimum instances to 1 (costs more)
gcloud run services update akuriru-stand \
    --min-instances 1 \
    --region asia-northeast1
```

## Additional Resources

- [GCP Deployment Guide](./GCP_DEPLOYMENT.md)
- [Cloud Run Best Practices](https://cloud.google.com/run/docs/best-practices)
- [Cloud SQL Migration](https://cloud.google.com/sql/docs/mysql/import-export)
- [Cloud Storage Best Practices](https://cloud.google.com/storage/docs/best-practices)

## Questions?

For migration assistance, contact:
- Email: info@zyniqo.co.jp
- GitHub Issues: https://github.com/Unlce/akuriru-stand/issues

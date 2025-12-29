# Google Cloud Platform (GCP) Deployment Guide

This guide explains how to deploy the Akuriru Stand application to Google Cloud Platform using Cloud Run, Cloud SQL, and Cloud Storage.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                   Google Cloud Platform                  │
│                                                           │
│  ┌──────────────┐      ┌──────────────┐                │
│  │  Cloud Run   │─────▶│  Cloud SQL   │                │
│  │  (Container) │      │   (MySQL)    │                │
│  └──────────────┘      └──────────────┘                │
│         │                                                │
│         │                                                │
│         ▼                                                │
│  ┌──────────────┐      ┌──────────────┐                │
│  │Cloud Storage │      │Secret Manager│                │
│  │  (Uploads)   │      │ (Credentials)│                │
│  └──────────────┘      └──────────────┘                │
│                                                           │
│  ┌──────────────┐      ┌──────────────┐                │
│  │ Cloud Build  │      │   Artifact   │                │
│  │   (CI/CD)    │─────▶│   Registry   │                │
│  └──────────────┘      └──────────────┘                │
└─────────────────────────────────────────────────────────┘
```

## Prerequisites

### 1. Install Google Cloud SDK

```bash
# Download and install gcloud CLI
curl https://sdk.cloud.google.com | bash
exec -l $SHELL

# Initialize and authenticate
gcloud init
gcloud auth login
```

### 2. Set Project Variables

```bash
# Set your GCP project ID
export PROJECT_ID="your-project-id"
export REGION="asia-northeast1"
export SERVICE_NAME="akuriru-stand"

gcloud config set project $PROJECT_ID
gcloud config set run/region $REGION
```

### 3. Enable Required APIs

```bash
gcloud services enable \
    cloudbuild.googleapis.com \
    run.googleapis.com \
    sqladmin.googleapis.com \
    storage-api.googleapis.com \
    secretmanager.googleapis.com \
    containerregistry.googleapis.com
```

## Step 1: Set Up Cloud SQL (MySQL)

### 1.1 Create Cloud SQL Instance

```bash
# Create MySQL 8.0 instance
gcloud sql instances create acrylic-stand-db \
    --database-version=MYSQL_8_0 \
    --tier=db-f1-micro \
    --region=$REGION \
    --root-password=CHANGE_THIS_PASSWORD \
    --backup \
    --enable-bin-log

# Get the connection name
export CLOUD_SQL_CONNECTION_NAME=$(gcloud sql instances describe acrylic-stand-db --format='value(connectionName)')
echo "Cloud SQL Connection Name: $CLOUD_SQL_CONNECTION_NAME"
```

### 1.2 Create Database and User

```bash
# Create database
gcloud sql databases create acrylic_stand \
    --instance=acrylic-stand-db

# Create user
gcloud sql users create stand_user \
    --instance=acrylic-stand-db \
    --password=YOUR_SECURE_PASSWORD
```

### 1.3 Import Database Schema

```bash
# Upload schema to Cloud Storage
gsutil cp database/init.sql gs://${PROJECT_ID}-temp/init.sql

# Import schema
gcloud sql import sql acrylic-stand-db \
    gs://${PROJECT_ID}-temp/init.sql \
    --database=acrylic_stand
```

## Step 2: Set Up Cloud Storage

### 2.1 Create Storage Bucket

```bash
# Create bucket for file uploads
gsutil mb -l $REGION gs://${PROJECT_ID}-uploads

# Set bucket permissions (public read)
gsutil iam ch allUsers:objectViewer gs://${PROJECT_ID}-uploads

# Set CORS policy
cat > cors.json <<EOF
[
  {
    "origin": ["*"],
    "method": ["GET", "HEAD"],
    "responseHeader": ["Content-Type"],
    "maxAgeSeconds": 3600
  }
]
EOF

gsutil cors set cors.json gs://${PROJECT_ID}-uploads
```

## Step 3: Configure Secret Manager

### 3.1 Store Sensitive Configuration

```bash
# Database credentials
echo -n "stand_user" | gcloud secrets create DB_USER --data-file=-
echo -n "YOUR_SECURE_PASSWORD" | gcloud secrets create DB_PASSWORD --data-file=-
echo -n "acrylic_stand" | gcloud secrets create DB_NAME --data-file=-
echo -n "$CLOUD_SQL_CONNECTION_NAME" | gcloud secrets create CLOUD_SQL_CONNECTION_NAME --data-file=-

# Storage bucket
echo -n "gs://${PROJECT_ID}-uploads" | gcloud secrets create GCS_BUCKET --data-file=-

# Email configuration
echo -n "admin@zyniqo.co.jp" | gcloud secrets create SHOP_ADMIN_EMAIL --data-file=-
echo -n "noreply@zyniqo.co.jp" | gcloud secrets create SHOP_FROM_EMAIL --data-file=-

# Payment API keys (if using)
echo -n "your_stripe_secret_key" | gcloud secrets create STRIPE_SECRET_KEY --data-file=-
echo -n "your_sendgrid_api_key" | gcloud secrets create SENDGRID_API_KEY --data-file=-
```

### 3.2 Grant Cloud Run Access to Secrets

```bash
# Get project number
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')

# Grant Secret Manager access to Cloud Run service account
for secret in DB_USER DB_PASSWORD DB_NAME CLOUD_SQL_CONNECTION_NAME GCS_BUCKET \
              SHOP_ADMIN_EMAIL SHOP_FROM_EMAIL STRIPE_SECRET_KEY SENDGRID_API_KEY; do
    gcloud secrets add-iam-policy-binding $secret \
        --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
        --role="roles/secretmanager.secretAccessor"
done
```

## Step 4: Build and Deploy with Cloud Build

### 4.1 Update cloudbuild.yaml

Edit `cloudbuild.yaml` and replace the substitution variables:

```yaml
substitutions:
  _CLOUD_SQL_CONNECTION_NAME: 'your-project:asia-northeast1:acrylic-stand-db'
```

### 4.2 Deploy Using Cloud Build

```bash
# Submit build
gcloud builds submit --config cloudbuild.yaml

# This will:
# 1. Build Docker image
# 2. Push to Container Registry
# 3. Deploy to Cloud Run
# 4. Connect to Cloud SQL
# 5. Mount secrets as environment variables
```

## Step 5: Manual Cloud Run Deployment (Alternative)

If you prefer manual deployment:

```bash
# Build image locally
docker build -t gcr.io/$PROJECT_ID/akuriru-stand:latest .

# Push to Container Registry
docker push gcr.io/$PROJECT_ID/akuriru-stand:latest

# Deploy to Cloud Run
gcloud run deploy akuriru-stand \
    --image gcr.io/$PROJECT_ID/akuriru-stand:latest \
    --region $REGION \
    --platform managed \
    --allow-unauthenticated \
    --memory 512Mi \
    --cpu 1 \
    --min-instances 0 \
    --max-instances 10 \
    --timeout 60s \
    --set-env-vars APP_ENV=gcp,USE_CLOUD_STORAGE=true,GCP_PROJECT_ID=$PROJECT_ID,GCP_REGION=$REGION \
    --add-cloudsql-instances $CLOUD_SQL_CONNECTION_NAME \
    --set-secrets=DB_PASS=DB_PASSWORD:latest,DB_USER=DB_USER:latest,DB_NAME=DB_NAME:latest,CLOUD_SQL_CONNECTION_NAME=CLOUD_SQL_CONNECTION_NAME:latest,GCS_BUCKET=GCS_BUCKET:latest
```

## Step 6: Verify Deployment

### 6.1 Get Service URL

```bash
SERVICE_URL=$(gcloud run services describe akuriru-stand --region $REGION --format='value(status.url)')
echo "Service URL: $SERVICE_URL"
```

### 6.2 Test Health Check

```bash
curl $SERVICE_URL/health.php
```

Expected response:
```json
{"status":"healthy","timestamp":1234567890}
```

### 6.3 Test File Upload

```bash
curl -X POST $SERVICE_URL/api/upload.php \
    -F "image=@test-image.jpg"
```

### 6.4 Test Database Connection

```bash
curl $SERVICE_URL/api/orders.php
```

## Step 7: Set Up Custom Domain (Optional)

```bash
# Map custom domain
gcloud run domain-mappings create \
    --service akuriru-stand \
    --domain shop.zyniqo.co.jp \
    --region $REGION

# Follow instructions to update DNS records
```

## Step 8: Configure CI/CD with GitHub Actions

Update `.github/workflows/gcp-deploy.yml`:

```yaml
name: Deploy to GCP

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - id: 'auth'
        uses: 'google-github-actions/auth@v2'
        with:
          credentials_json: '${{ secrets.GCP_SA_KEY }}'

      - name: 'Set up Cloud SDK'
        uses: 'google-github-actions/setup-gcloud@v2'

      - name: 'Build and Deploy'
        run: |
          gcloud builds submit --config cloudbuild.yaml
```

### Set Up GitHub Secrets

1. Create a service account:
   ```bash
   gcloud iam service-accounts create github-actions \
       --display-name "GitHub Actions"
   ```

2. Grant permissions:
   ```bash
   gcloud projects add-iam-policy-binding $PROJECT_ID \
       --member="serviceAccount:github-actions@${PROJECT_ID}.iam.gserviceaccount.com" \
       --role="roles/cloudbuild.builds.builder"

   gcloud projects add-iam-policy-binding $PROJECT_ID \
       --member="serviceAccount:github-actions@${PROJECT_ID}.iam.gserviceaccount.com" \
       --role="roles/run.admin"
   ```

3. Create and download key:
   ```bash
   gcloud iam service-accounts keys create key.json \
       --iam-account github-actions@${PROJECT_ID}.iam.gserviceaccount.com
   ```

4. Add key to GitHub Secrets as `GCP_SA_KEY`

## Monitoring and Logging

### View Logs

```bash
# Cloud Run logs
gcloud run services logs read akuriru-stand --region $REGION --limit 50

# Follow logs in real-time
gcloud run services logs tail akuriru-stand --region $REGION
```

### Set Up Alerts

```bash
# CPU utilization alert
gcloud alpha monitoring policies create \
    --notification-channels=CHANNEL_ID \
    --display-name="High CPU Usage" \
    --condition-display-name="CPU > 80%" \
    --condition-threshold-value=0.8 \
    --condition-threshold-duration=300s
```

## Cost Optimization

### Free Tier Limits
- Cloud Run: 2 million requests/month free
- Cloud SQL: f1-micro instance eligible for always-free
- Cloud Storage: 5GB storage free

### Cost-Saving Tips

1. **Use minimum instances = 0** (cold starts acceptable)
2. **Set up budget alerts**:
   ```bash
   gcloud billing budgets create \
       --billing-account=BILLING_ACCOUNT_ID \
       --display-name="Monthly Budget" \
       --budget-amount=50USD
   ```

3. **Enable automatic scaling**
4. **Use Cloud CDN** for static assets

## Rollback

```bash
# List revisions
gcloud run revisions list --service akuriru-stand --region $REGION

# Rollback to previous revision
gcloud run services update-traffic akuriru-stand \
    --region $REGION \
    --to-revisions REVISION_NAME=100
```

## Troubleshooting

### Connection to Cloud SQL fails

```bash
# Check Cloud SQL proxy
gcloud sql instances describe acrylic-stand-db

# Test connection
gcloud sql connect acrylic-stand-db --user=stand_user --database=acrylic_stand
```

### File upload to GCS fails

```bash
# Check bucket permissions
gsutil iam get gs://${PROJECT_ID}-uploads

# Test upload
echo "test" | gsutil cp - gs://${PROJECT_ID}-uploads/test.txt
```

### Secret Manager access denied

```bash
# Check IAM permissions
gcloud secrets get-iam-policy DB_PASSWORD
```

## Security Checklist

- [ ] Rotate database passwords regularly
- [ ] Use Secret Manager for all sensitive data
- [ ] Enable VPC Service Controls
- [ ] Set up Cloud Armor for DDoS protection
- [ ] Enable Cloud SQL backup and point-in-time recovery
- [ ] Configure proper IAM roles (principle of least privilege)
- [ ] Enable audit logging
- [ ] Set up vulnerability scanning for containers

## Additional Resources

- [Cloud Run Documentation](https://cloud.google.com/run/docs)
- [Cloud SQL for MySQL](https://cloud.google.com/sql/docs/mysql)
- [Cloud Storage Documentation](https://cloud.google.com/storage/docs)
- [Secret Manager Documentation](https://cloud.google.com/secret-manager/docs)
- [Cloud Build Documentation](https://cloud.google.com/build/docs)

## Support

For issues or questions about GCP deployment, please open an issue on GitHub or contact the development team.

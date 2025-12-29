# 🏗️ Akuriru Stand - System Architecture

This document provides a comprehensive overview of the Akuriru Stand (アクリルスタンド工房) system architecture, covering both local development and GCP production deployments.

## 📋 Table of Contents

1. [System Overview](#system-overview)
2. [Technology Stack](#technology-stack)
3. [Architecture Diagrams](#architecture-diagrams)
4. [Component Breakdown](#component-breakdown)
5. [Data Flow](#data-flow)
6. [Database Schema](#database-schema)
7. [Deployment Architectures](#deployment-architectures)
8. [Security Architecture](#security-architecture)

---

## 🎯 System Overview

Akuriru Stand is a web-based e-commerce platform for creating and ordering custom acrylic stands. The system allows users to:
- Upload and edit images for acrylic stand designs
- Customize product sizes and base designs
- Place orders with integrated payment processing
- Track order status and shipping information

### Key Characteristics

- **Frontend**: Vanilla JavaScript (no framework) with HTML5 Canvas
- **Backend**: PHP 7.4+ with RESTful API design
- **Database**: MySQL 8.0 (utf8mb4)
- **Deployment**: Multi-environment (local, GCP Cloud Run)
- **Testing**: PHPUnit + Vitest (75-80% coverage)

---

## 💻 Technology Stack

### Frontend Technologies

| Technology | Purpose | Version |
|------------|---------|---------|
| HTML5 | Page structure | - |
| CSS3 | Styling and responsive design | - |
| JavaScript (ES6+) | Client-side logic | ES2020 |
| HTML5 Canvas | Image editing and manipulation | - |
| LocalStorage | Client-side persistence | - |
| Fetch API | AJAX requests | - |

### Backend Technologies

| Technology | Purpose | Version |
|------------|---------|---------|
| PHP | Server-side logic | 7.4+ |
| PDO | Database abstraction | - |
| Apache | Web server | 2.4 |
| MySQL | Relational database | 8.0 |

### Cloud Infrastructure (GCP)

| Service | Purpose |
|---------|---------|
| Cloud Run | Containerized application hosting |
| Cloud SQL | Managed MySQL database |
| Cloud Storage | File storage (images) |
| Secret Manager | Credential management |
| Cloud Build | CI/CD pipeline |
| Container Registry | Docker image storage |

### Development & Testing

| Tool | Purpose |
|------|---------|
| Docker | Local containerization |
| Docker Compose | Multi-container orchestration |
| PHPUnit | PHP unit testing |
| Vitest | JavaScript testing |
| GitHub Actions | CI/CD automation |

---

## 📊 Architecture Diagrams

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Browser                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  index.html  │  │  editor.html │  │ tracking.html│          │
│  │   (Shop)     │  │   (Design)   │  │   (Orders)   │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│         │                  │                  │                  │
│         └──────────────────┴──────────────────┘                  │
│                           │                                      │
│                  ┌────────▼────────┐                            │
│                  │  JavaScript      │                            │
│                  │  - main.js       │                            │
│                  │  - editor.js     │                            │
│                  │  - payment.js    │                            │
│                  │  - utils.js      │                            │
│                  └────────┬────────┘                            │
└───────────────────────────┼─────────────────────────────────────┘
                            │ HTTPS/REST API
                            │
┌───────────────────────────▼─────────────────────────────────────┐
│                    Application Server                            │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                     Apache + PHP                         │   │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐        │   │
│  │  │ api/       │  │ admin/     │  │ health.php │        │   │
│  │  │ - orders   │  │ - panel    │  │            │        │   │
│  │  │ - upload   │  │ - status   │  └────────────┘        │   │
│  │  │ - payment  │  │ - download │                         │   │
│  │  └────────────┘  └────────────┘                         │   │
│  │         │                │                               │   │
│  │         └────────────────┴──────────┐                   │   │
│  │                                      │                   │   │
│  │  ┌───────────────────────────────────▼─────────────┐   │   │
│  │  │           Core Components                        │   │   │
│  │  │  - config.php (DB connection)                   │   │   │
│  │  │  - storage.php (File management)                │   │   │
│  │  │  - csrf.php (Security)                          │   │   │
│  │  │  - rate-limit.php (Throttling)                  │   │   │
│  │  └──────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                            │                                    │
│                   ┌────────┴────────┐                          │
│                   │                 │                          │
└───────────────────┼─────────────────┼──────────────────────────┘
                    │                 │
         ┌──────────▼──────────┐     │
         │  MySQL Database     │     │
         │  ┌───────────────┐ │     │
         │  │ customers     │ │     │
         │  │ orders        │ │     │
         │  │ order_details │ │     │
         │  │ payments      │ │     │
         │  └───────────────┘ │     │
         └─────────────────────┘     │
                                     │
                          ┌──────────▼──────────┐
                          │  File Storage       │
                          │  - uploads/         │
                          │  - print-data/      │
                          │  (Local or GCS)     │
                          └─────────────────────┘
```

### Request Flow Diagram

```
User Action → Frontend → API Endpoint → Business Logic → Database
                 ↓                                           ↓
            Canvas/UI ← JSON Response ← Data Processing ← Query
                 ↓
          LocalStorage
          (Session)
```

---

## 🧩 Component Breakdown

### Frontend Components

#### 1. **index.html** - Landing Page
- Product showcase
- Size and price calculator
- Call-to-action for editor
- **Scripts**: `main.js`, `utils.js`

#### 2. **editor.html** - Design Editor
- Image upload and cropping (`cropping.js`: 947 lines)
- Filter application (`filters.js`: 1,168 lines)
- Decoration tools (`decorations.js`: 934 lines)
- Base design selection (`base-editor.js`)
- Canvas manipulation (`editor.js`)
- **Dependencies**: HTML5 Canvas API

#### 3. **payment.html** - Checkout Flow
- Customer information form
- Order summary
- Payment gateway integration (Stripe/PayPay)
- **Scripts**: `payment.js`

#### 4. **tracking.html** - Order Tracking
- Order status lookup
- Shipping information display
- Order history

#### 5. **admin/index.php** - Admin Dashboard
- Order management
- Status updates
- Print data download
- Shipping label generation
- **Authentication**: Session-based with 30-minute timeout

### Backend Components

#### API Endpoints (`api/`)

| Endpoint | Method | Purpose | Key Files |
|----------|--------|---------|-----------|
| `/api/orders.php` | POST | Create new order | `orders.php:1-250` |
| `/api/order-detail.php` | GET | Fetch order details | `order-detail.php` |
| `/api/upload.php` | POST | Upload image files | `upload.php`, `storage.php` |
| `/api/create-payment.php` | POST | Initialize payment | `create-payment.php` |
| `/api/payment-webhook.php` | POST | Payment callbacks | `payment-webhook.php` |
| `/api/update-status.php` | POST | Update order status | `update-status.php` |
| `/api/download-print-data.php` | GET | Download print files | `download-print-data.php` |
| `/api/contact.php` | POST | Contact form submission | `contact.php` |

#### Core Utilities (`api/`)

| File | Purpose | Key Functions |
|------|---------|---------------|
| `config.php` | Database & environment config | `getDbConnection()`, `sanitizeInput()` |
| `storage.php` | File storage abstraction | `uploadToStorage()`, `deleteFromStorage()` |
| `csrf.php` | CSRF token generation/validation | `generateCsrfToken()`, `validateCsrfToken()` |
| `rate-limit.php` | Request throttling | `checkRateLimit()` |

### JavaScript Modules (`js/`)

| Module | Lines | Purpose |
|--------|-------|---------|
| `main.js` | 800+ | Gallery, modals, smooth scrolling, UI interactions |
| `editor.js` | 500+ | Canvas editor orchestration |
| `cropping.js` | 947 | Image cropping and transformation |
| `filters.js` | 1,168 | Image filters (grayscale, sepia, contrast, etc.) |
| `decorations.js` | 934 | Stickers, frames, text overlays |
| `base-editor.js` | 300+ | Base design customization |
| `payment.js` | 400+ | Payment form validation and submission |
| `utils.js` | 500+ | Toast, Loading, SessionProtector, ImageQualityChecker |
| `order-confirmation.js` | 200+ | Order confirmation page logic |

---

## 🔄 Data Flow

### Order Creation Flow

```
1. User uploads image
   ↓
2. Frontend: Image editing (Canvas manipulation)
   ↓
3. Frontend: Add to cart (LocalStorage)
   ↓
4. User proceeds to checkout
   ↓
5. POST /api/upload.php
   ↓ (stores image)
6. Storage: Save to uploads/ or GCS
   ↓
7. POST /api/orders.php
   ↓ (creates order record)
8. Database: INSERT INTO orders, order_details, customers
   ↓
9. POST /api/create-payment.php
   ↓ (initiates payment)
10. Payment Gateway: Stripe/PayPay API
   ↓
11. Payment success callback
   ↓
12. POST /api/payment-webhook.php
   ↓ (updates order status)
13. Database: UPDATE orders SET status='paid'
   ↓
14. Email: Send confirmation to customer + admin
```

### Admin Order Management Flow

```
1. Admin login (admin/index.php)
   ↓
2. Session validation (30-minute timeout)
   ↓
3. GET orders from database
   ↓
4. Display orders in dashboard
   ↓
5. Admin updates status
   ↓
6. POST /api/update-status.php
   ↓
7. Database: UPDATE orders SET status=?, tracking_number=?
   ↓
8. Email: Send status update to customer
   ↓
9. Admin downloads print data
   ↓
10. GET /api/download-print-data.php
   ↓
11. Generate ZIP with images + metadata JSON
```

---

## 🗄️ Database Schema

### Entity Relationship Diagram

```
┌─────────────────┐
│   customers     │
│─────────────────│
│ id (PK)         │◄──┐
│ name            │   │
│ email           │   │
│ phone           │   │
│ address         │   │
│ created_at      │   │
└─────────────────┘   │
                      │
┌─────────────────┐   │
│     orders      │   │
│─────────────────│   │
│ id (PK)         │   │
│ order_number    │   │ (FK)
│ customer_id     │───┘
│ status          │◄──┐
│ tracking_number │   │
│ shipping_company│   │
│ shipped_at      │   │
│ created_at      │   │
└─────────────────┘   │
         ▲            │
         │            │
         │(FK)        │
         │            │
┌─────────────────┐   │
│ order_details   │   │
│─────────────────│   │
│ id (PK)         │   │
│ order_id        │───┘
│ product_size    │
│ base_design     │
│ quantity        │
│ price           │
│ image_path      │
│ image_data      │
└─────────────────┘
         ▲
         │(FK)
         │
┌─────────────────┐
│    payments     │
│─────────────────│
│ id (PK)         │
│ order_id        │───┘
│ payment_status  │
│ transaction_id  │
│ amount          │
│ created_at      │
└─────────────────┘
```

### Table Details

#### `customers` Table
```sql
- id: INT UNSIGNED AUTO_INCREMENT PRIMARY KEY
- name: VARCHAR(255) NOT NULL
- email: VARCHAR(255) NOT NULL (indexed)
- phone: VARCHAR(50) NOT NULL
- address: TEXT NOT NULL
- created_at: DATETIME NOT NULL
- updated_at: DATETIME NULL
```

#### `orders` Table
```sql
- id: INT UNSIGNED AUTO_INCREMENT PRIMARY KEY
- order_number: VARCHAR(50) UNIQUE (format: AS-YYYYMMDD-XXXX)
- customer_id: INT UNSIGNED (FK → customers.id)
- status: ENUM('pending','paid','processing','shipped','completed','cancelled')
- tracking_number: VARCHAR(100) NULL
- shipping_company: VARCHAR(50) NULL
- shipped_at: DATETIME NULL
- created_at: DATETIME NOT NULL
- updated_at: DATETIME NOT NULL
```

#### `order_details` Table
```sql
- id: INT UNSIGNED AUTO_INCREMENT PRIMARY KEY
- order_id: INT UNSIGNED (FK → orders.id)
- product_size: ENUM('card','postcard','a5','a4')
- base_design: VARCHAR(50) DEFAULT 'default'
- quantity: INT UNSIGNED DEFAULT 1
- price: DECIMAL(10,2) NOT NULL
- image_path: VARCHAR(500) NULL
- image_data: LONGTEXT NULL (Base64 encoded)
- created_at: DATETIME NOT NULL
```

#### `payments` Table
```sql
- id: INT UNSIGNED AUTO_INCREMENT PRIMARY KEY
- order_id: INT UNSIGNED (FK → orders.id)
- payment_status: ENUM('pending','completed','failed','refunded')
- transaction_id: VARCHAR(255) NULL
- amount: DECIMAL(10,2) NOT NULL
- created_at: DATETIME NOT NULL
- updated_at: DATETIME NULL
```

---

## 🚀 Deployment Architectures

### Local Development Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  Docker Compose                          │
│                                                          │
│  ┌────────────────┐  ┌────────────────┐               │
│  │  web:8000      │  │  mysql:3306    │               │
│  │  - Apache      │  │  - MySQL 8.0   │               │
│  │  - PHP 8.1     │  │  - acrylic_db  │               │
│  │  - App code    │  │                │               │
│  └────────────────┘  └────────────────┘               │
│           │                   │                         │
│           └───────────────────┘                         │
│                     │                                   │
│  ┌────────────────┐ │  ┌────────────────┐            │
│  │ phpmyadmin     │ │  │   MailHog      │            │
│  │ :8080          │ │  │   :8025        │            │
│  └────────────────┘ │  └────────────────┘            │
└─────────────────────┼─────────────────────────────────┘
                      │
              ┌───────▼───────┐
              │ Local volumes │
              │ - uploads/    │
              │ - mysql-data/ │
              └───────────────┘
```

**Configuration**:
- `.env` file with local settings
- `docker-compose.yml` orchestration
- Port mappings: 8000 (web), 3306 (MySQL), 8080 (phpMyAdmin), 8025 (MailHog)

### GCP Production Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                      Google Cloud Platform                    │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                   Cloud Run (Managed)                │    │
│  │  ┌────────────────────────────────────────────┐    │    │
│  │  │  akuriru-stand:latest                      │    │    │
│  │  │  - Auto-scaling (0-100 instances)         │    │    │
│  │  │  - HTTPS (automatic TLS)                  │    │    │
│  │  │  - PORT=8080                              │    │    │
│  │  │  - Max 512Mi RAM, 1 vCPU                  │    │    │
│  │  └────────────────────────────────────────────┘    │    │
│  │           │                  │                      │    │
│  └───────────┼──────────────────┼──────────────────────┘    │
│              │                  │                           │
│    ┌─────────▼────────┐  ┌─────▼──────────────┐           │
│    │  Cloud SQL       │  │ Secret Manager     │           │
│    │  - MySQL 8.0     │  │ - ADMIN_PASSWORD   │           │
│    │  - Unix socket   │  │ - DB_PASSWORD      │           │
│    │  - Auto backups  │  │ - STRIPE_SECRET    │           │
│    │  - db-f1-micro   │  └────────────────────┘           │
│    └──────────────────┘                                    │
│                                                             │
│    ┌─────────────────────────────────────────────┐        │
│    │          Cloud Storage                       │        │
│    │  - akuriru-stand-uploads/                   │        │
│    │  - akuriru-stand-print-data/                │        │
│    │  - Versioning enabled                       │        │
│    └─────────────────────────────────────────────┘        │
│                                                             │
│    ┌─────────────────────────────────────────────┐        │
│    │         Cloud Build + GitHub                 │        │
│    │  - Automated CI/CD                          │        │
│    │  - Trigger on push to claude/testing-*      │        │
│    │  - Docker image build & deploy              │        │
│    └─────────────────────────────────────────────┘        │
└──────────────────────────────────────────────────────────────┘
```

**Configuration**:
- Environment variables from Secret Manager
- Cloud SQL connection via Unix socket (`/cloudsql/PROJECT:REGION:INSTANCE`)
- Cloud Storage with bucket name in env vars
- Automatic HTTPS with Google-managed certificates

### Configuration Comparison

| Setting | Local | GCP |
|---------|-------|-----|
| Database Host | `localhost:3306` | `/cloudsql/CONNECTION_NAME` |
| Database Type | Docker MySQL | Cloud SQL |
| File Storage | `uploads/` directory | Cloud Storage bucket |
| HTTPS | Manual (localhost) | Automatic |
| Scaling | Single instance | Auto-scaling (0-100) |
| Secrets | `.env` file | Secret Manager |
| Health Check | Optional | `/health.php` (required) |
| Session Storage | File-based | File-based (ephemeral) |

---

## 🔒 Security Architecture

### Security Layers

```
┌─────────────────────────────────────────────────────────┐
│                  Layer 1: Network                        │
│  - HTTPS only (TLS 1.2+)                                │
│  - CORS headers                                          │
│  - Cloud Run: Automatic DDoS protection                 │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│               Layer 2: Application                       │
│  - CSRF tokens (api/csrf.php)                           │
│  - Rate limiting (api/rate-limit.php)                   │
│  - Input sanitization (htmlspecialchars)                │
│  - Admin session timeout (30 minutes)                   │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│                Layer 3: Data                             │
│  - PDO prepared statements (SQL injection prevention)   │
│  - Password hashing (admin authentication)              │
│  - File upload validation (MIME, size, extension)       │
│  - Base64 image encoding                                │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│             Layer 4: Infrastructure                      │
│  - Secret Manager (credential encryption)               │
│  - Cloud SQL: SSL/TLS, IAM authentication              │
│  - Cloud Storage: IAM, signed URLs                      │
│  - Audit logging                                         │
└─────────────────────────────────────────────────────────┘
```

### Security Features

| Feature | Implementation | Location |
|---------|----------------|----------|
| **CSRF Protection** | Token-based validation | `api/csrf.php` |
| **SQL Injection** | PDO prepared statements | `api/config.php:88` |
| **XSS Prevention** | `htmlspecialchars()` | `api/config.php:133` |
| **File Upload** | MIME/size/extension checks | `api/upload.php` |
| **Rate Limiting** | 100 req/hour per IP | `api/rate-limit.php` |
| **Admin Auth** | Session-based + timeout | `admin/index.php` |
| **Password Policy** | Environment variable | `admin/index.php:3` |
| **Session Security** | 30-minute timeout | `admin/index.php:10-15` |

### File Upload Security

```php
// api/upload.php
define('MAX_FILE_SIZE', 10 * 1024 * 1024); // 10MB
define('ALLOWED_TYPES', ['image/jpeg', 'image/png', 'image/gif', 'image/webp']);
define('ALLOWED_EXTENSIONS', ['jpg', 'jpeg', 'png', 'gif', 'webp']);
define('BLOCKED_EXTENSIONS', ['php', 'exe', 'sh', 'bat', 'js']);

// Validation steps:
1. File size check
2. MIME type verification
3. Extension whitelist
4. Dangerous extension blocking
5. Path traversal prevention
6. Unique filename generation
```

---

## 📝 Configuration Files

### Environment Variables

| Variable | Local | GCP | Purpose |
|----------|-------|-----|---------|
| `APP_ENV` | `local` | `gcp` | Environment detection |
| `DB_HOST` | `localhost` | `/cloudsql/...` | Database host |
| `DB_NAME` | `acrylic_stand` | `acrylic_stand` | Database name |
| `DB_USER` | `root` | `stand_user` | Database user |
| `DB_PASS` | (local pw) | (from Secret) | Database password |
| `ADMIN_PASSWORD` | (dev default) | (from Secret) | Admin panel password |
| `USE_CLOUD_STORAGE` | `false` | `true` | Storage backend toggle |
| `GCS_BUCKET` | - | `gs://bucket/` | Cloud Storage bucket |

### Configuration Files

- `.env.local.example` - Local development template
- `.env.gcp.example` - GCP production template
- `docker-compose.yml` - Local container orchestration
- `Dockerfile` - Container image definition
- `cloudbuild.yaml` - GCP CI/CD pipeline
- `.github/workflows/` - GitHub Actions CI

---

## 🔍 Monitoring & Observability

### Health Checks

**Endpoint**: `/health.php`

```json
{
  "status": "healthy",
  "timestamp": 1703886421,
  "service": "akuriru-stand",
  "version": "1.0.0",
  "database": "connected",
  "environment": "gcp",
  "php_version": "8.1.0"
}
```

**Used by**:
- Cloud Run health probes
- Load balancers
- Monitoring systems

### Logging

| Environment | Method | Location |
|-------------|--------|----------|
| Local | `error_log()` | Docker logs (`docker-compose logs`) |
| GCP | `error_log()` | Cloud Logging (Stackdriver) |

**Log levels**:
- Database connection errors (`config.php:91`)
- Admin password warnings (`admin/index.php:7`)
- File upload errors (`upload.php`)
- Payment webhook events (`payment-webhook.php`)

---

## 📚 Related Documentation

- [Functionality Checklist](FUNCTIONALITY_CHECKLIST.md) - Feature inventory
- [Deployment Guide (GCP)](DEPLOYMENT_GCP.md) - Production deployment steps
- [Local Setup](LOCAL_SETUP.md) - Development environment setup
- [Security Setup](SECURITY_SETUP.md) - Security configuration guide
- [Implementation Report](IMPLEMENTATION_REPORT.md) - Test coverage and quality

---

**Document Version**: 1.0
**Last Updated**: 2025-12-29
**Maintained by**: Development Team

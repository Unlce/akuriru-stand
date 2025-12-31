# アクリルスタンド工房 - 注文管理システム設計書
# Order & Customer Management System Design

## 🎯 目標

构建一个完整的订单管理和客户管理系统，包括：
- 订单数据库存储（GCP集成）
- 后台管理界面
- 客户信息管理
- 订单状态追踪

---

## 📊 主流解决方案分析

### 1. 数据库选择

#### 方案A: Cloud Firestore (推荐 ⭐⭐⭐⭐⭐)
**优点：**
- ✅ 无服务器（serverless）- 无需管理
- ✅ 免费额度：50K读/天，20K写/天，1GB存储
- ✅ 实时同步
- ✅ 自动扩展
- ✅ 简单易用的JavaScript/PHP SDK
- ✅ 与Cloud Run完美集成

**缺点：**
- ⚠️ NoSQL（但对订单系统足够）
- ⚠️ 复杂查询有限制

**成本：**
- 前1000个订单/月：**¥0**
- 1万订单/月：**¥10-20**

#### 方案B: Cloud SQL (MySQL)
**优点：**
- ✅ 传统SQL，熟悉的查询语法
- ✅ 复杂关联查询
- ✅ 数据一致性强

**缺点：**
- ❌ 需要管理实例
- ❌ 最低成本：¥60/月（即使没有订单）
- ❌ 需要配置连接池等

**成本：**
- 最小实例：¥60-90/月（固定）

#### 方案C: Google Sheets + API
**优点：**
- ✅ 完全免费
- ✅ 可直接在表格查看编辑
- ✅ 易于导出

**缺点：**
- ❌ 性能限制（API配额）
- ❌ 不适合大规模
- ❌ 安全性较弱

---

### 2. 后台管理界面方案

#### 方案A: 自定义PHP管理面板 (推荐 ⭐⭐⭐⭐⭐)
**优点：**
- ✅ 完全定制
- ✅ 与现有PHP应用集成
- ✅ 轻量级
- ✅ 无额外成本

**技术栈：**
- PHP 8.1 后端
- Bootstrap 5 UI
- DataTables.js 表格
- Chart.js 数据可视化

#### 方案B: Firebase Admin SDK + React
**优点：**
- ✅ 现代化SPA
- ✅ 实时更新
- ✅ 丰富的UI组件

**缺点：**
- ❌ 需要单独部署
- ❌ 学习曲线

#### 方案C: 无代码工具 (Retool/Appsmith)
**优点：**
- ✅ 快速搭建
- ✅ 拖拽式界面

**缺点：**
- ❌ 需要付费（$10-50/月）
- ❌ 定制性有限

---

## 🏗️ 推荐架构

### 技术栈

```
前端:
├── 用户下单页面 (现有)
└── 管理后台
    ├── Bootstrap 5
    ├── DataTables.js
    └── Chart.js

后端:
├── PHP 8.1
├── Firestore PHP SDK
└── RESTful API

数据库:
└── Cloud Firestore
    ├── orders (订单集合)
    ├── customers (客户集合)
    └── products (产品配置)

认证:
└── 简单的管理员密码认证
    (可升级为Firebase Auth)
```

---

## 📐 数据库设计

### Firestore 集合结构

#### 1. orders 集合
```javascript
{
  orderId: "ORD-20251230-001",
  orderNumber: "20251230001", // 显示用订单号

  // 客户信息
  customer: {
    name: "山田太郎",
    email: "yamada@example.com",
    phone: "080-1234-5678",
    zipCode: "100-0001",
    address: "東京都千代田区千代田1-1"
  },

  // 订单详情
  product: {
    type: "acrylic-stand",
    size: "120x150mm",
    baseShape: "circle", // square, heart, star
    baseColor: "#FFB6C1",
    imageUrl: "gs://bucket/uploads/xxx.png",
    thumbnailUrl: "gs://bucket/thumbnails/xxx.png"
  },

  // 价格和数量
  pricing: {
    quantity: 1,
    unitPrice: 1500,
    subtotal: 1500,
    shipping: 500,
    tax: 200,
    total: 2200,
    currency: "JPY"
  },

  // 订单状态
  status: "pending", // pending, confirmed, processing, shipped, delivered, cancelled
  paymentStatus: "pending", // pending, paid, failed

  // 时间戳
  createdAt: Timestamp,
  updatedAt: Timestamp,
  confirmedAt: Timestamp | null,
  shippedAt: Timestamp | null,
  deliveredAt: Timestamp | null,

  // 备注和追踪
  notes: "客户要求加急处理",
  trackingNumber: "1234567890",
  adminNotes: "内部备注"
}
```

#### 2. customers 集合
```javascript
{
  customerId: "CUST-001",
  email: "yamada@example.com", // 唯一索引

  profile: {
    name: "山田太郎",
    phone: "080-1234-5678",
    zipCode: "100-0001",
    address: "東京都千代田区千代田1-1"
  },

  stats: {
    totalOrders: 5,
    totalSpent: 11000,
    lastOrderDate: Timestamp
  },

  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

#### 3. settings 集合
```javascript
{
  settingId: "general",

  pricing: {
    basePrice: 1500,
    shippingFee: 500,
    taxRate: 0.10
  },

  admin: {
    email: "admin@example.com",
    passwordHash: "..." // bcrypt
  }
}
```

---

## 🔌 API 设计

### REST API 端点

```
POST   /api/orders.php              创建订单
GET    /api/orders.php              获取订单列表
GET    /api/orders.php?id=xxx       获取单个订单
PUT    /api/orders.php?id=xxx       更新订单
DELETE /api/orders.php?id=xxx       删除订单

GET    /api/customers.php           获取客户列表
GET    /api/customers.php?id=xxx    获取客户详情

POST   /api/admin/login.php         管理员登录
GET    /api/admin/stats.php         统计数据
```

---

## 🎨 管理后台功能

### 1. 仪表盘 (Dashboard)
```
┌─────────────────────────────────────────┐
│  今日统计                                │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐  │
│  │ 5    │ │ 3    │ │ ¥8500│ │ 2    │  │
│  │新订单│ │待处理│ │ 收入 │ │已完成│  │
│  └──────┘ └──────┘ └──────┘ └──────┘  │
│                                         │
│  最近订单                                │
│  ┌───────────────────────────────────┐ │
│  │ ORD-001 | 山田  | ¥2200 | 待处理 │ │
│  │ ORD-002 | 佐藤  | ¥3000 | 已确认 │ │
│  └───────────────────────────────────┘ │
│                                         │
│  销售趋势图 📈                          │
└─────────────────────────────────────────┘
```

### 2. 订单管理
- 订单列表（可搜索、筛选、排序）
- 订单详情查看
- 状态更新
- 添加备注
- 打印订单
- 导出Excel

### 3. 客户管理
- 客户列表
- 客户详情（订单历史）
- 客户统计

---

## 💰 成本估算

### Firestore 成本

**免费额度（每天）：**
- 50,000 次文档读取
- 20,000 次文档写入
- 1 GB 存储

**实际使用估算：**

| 场景 | 操作/天 | 成本/月 |
|------|---------|---------|
| 50订单/月 | 读: 500<br>写: 100 | **¥0** |
| 500订单/月 | 读: 5000<br>写: 1000 | **¥0** |
| 5000订单/月 | 读: 50K<br>写: 10K | **¥5-10** |

**总成本 = Cloud Run + Firestore**
- 小规模：¥0-30/月
- 中规模：¥50-100/月

---

## 🚀 实施步骤

### Phase 1: 数据库设置 (30分钟)
1. 启用 Firestore API
2. 创建 Firestore 数据库
3. 安装 PHP SDK
4. 测试连接

### Phase 2: API 开发 (2小时)
1. 创建 orders API
2. 实现 CRUD 操作
3. 添加验证和错误处理
4. 测试 API

### Phase 3: 管理后台 (3小时)
1. 创建登录页面
2. 开发订单列表页
3. 订单详情页
4. 统计仪表盘
5. 客户管理页

### Phase 4: 前端集成 (1小时)
1. 更新订单确认页面
2. 连接到新 API
3. 测试完整流程

### Phase 5: 部署 (30分钟)
1. 更新 Cloud Run 配置
2. 设置环境变量
3. 部署到生产环境

**总时间：约7小时**

---

## 🔒 安全措施

1. **管理员认证**
   - 基于 session 的认证
   - bcrypt 密码哈希
   - CSRF 保护

2. **API 安全**
   - 请求验证
   - 速率限制
   - SQL 注入防护（虽然用 Firestore）

3. **数据保护**
   - Firestore 安全规则
   - 敏感数据加密
   - 定期备份

---

## 📱 移动端适配

管理后台将完全响应式设计，支持：
- 📱 手机管理订单
- 💻 平板查看统计
- 🖥️ 桌面完整功能

---

## 🔄 未来扩展

1. **邮件通知**
   - SendGrid 集成
   - 订单确认邮件
   - 状态更新通知

2. **支付集成**
   - Stripe
   - PayPal
   - 日本本地支付

3. **库存管理**
   - 材料追踪
   - 自动预警

4. **客户端查询**
   - 订单追踪页面
   - 客户自助查询

---

## ✅ 下一步

请确认以下问题，然后我们开始实施：

1. **数据库选择**：使用 Firestore（免费，推荐）还是 Cloud SQL？
2. **管理员数量**：单个管理员还是多个？
3. **必需功能**：除了基本的订单管理，还需要什么？
4. **语言偏好**：界面用日语还是中文？

确认后，我会立即开始构建！

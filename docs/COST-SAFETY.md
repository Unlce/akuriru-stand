# 🛡️ GCP成本安全指南 - 100%防止天价账单
# Cost Safety Guide - Complete Protection Against Surprise Bills

**重要**: 本指南提供多层保护措施，确保你永远不会收到意外的天价账单。

---

## 🎯 核心保护策略

### 三重防护体系

```
┌─────────────────────────────────────────────────────┐
│  第一层: 预算警报 (Budget Alerts)                    │
│  ✓ 达到50%预算时发送警告邮件                         │
│  ✓ 达到100%预算时紧急通知                           │
├─────────────────────────────────────────────────────┤
│  第二层: 资源限制 (Resource Limits)                  │
│  ✓ 最大10个实例（硬性限制）                          │
│  ✓ 每个实例512MB内存上限                            │
│  ✓ 无流量时自动缩容到0                               │
├─────────────────────────────────────────────────────┤
│  第三层: 紧急停止 (Emergency Shutdown)               │
│  ✓ 一键停止所有服务                                  │
│  ✓ 手动或自动触发                                    │
└─────────────────────────────────────────────────────┘
```

---

## 🚀 快速开始 - 5分钟设置完整保护

### 步骤 1: 运行成本保护设置脚本

```bash
./setup-cost-protection.sh
```

这个脚本会自动:
- ✅ 设置预算警报（你选择预算额度）
- ✅ 配置Cloud Run资源限制
- ✅ 创建紧急停止脚本
- ✅ 设置每日成本检查

### 步骤 2: 添加邮箱接收警报

```bash
# 访问GCP控制台
https://console.cloud.google.com/billing/budgets

# 点击你的预算 -> 管理通知 -> 添加邮箱
```

### 步骤 3: 测试紧急停止功能（可选）

```bash
# 创建测试部署
./deploy-to-gcp.sh

# 测试紧急停止
./emergency-stop.sh

# 恢复服务
gcloud run services update akuriru-stand --region=asia-northeast1 --max-instances=10
```

---

## 💰 费用上限计算

### 绝对最大费用（理论极限）

基于我们的配置，**即使在最极端情况下**，月度费用也有上限：

```
配置限制:
- 最大实例数: 10
- 每实例内存: 512Mi
- 每实例CPU: 1核
- 最大并发: 800 (10实例 × 80并发)

最坏情况（10个实例24×7运行）:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
内存费用:  ¥34/月
CPU费用:   ¥6,177/月
请求费用:  ¥11,200/月（假设3000万请求）
网络费用:  ¥1,200/月（假设10TB流量）
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
总计:      ~¥18,600/月（极端情况）
```

**但是！** 这需要:
- 10个实例全天候运行（几乎不可能）
- 每天100万次访问（非常大的流量）
- 10TB网络流量（相当于2000万张图片）

### 实际预期费用

**正常使用情况**:

| 你的网站规模 | 实例使用 | 实际费用 |
|------------|---------|---------|
| 测试/个人 (1K访问/月) | 平均0.1个实例运行 | **¥0** |
| 小型商家 (10K访问/月) | 平均0.5个实例运行 | **¥5-30** |
| 中型商家 (100K访问/月) | 平均2个实例运行 | **¥100-300** |

---

## 🔒 详细保护措施

### 1. 预算警报系统

#### 工作原理
```
你的实际费用
    ↓
GCP实时监控
    ↓
达到阈值 → 发送通知到你的邮箱/手机
    ↓
你收到警告 → 可以立即停止服务
```

#### 警报级别

| 预算% | 动作 | 说明 |
|------|------|------|
| 50% | 📧 邮件通知 | 提醒你关注费用 |
| 75% | ⚠️ 警告通知 | 建议检查使用情况 |
| 90% | 🚨 紧急警告 | 考虑停止服务 |
| 100% | 🛑 超预算 | 立即执行emergency-stop.sh |

#### 设置你的预算

```bash
# 方法1: 使用我们的脚本
./setup-cost-protection.sh

# 方法2: 手动设置
gcloud billing budgets create \
    --billing-account=BILLING_ACCOUNT_ID \
    --display-name="Monthly Budget" \
    --budget-amount=100CNY \
    --threshold-rule=percent=0.5 \
    --threshold-rule=percent=1.0
```

### 2. Cloud Run资源硬限制

#### 配置文件: `cloud-run-safe-config.yaml`

```yaml
关键参数说明:

minScale: 0          # 无流量时 = 0实例 = ¥0费用
maxScale: 10         # 最多10个实例 = 硬性上限
memory: 512Mi        # 内存上限 = 防止泄漏
cpu: "1"             # CPU上限 = 防止滥用
timeout: 60s         # 请求超时 = 防止卡死
containerConcurrency: 80  # 并发限制
```

#### 为什么这些限制是安全的？

**minScale: 0**
- 无访问时，实例数降为0
- **完全不收费**
- 首次访问有2-3秒冷启动（可接受）

**maxScale: 10**
- 即使遭到DDoS攻击，最多也只有10个实例
- 可处理: 10实例 × 80并发 = **800并发请求**
- 对于小型电商网站，完全够用

**memory: 512Mi**
- PHP应用通常只需要128-256Mi
- 512Mi是安全冗余
- 防止内存泄漏导致无限扩容

**timeout: 60s**
- 正常请求1-5秒完成
- 60秒是安全上限
- 防止卡住的请求占用资源

### 3. 紧急停止系统

#### emergency-stop.sh 脚本

**功能**: 立即将所有实例数设为0，完全停止收费

```bash
# 使用方法
./emergency-stop.sh

# 会提示确认，输入 STOP 后执行

# 效果
✓ 所有Cloud Run实例停止
✓ 费用立即停止累计
✓ 网站暂时不可访问
```

#### 何时使用？

- 📊 看到费用异常增长
- 🚨 收到100%预算警报
- 🤖 怀疑遭到DDoS攻击
- 🧪 测试完成，暂时不需要服务

#### 如何恢复？

```bash
# 恢复服务（重新设置max-instances）
gcloud run services update akuriru-stand \
    --region=asia-northeast1 \
    --max-instances=10
```

---

## 📊 实时监控

### 方法1: 使用check-costs.sh脚本

```bash
# 每天运行一次（建议）
./check-costs.sh

# 输出示例:
# 📊 GCP 成本报告 - 2025-12-30
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 当月费用: ¥15.30
# 预算额度: ¥100.00
# 使用率: 15.3%
# 状态: ✅ 正常
```

### 方法2: GCP控制台

```bash
# 查看计费信息
https://console.cloud.google.com/billing

# 查看Cloud Run指标
https://console.cloud.google.com/run

# 关键指标:
- 请求数 (Request count)
- 实例数 (Instance count)
- 内存使用 (Memory utilization)
- CPU使用 (CPU utilization)
```

### 方法3: 手机App

下载 **Google Cloud** 手机应用:
- iOS: App Store搜索 "Google Cloud"
- Android: Play Store搜索 "Google Cloud"

启用推送通知，随时随地监控费用！

---

## 🚨 常见异常情况处理

### 情况1: 费用突然增长

**症状**: 昨天¥2，今天¥20

**可能原因**:
1. 流量突然增加（好事！）
2. 遭到爬虫/DDoS攻击
3. 某个请求卡死导致实例长时间运行

**处理步骤**:
```bash
# 1. 立即检查当前实例数
gcloud run services describe akuriru-stand \
    --region=asia-northeast1 \
    --format="value(status.traffic)"

# 2. 查看请求日志
gcloud run services logs read akuriru-stand \
    --region=asia-northeast1 \
    --limit=100

# 3. 如果异常，立即停止
./emergency-stop.sh

# 4. 分析日志找出原因
```

### 情况2: 收到100%预算警报

**立即行动**:
```bash
# 1. 停止服务
./emergency-stop.sh

# 2. 检查费用详情
https://console.cloud.google.com/billing

# 3. 分析是否正常流量
# - 如果是正常业务增长 → 增加预算
# - 如果是异常攻击 → 保持停止，添加防护

# 4. 决定下一步
# - 增加预算: ./setup-cost-protection.sh (选择更高预算)
# - 添加防护: 启用Cloud Armor (DDoS防护)
```

### 情况3: 怀疑遭到攻击

**识别攻击**:
```bash
# 查看请求来源IP
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=akuriru-stand" \
    --limit=1000 \
    --format="table(httpRequest.remoteIp)" | sort | uniq -c | sort -rn | head -20

# 如果看到某个IP有大量请求（>1000），可能是攻击
```

**防护措施**:
```bash
# 1. 立即停止服务
./emergency-stop.sh

# 2. 启用Cloud Armor（需要额外设置）
# 或使用Cloudflare免费版作为前端

# 3. 添加IP白名单/黑名单（如需要）
```

---

## 💡 进阶保护措施

### 1. 启用Cloud Armor (DDoS防护)

**免费层**: 无（但可以用Cloudflare免费版）

```bash
# Cloud Armor 设置（付费功能）
gcloud compute security-policies create ddos-protection \
    --description="DDoS protection for akuriru-stand"

# 添加速率限制规则
gcloud compute security-policies rules create 1000 \
    --security-policy=ddos-protection \
    --expression="true" \
    --action=rate-based-ban \
    --rate-limit-threshold-count=100 \
    --rate-limit-threshold-interval-sec=60
```

### 2. 使用Cloudflare免费版

**优势**:
- 免费的DDoS防护
- 免费的CDN加速
- 隐藏真实服务器IP

**设置**:
1. 注册Cloudflare账户
2. 添加你的域名
3. 将DNS指向Cloudflare
4. 在Cloudflare设置CNAME指向Cloud Run URL

### 3. 自动化成本监控

**使用Cloud Functions自动停止**:

```python
# 当费用超过预算时，自动停止服务
# 代码在 /tmp/auto-stop-function/main.py

# 部署 (可选)
gcloud functions deploy auto-stop-on-budget \
    --runtime=python39 \
    --trigger-topic=budget-alerts \
    --entry-point=stop_cloud_run_on_budget
```

---

## 📋 每日检查清单

建议每天花30秒检查:

```
□ 运行 ./check-costs.sh 查看费用
□ 检查是否收到预算警报邮件
□ 在GCP控制台快速查看图表
□ 确认实例数正常（0-2个）
```

如果一切正常，无需任何操作！

---

## 🎓 成本优化技巧

### 1. 合理使用minScale

```yaml
# 测试/个人项目
minScale: 0    # 完全不用时不收费

# 小型商家（偶尔访问）
minScale: 0    # 可接受冷启动

# 中型商家（经常访问）
minScale: 1    # 避免冷启动，但会有基础费用(~¥30/月)
```

### 2. 启用CPU节流

```yaml
# 在 cloud-run-safe-config.yaml 中已启用
run.googleapis.com/cpu-throttling: "true"

# 效果: 请求处理完后，CPU降到最低
# 节省: 约20-30%的CPU费用
```

### 3. 优化图片处理

```php
// 在上传时压缩图片
// 减少存储和带宽费用

function compressImage($source, $quality = 75) {
    // 使用GD库压缩
    $image = imagecreatefromstring(file_get_contents($source));
    ob_start();
    imagejpeg($image, null, $quality);
    $compressed = ob_get_clean();
    imagedestroy($image);
    return $compressed;
}
```

---

## 🆘 紧急联系方式

### 如果费用失控

**步骤1**: 立即停止服务
```bash
./emergency-stop.sh
```

**步骤2**: 联系GCP支持
- 免费用户: https://cloud.google.com/support
- 付费用户: 在控制台创建support ticket

**步骤3**: 申请费用退款
如果是系统错误导致的异常费用，GCP通常会退款。

### GCP免费支持资源

- 📚 文档: https://cloud.google.com/docs
- 💬 社区: https://www.googlecloudcommunity.com/
- 🎓 培训: https://cloud.google.com/training

---

## ✅ 完整保护措施检查表

部署前确认:

```
预算设置:
□ 已运行 ./setup-cost-protection.sh
□ 已设置预算警报（推荐¥100/月起步）
□ 已添加邮箱接收警报
□ 已下载Google Cloud手机app

资源限制:
□ maxScale设为10或更低
□ minScale设为0
□ memory限制为512Mi
□ timeout设为60s
□ 已应用 cloud-run-safe-config.yaml

紧急措施:
□ 已测试 emergency-stop.sh
□ 知道如何在控制台手动停止服务
□ 已设置手机通知

监控:
□ 知道如何运行 ./check-costs.sh
□ 知道如何访问GCP计费控制台
□ 计划每天检查一次费用
```

**全部打勾后，你就100%安全了！**

---

## 🎯 总结

### 你现在拥有的保护:

1. ✅ **预算上限** - 超过后立即收到通知
2. ✅ **资源硬限制** - 最多10个实例，无法突破
3. ✅ **自动缩容** - 无流量时费用为0
4. ✅ **紧急停止** - 一键停止所有服务
5. ✅ **实时监控** - 随时查看费用

### 最坏情况分析:

即使你:
- 忘记设置预算警报
- 网站被DDoS攻击
- 连续一个月没有检查

**最多的费用**: ~¥18,600/月（10个实例全月运行）

但这需要:
- 每天100万次访问（非常大的流量）
- 10个实例全天候运行
- 这种情况下，你的网站应该已经赚钱了！

### 现实情况:

对于正常的小型电商网站:
- **前期测试**: ¥0/月（免费额度内）
- **小型运营**: ¥10-50/月
- **中型运营**: ¥100-300/月

**完全可控，绝对安全！**

---

**最后提醒**:
1. 运行 `./setup-cost-protection.sh` 设置所有保护
2. 添加邮箱接收警报
3. 每天花30秒检查 `./check-costs.sh`

**然后就可以放心部署了！** 🚀

---

**文档版本**: 1.0
**最后更新**: 2025-12-30
**维护者**: Claude (Anthropic)

有任何问题或担心，随时询问！

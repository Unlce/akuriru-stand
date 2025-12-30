# 🚀 立即部署到GCP - 详细步骤

你的GCP项目已创建：
- **项目ID**: `acrylicstand`
- **项目编号**: `1046635409296`
- **区域**: `asia-northeast1` (东京)

---

## 📋 部署步骤（总共10-15分钟）

### 第一步：安装和认证 gcloud CLI (5分钟)

#### 如果你还没有安装 gcloud:

**macOS**:
```bash
brew install google-cloud-sdk
```

**Ubuntu/Debian**:
```bash
curl https://sdk.cloud.google.com | bash
exec -l $SHELL
```

**Windows**:
下载安装器: https://cloud.google.com/sdk/docs/install

#### 认证你的账户:

```bash
# 1. 登录GCP
gcloud auth login

# 浏览器会打开，选择你的Google账号登录

# 2. 设置应用默认凭据
gcloud auth application-default login

# 3. 设置项目
gcloud config set project acrylicstand

# 4. 设置默认区域
gcloud config set run/region asia-northeast1

# 5. 确认配置
gcloud config list
```

预期输出:
```
[core]
account = your-email@gmail.com
project = acrylicstand

[run]
region = asia-northeast1
```

---

### 第二步：启用必要的API (2分钟)

```bash
# 启用所需的GCP服务
gcloud services enable \
    cloudbuild.googleapis.com \
    run.googleapis.com \
    containerregistry.googleapis.com \
    secretmanager.googleapis.com
```

等待完成（约1-2分钟）...

---

### 第三步：设置成本保护 (3分钟)

```bash
# 运行成本保护设置脚本
export GCP_PROJECT_ID=acrylicstand
./setup-cost-protection.sh
```

脚本会询问:
1. **预算额度**: 建议输入 `100` (¥100/月)
2. **确认设置**: 输入 `y`

完成后你会看到:
```
✅ 预算警报已设置
✅ Cloud Run限制已配置
✅ 紧急停止脚本已创建
```

---

### 第四步：部署到GCP (5-10分钟)

```bash
# 设置项目ID环境变量
export GCP_PROJECT_ID=acrylicstand

# 运行部署脚本
./deploy-to-gcp.sh
```

部署过程中你会看到:

```
[1/6] 设置GCP项目...          ✓
[2/6] 启用API...              ✓
[3/6] 构建Docker镜像...       ⏳ (需要3-5分钟)
[4/6] 推送到Container Registry... ⏳ (需要1-2分钟)
[5/6] 部署到Cloud Run...      ⏳ (需要1-2分钟)
[6/6] 确认部署结果...         ✓
```

---

### 第五步：获取网站URL

部署完成后会显示:

```
╔════════════════════════════════════════╗
║     ✓ 部署成功！                        ║
╚════════════════════════════════════════╝

服务URL: https://akuriru-stand-xxxxx-an.a.run.app
```

**复制这个URL**，在浏览器中打开！

---

## 🧪 测试你的网站

### 1. 访问网站

打开浏览器，访问你的URL:
```
https://akuriru-stand-xxxxx-an.a.run.app
```

### 2. 测试功能

按照以下顺序测试:

- [ ] ✅ 主页加载
- [ ] ✅ 上传图片
- [ ] ✅ 基本编辑（调整大小、位置）
- [ ] ✅ 滤镜功能
- [ ] ✅ **切り抜き（裁剪）功能** ← 之前修复的
- [ ] ✅ **台座編集（底座编辑）功能** ← 之前修复的
- [ ] ✅ 预览效果
- [ ] ✅ 订单确认

如果所有功能都正常，恭喜！🎉

---

## 📧 设置预算警报邮箱（重要！）

### 添加你的邮箱接收成本警报:

1. 访问GCP预算页面:
```
https://console.cloud.google.com/billing/budgets?project=acrylicstand
```

2. 找到 "Akuriru Stand Budget"

3. 点击 "编辑" 或 "管理通知"

4. 添加你的邮箱地址

5. 保存

现在你会在费用达到阈值时收到邮件！

---

## 📱 安装手机监控App（推荐）

1. 下载 **Google Cloud Console** app
   - iOS: https://apps.apple.com/app/google-cloud/id1095367069
   - Android: https://play.google.com/store/apps/details?id=com.google.android.apps.cloudconsole

2. 登录你的Google账号

3. 选择项目 "acrylicstand"

4. 启用通知

随时随地监控你的网站！

---

## 💰 查看当前费用

### 方法1: 使用脚本
```bash
./check-costs.sh
```

### 方法2: Web控制台
访问: https://console.cloud.google.com/billing?project=acrylicstand

### 方法3: 手机App
打开Google Cloud app → Billing

---

## 🔍 查看实时日志

### 查看最近的请求日志:
```bash
gcloud run services logs read akuriru-stand \
    --region=asia-northeast1 \
    --limit=50
```

### 实时流式日志:
```bash
gcloud run services logs tail akuriru-stand \
    --region=asia-northeast1
```

按 `Ctrl+C` 停止查看

---

## 📊 监控服务状态

### 查看服务详情:
```bash
gcloud run services describe akuriru-stand \
    --region=asia-northeast1
```

### 查看当前实例数:
```bash
gcloud run services describe akuriru-stand \
    --region=asia-northeast1 \
    --format="value(status.conditions.message)"
```

---

## 🚨 如果遇到问题

### 问题1: 构建失败

**错误**: "Error building Docker image"

**解决**:
```bash
# 检查Docker是否运行
docker ps

# 如果Docker未运行，启动Docker Desktop
# 然后重新运行部署
./deploy-to-gcp.sh
```

### 问题2: 权限错误

**错误**: "Permission denied" 或 "403 Forbidden"

**解决**:
```bash
# 1. 确认你是项目所有者
gcloud projects get-iam-policy acrylicstand \
    --flatten="bindings[].members" \
    --filter="bindings.members:user:YOUR_EMAIL"

# 2. 如果没有权限，添加所有者角色
gcloud projects add-iam-policy-binding acrylicstand \
    --member="user:YOUR_EMAIL" \
    --role="roles/owner"
```

### 问题3: 部署后网站无法访问

**检查步骤**:
```bash
# 1. 确认服务是否部署成功
gcloud run services list --region=asia-northeast1

# 2. 检查服务URL
gcloud run services describe akuriru-stand \
    --region=asia-northeast1 \
    --format="value(status.url)"

# 3. 查看错误日志
gcloud run services logs read akuriru-stand \
    --region=asia-northeast1 \
    --limit=100
```

### 问题4: 图片上传失败

这是正常的！当前配置使用本地存储。

**临时解决方案**: 图片存储在容器中（容器重启会丢失）

**永久解决方案**: 设置Cloud Storage（可选）

---

## 🛑 紧急停止服务

如果你看到费用异常或想暂停服务:

```bash
./emergency-stop.sh
```

输入 `STOP` 确认

服务会立即停止，费用停止累计。

### 恢复服务:
```bash
gcloud run services update akuriru-stand \
    --region=asia-northeast1 \
    --max-instances=10
```

---

## 🎯 下一步优化（可选）

### 1. 添加自定义域名

```bash
# 映射你的域名
gcloud run services add-iam-policy-binding akuriru-stand \
    --region=asia-northeast1 \
    --member="allUsers" \
    --role="roles/run.invoker"

# 然后在域名设置中添加CNAME记录
```

### 2. 设置Cloud Storage（持久化图片存储）

参考: `docs/GCP-DEPLOYMENT.md` 中的Cloud Storage部分

### 3. 设置Cloud SQL（数据库）

如果订单量>100/月，考虑使用数据库

---

## 📋 每日维护清单

### 每天花30秒检查:

```bash
# 运行成本检查
./check-costs.sh
```

如果费用正常，无需其他操作！

### 每周检查:

1. 查看预算警报邮件（如果有）
2. 检查GCP控制台的计费页面
3. 查看服务日志是否有异常

---

## 📞 获取帮助

### GCP文档:
- Cloud Run: https://cloud.google.com/run/docs
- 计费: https://cloud.google.com/billing/docs

### 社区支持:
- Stack Overflow: https://stackoverflow.com/questions/tagged/google-cloud-run
- GCP社区: https://www.googlecloudcommunity.com/

### 紧急情况:
如果费用失控，立即运行:
```bash
./emergency-stop.sh
```

---

## ✅ 完成检查表

部署完成后确认:

```
□ 网站可以访问
□ 图片上传功能正常
□ 切り抜き功能正常
□ 台座編集功能正常
□ 已添加邮箱接收预算警报
□ 已安装Google Cloud手机app
□ 知道如何使用 emergency-stop.sh
□ 已运行一次 ./check-costs.sh
```

全部打勾？**恭喜你成功部署！** 🎉

---

## 🎊 总结

你现在有:
- ✅ 完全部署的网站
- ✅ 完整的成本保护
- ✅ 实时监控和警报
- ✅ 紧急停止功能

**安心使用，费用完全可控！**

预期成本:
- 测试阶段: ¥0/月
- 正式运营: ¥10-100/月

---

**问题？** 随时问我！

**开始部署？** 运行:
```bash
./deploy-to-gcp.sh
```

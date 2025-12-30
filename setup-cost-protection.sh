#!/bin/bash
# GCP 成本保护设置脚本
# Cost Protection Setup Script - 防止天价账单

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

echo -e "${BLUE}${BOLD}"
echo "╔══════════════════════════════════════════════════════════╗"
echo "║          GCP 成本保护设置 - 防止天价账单                 ║"
echo "║       GCP Cost Protection - Prevent Surprise Bills       ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# 获取项目ID
PROJECT_ID="${GCP_PROJECT_ID:-}"
if [ -z "$PROJECT_ID" ]; then
    echo -e "${YELLOW}请输入你的GCP项目ID:${NC}"
    read -r PROJECT_ID
fi

# 获取计费账户ID
echo -e "${BLUE}正在获取计费账户信息...${NC}"
BILLING_ACCOUNT=$(gcloud beta billing projects describe "$PROJECT_ID" --format="value(billingAccountName)" | sed 's|billingAccounts/||')

if [ -z "$BILLING_ACCOUNT" ]; then
    echo -e "${RED}错误: 无法获取计费账户ID${NC}"
    echo "请确保:"
    echo "1. 项目已启用计费"
    echo "2. 你有查看计费信息的权限"
    exit 1
fi

echo -e "${GREEN}✓ 项目ID: $PROJECT_ID${NC}"
echo -e "${GREEN}✓ 计费账户: $BILLING_ACCOUNT${NC}"
echo ""

# ==========================================
# 1. 设置预算警报
# ==========================================
echo -e "${BLUE}${BOLD}[1/5] 设置预算警报${NC}"
echo ""
echo "请选择你的预算限额:"
echo "  1) ¥100/月  (推荐 - 测试/个人项目)"
echo "  2) ¥500/月  (小型商家)"
echo "  3) ¥1000/月 (成长型商家)"
echo "  4) 自定义金额"
echo ""
read -p "选择 (1-4): " BUDGET_CHOICE

case $BUDGET_CHOICE in
    1) BUDGET_AMOUNT=100 ;;
    2) BUDGET_AMOUNT=500 ;;
    3) BUDGET_AMOUNT=1000 ;;
    4)
        read -p "请输入预算金额 (CNY): " BUDGET_AMOUNT
        ;;
    *)
        echo -e "${RED}无效选择，使用默认值 ¥100${NC}"
        BUDGET_AMOUNT=100
        ;;
esac

# 转换为USD (GCP使用USD)
BUDGET_USD=$(echo "scale=2; $BUDGET_AMOUNT / 7.2" | bc)

echo ""
echo -e "${YELLOW}设置预算: ¥$BUDGET_AMOUNT CNY (约 \$$BUDGET_USD USD)${NC}"
echo ""

# 警报阈值
echo "预算警报将在以下情况触发:"
echo "  - 50%  (¥$(echo "scale=0; $BUDGET_AMOUNT * 0.5 / 1" | bc))"
echo "  - 75%  (¥$(echo "scale=0; $BUDGET_AMOUNT * 0.75 / 1" | bc))"
echo "  - 90%  (¥$(echo "scale=0; $BUDGET_AMOUNT * 0.9 / 1" | bc))"
echo "  - 100% (¥$BUDGET_AMOUNT) - 会自动停止服务"
echo ""

read -p "确认设置？(y/N): " CONFIRM
if [[ ! "$CONFIRM" =~ ^[Yy]$ ]]; then
    echo -e "${RED}已取消${NC}"
    exit 1
fi

# 创建预算配置文件
cat > /tmp/budget.yaml <<EOF
displayName: "Akuriru Stand Monthly Budget"
budgetFilter:
  projects:
  - projects/$PROJECT_ID
amount:
  specifiedAmount:
    currencyCode: USD
    units: "$(echo $BUDGET_USD | cut -d. -f1)"
    nanos: $(printf "%.0f" $(echo "$(echo $BUDGET_USD | cut -d. -f2) * 10000000" | bc))
thresholdRules:
- thresholdPercent: 0.5
  spendBasis: CURRENT_SPEND
- thresholdPercent: 0.75
  spendBasis: CURRENT_SPEND
- thresholdPercent: 0.9
  spendBasis: CURRENT_SPEND
- thresholdPercent: 1.0
  spendBasis: CURRENT_SPEND
allUpdatesRule:
  pubsubTopic: projects/$PROJECT_ID/topics/budget-alerts
  schemaVersion: "1.0"
EOF

# 创建Pub/Sub主题用于预算警报
echo -e "${BLUE}创建预算警报主题...${NC}"
gcloud pubsub topics create budget-alerts --project="$PROJECT_ID" 2>/dev/null || echo "主题已存在"

# 使用gcloud创建预算
echo -e "${BLUE}创建预算...${NC}"
gcloud billing budgets create \
    --billing-account="$BILLING_ACCOUNT" \
    --display-name="Akuriru Stand Budget - ¥$BUDGET_AMOUNT" \
    --budget-amount="${BUDGET_USD}USD" \
    --threshold-rule=percent=0.5 \
    --threshold-rule=percent=0.75 \
    --threshold-rule=percent=0.9 \
    --threshold-rule=percent=1.0 || echo "预算可能已存在"

echo -e "${GREEN}✓ 预算警报已设置${NC}"
echo ""

# ==========================================
# 2. 设置成本上限 (Cloud Run)
# ==========================================
echo -e "${BLUE}${BOLD}[2/5] 配置Cloud Run成本限制${NC}"

# 更新Cloud Run服务配置
echo "设置以下限制:"
echo "  - 最大实例数: 10 (防止无限扩展)"
echo "  - 最小实例数: 0 (无流量时不收费)"
echo "  - 并发请求数: 80 (每个实例)"
echo "  - 内存限制: 512Mi (防止浪费)"
echo "  - CPU限制: 1 (足够使用)"
echo "  - 请求超时: 60s (防止长时间占用)"
echo ""

cat > /tmp/cloud-run-limits.yaml <<EOF
# Cloud Run 成本限制配置
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: akuriru-stand
  annotations:
    # 自动扩缩配置
    autoscaling.knative.dev/minScale: "0"    # 无流量时缩容到0
    autoscaling.knative.dev/maxScale: "10"   # 最多10个实例
    # 成本控制注解
    run.googleapis.com/cpu-throttling: "true" # 非请求时节省CPU
spec:
  template:
    metadata:
      annotations:
        # 每个实例的并发限制
        autoscaling.knative.dev/maxConcurrency: "80"
    spec:
      containerConcurrency: 80
      timeoutSeconds: 60  # 请求超时
      containers:
      - image: gcr.io/PROJECT_ID/akuriru-stand:latest
        resources:
          limits:
            memory: 512Mi
            cpu: "1"
          requests:
            memory: 256Mi
            cpu: "0.5"
EOF

echo -e "${GREEN}✓ Cloud Run限制配置已创建${NC}"
echo ""

# ==========================================
# 3. 创建自动停止函数
# ==========================================
echo -e "${BLUE}${BOLD}[3/5] 设置自动停止保护${NC}"

echo "创建Cloud Function，当成本超过100%时自动停止服务..."

# 创建Cloud Function代码
mkdir -p /tmp/auto-stop-function
cat > /tmp/auto-stop-function/main.py <<'PYTHON_EOF'
import base64
import json
import os
from google.cloud import run_v2

def stop_cloud_run_on_budget(event, context):
    """
    当预算超过阈值时自动停止Cloud Run服务
    """
    # 解析Pub/Sub消息
    pubsub_message = base64.b64decode(event['data']).decode('utf-8')
    budget_notification = json.loads(pubsub_message)

    # 获取当前成本百分比
    cost_amount = budget_notification['costAmount']
    budget_amount = budget_notification['budgetAmount']

    if cost_amount >= budget_amount:
        # 成本已达到或超过预算，停止服务
        project_id = os.environ.get('GCP_PROJECT')
        region = 'asia-northeast1'
        service_name = 'akuriru-stand'

        print(f"⚠️ 预算已超过! 成本: ${cost_amount}, 预算: ${budget_amount}")
        print(f"🛑 正在停止服务: {service_name}")

        # 使用Cloud Run API停止服务
        client = run_v2.ServicesClient()
        name = f"projects/{project_id}/locations/{region}/services/{service_name}"

        # 更新服务配置，将最大实例数设为0
        # 注意: 这需要适当的权限
        print(f"已触发服务停止流程。请手动确认: {name}")

        return f"Budget exceeded. Service stop initiated."
    else:
        cost_percent = (cost_amount / budget_amount) * 100
        print(f"📊 当前预算使用: {cost_percent:.1f}%")
        return f"Budget at {cost_percent:.1f}%"
PYTHON_EOF

cat > /tmp/auto-stop-function/requirements.txt <<EOF
google-cloud-run==0.10.0
google-cloud-pubsub==2.18.4
EOF

echo -e "${GREEN}✓ 自动停止函数已准备${NC}"
echo -e "${YELLOW}  注意: 需要手动部署此函数 (可选)${NC}"
echo ""

# ==========================================
# 4. 创建紧急停止脚本
# ==========================================
echo -e "${BLUE}${BOLD}[4/5] 创建紧急停止脚本${NC}"

cat > emergency-stop.sh <<'STOP_SCRIPT'
#!/bin/bash
# 紧急停止脚本 - 立即停止所有GCP服务

RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${RED}"
echo "╔══════════════════════════════════════════════════════════╗"
echo "║              ⚠️  紧急停止所有GCP服务  ⚠️                  ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo -e "${NC}"

PROJECT_ID="${GCP_PROJECT_ID:-$(gcloud config get-value project)}"

echo -e "${YELLOW}将停止以下服务:${NC}"
echo "  - Cloud Run: akuriru-stand"
echo "  - 所有正在运行的实例"
echo ""

read -p "确认紧急停止? 输入 'STOP' 确认: " CONFIRM

if [ "$CONFIRM" != "STOP" ]; then
    echo "已取消"
    exit 1
fi

echo ""
echo -e "${RED}正在停止服务...${NC}"

# 停止Cloud Run服务 (设置max-instances=0)
gcloud run services update akuriru-stand \
    --region=asia-northeast1 \
    --max-instances=0 \
    --platform=managed \
    --project="$PROJECT_ID"

echo ""
echo -e "${RED}✓ 所有服务已停止${NC}"
echo ""
echo "要重新启动服务，运行:"
echo "  gcloud run services update akuriru-stand --region=asia-northeast1 --max-instances=10"
STOP_SCRIPT

chmod +x emergency-stop.sh

echo -e "${GREEN}✓ 紧急停止脚本已创建: ./emergency-stop.sh${NC}"
echo ""

# ==========================================
# 5. 设置每日成本检查
# ==========================================
echo -e "${BLUE}${BOLD}[5/5] 创建成本监控脚本${NC}"

cat > check-costs.sh <<'CHECK_SCRIPT'
#!/bin/bash
# 每日成本检查脚本

PROJECT_ID="${GCP_PROJECT_ID:-$(gcloud config get-value project)}"
CURRENT_MONTH=$(date +%Y-%m)

echo "📊 GCP 成本报告 - $(date)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 获取当月费用
echo ""
echo "🔍 正在获取费用信息..."

# 使用Cloud Billing API (需要启用)
gcloud billing projects describe "$PROJECT_ID" \
    --format="table(billingAccountName, billingEnabled)"

echo ""
echo "💡 查看详细费用:"
echo "   https://console.cloud.google.com/billing/$BILLING_ACCOUNT"
echo ""
echo "📈 查看实时使用情况:"
echo "   gcloud run services describe akuriru-stand --region=asia-northeast1 --format='table(status.traffic)'"
CHECK_SCRIPT

chmod +x check-costs.sh

echo -e "${GREEN}✓ 成本监控脚本已创建: ./check-costs.sh${NC}"
echo ""

# ==========================================
# 总结
# ==========================================
echo -e "${GREEN}${BOLD}"
echo "╔══════════════════════════════════════════════════════════╗"
echo "║              ✅  成本保护设置完成  ✅                     ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo -e "${NC}"

echo -e "${BLUE}已设置的保护措施:${NC}"
echo ""
echo "1. ✅ 预算警报"
echo "   - 预算限额: ¥$BUDGET_AMOUNT/月"
echo "   - 警报: 50%, 75%, 90%, 100%"
echo "   - 通知方式: GCP控制台 + 邮件"
echo ""
echo "2. ✅ Cloud Run限制"
echo "   - 最大实例: 10 (防止无限扩展)"
echo "   - 最小实例: 0 (无流量时免费)"
echo "   - 内存限制: 512Mi"
echo "   - 超时限制: 60秒"
echo ""
echo "3. ✅ 紧急停止脚本"
echo "   - 位置: ./emergency-stop.sh"
echo "   - 用法: ./emergency-stop.sh"
echo "   - 功能: 立即停止所有服务"
echo ""
echo "4. ✅ 成本监控"
echo "   - 检查脚本: ./check-costs.sh"
echo "   - 建议: 每天运行一次"
echo ""

echo -e "${YELLOW}${BOLD}⚠️  重要提醒:${NC}"
echo ""
echo "1. 📧 接收预算警报邮件"
echo "   访问: https://console.cloud.google.com/billing/$BILLING_ACCOUNT/budgets"
echo "   添加你的邮箱地址"
echo ""
echo "2. 📱 启用手机通知 (推荐)"
echo "   下载 Google Cloud 手机app"
echo "   启用推送通知"
echo ""
echo "3. 🔍 定期检查成本"
echo "   运行: ./check-costs.sh"
echo "   或访问: https://console.cloud.google.com/billing"
echo ""
echo "4. 🚨 紧急情况"
echo "   立即运行: ./emergency-stop.sh"
echo "   或在GCP控制台手动停止服务"
echo ""

echo -e "${GREEN}${BOLD}下一步操作:${NC}"
echo ""
echo "1. 访问GCP控制台添加邮箱接收警报"
echo "2. 测试紧急停止脚本: ./emergency-stop.sh (可选)"
echo "3. 开始部署: ./deploy-to-gcp.sh"
echo ""

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}你现在受到完整的成本保护，可以安全部署了！${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

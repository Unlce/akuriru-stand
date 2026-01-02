# 自动化部署（中文说明，简单版）

你现在遇到的“每次都要 pull / build / push / deploy”的原因很简单：
- Cloud Run 运行的是 **Docker 镜像**，不是 GitHub 上的源码。
- 你代码改了以后，必须把它 **构建成新镜像**，并让 Cloud Run **切换到新镜像**，线上才会更新。

下面这份流程可以做到：**以后你只要 `git push`，GCP 就会自动 build + push + deploy**。

---

## 一次性设置（做完以后就省事）

### 0) 确认你已经有 Artifact Registry 仓库
仓库位置：Tokyo（`asia-northeast1`）
仓库名字：`akuriru-repo`

如果没有，就在 Cloud Shell 执行：

```bash
gcloud services enable artifactregistry.googleapis.com

gcloud artifacts repositories create akuriru-repo \
  --repository-format=docker \
  --location=asia-northeast1 \
  --description="Docker repository for Akuriru Stand"
```

### 1) 在 GCP 控制台创建 Cloud Build Trigger（最省事的自动化方式）

打开：Cloud Build → Triggers → Create trigger

1. 选择 **GitHub**，连接你的仓库（`Unlce/akuriru-stand`）
2. 触发条件建议：
   - 只部署主分支：`main`（或你实际用于上线的分支）
   - 或者你现在的分支：`claude/fix-cropping-syntax-error-eh9Yl`
3. 配置类型：选择 **Cloud Build configuration file**
4. 配置文件路径：
   - 如果你的仓库根目录就是网站项目：填 `cloudbuild.yaml`
   - 如果网站项目在子目录 `akuriru-stand/`：填 `akuriru-stand/cloudbuild.yaml`

> 我已经把 `cloudbuild.yaml` 改成使用 Artifact Registry（不再用 gcr.io）。

### 2) （强烈建议）设置镜像自动清理，避免仓库越堆越多
打开：Artifact Registry → `akuriru-repo` → Cleanup policies

建议策略：
- 只保留最近 10~20 个镜像版本（或保留最近 7~14 天）

这样基本不会产生明显的存储费用。

---

## 日常使用（以后你只要做这个）

你每天找我写代码后，你只需要：

```bash
git add -A
git commit -m "your message"
git push
```

然后等待 Cloud Build 自动完成：
- Build（构建镜像）
- Push（推到 Artifact Registry）
- Deploy（部署到 Cloud Run）

你不需要再手动在 Cloud Shell 跑 `gcloud builds submit` 和 `gcloud run deploy`。

---

## 费用会不会很贵？（直白结论）

一般不会。
- Cloud Run：主要按访问量计费，你已经设置了 `--min-instances=0`（没流量就很省）。
- Cloud Build：只有触发构建时才计费；如果你每天 push 几次，通常费用很低。
- Artifact Registry：主要是存储费；配置“自动清理”后，成本基本可控。

如果你愿意，我可以按你“每天预计 push 几次”和“现在有没有流量”给你一个更贴近实际的预算建议。
# 🐳 Docker Desktop 安装指南

## 📥 下载和安装（10分钟）

### 步骤 1：下载 Docker Desktop

**点击下载**：https://desktop.docker.com/win/main/amd64/Docker%20Desktop%20Installer.exe

或访问官网：https://www.docker.com/products/docker-desktop

### 步骤 2：安装

1. 双击下载的 `Docker Desktop Installer.exe`
2. 安装向导中保持默认设置
3. **重要**：选中 "Use WSL 2 instead of Hyper-V"（如果可选）
4. 点击 "OK" 完成安装
5. **重启电脑**（必须）

### 步骤 3：首次启动

1. 启动 Docker Desktop（桌面图标或开始菜单）
2. 首次启动会提示接受服务条款，点击 "Accept"
3. 可选：注册 Docker Hub 账号（可跳过）
4. 等待 Docker Engine 启动（右下角图标变成绿色）

---

## ✅ 验证安装

安装完成并重启后，运行以下命令验证：

```powershell
# 打开 PowerShell，运行：
docker --version
docker-compose --version

# 应该看到类似输出：
# Docker version 24.0.x
# Docker Compose version v2.x.x
```

---

## 🚀 安装完成后立即运行

```powershell
# 进入项目目录
cd C:\Users\zjuzy\OneDrive\Documents\GitHub\akuriru-stand

# 运行一键启动脚本
.\scripts\start-local.ps1

# 或手动启动
docker-compose up -d
```

3分钟后访问：
- **应用**: http://localhost:8000
- **数据库管理**: http://localhost:8080

---

## 🔧 常见问题

### WSL 2 安装错误

如果提示需要 WSL 2：

```powershell
# 以管理员身份运行 PowerShell
wsl --install

# 重启电脑
```

### 虚拟化未启用

需要在 BIOS 中启用 VT-x/AMD-V：
1. 重启电脑，进入 BIOS（通常按 F2/F10/Delete）
2. 找到 "Virtualization Technology" 或 "VT-x"
3. 设置为 "Enabled"
4. 保存并退出

### Docker Desktop 无法启动

1. 确保已重启电脑
2. 检查 Windows 更新是否完成
3. 右键 Docker Desktop → "以管理员身份运行"

---

## 📞 需要帮助？

安装过程中遇到问题，随时告诉我：
- WSL 相关问题
- 虚拟化问题
- 启动错误

---

**预计总时间**：
- 下载：5分钟（取决于网速）
- 安装：3分钟
- 重启：2分钟
- **总计：约15分钟**

安装完成后告诉我，我会立即帮您启动开发环境！

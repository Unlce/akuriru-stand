# 快速开发指南（使用 Lolipop）

## 当前状况
- ✅ Lolipop 已经在运行
- ✅ 数据库已经配置好
- ❌ Docker 未安装

## 🚀 立即开始开发的方案

### 选项 1：直接在 Lolipop 上开发（最快）

**工作流程**：
1. 在本地编辑代码
2. 用 FTP/SFTP 上传到 Lolipop
3. 在 Lolipop 上测试

**设置自动同步**：

#### 使用 VS Code 自动同步
1. 安装 VS Code 扩展：`SFTP` (作者：Natizyskunk)
2. 创建 `.vscode/sftp.json` 配置文件
3. 每次保存文件自动上传

#### 使用 FileZilla
- 手动拖拽上传，适合小改动

---

### 选项 2：安装本地 PHP 环境（推荐）

**Windows 用户推荐 XAMPP**：
1. 下载：https://www.apachefriends.org/
2. 安装后启动 Apache + MySQL
3. 将项目放到 `C:\xampp\htdocs\akuriru-stand`
4. 访问：http://localhost/akuriru-stand

**配置步骤**：
```powershell
# 1. 安装 XAMPP
# 2. 复制项目到 htdocs
Copy-Item -Recurse . C:\xampp\htdocs\akuriru-stand

# 3. 修改数据库配置指向本地
# 编辑 api/config.php，将 DB_HOST 改为 localhost
```

---

### 选项 3：使用 PHP 内置服务器（最简单）

如果您已经安装了 PHP，可以直接运行：

```powershell
# 检查 PHP 是否安装
php -v

# 启动内置服务器
cd C:\Users\zjuzy\OneDrive\Documents\GitHub\akuriru-stand
php -S localhost:8000

# 访问
start http://localhost:8000
```

**注意**：内置服务器没有 MySQL，需要连接到 Lolipop 的数据库。

---

## 🎯 我的建议

**今天**：
- 继续使用 Lolipop 作为开发环境
- 在本地编辑代码，用 FTP 上传
- 每次改完就测试

**本周末**：
- 安装 Docker Desktop
- 切换到完整的本地开发环境
- 这样可以离线开发

---

## 📝 下一步

请告诉我：
1. 您有安装 XAMPP 或其他本地 PHP 环境吗？
2. 您更倾向于哪种方案？
3. 需要我帮您配置 VS Code 的自动同步吗？

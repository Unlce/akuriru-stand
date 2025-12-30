#!/bin/bash
# 安装部署所需工具 - Google Cloud SDK 和 Docker

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     安装 GCP 部署工具 (gcloud + Docker)               ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

# 检测操作系统
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$ID
else
    echo -e "${RED}无法检测操作系统${NC}"
    exit 1
fi

echo -e "${BLUE}检测到操作系统: $OS${NC}"
echo ""

# ==========================================
# 1. 安装 Google Cloud SDK
# ==========================================
echo -e "${BLUE}${BOLD}[1/2] 安装 Google Cloud SDK...${NC}"

if command -v gcloud &> /dev/null; then
    echo -e "${GREEN}✓ gcloud 已安装${NC}"
    gcloud --version
else
    echo -e "${YELLOW}正在安装 gcloud CLI...${NC}"

    if [[ "$OS" == "ubuntu" ]] || [[ "$OS" == "debian" ]]; then
        # Debian/Ubuntu
        echo "deb [signed-by=/usr/share/keyrings/cloud.google.gpg] https://packages.cloud.google.com/apt cloud-sdk main" | sudo tee -a /etc/apt/sources.list.d/google-cloud-sdk.list

        sudo apt-get install -y apt-transport-https ca-certificates gnupg curl

        curl https://packages.cloud.google.com/apt/doc/apt-key.gpg | sudo gpg --dearmor -o /usr/share/keyrings/cloud.google.gpg

        sudo apt-get update && sudo apt-get install -y google-cloud-cli

    elif [[ "$OS" == "centos" ]] || [[ "$OS" == "rhel" ]]; then
        # CentOS/RHEL
        sudo tee -a /etc/yum.repos.d/google-cloud-sdk.repo << EOM
[google-cloud-cli]
name=Google Cloud CLI
baseurl=https://packages.cloud.google.com/yum/repos/cloud-sdk-el8-x86_64
enabled=1
gpgcheck=1
repo_gpgcheck=0
gpgkey=https://packages.cloud.google.com/yum/doc/rpm-package-key.gpg
EOM
        sudo yum install -y google-cloud-cli

    else
        # 通用安装方法
        echo -e "${YELLOW}使用安装脚本...${NC}"
        curl https://sdk.cloud.google.com | bash
        exec -l $SHELL
    fi

    echo -e "${GREEN}✓ gcloud 安装完成${NC}"
fi

echo ""

# ==========================================
# 2. 安装 Docker
# ==========================================
echo -e "${BLUE}${BOLD}[2/2] 安装 Docker...${NC}"

if command -v docker &> /dev/null; then
    echo -e "${GREEN}✓ Docker 已安装${NC}"
    docker --version
else
    echo -e "${YELLOW}正在安装 Docker...${NC}"

    if [[ "$OS" == "ubuntu" ]] || [[ "$OS" == "debian" ]]; then
        # 安装 Docker (Ubuntu/Debian)
        sudo apt-get update
        sudo apt-get install -y \
            ca-certificates \
            curl \
            gnupg \
            lsb-release

        sudo mkdir -p /etc/apt/keyrings
        curl -fsSL https://download.docker.com/linux/$OS/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

        echo \
          "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/$OS \
          $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

        sudo apt-get update
        sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

    else
        echo -e "${RED}请手动安装 Docker: https://docs.docker.com/engine/install/${NC}"
        exit 1
    fi

    # 添加当前用户到 docker 组
    sudo usermod -aG docker $USER

    # 启动 Docker
    sudo systemctl start docker
    sudo systemctl enable docker

    echo -e "${GREEN}✓ Docker 安装完成${NC}"
    echo -e "${YELLOW}⚠️  注意: 你可能需要重新登录或运行以下命令来应用 docker 组权限:${NC}"
    echo -e "${YELLOW}   newgrp docker${NC}"
fi

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║           ✓ 所有工具安装完成！                         ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${BLUE}已安装的工具:${NC}"
echo ""
echo -e "${GREEN}gcloud CLI:${NC}"
gcloud --version | head -1
echo ""
echo -e "${GREEN}Docker:${NC}"
docker --version
echo ""

echo -e "${YELLOW}下一步: 运行以下命令开始认证${NC}"
echo -e "${BLUE}  gcloud auth login${NC}"
echo ""

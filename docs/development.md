# 开发环境

## 推荐环境

代码存放在 WSL2 的 Linux 文件系统中，例如 `~/work/campus-sports-platform`。在 WSL 终端运行 Git 和 Docker 命令，避免跨文件系统导致的权限和性能问题。

Docker Desktop 需要处于运行状态，并在 **Settings > Resources > WSL Integration** 中启用当前 Ubuntu 发行版。验证：

```bash
docker version
docker compose version
./scripts/check-env.sh
```

## 启动

```bash
cp .env.example .env
docker compose up --build -d
docker compose ps
```

查看日志：`docker compose logs -f --tail=100`。停止但保留媒体目录：`docker compose down`。

## 本地调试

完整环境优先用 Compose。需要单独开发时：

```bash
cd apps/api
python3 -m venv .venv
source .venv/bin/activate
pip install -e '.[dev]'
uvicorn campus_sports.main:app --reload
```

```bash
cd apps/web
npm install
npm run dev
```

Web 开发服务器把 `/api` 和 `/media` 代理到默认网关地址。环境变量和端口说明维护在 `.env.example`。

# 开发环境

## 推荐环境

代码存放在 WSL2 的 Linux 文件系统中，例如 `~/work/campus-sports-platform`。在 WSL 终端运行 Git 和 Docker 命令，避免跨文件系统导致的权限和性能问题。

选择一种 Docker 运行方式：本机已采用 WSL Ubuntu 内的原生 Docker Engine + Compose 插件，使用 `sudo systemctl enable --now containerd docker` 启动；如果团队成员采用 Docker Desktop，则在 **Settings > Resources > WSL Integration** 中启用目标发行版。避免让两种方式同时接管同一发行版的 Docker CLI/socket。验证：

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
npm ci
npm run dev
```

Web 开发服务器把 `/api` 和 `/media` 代理到默认网关地址。环境变量和端口说明维护在 `.env.example`。

## WSL 故障排查记录

- `Wsl/Service/E_ACCESSDENIED` 是错误信息，不是命令。Windows 的 `wsl.exe` 在 PowerShell 中运行。Ubuntu 的 `apt install wsl` 安装的是无关的 WS-Man 工具。
- `docker --version` 必须真正成功，仅有 `command -v docker` 的路径不能证明 CLI 可用。
- `docker-credential-desktop.exe: Exec format error` 表示迁移后仍引用 Windows 凭据助手。先备份 `~/.docker/config.json`，仅移除指向 Desktop 的 `credsStore` 或相应 `credHelpers` 配置，保留其他配置；不要提交凭据文件。
- curl 可连接但 Docker Hub 拉取超时：检查 Docker daemon 自己的代理配置。shell 中的 `HTTP_PROXY` 不会自动传给 systemd 服务。按 [Docker 官方代理文档](https://docs.docker.com/engine/daemon/proxy/) 配置本机的 systemd drop-in；本机地址不进入 Compose 或仓库。修改后执行 `sudo systemctl daemon-reload`、`sudo systemctl restart docker`。
- `sudo systemctl show --property=Environment --no-pager docker` 避免停留在分页器；如果看到 `(END)`，按 `q` 退出。
- 仅凭超时中的 IPv6 地址不能认定 IPv6 是唯一根因；同时检查 DNS 和代理。`/etc/gai.conf` 也不保证改变 Docker 的 Go 网络解析行为。
- WSL 中 `code .` 报 `Exec format error` 时，从 Windows VS Code 的 WSL 扩展连接目标发行版并打开 Linux 项目路径，后续单独检查 WSL 互操作；不要把代码迁回 Windows 磁盘。

## 构建网络

镜像拉取走 daemon 代理；Dockerfile 内的 pip/npm 下载属于构建容器网络，两者需分别验证。必要时通过 Docker 预定义 `HTTP_PROXY`/`HTTPS_PROXY` build args 传入构建器可达的代理地址，不要写入 Dockerfile 的 ENV。宿主回环代理仅在 Linux host build network 可达；可用未提交的本机 Compose override 设置 `build.network: host`。这属于机器配置，团队默认 Compose 不依赖该代理。API 镜像先按 pyproject 安装依赖、后复制代码，代码变更不会重复下载依赖。

原生 WSL/Linux 使用本机代理时，可在已设置 `HTTPS_PROXY` 的 Ubuntu 终端运行 `python3 scripts/configure-build-proxy.py`。脚本创建 Git 忽略的 `compose.override.yaml`，仅配置 build network 和预定义代理参数；Compose 会自动加载它，之后 `make test` 和 `make up` 也使用相同网络。已存在的 override 不会被覆盖。该方式不适用于 Docker Desktop 的默认构建网络。停用前先检查文件内容，再移走这个仅本机配置文件。

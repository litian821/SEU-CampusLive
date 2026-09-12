# 校园体育赛事直播与点播平台

一个面向校园赛事的自研 Web 平台。OBS 通过 RTMP 向 SRS 推流，SRS 生成 HLS；React 客户端通过统一的 Nginx 入口观看直播，并浏览由 FastAPI 索引的视频文件。

## 当前状态

仓库已经包含可运行的 MVP 骨架：五个 Web 页面、直播/点播目录 API、SRS 与 Nginx 配置、Docker Compose 和基础测试。Docker Desktop 启动并启用 WSL 集成后，可执行完整环境验证。

## 快速开始

前置条件：Windows 11、WSL2 Ubuntu、Docker Desktop（启用目标 WSL 发行版集成）、Git。

```bash
git clone <repository-url> campus-sports-platform
cd campus-sports-platform
cp .env.example .env
./scripts/check-env.sh
docker compose up --build -d
docker compose ps
```

浏览器打开 <http://localhost:8080>。API 健康检查位于 <http://localhost:8080/api/health>。

## OBS 直播

- 服务：`rtmp://localhost:1935/live`
- 串流密钥：`demo`
- Web 播放页：<http://localhost:8080/live/demo>

OBS 建议使用 H.264 视频和 AAC 音频。开始推流后等待数秒让 HLS 播放列表生成。局域网设备访问时，把 `localhost` 换成 Windows 主机 IP。

## 点播

把测试视频放入 `storage/vod/`，然后打开 <http://localhost:8080/vod>。媒体文件不会被 Git 跟踪。Nginx 直接提供文件并支持浏览器 Range 请求，API 只负责生成目录元数据。

## 常用命令

```bash
make check
make up
make ps
make test
make logs
make down
```

详细信息见 [架构](docs/architecture.md)、[开发环境](docs/development.md)、[直播配置](docs/streaming.md)、[测试](docs/testing.md) 和 [Git 协作](docs/git-workflow.md)。长期工程规则见 [AGENTS.md](AGENTS.md)。

# 校园体育赛事直播与点播平台

一个面向校园赛事的自研 Web 平台。OBS 通过 RTMP 向 SRS 推流，SRS 生成 HLS；Vue 3 客户端通过统一的 Nginx 入口观看直播，并浏览由 FastAPI 索引的视频文件。

## 当前状态

仓库已经包含可运行的 MVP 骨架：五个 Web 页面、直播/点播目录 API、SRS 与 Nginx 配置、Docker Compose 和基础测试。包含真实直播状态、断流重试、点播搜索和缺失视频提示；支持原生 WSL Docker Engine 或 Docker Desktop。

## 快速开始

前置条件：Windows 11、WSL2 Ubuntu、Docker Engine + Compose 插件（WSL 原生服务或 Docker Desktop 二选一）、Git。

```bash
git clone <repository-url> campus-sports-platform
cd campus-sports-platform
cp .env.example .env
./scripts/check-env.sh
docker compose up --build --wait --wait-timeout 120
docker compose ps
```

浏览器打开 <http://localhost:8080>。API 健康检查位于 <http://localhost:8080/api/health>。

## OBS 直播

- 服务：`rtmp://localhost:1935/live`
- 串流密钥：`demo`
- Web 播放页：<http://localhost:8080/live/demo>

OBS 建议使用 H.264 视频和 AAC 音频。开始推流后等待数秒让 HLS 播放列表生成。局域网设备访问时，把 `localhost` 换成 Windows 主机 IP。

## 点播

把测试视频放入 `storage/vod/`，然后打开 <http://localhost:8080/vod>。请先以 `.part` 后缀复制完整，再改为视频扩展名，避免播放未写完的文件。媒体文件不会被 Git 跟踪。Nginx 直接提供文件并支持浏览器 Range 请求，API 只负责生成目录元数据。

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

## 本轮完善

直播目录每 10 秒查询实际开播状态，支持自动发现 `live` 应用中的频道。默认频道通过 `.env` 配置名称、运动项目和场地。点播提供搜索、文件存在性检查和播放失败重试。当前仍为可信校园局域网 MVP，新增赛场瞬间相册，支持文件导入、按比赛浏览和照片放大；尚未实现账户、上传后台和推流鉴权。

运行 `make test` 检查 API、Web 单元测试和构建，运行 `make smoke` 验证完整环境。GitHub Actions 配置已入库，连接远程仓库后会在 push/PR 时执行。设计依据和后续阶段见 [改进决策](docs/improvements.md)。

## 东大主场与赛场瞬间

客户端已迁移到 Vue 3，新增比赛相册 `/moments`、实拍封面和院系杯赛事信息。照片导入、文件管理、组件结构与验证方式见 [客户端与相册](docs/client-gallery.md)。

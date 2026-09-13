# 运维交接说明

本文说明开发电脑、云服务器和课堂交付分别负责什么。交给队友前，优先阅读 `AGENTS.md`、`README.md` 和本文。

不要把真实服务器 IP、密码、Token、SSH 私钥、`.env`、视频、HLS 分片、日志或数据库运行文件提交到 Git。

## 当前架构

Campus Live 使用 Docker Compose 运行四个服务：

- `gateway`：公网 HTTP 入口，负责 Web、API、直播 HLS、点播和照片访问。
- `web`：Vue 3 + Vite + TypeScript 客户端。
- `api`：FastAPI 服务，提供直播目录、点播目录和照片相册接口。
- `media`：SRS 服务，接收 RTMP 推流并生成 HLS。

直播链路：

```text
OBS 或 FFmpeg -> RTMP -> SRS -> HLS 文件 -> Nginx -> Campus Live Web 客户端
```

## 这台电脑负责什么

这台 Windows + WSL 电脑适合作为开发机和推流测试机：

- 在 WSL 项目目录中编辑代码。
- 用 Docker Compose 启动本地开发环境。
- 运行 Web、API、HTTP 冒烟和媒体链路测试。
- 将本地比赛录像放入 `storage/vod/` 做点播测试。
- 用 `scripts/import-photos.py` 将照片导入 `storage/photos/`。
- 通过 Git 提交并推送代码到 GitHub。
- 用 OBS 播放一段篮球比赛视频，推流到云服务器。
- 从浏览器检查云端网站和直播页面。

本地启动：

```bash
cd /home/sg/work/campus-sports-platform
cp .env.example .env
docker compose up --build -d
docker compose ps
```

本地访问：

```text
http://127.0.0.1:8080/
http://127.0.0.1:8080/live/demo
http://127.0.0.1:8080/vod
http://127.0.0.1:8080/moments
```

常用检查：

```bash
make check
make config
make test-api
make test-web
make smoke
make test-media
```

## 云服务器负责什么

云服务器是公网运行环境，负责让同学和老师访问网站，并接收 OBS 推流。

云服务器入方向端口：

- `80/tcp`：网站 HTTP。
- `443/tcp`：配置域名和 HTTPS 后使用。
- `1935/tcp`：OBS RTMP 推流。
- `22/tcp`：SSH 管理。

不要把 SRS 管理端口 `1985` 暴露到公网；当前 Compose 配置只绑定到服务器本机回环地址。

云服务器部署命令：

```bash
cd /opt/campus-live
git pull
docker compose up --build -d --wait --wait-timeout 180
docker compose ps
curl http://127.0.0.1/api/health
```

公网检查：

```bash
curl http://<server-ip>/api/health
curl http://<server-ip>/api/live
curl -I http://<server-ip>/
```

## 不用摄像头的 OBS 直播测试

课堂展示建议使用一段篮球比赛视频作为 OBS 媒体源，比电脑摄像头更接近赛事直播。

OBS 设置：

```text
服务：自定义
服务器：rtmp://<server-ip>:1935/live
串流密钥：demo
```

注意：服务器地址只写到 `/live`，不要写成 `/live/demo`；`demo` 单独填在串流密钥中。

OBS 场景：

```text
来源 -> 媒体源 -> 选择篮球比赛视频 -> 勾选循环
```

推荐输出：

```text
分辨率：1280x720
帧率：30 FPS
视频码率：2500-3500 kbps
关键帧间隔：2 秒
视频编码：H.264
音频编码：AAC
```

观看地址：

```text
http://<server-ip>/live/demo
```

## 队友接手清单

队友开始开发前：

- 从 GitHub 官方仓库克隆代码。
- 新建自己的功能分支。
- 阅读 `AGENTS.md`、`README.md` 和本文。
- 媒体文件只放在 `storage/`，不要提交到 Git。
- 不提交 `.env`、真实服务器地址、视频、HLS 文件、日志和密钥。
- 修改端口、环境变量、部署方式、直播链路或页面功能时同步更新文档。
- 提交或发 PR 前运行相关测试。

课堂交付前：

- 确认云服务器安全组已开放 `80/tcp` 和 `1935/tcp`。
- 确认网站能从校园网设备打开。
- 确认 OBS 能推流到云服务器。
- 至少用 3-5 台设备同时观看同一路直播。
- 准备一个备用点播视频，防止现场直播源出问题。
- 将默认推流密钥 `demo` 换成更难猜的字符串。
- 准备架构图、功能截图和测试结果说明。

## 常见问题

网站打不开：

- 检查 `docker compose ps`。
- 检查云服务器安全组是否开放 `80/tcp`。
- 查看 `docker compose logs gateway`。

OBS 无法连接：

- 检查云服务器安全组是否开放 `1935/tcp`。
- 确认 OBS 服务器是 `rtmp://<server-ip>:1935/live`。
- 确认串流密钥和 `.env` 中的 `LIVE_STREAM_KEY` 一致。
- 查看 `docker compose logs media`。

网页一直显示等待直播：

- OBS 可能还没有成功推流。
- HLS 需要几秒生成分片。
- 查看 `/api/live` 是否返回 `status: live`。

点播不能拖动：

- 优先使用 H.264 + AAC 的 MP4。
- 确认媒体请求返回 `206 Partial Content`。

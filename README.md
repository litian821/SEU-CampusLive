# Campus Live

校园体育赛事直播与点播平台。

Campus Live 面向东南大学学生，提供校园赛事直播、比赛回放和赛场照片浏览功能。平台支持 OBS 通过 RTMP 推流，服务端使用 SRS 转换为 HLS，Web 客户端负责直播观看、点播播放和赛场内容浏览。

## 当前能力

- 首页：展示当前直播、赛事入口和精彩内容。
- 赛事直播：支持多场比赛同时开播，每场比赛可配置多个手机机位。
- 直播播放：支持机位切换、HLS 播放、断流重试和手动重新连接。
- 点播库：浏览历史比赛视频。
- 点播播放：支持播放、暂停、拖动进度和 Range 请求。
- 赛场瞬间：按比赛浏览照片，支持放大和键盘切换。
- 响应式页面：支持桌面端、笔记本和基础移动端。
- 东南大学校园视觉：松青、暖金、大礼堂线稿和“止于至善”品牌语境。
- 云服务器部署：已支持单台服务器小规模公网展示和 RTMP 推流。

## 当前示例赛事

```text
院系杯 · 网络空间安全学院 vs 电子科学与工程学院
```

示例直播频道：

```text
频道：demo
项目：篮球
```

## 技术架构

```text
OBS / iPhone（每台设备使用唯一流名）
 │
 │ RTMP
 ▼
SRS
 │
 │ HLS
 ▼
Nginx Gateway
 ├── Vue 3 Web Client
 ├── FastAPI API
 ├── HLS Live Stream
 ├── MP4/WebM VOD
 └── Photo Albums
```

主要技术：

- Vue 3
- TypeScript
- Vite
- Vue Router
- hls.js
- FastAPI
- SRS
- Nginx
- Docker Compose
- Pytest
- Vitest
- Playwright

## 目录结构

```text
campus-sports-platform/
├── apps/
│   ├── api/                  # FastAPI API
│   └── web/                  # Vue 3 Web 客户端
├── infra/
│   ├── nginx/                # Nginx 配置
│   └── srs/                  # SRS 配置
├── storage/
│   ├── live/                 # HLS 运行文件，不提交 Git
│   ├── vod/                  # 点播视频，不提交 Git
│   └── photos/               # 赛场照片，不提交 Git
├── scripts/
│   ├── check-env.sh          # 环境检查
│   ├── import-photos.py      # 导入比赛照片
│   └── dev.sh                # 开发辅助脚本
├── tests/
│   ├── browser/              # 浏览器验收
│   ├── media_smoke.py        # RTMP/HLS/点播媒体验收
│   └── smoke.py              # HTTP 冒烟测试
├── docs/
│   ├── architecture.md       # 系统架构
│   ├── development.md        # 开发环境
│   ├── streaming.md          # OBS 推流说明
│   ├── testing.md            # 测试说明
│   ├── client-gallery.md     # Vue 客户端与赛场瞬间
│   └── operations-handoff.md # 团队交接与云服务器部署
├── compose.yaml
├── .env.example
├── AGENTS.md
└── README.md
```

## 环境要求

- Windows 11
- WSL2 Ubuntu
- Docker Desktop 或 WSL 原生 Docker Engine
- Docker Compose
- Git
- OBS Studio（直播推流时需要）

## 本地快速启动

```bash
git clone git@github.com:litian821/SEU-CampusLive.git campus-sports-platform
cd campus-sports-platform
cp .env.example .env
docker compose up --build --wait --wait-timeout 120
docker compose ps
```

浏览器打开：

```text
http://127.0.0.1:8080
```

API 健康检查：

```text
http://127.0.0.1:8080/api/health
```

停止服务：

```bash
docker compose down
```

## 云服务器部署

云服务器部署建议使用 `/opt/campus-live` 作为运行目录：

```bash
cd /opt
git clone https://github.com/litian821/SEU-CampusLive.git campus-live
cd campus-live
cp .env.example .env
```

生产展示时建议在 `.env` 中设置：

```text
APP_ENV=production
WEB_PORT=80
RTMP_PORT=1935
LIVE_STREAM_KEY=demo
```

启动：

```bash
docker compose up --build -d --wait --wait-timeout 180
docker compose ps
curl http://127.0.0.1/api/health
```

云服务器安全组需要开放：

```text
80/tcp    网站访问
1935/tcp  OBS RTMP 推流
22/tcp    SSH 管理
443/tcp   后续 HTTPS 使用
```

不要把 SRS 管理端口 `1985` 暴露到公网。

## OBS 直播

本地开发推流：

```text
服务：自定义
服务器：rtmp://127.0.0.1:1935/live
串流密钥：demo
观看地址：http://127.0.0.1:8080/live/demo
```

云服务器推流：

```text
服务：自定义
服务器：rtmp://<server-ip>:1935/live
串流密钥：demo
观看地址：http://<server-ip>/live/demo
```

服务器地址只写到 `/live`，不要写成 `/live/demo`；`demo` 单独填在串流密钥中。

课堂展示建议在 OBS 中添加“媒体源”，选择一段篮球比赛视频并勾选循环，不建议只用电脑摄像头。

推荐输出：

```text
分辨率：1280x720
帧率：30 FPS
视频码率：2500-3500 kbps
关键帧间隔：2 秒
视频编码：H.264
音频编码：AAC
```

## 点播

将视频文件放入：

```text
storage/vod/
```

支持 `.mp4`、`.webm`、`.mov`、`.m4v`。为了浏览器兼容性，优先使用 H.264 + AAC 的 MP4。

复制大文件时建议先使用 `.part` 临时后缀，复制完成后再改名为正式扩展名，避免客户端读取未写完的视频。

点播页面：

```text
http://127.0.0.1:8080/vod
```

## 赛场瞬间

照片存放在：

```text
storage/photos/<比赛名称>/
```

通过脚本导入照片：

```bash
python3 scripts/import-photos.py \
  --album "院系杯 · 网络空间安全学院 vs 电子科学与工程学院" \
  /path/to/photo.jpg
```

支持 JPEG、PNG、WebP，单张最大 25 MB。同名文件会拒绝覆盖。照片和视频不会提交到 Git。

照片页面：

```text
http://127.0.0.1:8080/moments
```

## 常用测试

```bash
make check       # 检查环境
make config      # 检查 Compose 配置
make test-api    # 运行 API 测试
make test-web    # 运行 Web 测试和构建
make test        # 运行完整检查
make smoke       # 运行 HTTP 冒烟测试
make test-media  # 运行真实媒体链路测试
```

媒体测试会验证点播详情、中文和特殊文件名、Range `206`、RTMP 推流、SRS 直播发现、HLS 播放列表、HLS 分片、音视频解码，以及停止推流后的频道状态。

## 开发前端

```bash
cd apps/web
npm ci
npm run dev
```

前端开发地址：

```text
http://127.0.0.1:5173
```

常用检查：

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

## API 接口

```text
GET /api/health
GET /api/live
GET /api/live/{stream_id}
GET /api/matches
GET /api/matches/{match_id}
GET /api/vod
GET /api/vod/detail?filename=<filename>
GET /api/photos
```

## Git 协作

分支命名：

```text
codex/feature-<topic>
codex/fix-<topic>
codex/docs-<topic>
```

Commit 示例：

```text
feat: add photo moments gallery
fix: recover live playback after network failure
docs: update OBS streaming guide
test: add photo catalog regression tests
refactor: split media player components
chore: update dependencies
```

提交前建议执行：

```bash
git status
make test
```

## 当前限制

- 暂无用户登录系统。
- 暂无后台上传管理。
- 赛事和机位通过 `LIVE_MATCHES_JSON` 配置，暂无持久化数据库与后台管理。
- 暂无比分和赛程管理。
- 暂无推流鉴权。
- 暂无公网 HTTPS、域名和长期监控。
- 当前适合本地开发和单台云服务器小规模课程展示。
- 课堂交付前仍需完成 OBS 真实视频源推流和多设备观看测试。

## 文档入口

- `AGENTS.md`：长期工程规范。
- `docs/architecture.md`：系统架构和当前取舍。
- `docs/streaming.md`：OBS、RTMP、HLS、点播说明。
- `docs/testing.md`：本地、云端和媒体链路验收。
- `docs/client-gallery.md`：Vue 客户端与赛场瞬间。
- `docs/operations-handoff.md`：开发电脑、云服务器和课堂交付交接。
- `docs/design/campus-live-v1/DESIGN.md`：产品设计、视觉规范和东南大学元素说明。

## 许可证

本项目目前用于东南大学学生团队课程与实践项目。

正式发布前，请根据团队决定补充许可证和媒体素材授权说明。

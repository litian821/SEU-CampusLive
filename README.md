# Campus Live

校园体育赛事直播与点播平台。

Campus Live 面向东南大学学生，提供校园赛事直播、比赛回放和赛场照片浏览功能。平台支持 OBS 通过 RTMP 推流，服务端使用 SRS 转换为 HLS，Web 客户端负责直播观看、点播播放和赛场内容浏览。

## 功能

- 首页：展示当前直播、赛事入口和精彩内容
- 赛事直播：查看正在直播的校园比赛
- 直播播放：支持 HLS 播放、断流重试和重新连接
- 点播库：浏览历史比赛视频
- 点播播放：支持播放、暂停、拖动进度和 Range 请求
- 赛场瞬间：按比赛浏览照片，支持放大和键盘切换
- 响应式页面：支持桌面端、笔记本和移动端
- 东南大学校园视觉：松青、暖金、大礼堂线稿和“止于至善”品牌语境

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
OBS
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
 └── MP4/WebM VOD
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
│   ├── streaming.md           # OBS 推流说明
│   ├── testing.md            # 测试说明
│   └── client-gallery.md     # Vue 客户端与赛场瞬间
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
- OBS Studio（仅直播推流时需要）

## 快速启动

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

## OBS 直播

在 OBS Studio 中打开“设置 → 直播”，选择：

```text
服务：自定义
服务器：rtmp://127.0.0.1:1935/live
串流密钥：demo
```

然后：

1. 在 OBS 的“来源”中添加摄像头、显示器或媒体源。
2. 点击“开始直播”。
3. 打开 `http://127.0.0.1:8080/live/demo`。
4. 等待几秒，网页会显示直播画面。

结束直播时，在 OBS 中点击“停止直播”。

## 点播

将视频文件放入：

```text
storage/vod/
```

支持的格式：`.mp4`、`.webm`、`.mov`、`.m4v`。

推荐使用临时文件导入：

```text
比赛录像.mp4.part
```

文件写入完成后，再改名为正式扩展名，避免客户端读取未完成的视频。

点播页面：`http://127.0.0.1:8080/vod`

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

支持：

- JPEG、PNG、WebP
- 单张最大 25 MB
- 同名文件拒绝覆盖
- 照片按比赛相册浏览
- 点击放大
- Escape 关闭
- 方向键切换

照片页面：`http://127.0.0.1:8080/moments`

照片和视频不会提交到 Git。

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

前端开发地址：`http://127.0.0.1:5173`

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

Commit 规范：

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

- 暂无用户登录系统
- 暂无后台上传管理
- 暂无赛事持久化数据库
- 暂无比分和赛程管理
- 暂无推流鉴权
- 当前适合校园局域网和开发环境
- OBS 推流需要本机运行 Docker 和 SRS

## 设计文档

完整的产品设计、视觉规范、东南大学元素使用说明和 Vue 页面结构见：

```text
docs/design/campus-live-v1/DESIGN.md
```

## 许可证

本项目目前用于东南大学学生团队课程与实践项目。

正式发布前，请根据团队决定补充许可证和媒体素材授权说明。

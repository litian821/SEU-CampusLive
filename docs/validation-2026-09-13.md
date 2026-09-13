# 2026-09-13 验收记录

## 环境

本地环境为 Windows 11 + WSL2 Ubuntu，使用 Docker Engine / Docker Compose 运行完整服务。媒体服务为 SRS 6.0.191，浏览器验收使用 Windows Edge。代码和运行媒体优先保存在 WSL Linux 文件系统。

云服务器环境为单台 Linux 服务器，使用 Docker 26.1.3 和 Docker Compose v2.27.0。云服务器部署目录为 `/opt/campus-live`，公网地址不写入 Git 文档。

## 本地已通过

| 检查 | 结果 |
| --- | --- |
| 环境检查 | Git、Docker、Compose、daemon 和项目根文件通过 |
| API 测试 | 覆盖直播状态、频道过滤、缺失视频、特殊文件名、临时文件、符号链接和照片目录 |
| Web 测试 | 覆盖网络重试、HLS 恢复、资源清理、查询恢复、百分号文件名和搜索 |
| 类型检查与生产构建 | Vue 3 + TypeScript + Vite 构建通过 |
| Compose / Nginx 配置 | 配置检查通过，四个服务健康 |
| HTTP 冒烟测试 | 首页、列表、API 健康、直播目录和点播目录通过 |
| 媒体链路测试 | H.264/AAC MP4、Range 206、RTMP 推流、HLS 清单/分片、音视频解码和停播恢复通过 |
| 浏览器验收 | 点播播放、暂停、拖动、缺失视频、未知路由和基础响应式布局通过 |
| Git 文件管理 | `.env`、测试视频、HLS 数据、日志和运行文件保持在 Git 外 |

## 云服务器已通过

- Docker 和 Docker Compose 已可用。
- GitHub 仓库已部署到 `/opt/campus-live`。
- `.env` 已按生产展示设置 `APP_ENV=production`、`WEB_PORT=80`、`RTMP_PORT=1935`。
- 四个服务 `api`、`web`、`media`、`gateway` 均可启动并健康运行。
- 公网 HTTP 网站访问通过。
- 公网 API 健康检查通过。
- 服务器内部 RTMP 推流到 SRS、HLS 生成和公网 HLS 访问通过。
- 云服务器安全组开放 `1935/tcp` 后，公网 RTMP 端口可达。
- SRS 管理端口 `1985` 仍只绑定服务器本机回环地址。

## 实测发现并修复

1. 点播路径含字面 `%20` 时重复解码导致 404；详情接口改为查询参数，并覆盖特殊文件名测试。
2. Edge 原生 HLS 报解析错误；MSE 可用时优先使用 hls.js，原生 HLS 作为备用分支。
3. API/Web 容器重建后 Nginx 可能缓存旧上游 IP；网关改用 Docker 内置 DNS 动态解析。
4. 云服务器首次拉 Docker Hub 镜像超时；SRS 镜像通过公开镜像代理拉取并打回原镜像名。
5. 云服务器前端 `npm ci` 访问官方源卡住；Dockerfile 增加 npm 镜像源配置。
6. OBS 报“无法访问指定频道或推流码”时，SRS 日志显示曾把服务器地址写成 `/live/demo`，导致实际流路径变成 `/live/demo/demo`；正确写法是服务器 `rtmp://<server-ip>:1935/live`，串流密钥 `demo`。

## 证据边界

- 本地真实 RTMP 测试主要使用 FFmpeg 模拟推流；云服务器也已用 FFmpeg 验证 RTMP/HLS 链路。
- Windows OBS 已能连接到服务器；课堂交付前仍需用 OBS 播放真实篮球视频源完成一次完整公网直播验收。
- 还没有完成 3-5 台设备同时观看测试。
- Safari、部分移动浏览器和弱网场景尚未实机验证。
- GitHub Actions 是否远程通过需要以 GitHub 页面结果为准，不能用本地结果代替。
- 当前未实现用户登录、后台上传、数据库赛事管理、比分赛程、推流鉴权、HTTPS 域名和长期监控。
- 合成测试视频只用于验收和演示，不应作为真实赛事素材提交到 Git。

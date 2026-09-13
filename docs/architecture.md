# 架构设计

## 目标与边界

Campus Live 的 MVP 解决三条核心链路：OBS 推流后可在自研 Web 页面观看直播；管理员放入视频文件后可在 Web 页面浏览和点播；团队将比赛照片放入相册后可在“赛场瞬间”浏览。

当前部署方式仍保持单机 Docker Compose，适合本地开发、云服务器课程展示和小规模校园演示。项目暂不引入 Kubernetes、消息队列、复杂权限系统或分布式媒体集群。

## 组件

| 组件 | 技术 | 职责 |
| --- | --- | --- |
| Web | Vue 3、TypeScript、Vite、Vue Router、hls.js | 首页、直播列表、直播播放、点播列表、点播播放、赛场瞬间 |
| API | FastAPI、Python | 健康检查、直播目录、点播文件索引、照片相册索引 |
| Media | SRS 6 | 接收 RTMP 推流，生成 HLS 直播文件 |
| Gateway | Nginx | 单一 HTTP 入口、页面/API 反向代理、直播 HLS、点播 Range、照片静态访问 |
| Storage | 主机目录 | 保存点播视频、照片和直播临时分片；运行数据不进入 Git |

## 数据流

本地开发默认端口为 `8080`；云服务器生产部署可通过 `.env` 将 `WEB_PORT` 改为 `80`。

```text
OBS -> RTMP :1935 -> SRS -> HLS 文件 -> Nginx /media/live -> Web 播放器
storage/vod -> FastAPI 索引 -> Nginx /api -> Web 点播列表
storage/vod -> Nginx /media/vod -> HTML5 video 点播播放
storage/photos -> FastAPI 索引 -> Nginx /media/photos -> 赛场瞬间
```

Web、API 和媒体文件通过 Nginx 统一为同源地址，减少 MVP 阶段的 CORS 和跨域配置。直播采用 HLS，覆盖主流桌面浏览器；通常会有数秒延迟，低延迟方案留到后续需求明确后评估。

## 当前取舍

- 点播和照片元数据从目录生成，不使用数据库，降低首次部署成本。
- 使用 SRS 处理 RTMP/HLS，不重复开发媒体协议服务；用户界面由本仓库自主开发。
- 前后端单仓库，接口、UI、文档可以在同一 PR 中审查。
- 运行数据通过 bind mount 保存，方便开发者查看、备份和清理。
- SRS 管理端口 `1985` 只绑定服务器本机回环地址，不暴露公网。
- 云服务器部署保留 Docker Compose，不额外引入复杂运维平台。

## 可靠性设计

API 通过内部地址 `http://media:1985` 查询 SRS 开播状态。查询失败时返回 `unknown`，不会伪装成停播；默认频道可等待开播，其他合法活跃流会被自动发现。

前端每次请求完成后再等待一段时间刷新，避免请求堆积；播放器在 HLS 首次 404、断流或网络抖动时按退避策略重连，并保留手动重试入口。

Nginx 直接提供点播视频和照片，点播保留 Range 请求，照片和视频都拒绝隐藏路径、符号链接和明显不合法文件。运行日志限制大小和份数，避免长时间运行撑满磁盘。

## 已验证状态

截至 2026-09-13：

- 本地 Docker Compose 四个服务已验证 healthy。
- API、Web、HTTP 冒烟和媒体链路测试已通过。
- FFmpeg 模拟 RTMP 推流到 SRS、HLS 生成和音视频解码已通过。
- 云服务器已验证公网 HTTP、API、HLS 观看链路可用。
- 云服务器安全组开放 `1935/tcp` 后，公网 RTMP 端口已可达。
- Windows OBS 已能连接到 SRS；OBS 地址必须填写 `rtmp://<server-ip>:1935/live`，串流密钥单独填写 `demo`。

## 后续演进

下一阶段按课堂交付优先级推进：真实 OBS 视频源推流、多设备观看测试、HTTPS/域名、强推流密钥、真实点播素材和照片素材。再往后可增加 SQLite 赛事元数据、后台上传、推流鉴权、录制转点播、赛程比分和基础监控。

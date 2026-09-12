# 架构设计

## 目标与边界

MVP 只解决两条核心链路：OBS 推流后可在自研 Web 页面观看；管理员放入视频文件后可在 Web 页面浏览和点播。单机 Docker Compose 是第一阶段的部署边界。

## 组件

| 组件 | 技术 | 职责 |
| --- | --- | --- |
| Web | React、TypeScript、Vite、hls.js | 五个基础页面、HLS 直播播放、HTML5 点播 |
| API | FastAPI、Python | 健康检查、直播目录、点播文件索引 |
| Media | SRS 6 | 接收 RTMP，生成 HLS |
| Gateway | Nginx | 单一 HTTP 入口、页面/API 反向代理、直播和点播文件、Range 请求 |
| Storage | 主机目录 | 保存点播文件和临时直播分片，不进入 Git |

## 数据流

```text
OBS (Windows) --RTMP :1935--> SRS --HLS 文件--> Nginx :8080 --> Web 播放器
storage/vod ---------------------------> Nginx :8080 --> HTML5 播放器
storage/vod --> FastAPI 索引 --> Nginx /api --> Web 列表
```

Web、API 和媒体服务都由 Nginx 统一为同源地址，避免 MVP 阶段增加 CORS 配置。直播采用 HLS 以覆盖主流浏览器；延迟通常为数秒，低延迟协议留到基础链路稳定后评估。

## 当前取舍

- 点播元数据从目录生成，不使用数据库，降低首次运行成本。
- 使用 SRS 处理媒体协议，不重复开发 RTMP/HLS 服务；所有面向用户的页面由本仓库开发。
- 前后端单仓库，接口和 UI 变更可在同一 PR 审查。
- 运行数据通过 bind mount 保存，便于开发者查看和清理。

## 后续演进

确认 MVP 后按需求增加 SQLite 元数据、赛事管理、封面上传、鉴权、录制转点播和自动化端到端测试。只有单机容量或可用性要求明确时再拆分服务。

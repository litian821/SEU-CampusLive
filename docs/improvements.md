# MVP 可靠性完善（2026-09-13）

## 决策与依据

选择适合本项目的简单方案，并不把“最好”理解为堆叠最多组件。继续采用 React + TypeScript、FastAPI、SRS 6 和 Nginx，同源 HTTP 入口、RTMP 入流、HLS 直播和静态文件点播。

1. [SRS 6 HTTP API](https://ossrs.io/lts/en-us/docs/v6/doc/http-api)：业务 API 查询内部 `/api/v1/streams/`，验证 HTTP 错误、业务 code 和响应结构，区分 live/offline/unknown。默认频道始终可进入，其他活跃流自动发现；仅支持 `live` 应用和由字母、数字、下划线、连字符组成的流名。查询超时为 2 秒，前端每次查询完成 10 秒后更新，适合小规模单机 MVP。更大并发时再加共享缓存或事件状态存储。
2. [hls.js 官方 API](https://github.com/video-dev/hls.js/blob/master/docs/API.md)：遇到致命媒体错误先有限恢复，其余致命错误按 5/10/20/30 秒重建连接；卸载时销毁实例、定时器和媒体资源。保留原生 HLS 分支。页面提供手动重试，浏览器仍需要用户点击播放，不强行绕过自动播放策略。
3. [Nginx 文件服务](https://nginx.org/en/docs/http/ngx_http_core_module.html)：视频字节由 Nginx 提供，保留 Range；API 只处理元数据，隐藏临时、空文件和符号链接，Nginx 同时拒绝符号链接读取。目录扫描仍不等于编码校验，管理员应提供浏览器支持的 H.264/AAC MP4。
4. [Docker daemon 代理](https://docs.docker.com/engine/daemon/proxy/)：宿主代理属于机器环境，不写进镜像或 Compose。内部 SRS 请求明确不继承代理。SRS 管理端口只绑定回环地址，四个服务都有健康检查和有限日志保留。

## 已解决的具体问题

- 停播频道被固定显示为 LIVE；现在显示真实状态，SRS 异常显示“状态暂不可用”。
- HLS 初次 404 或断流后停在错误提示；现在持续退避重连并可手动连接。
- 点播 URL 二次解码破坏 `%` 文件名；现在使用路由解码后的 ID 请求 API 详情。
- 点播文件删除后仍显示空播放器；现在先确认详情，播放阶段另提供失败提示。
- Web 原来的 `check` 只有构建，没有单元测试；现在引入 Vitest 和 React Testing Library。
- 测试命令可能使用旧镜像；现在测试容器显式使用 `--build`。

## 下一阶段

1. 单管理员身份验证、SQLite 赛事元数据和受保护的视频上传，形成赛事管理闭环。上传使用 [FastAPI UploadFile](https://fastapi.tiangolo.com/tutorial/request-files/) 或流式写入并限制请求大小，避免将大视频一次性读入内存；未完成前不提供匿名上传入口。
2. SRS 发布回调校验推流凭据，增加真实赛事频道管理。当前流名是公开播放标识，不是秘密，也不提供鉴权。
3. 实际录制需求明确后加入录制转点播和后台转码任务，验证失败重试、磁盘容量和发布原子性。
4. 有明确延迟目标再比较 WebRTC/HTTP-FLV；有校外部署需求再配置 HTTPS、身份权限和监控。

上述为后续规划，不代表已经实现。当前版本仍以可信局域网演示为边界。

## 浏览器实测修复

Windows Edge 声称支持原生 HLS，但本机实播出现 `PipelineStatus::DEMUXER_ERROR_COULD_NOT_PARSE`，表现为缓冲已就绪而播放时间停在 0。按 [hls.js 官方嵌入顺序](https://github.com/video-dev/hls.js#embedding-hlsjs)，MSE 可用时优先使用 hls.js，只在不支持 MSE 时选择原生 HLS。增加对应回归测试；原生 Safari 分支仍需 Safari 实机验收。

容器重建还复现了 Nginx 缓存旧上游 IP 导致的 502：网关进程健康并不代表业务链路正常。使用 Docker 内置 DNS `127.0.0.11` 和 [Nginx upstream resolve](https://nginx.org/en/docs/http/ngx_http_upstream_module.html#server) 动态解析，避免每次更新 API/Web 都需要重启网关。当前 Nginx 1.28 支持该开源功能。

# 2026-09-13 本地验收记录

## 环境

Windows 11 + WSL2 Ubuntu，原生 Docker Engine 29.1.3、Compose 2.40.3；媒体服务 SRS 6.0.191，测试编码工具为该镜像自带 FFmpeg 8.1.2。浏览器使用 Windows Edge 152 的独立无界面实例。代码与运行媒体保存在 WSL Linux 文件系统。

## 已通过

| 检查 | 结果 |
| --- | --- |
| `./scripts/check-env.sh` | CLI、Compose、daemon、项目根文件均通过 |
| API pytest | 13 项通过：开播/停播/未知状态、频道过滤、缺失视频、特殊文件名、临时文件和符号链接 |
| Web Vitest | 11 项通过：网络重试、有限媒体恢复、原生分支、MSE 优先、资源清理、查询恢复、百分号文件名和搜索 |
| TypeScript + Vite build | 通过；直播播放器按需加载，入口脚本约 266 kB，直播分包约 577 kB（未压缩） |
| Compose / Nginx config | 配置检查通过，api/web/media/gateway 均 healthy |
| `make smoke` | 首页、列表、API 健康、真实 SRS 状态、点播详情通过 |
| `KEEP_TEST_VIDEO=1 make test-media` | H.264/AAC MP4 生成、Range 206、RTMP 推流发现、HLS 播放列表/分片、FFmpeg 实际解码、停播后目录更新全部通过 |
| Edge 浏览器 | 点播播放、暂停、拖动到第 12 秒后继续播放；中文与百分号文件名、缺失视频、未知路由和手机布局通过 |
| Edge 直播恢复 | 人为让首次 m3u8 返回 404，恢复网络后自动重连；真实画面加载且播放时间持续前进，无未捕获页面异常 |
| 容器更新回归 | 仅重建 API/Web，不重启网关，等待健康后 `make smoke` 通过 |
| Git 文件管理 | `.env`、本机 `compose.override.yaml`、测试 MP4 和 HLS 数据均被忽略 |

## 实测发现并修复

1. 点播路径含字面 `%20` 时重复解码导致 404：详情改为查询参数，并覆盖特殊文件名测试。
2. Edge 原生 HLS 报 `DEMUXER_ERROR_COULD_NOT_PARSE`：MSE 可用时优先使用 hls.js，实播复验通过。
3. API/Web 重建后 Nginx 仍连接旧 IP 导致 502：增加动态上游 DNS 解析，重建回归通过。配置重载或服务替换期间仍可能有数秒短暂不可用，本版本不承诺零停机更新。
4. 构建容器下载超时/截断：保持 TLS 和哈希校验，重新下载；本机采用未提交的 host build network/代理 override。API 依赖层与源代码层分离，正常 `make test` 已通过。

## 证据边界

- 真实 RTMP 测试使用 FFmpeg 模拟推流；本轮未操作 Windows OBS，也未做实际体育现场测试。
- 浏览器实测是 Edge；Safari 原生 HLS、其他移动设备尚未做实机测试。
- GitHub Actions 配置已添加，尚无远程运行结果。
- Vite 仍提示直播分包超过 500 kB，按需加载已避免首页下载该包；本轮没有通过提高告警阈值隐藏提示。
- 未进行并发负载测试，未实现账户、推流鉴权、上传后台、数据库赛事管理或公网 HTTPS 部署。
- 保留一段约 4.6 MB 的“自动验收”合成点播视频供本机体验；临时推流容器已停止。该视频不提交 Git。

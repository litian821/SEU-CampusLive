# 直播与点播

## OBS 推流

1. 启动 Compose 环境。
2. OBS 打开“设置 > 直播”，服务选择“自定义”。
3. 服务器填写 `rtmp://localhost:1935/live`。
4. 串流密钥填写 `demo`。
5. 输出编码器选择 H.264，音频选择 AAC，关键帧间隔设置为 2 秒。
6. 开始直播，然后打开 `http://localhost:8080/live/demo`。

若 OBS 与服务不在同一台机器，把 `localhost` 换为服务端 IP。Windows 防火墙需要允许 TCP 1935 和 Web 端口 8080。

## HLS 路径

默认流地址为 `/media/live/<stream-key>.m3u8`。SRS 把分片写入 `storage/live/`，Nginx 从该共享目录直接提供播放列表和分片；这些临时文件被 `.gitignore` 排除。

## 点播文件

把 `.mp4`、`.webm`、`.mov` 或 `.m4v` 文件放入 `storage/vod/`。API 会在请求列表时扫描目录，Nginx 从 `/media/vod/<filename>` 提供文件。为了浏览器兼容性，优先使用 H.264 + AAC 的 MP4。

## 常见问题

- 页面显示等待直播：确认 OBS 正在推流，并检查 `docker compose logs media`。
- OBS 无法连接：确认 1935 端口映射、Docker Desktop 与 Windows 防火墙。
- 有画面无声音：确认 OBS 音频编码为 AAC。
- 点播无法拖动：用浏览器网络面板确认媒体请求返回 `206 Partial Content`。

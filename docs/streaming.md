# 直播与点播说明

## OBS 推流

本地开发时：

```text
服务：自定义
服务器：rtmp://127.0.0.1:1935/live
串流密钥：demo
观看地址：http://127.0.0.1:8080/live/demo
```

云服务器展示时：

```text
服务：自定义
服务器：rtmp://<server-ip>:1935/live
串流密钥：demo
观看地址：http://<server-ip>/live/demo
```

注意：服务器地址只写到 `/live`，不要写成 `/live/demo`。`demo` 要单独填写在“串流密钥”中。写成 `/live/demo` 后，SRS 会把应用识别为 `live/demo`，实际流路径会变成 `/live/demo/demo`，网页默认频道无法正确识别。

## 推荐 OBS 输出

课堂展示优先使用一段篮球比赛视频作为媒体源，不建议只用电脑摄像头。

```text
来源：媒体源，选择篮球比赛视频，可勾选循环
分辨率：1280x720
帧率：30 FPS
视频码率：2500-3500 kbps
关键帧间隔：2 秒
视频编码：H.264
音频编码：AAC
```

推流后等待 5-10 秒，SRS 生成足够 HLS 分片后网页会开始播放。

## iPhone 使用 Larix 横屏直推

在 Larix 的 `Settings → Capture and encoding → Video` 中使用以下设置：

```text
Orientation：Always horizontal / Landscape
Live rotation：Lock while broadcasting
Resolution：1280x720
Frame rate：30 FPS
Video codec：H.264 / AVC
Keyframe interval：2 秒
Video bitrate：2500-3500 kbps
Audio codec：AAC
```

先停止推流，横持手机并确认预览画面方向正确，再开始推流。`Lock while broadcasting` 会锁定开播时的方向；如果竖持手机开始后再旋转，编码画面可能保持竖向。测试方向变化时可暂时使用 `Follow screen rotation`，正式直播建议锁定横屏，避免手机晃动触发旋转。

播放器会按视频元数据中的真实宽高自动选择横屏、竖屏或方形容器，并允许在“完整显示”和“填满画面”之间切换。若推流软件已经把侧转画面和黑边合成为一个 16:9 视频帧，网页无法从该帧恢复原始方向，必须先修正手机端的编码方向并重新推流。

Larix 免费模式显示的测试水印属于推流端写入视频的内容，网页和 SRS 无法无损去除。正式直播需在 Larix 中启用可移除默认水印的版本，或改用经过验证、支持自定义 RTMP 且不写入水印的推流端。

## 云服务器端口

云服务器安全组和系统防火墙需要允许：

- `80/tcp`：网站访问。
- `1935/tcp`：OBS RTMP 推流。
- `443/tcp`：配置 HTTPS 后使用。
- `22/tcp`：SSH 管理。

SRS 管理端口 `1985` 只供服务器内部使用，不应开放公网。

## HLS 路径

默认直播播放地址：

```text
/media/live/<stream-key>.m3u8
```

SRS 将 HLS 分片写入 `storage/live/`，Nginx 从共享目录提供播放列表和 `.ts` 分片。这些运行文件已经被 `.gitignore` 排除。

## 点播文件

将 `.mp4`、`.webm`、`.mov` 或 `.m4v` 文件放入：

```text
storage/vod/
```

为了浏览器兼容性，优先使用 H.264 + AAC 的 MP4。复制大文件时建议先使用 `.part` 临时后缀，复制完成后再改名为正式扩展名，避免客户端读取未写完的视频。

## 常见问题

页面显示等待直播：

- 确认 OBS 已点击“开始直播”。
- 确认 OBS 服务器地址和串流密钥填写正确。
- 等待几秒让 HLS 分片生成。
- 查看 `docker compose logs media`。

OBS 无法连接：

- 检查云服务器安全组是否开放 `1935/tcp`。
- 检查服务器是否运行 `docker compose ps`。
- 确认服务器地址是 `rtmp://<server-ip>:1935/live`。
- 确认串流密钥与 `.env` 中的 `LIVE_STREAM_KEY` 一致。

有画面无声音：

- 确认 OBS 音频编码为 AAC。
- 确认 OBS 混音器有音频输入。

点播无法拖动：

- 用浏览器网络面板确认媒体请求返回 `206 Partial Content`。
- 优先换成 H.264 + AAC 的 MP4。

## 频道与状态

`.env` 中：

- `LIVE_STREAM_KEY`：默认频道 ID。
- `LIVE_TITLE`：页面显示的比赛名。
- `LIVE_SPORT`：体育项目。
- `LIVE_VENUE`：场地。

RTMP 应用固定为 `live`。其他合法流名推流后也会自动进入直播列表。直播状态来自 SRS；接口查询失败时显示未知状态，不伪装为停播。

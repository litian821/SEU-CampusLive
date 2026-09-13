# 测试与验收

## 自动检查

项目根目录常用命令：

```bash
make check
make config
make test-api
make test-web
make test
```

`make test` 汇总 API 测试、Web 类型/单元测试和 Compose 配置验证。修改 Docker 或部署配置后至少运行 `make config`；修改直播或点播链路后还要运行媒体链路测试。

## 本地直播验收

1. 执行 `docker compose up --build -d`。
2. 确认 `docker compose ps` 中 `api`、`web`、`media`、`gateway` 均为 healthy。
3. OBS 服务器填写 `rtmp://127.0.0.1:1935/live`，串流密钥填写 `demo`。
4. 打开 `http://127.0.0.1:8080/live/demo`。
5. 页面应在几秒后播放直播；停止推流后应显示可理解的等待或错误状态。
6. 检查 HLS 分片没有进入 Git。

## 云服务器直播验收

1. 云服务器安全组开放 `80/tcp` 和 `1935/tcp`。
2. 云服务器执行 `docker compose up --build -d --wait --wait-timeout 180`。
3. 浏览器打开 `http://<server-ip>/`，确认首页可访问。
4. OBS 服务器填写 `rtmp://<server-ip>:1935/live`，串流密钥填写 `demo`。
5. 打开 `http://<server-ip>/live/demo`，等待 HLS 分片生成后确认画面播放。
6. 用至少 3-5 台设备同时观看，观察卡顿、延迟和服务器资源。

## 点播验收

1. 把一个 H.264/AAC MP4 放入 `storage/vod/`。
2. `/vod` 能显示文件，点入详情后能播放、暂停和拖动。
3. 执行 Range 请求检查，响应应为 `206`：

```bash
curl -I -H 'Range: bytes=0-1023' http://127.0.0.1:8080/media/vod/<file>
```

4. `git status --short` 不应显示媒体文件和运行数据。

## 照片验收

1. 使用 `scripts/import-photos.py` 将照片导入指定相册。
2. 打开 `/moments`，确认相册、照片列表和放大预览正常。
3. 验证 Escape 关闭预览，方向键切换照片。
4. 确认照片原图不提交到 Git。

## 真实媒体链路测试

在 WSL/Linux 项目根目录执行：

```bash
make test-media
```

脚本使用 SRS 镜像自带 FFmpeg 生成 20 秒 H.264/AAC 测试片，验证：

- 含百分号和中文的文件名。
- 点播详情接口。
- Range `206`。
- RTMP 推流。
- SRS 开播状态发现。
- HLS 播放列表和分片。
- 音视频解码。
- 停止推流后的目录状态恢复。

使用 `KEEP_TEST_VIDEO=1 make test-media` 可保留合成测试片供浏览器验收。

## 浏览器自动检查

先保留合成测试片，再运行浏览器测试：

```bash
KEEP_TEST_VIDEO=1 make test-media
cd tests/browser
npm ci
npx playwright install --with-deps chromium
npm test
```

可选环境变量：

- `BROWSER_CHANNEL=msedge`：使用本机 Microsoft Edge。
- `BASE_URL=http://127.0.0.1:<port>`：服务不在默认端口时指定地址。
- `LIVE_TEST_ID=<stream-key>`：对当前正在推流的频道增加 HLS 恢复和播放进度检查。
- `SCREENSHOT_DIR=<path>`：将截图保存到 Git 外目录。

浏览器测试会覆盖点播播放、暂停、拖动、缺失视频、未知页面、手机布局和未捕获页面异常。自动播放受浏览器策略限制，不能把单元测试当成真实直播验收。

## 当前验证记录

截至 2026-09-13，本地和云服务器主要链路已完成验证，具体边界见 [2026-09-13 验收记录](validation-2026-09-13.md)。课堂交付前仍需完成 OBS 真实视频源推流和多设备观看测试。

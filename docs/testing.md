# 测试与验收

## 自动检查

```bash
make check
make config
make test-api
make test-web
```

`make test` 汇总 API 测试、Web 类型/单元测试和 Compose 配置验证。

## 直播验收

1. `docker compose up --build -d` 后所有服务健康。
2. OBS 向 `rtmp://localhost:1935/live`、密钥 `demo` 推流。
3. `/live` 显示直播项目，`/live/demo` 可播放且停止推流后给出可理解的错误状态。
4. 检查 HLS 播放列表和分片没有进入 Git。

## 点播验收

1. 把一个 H.264/AAC MP4 放入 `storage/vod/`。
2. `/vod` 能显示文件，点入详情后能播放、暂停和拖动。
3. 执行 `curl -I -H 'Range: bytes=0-1023' http://localhost:8080/media/vod/<file>`，响应应为 `206`。
4. `git status --short` 不显示媒体文件和运行数据。

## 回归检查

- `make test` 会重新构建测试镜像，包含 API 单元测试、Vitest Vue 3 组件测试、类型检查、生产构建与 Compose 配置验证。
- `docker compose up --build --wait --wait-timeout 120` 等待四个服务健康，再运行 `make smoke`。自定义 Web 端口时执行 `BASE_URL=http://127.0.0.1:<port> make smoke`。
- GitHub Actions 工作流已配置，但在未连接 GitHub 之前只能在本地执行等价检查，不能声称远程 CI 已通过。
- 浏览器验收：未开播频道显示“尚未开播”；打开播放页再推流，等待自动重连；停止再恢复推流后重新播放；点播搜索、缺失详情、中文/百分号文件名、播放/暂停/拖动都应可用。
- 自动播放受浏览器策略约束，播放页需要用户点击播放。单元测试使用媒体接口替身，不能代替真实媒体链路验收。

## 可重复的真实媒体链路验收

在 WSL/Linux 项目根目录执行 `make test-media`。脚本使用 Compose 中同一 SRS 镜像自带的 FFmpeg 生成 20 秒 H.264/AAC 测试片，验证含百分号的文件名、详情接口、Range 206、RTMP 推流、真实开播状态、HLS 分片与音视频解码，以及停止推流后的目录更新。使用随机频道名和临时容器，退出时只清理本次创建的容器和点播测试文件。HLS 临时文件由 SRS 清理且被 Git 忽略。`KEEP_TEST_VIDEO=1 make test-media` 保留合成测试片供浏览器验收。

## 浏览器自动检查

先执行 `KEEP_TEST_VIDEO=1 make test-media` 保留合成测试片，再运行：

```bash
cd tests/browser
npm ci
npx playwright install --with-deps chromium
npm test
```

测试真实播放、暂停、拖动及继续播放，缺失视频、未知页面、手机布局和未捕获页面异常。已安装 Microsoft Edge 时可设置 `BROWSER_CHANNEL=msedge`；服务不在默认端口时设置 `BASE_URL`。设置 `LIVE_TEST_ID` 为当前正在推流的测试频道，会额外验证首次 HLS 404 后自动恢复和实际播放进度；不会替你启动或停止 OBS。可设置 `SCREENSHOT_DIR` 为 Git 外的输出目录保存截图。

本轮实际结果与未验证范围见 [2026-09-13 验收记录](validation-2026-09-13.md)。

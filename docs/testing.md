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

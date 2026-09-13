# Campus Live 东大主场客户端与赛场瞬间

## 客户端

前端现使用 Vue 3、Vue Router、TypeScript、Vite 与 hls.js。首页、直播列表、直播详情、点播列表、点播详情、赛场瞬间均接入真实 API。首页优先显示正在直播的频道；没有直播时展示待开播频道及明确状态，不展示示例比分或示例日程。点播按真实标题排列，不虚构发布日期或时长，详情页从媒体元数据获取时长。

默认频道：`demo`；比赛名称：`院系杯 · 网络空间安全学院 vs 电子科学与工程学院`。可在 `.env` 使用 `LIVE_TITLE`、`LIVE_SPORT`、`LIVE_VENUE` 和 `LIVE_STREAM_KEY` 修改。封面和参赛方的可选编辑信息集中在 `apps/web/src/domain/media.ts`，仅在比赛标题匹配时应用，不给其他频道套用这场比赛的信息。

## 赛场瞬间

网页入口：`/moments`。按比赛选择相册；点击照片放大，支持 Escape 关闭、方向键切换以及焦点恢复。只有一张照片时不显示多余的翻页按钮。照片读取失败使用统一占位或明确错误提示。

```text
storage/photos/                   # 内容被 Git 忽略
  院系杯 · 网安 vs 电子/            # 目录名称就是相册名称
    篮下对抗.jpg                   # 文件名就是照片标题
    终场合影.png
```

在项目根目录执行：

```bash
python3 scripts/import-photos.py --album '院系杯 · 网络空间安全学院 vs 电子科学与工程学院' /path/to/photo.jpg
```

支持多个路径、JPEG/PNG/WebP，单张不超过 25 MB；先写临时文件，再原子发布。同名文件会被拒绝，避免覆盖。相册无需重建镜像，网页点击“刷新相册”即可看到新增照片。仅导入团队有权展示的照片。当前为可信局域网 MVP，通过维护脚本导入，不开放匿名 Web 上传。

API `GET /api/photos` 返回比赛相册及照片列表。FastAPI 只读索引；Nginx `/media/photos/` 提供原图，拒绝隐藏文件、其他扩展名和符号链接，增加 nosniff 响应头。API 同样过滤隐藏文件、临时文件、空文件、符号链接、超大文件及文件头不符的图片。照片按文件名排列，不将文件修改时间冒充拍摄日期。

用户提供的原始照片保存在相册中，不进入 Git。首页和比赛封面使用 `apps/web/public/brand/seu-basketball.png`，这是该照片的 AI 辅助调色版本，作为明确命名的产品素材入库。调色提示词和来源说明位于 `docs/design/campus-live-v1/assets/README.md`。学校大礼堂图案为原创线稿，颜色为产品自定义松青与暖金。

## 维护与验证

```bash
docker compose run --build --rm api-test
docker compose run --build --rm web-build npm run check
docker compose up --build --wait --wait-timeout 120
make smoke
KEEP_TEST_VIDEO=1 make test-media
```

本地开发：`cd apps/web && npm ci && npm run dev`。`npm run lint`、`npm run typecheck`、`npm test`、`npm run build` 可分别执行。使用满足依赖要求的 Node 22.22.2+ 或 Node 24.15+；团队也可以统一使用 Docker，无需本机安装 Node。VS Code 推荐 Vue - Official。

HLS 播放优先 MSE；保留原生 HLS 后备、5–30 秒断流退避重连、最多两次媒体恢复、页面离开清理计时器与实例。点播使用原生 controls，不改变 Range 服务与特殊文件名编码规则。

真实媒体验收使用合成测试图与音频，不代表院系杯正在举行。FFmpeg 自动推流验收与 Windows OBS 人工推流验收分别记录，不能混称。

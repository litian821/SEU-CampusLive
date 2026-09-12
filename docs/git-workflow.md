# Git 协作流程

`main` 始终保持可运行。开发者从最新 `main` 创建短生命周期分支：

```bash
git switch main
git pull --ff-only
git switch -c feature/live-status
```

提交使用 Conventional Commits，例如：

- `feat: show live stream status`
- `fix: preserve video range responses`
- `docs: document OBS encoder settings`
- `test: cover empty vod catalog`
- `chore: pin media server image`

推送后通过 GitHub pull request 合并。PR 必须说明用户可见行为、架构影响、测试命令和结果。禁止提交 `.env`、媒体、日志、数据库和依赖目录。

本仓库初始提交使用仓库本地占位身份 `Codex <codex@local.invalid>`。团队成员首次提交前应配置自己的 Git 身份：

```bash
git config user.name "Your Name"
git config user.email "you@example.com"
```

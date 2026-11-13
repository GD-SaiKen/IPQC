# proposals — 方案文档目录

把原始方案/需求文档以 Markdown 形式放在本目录（如 `proposals/xxx.md`），推送到 `main` 分支后，
`auto-plan` 会阅读文档、生成方案评论，并接着自动开发。

直接新建 Issue 也会开始开发，不必打 `proposal` 标签。

**与 SDD 的关系**：审核通过、准备落地时，应将可验收的「规格 + 实施计划」成对写入 `docs/SDD/规格文档/` 与 `docs/SDD/实施计划/`（命名 `YY-MM-DD 主题.md`）。`proposals/` 保留原始输入；`docs/SDD/` 为增量交付的权威口径。

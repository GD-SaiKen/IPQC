# proposals — 方案文档目录

把原始方案/需求文档以 Markdown 形式放在本目录（如 `proposals/xxx.md`），推送到 `main` 分支后，
`auto-plan` 工作流会自动阅读文档、生成结构化开发方案，并创建对应的 Issue 供人工审核。

也可以直接新建 Issue 并打上 `proposal` 标签，效果相同。

**与 SDD 的关系**：审核通过、准备落地时，应将可验收的「规格 + 实施计划」成对写入 `docs/SDD/规格文档/` 与 `docs/SDD/实施计划/`（命名 `YY-MM-DD 主题.md`）。`proposals/` 保留原始输入；`docs/SDD/` 为增量交付的权威口径。

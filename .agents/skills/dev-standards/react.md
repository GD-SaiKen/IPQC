# 前端规范 — React

函数组件 + Hooks；类组件仅维护遗留代码时沿用，新代码不写 class。

## 1. 技术栈

- TypeScript；扩展名 `.tsx` / `.ts`。
- 构建以项目为准（Vite、Next.js、CRA 等），不擅自换脚手架。
- 路由、状态（Redux、Zustand、React Query 等）遵循仓库已有选型。

## 2. 目录（参考）

```text
src/
├── api/
├── components/
├── hooks/
├── pages/ 或 app/   # 视框架而定
├── types/
└── utils/
```

## 3. 组件约定

- 一个文件默认导出一个主要组件；文件名 PascalCase 或与团队 kebab 约定一致（跟仓库现有文件）。
- Props 用 interface / type 声明；避免 `any`。
- 列表渲染稳定 `key`（不用随机数）。
- 副作用：`useEffect` 依赖数组完整；清理函数在卸载时执行。

## 4. 数据与错误

- 服务端状态优先用项目已有的 data-fetch 层（React Query、SWR 等），避免在多个组件重复请求。
- 加载 / 错误 / 空态三态显式 UI，不静默失败。
- 若未统一 data-fetch 封装，axios 仍按 [http-client.md](http-client.md)：`utils/request.ts` + `api/<module>.ts`，消息提示走 feedback 适配（Ant Design、MUI 等各自实现 `setFeedbackAdapter`）。

## 5. 样式

- 与项目一致：CSS Modules、Tailwind、styled-components 等，不混用多种方案于同一功能模块。

## 6. 验证

**默认用 pnpm** 执行 `package.json` 里已有的脚本（`pnpm run <script>`；常见为 `lint`、`test`、`build`）；仅当项目已明确选用 npm、yarn 或 bun 时跟随该项目。

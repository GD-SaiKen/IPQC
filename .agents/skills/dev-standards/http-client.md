# 前端网络请求规范（axios）

适用于 Vue 2/3、React 等 TypeScript 前端；与具体页面框架无关。**响应信封、动词与分页 `data` 以 [SKILL.md](SKILL.md)「前后端统一约定」为准**（仓库 `docs/SDD`、`docs/项目-业务约定.md` 可收窄路由与文案）。本节只规定前端如何分层、发请求、解包。Flutter / Dart 版的分层与信封解包见 [flutter.md](flutter.md) §6，职责划分与本节一致。

## 1. 分层职责

| 层级 | 路径 | 职责 |
|------|------|------|
| **反馈（可选）** | `src/utils/feedback.ts` + `src/utils/feedback-*.ts` | 错误/成功**消息提示**、确认框；**不**发 HTTP |
| **传输** | `src/utils/request.ts` | 单一 axios 实例、拦截器、鉴权、统一解包、重试/刷新令牌（若项目需要） |
| **业务 API** | 默认 `src/api/<module-kebab>.ts`；变大后 `src/api/<module-kebab>/index.ts`（§4.1） | 路径常量、按模块导出**具名函数**；**禁止**在 views/components 里拼 URL |
| **类型** | 跨模块：`src/types/<domain>.ts`；仅本模块：目录内 `types.ts` | 请求参数、响应体；API 函数返回 `Promise<T>` |
| **聚合** | `src/api/index.ts` | `export * from './auth'` 等，供 `@/api` 统一导入 |

约定：

- 页面、组件只调用 `src/api` 或 composable；**不**直接 `import axios`（导出 Excel、blob 等例外可封装在 `request` 上）。
- `request.ts` **不得**直接 `import` Element UI / Element Plus / Naive UI；错误提示走 **feedback 适配层**（见 §5）。
- 项目特有的请求体清洗、单接口 hack **放在拦截器或该模块 API 函数内**，不要写进本 skill 的通用模板。

## 2. RESTful 与 HTTP 动词

与仓库 `AGENTS.md`、后端 Nest 控制器一致：**资源路径 + 标准动词**，避免在新接口上堆 RPC 风格（`POST /getUserList`）。

| 操作 | 方法 | URL 形态 | 请求体 / 查询 |
|------|------|----------|----------------|
| 列表、查询 | `GET` | `/api/<resources>` | `params`（查询字符串） |
| 详情 | `GET` | `/api/<resources>/:id` | — |
| 创建 | `POST` | `/api/<resources>` | JSON body |
| 全量更新 | `PUT` | `/api/<resources>/:id` | JSON body |
| 部分更新 | `PATCH` | `/api/<resources>/:id` | JSON body |
| 删除单条 | `DELETE` | `/api/<resources>/:id` | — |
| 批量删除 | `DELETE` | `/api/<resources>` | `params` 或 body（与后端约定一致） |
| 文件上传 | `POST` | 约定路径 | `FormData`；`Content-Type: multipart/form-data` |
| 文件下载 | `GET` 或 `POST` | 约定路径 | `responseType: 'blob'`；在 `request` 封装 `download` / `exportExcel` |

命名：

- 路径片段：**kebab-case** 或仓库已有风格；JSON 字段 **camelCase**（见 [engineering.md](engineering.md) §1）。
- 模块内路径常量：`export const AUTH_API = { LOGIN: '/admin/auth/login', ... }` 或 `export const ORDER_API = { LIST: '/admin/orders' }`（**UPPER_SNAKE** 对象名 + 字符串值）。

非 REST 的遗留接口（登录、刷新、captcha、同步任务等）保留在对应 `api` 模块，**新功能优先 REST**。

## 3. `request.ts`（TypeScript）

### 3.1 对外 API

封装类或工厂，暴露与 HTTP 动词一致的方法（小写即可）：

- `get(url, params?, config?)`
- `post(url, data?, config?)`
- `put(url, data?, config?)`
- `patch(url, data?, config?)`
- `delete(url, config?)`
- `upload(url, formData, config?)`（可选）
- `download` / `exportExcel`（blob，可选）

`config` 为 axios 的 `AxiosRequestConfig`，并扩展 **`requestOptions`**（见下）。

### 3.2 `requestOptions`

通过 `config.requestOptions` 传递，**不要**把 `showError` 等扁平挂在 config 根上（避免与 axios 字段混淆）：

```typescript
export interface RequestOptions {
  /** 成功时是否自动提示，默认 true */
  showSuccess?: boolean;
  /** 成功提示文案。有值时优先于响应里的 message */
  successMessage?: string;
  /** 失败时是否自动提示，默认 true */
  showError?: boolean;
  /** 失败提示文案。有值时优先于响应里的 message / msg */
  errorMessage?: string;
  /** 不附带 Authorization */
  skipAuth?: boolean;
  /** 401 时不走 refresh 队列 */
  skipRefresh?: boolean;
  /**
   * 401 时是否按「会话失效」清理并跳登录，默认 true。
   * 登录接口传 false，避免错密时触发 logout 副作用。
   */
  sessionExpiredOn401?: boolean;
  /** 解包后仍返回完整 AxiosResponse */
  returnFullResponse?: boolean;
}
```

调用示例：

```typescript
return request.get(ORDER_API.LIST, params, {
  requestOptions: { errorMessage: '订单列表加载失败' },
});
```

**兼容**：遗留代码可能把 `showError` 写在 config 根上；`request` 实现可在入参处归一化为 `requestOptions`（新写的 `api` 模块不要再使用根级 `showError`）。

### 3.3 拦截器（通用）

1. **请求**：`baseURL`、`timeout`、`withCredentials` 从环境变量读取（Vite：`import.meta.env.VITE_*`）；按需附加 `Authorization`；`params` / `data`（非 `FormData`）与后端约定一致时做 key 规范化（如 camelCase）。
2. **响应成功**：body 为 [SKILL.md](SKILL.md) 规定的 `{ code, data, msg, message }`。`code === 200` 时默认返回 **`data`**；`returnFullResponse` 为真时返回整包 Axios 响应。`showSuccess !== false` 时提示，文案优先级为 `successMessage` → `message` → `msg` → `操作成功`。
3. **响应失败**：`showError !== false` 时提示，文案优先级为 `errorMessage` → `message` → `msg` → `请求失败`。然后 `reject`（附带 `message`、`msg`、`code`）。页面继续 `await` 即可，失败后的语句不会执行；不必为了弹出错误再写 `try/catch`。需要失败后仍收尾时用 `finally`。
4. **401 + 会话失效**：`sessionExpiredOn401 !== false` 时清理登录态并跳登录页；**登录请求**须传 `sessionExpiredOn401: false`（见 [login-page.md](login-page.md)）。
5. **401 + 刷新令牌**：可选；刷新队列、`skipRefresh`、登出跳转留在项目 `request.ts`，不写死到所有仓库。

### 3.4 类型扩展示例

```typescript
import type { AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';

export interface RequestConfig extends AxiosRequestConfig {
  requestOptions?: RequestOptions;
}

declare module 'axios' {
  export interface AxiosRequestConfig {
    requestOptions?: RequestOptions;
  }
}
```

## 4. `src/api` 模块约定

### 4.1 单文件还是目录

**默认单文件**，不要为每个模块先建目录。

| 形态 | 何时用 | 路径 |
|------|--------|------|
| **单文件（默认）** | 同一业务域接口不多（大约 15 个以内），文件大约 200 行以内，类型可放在 `src/types` 或同文件 `export type` | `src/api/<module-kebab>.ts` |
| **目录** | 同一文件继续加接口会混进多段拼装、归一化，或出现**只被本模块使用**的类型 | `src/api/<module-kebab>/` |

目录只在变大之后拆，不预先拆。拆开后对外入口仍是该目录：

```text
src/api/<module-kebab>/
├── index.ts       # 路径常量 + 请求函数；re-export 本模块类型
├── types.ts       # 仅本模块的请求/响应类型
└── <helper>.ts    # 可选：纯函数（拼 query、字段清洗），不含 axios
```

- 页面、其它模块从 `@/api` 或 `@/api/<module-kebab>` 导入，**不**深入 `types.ts` / helper（`index.ts` 再导出需要公开的类型）。
- 多个页面、多个 API 模块共用的类型仍放 `src/types/<domain>.ts`，不要在每个 API 目录复制一份。
- `src/api/index.ts` 对单文件写 `export * from './auth'`，对目录写 `export * from './order'`（指向该目录的 `index.ts`）。

### 4.2 函数还是 class

**默认具名函数**，一个 HTTP 调用对应一个函数。

- 调用方写 `getOrderList(params)`，便于按名 mock、按名 tree-shake，也没有 `this`。
- **不用** `class OrderApi` 把一组无状态请求包起来；也不要再包一层 `orderApi.getXxx` 对象，除非该仓库已经统一用对象导出且只是保持一致。
- **class（或 `createXxx` 工厂）只用于有实例状态或可配置基座**：例如 `CrudApi` 的缓存、字段白名单、`base` 路径。普通「一个 URL 一次请求」不要为了面向对象改成 class。
- class 的公开方法仍对应 REST 动词（`getList` / `post` / `patch` / `put` / `delete`），URL 拼装留在 class 内部，页面不拼路径。

每个模块（单文件或 `index.ts`）固定三件事：

1. `import { request } from '@/utils/request'`（或 `@/utils` 统一导出）
2. 导出路径常量对象
3. 导出命名函数，`async` 可选；返回类型显式标注（与类型对齐）

**不在 API 层**做 UI 提示（除非该函数文档写明会触发全局 feedback，且仅通过 `requestOptions.showError` 控制）。

列表/CRUD 若多资源共用同一套字段过滤与缓存，用项目内 `createCrudApi` 一类工厂；新仓库按 SDD 决定是否引入。没有这份共享行为时，继续写函数。

示例（TypeScript）：

```typescript
import { request } from '@/utils/request';

import type { OrderListQuery, OrderListResponse } from '@/types/order';

export const ORDER_API = {
  LIST: '/admin/orders',
} as const;

export function getOrderList(params: OrderListQuery = {}) {
  return request.get<OrderListResponse>(ORDER_API.LIST, params, {
    requestOptions: { showError: true },
  });
}
```

`src/api/index.ts` 只做 re-export，不写业务逻辑。

## 5. 消息提示与 UI 解耦

**问题**：`request.ts` 若直接依赖 `ElMessage` / `Message`，非 Element 项目无法复用，单测也难以 mock。

**做法**：独立 **feedback 门面** + **按栈适配**。

### 5.1 门面（`src/utils/feedback.ts`）

定义最小接口，默认 no-op 或 `console`：

```typescript
export interface FeedbackAdapter {
  msgError(message: string): void;
  msgSuccess?(message: string): void;
  msgWarning?(message: string): void;
  confirm?(options: { title: string; message: string }): Promise<void>;
}

let adapter: FeedbackAdapter = {
  msgError(message) {
    console.error('[feedback]', message);
  },
};

export function setFeedbackAdapter(next: FeedbackAdapter) {
  adapter = next;
}

export function msgError(message: string) {
  adapter.msgError(message);
}
```

`request.ts` 只 `import { msgError } from './feedback'`。

### 5.2 适配实现（在 `main.ts` 注入一次）

| 项目 UI | 适配文件示例 | 注入时机 |
|---------|----------------|----------|
| Element Plus（Vue 3） | `feedback-element-plus.ts` | `createApp` 后、`setFeedbackAdapter` |
| Element UI 2（Vue 2） | `feedback-element-ui.ts` | `new Vue` 前 |
| Naive UI | `feedback-naive.ts` | 同上 |
| Vant 4（Vue 3 移动 H5） | `feedback-vant.ts`（`showToast` / `showDialog`） | `createApp` 后、`setFeedbackAdapter`；壳层见 [vant.md](vant.md) |
| 无 UI 库 / Storybook | 默认 `feedback.ts` 或 console | 可不注入 |

`notice-message.ts` 一类文件：对外保留 `msg` / `msgError` / `notice` / `msgBox` 等**业务友好 API**，内部转调 `FeedbackAdapter` 或对应 UI；**不要**在 `request.ts` 里再 import Element。

登出确认框（如 token 失效）属于 **auth 流程**：优先在 `request` 的 auth 模块通过 `confirm` 回调或注入的 `onSessionExpired`，避免在通用 feedback 里写死路由路径。

## 6. 页面侧用法

- 需要**静默失败**（轮询、预检）：`requestOptions: { showError: false }`，页面自行处理空态/错误。
- 并发请求：用请求序号或 `AbortController` 忽略过期响应（见业务页实现模式）。
- 成功提示：默认**不**在 `request` 全局弹成功；由操作按钮所在页面 `msgSuccess`（通过 feedback 门面）。

## 7. 验证

包管理器**默认 pnpm**；仅当当前包的 `package.json`（`packageManager` 字段、锁文件或 README 已有安装方式）明确使用 npm、yarn、bun 时跟随该项目。只执行 `scripts` 里实际存在的脚本。

- 单测：mock `@/utils/request` 或 axios adapter，测 `api` 函数是否拼对 URL/方法。
- 集成：若 `scripts` 中有 `lint`、`build`，用当前包管理器跑它们；关键路径手测错误提示是否来自当前 UI 栈。

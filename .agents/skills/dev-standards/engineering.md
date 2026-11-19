# 工程规范（全栈通用）

适用于各语言的工程约定；与具体 UI 框架无关。下文用 TypeScript、Python 举例，规则本身不绑死某一种后缀。

## 1. 命名

### 文件

- 新增英文技术文件：**kebab-case**（如 `user-import.service.ts`、`order-form.vue`）。Go 源文件用 **snake_case**，见 [go.md](go.md)。
- **Dart / Flutter 例外**：源文件与包名用 **snake_case**（语言官方风格，lint 强制；见 [flutter.md](flutter.md) §2）。
- 规格与中文文档：中文文件名。增量交付推荐 **`docs/SDD/规格文档/`** + **`docs/SDD/实施计划/`**（成对、同日期主题）；写法见 [sdd.md](sdd.md)。长期方案仍可放 `docs/design/` 等仓库已有目录。

### Vue 单文件组件（路径）

| 类型 | 约定 |
|------|------|
| **新建**业务组件 | 目录 `components/<feature-kebab>/`，主文件 `<feature-kebab>.vue` |
| **新建**路由页面 | 目录 `views/<page-kebab>/`，入口 **`index.vue`**；同目录附属文件亦 kebab-case |
| 组件 / 页面私有 TS | 与对应 SFC **同目录**，不堆在 `components` / `views` 根下 |
| **新建**任意单测 | `src/__test__/…`，目录镜像 `src/`（`components/`、`views/`、`stores/` 等）；见 [vue3.md](vue3.md) §3.3 |
| 遗留 `PascalCase.vue` | 允许存在；新功能优先 kebab 目录，不强制批量迁移 |

SFC 块顺序：`template` → `script` → `style`（Vue 2 / Vue 3 相同，见各栈文档）。

### 代码

- 变量、函数：**camelCase**
- 类、组件、实体：**PascalCase**
- 常量：**UPPER_SNAKE_CASE**（Dart 例外：按 Effective Dart 用 lowerCamelCase、不加 `k` 前缀，见 [flutter.md](flutter.md) §2）

### API 与数据库

- JSON 字段：**camelCase**
- 表名、列名：**snake_case**
- ORM 模型 / Entity：类 **PascalCase**，属性 **camelCase**，列映射 **snake_case**
- 前后端响应信封与分页 `data` 以 [SKILL.md](SKILL.md)「前后端统一约定」为准；后端分层见 [backend.md](backend.md)

### 前端 HTTP（axios）

- 传输层：`src/utils/request.ts`；业务 URL 与动词：`src/api/<module-kebab>.ts`；REST 与 `requestOptions` 约定见 [http-client.md](http-client.md)。
- `request` 不依赖具体 UI 库；错误提示经 `feedback` 适配在入口注入。

## 2. 目录导出与引用

一个目录对外只留**一个入口文件**，由该语言的惯例命名，不另造名字：

| 语言 | 入口文件 |
|------|----------|
| TypeScript / JavaScript | `index.ts`（或该目录已有的 `index.js`） |
| Python | `__init__.py` |
| Dart | 同名 barrel 文件（如 `user.dart` 内 `export 'src/…'`），引用写到目录为止；Flutter 项目结构见 [flutter.md](flutter.md) §3 |
| 其它 | 用该语言的包入口；没有包入口惯例时，仍用一个文件再导出本目录要公开的名字 |

入口只重新导出本目录允许外面使用的名字。外面引用这个目录时，写到目录为止，不写入口文件名，也不写源文件后缀。

```text
# TypeScript：解析到 user/index.ts
import { UserService } from '../modules/user'

# Python：解析到 user/__init__.py
from app.modules.user import UserService
```

同一目录里的文件互相引用用**相对路径**，同样省略语言允许省略的后缀（`.ts`、`.js`、`.mjs` 等）。不要绕出去再从本目录的入口导回来，避免循环依赖。

```text
# user.service.ts 引用同目录文件
import { CreateUserDto } from './dto/create-user.dto'

# user_service.py 引用同目录模块
from .dto import CreateUserDto
```

目录外不要深入入口没有导出的内部文件。只有该目录还没有入口、且整个目录只有一个文件时，可以直接引用那个文件（仍然不写后缀）。

## 3. Import 顺序

TypeScript 文件分组，组间空一行：

1. 类型导入
2. Node / 浏览器内置
3. 第三方库
4. 项目别名 / 跨包
5. 相对路径
6. 样式

## 4. 注释

默认中文。写业务含义、边界和规格出处。类型已经写在签名里时，标签里的类型与签名一致，说明写在破折号后面。

TypeScript / JavaScript 用块注释 `/** */`。Python 没有这种块注释，`/** */` 会语法错误；同一套标签写在三引号文档字符串里，标签名保持一致。行注释和 region 仍用该语言的行注释。

### 4.1 文件

放在文件最上方。标签顺序固定：`@file`、`@description`、`@author`、`@date`。`@date` 用 `YYYY-MM-DD`。纯转发、没有业务语义的文件可以不写。

```typescript
/**
 * @file 用户相关接口模块
 * @description 用户登录、信息查询、修改资料
 * @author 作者
 * @date 2026-10-22
 */
```

```python
"""
@file 用户相关接口模块
@description 用户登录、信息查询、修改资料
@author 作者
@date 2026-10-22
"""
```

### 4.2 模块

目录入口或一组对外类型，用 `@module` 说明这组符号一起提供什么。

```typescript
/**
 * @module 用户列表查询条件
 * @description 分页字段来自 PageQueryDto，此处只加筛选
 */
export class FindUserQueryDto extends PageQueryDto {}
```

### 4.3 函数

写在函数上方。第一行是功能说明。每个参数一条 `@param`，可选参数写成 `[name=默认值]`。有返回值写 `@returns`。会抛出的业务错误写 `@throws`。公式在说明里写清，并注明规格位置。

```typescript
/**
 * 获取用户详情
 * @param {number} userId - 用户 ID
 * @returns {Promise<User>} 用户信息
 */
async function getUserInfo(userId: number): Promise<User> {
  // ...
}

/**
 * 分页查询列表
 * @param {number} page - 页码，从 1 开始
 * @param {number} [size=10] - 每页条数，默认 10，最大 100
 * @throws {Error} 参数非法时报错
 */
function getList(page: number, size: number = 10) {}

/**
 * 完成率 = 已填行数 / 有效行数。有效行数不含已软删行。
 * 见 docs/SDD/规格文档/<本期>.md 对应章节。
 * @param {number} filled - 已填行数
 * @param {number} valid - 有效行数
 * @returns {number} 0 到 1；有效行数为 0 时返回 0
 */
export function completionRate(filled: number, valid: number): number {
  return valid === 0 ? 0 : filled / valid
}
```

```python
def get_list(page: int, size: int = 10):
    """
    分页查询列表
    @param {int} page - 页码，从 1 开始
    @param {int} [size=10] - 每页条数，默认 10，最大 100
    @throws {ValueError} 参数非法时报错
    """
```

### 4.4 行

只标在那一行旁边，解释一个不明显的取值、单位或边界。

```typescript
const pageSize = 10 // 与分页约定的默认每页条数一致，上限 100
```

```python
skip = (page - 1) * page_size  # page 从 1 开始
```

### 4.5 可折叠区块

一段里有多个函数、多个方法或多组变量，放在一起才方便阅读时，用编辑器识别的 region 折起来。名称用中文，写出这一组在做什么。

region 包的是一组声明，不包单个函数、单个方法或单个变量。函数自己的说明仍写在该函数的 `/** */` 或文档字符串里。

TypeScript / JavaScript：

```typescript
// region 用户查询
/**
 * 获取用户详情
 * @param {number} userId - 用户 ID
 * @returns {Promise<User>} 用户信息
 */
async function getUserInfo(userId: number): Promise<User> {
  // ...
}

/**
 * 分页查询用户
 * @param {number} page - 页码，从 1 开始
 * @param {number} [size=10] - 每页条数
 * @returns {Promise<UserList>} 列表与总数
 */
async function getUserList(page: number, size: number = 10): Promise<UserList> {
  // ...
}
// endregion
```

Python：

```python
# region 用户查询
def get_user_info(user_id: int):
    """
    获取用户详情
    @param {int} user_id - 用户 ID
    @returns {User} 用户信息
    """

def get_user_list(page: int, size: int = 10):
    """
    分页查询用户
    @param {int} page - 页码，从 1 开始
    @param {int} [size=10] - 每页条数
    @returns {UserList} 列表与总数
    """
# endregion
```

region 成对出现，不要嵌套。不要用 region 把整个文件分成「导入 / 实现」这种空标题。

## 5. 文档与文案

- 文档、注释、提交信息、界面文案默认**中文**；API 机器可读 `code` 用英文。
- 业务行为以仓库规格为准：**优先 `docs/SDD/规格文档/`**（配套 `实施计划/`）；本 skill 只链接，不复制规格全文。见 [sdd.md](sdd.md)。
- 验收样本放 `docs/原材料/` 等非运行时目录，与生产数据源分离。

## 6. Git 提交

仓库根目录约定（如 `AGENTS.md`）优先于本节。仓库没有更细的分支约定时，按下述执行。不使用 release 分支。没有 `dev` 时不要擅自新建。

### 提交信息

```text
<type>(<scope>): <subject>
```

| type | 含义 |
|------|------|
| feat | 新功能 |
| fix | 修复 |
| docs | 文档 |
| refactor | 重构 |
| style | 格式/样式 |
| test | 测试 |
| chore | 工具/依赖/配置 |

`subject` 用中文一句话，写清「为什么」。例如：`feat(import): 解析清单并切换当前批次`。

- 一次提交只做一件事；先提交被依赖层（实体、服务），再页面。
- 只 `git add` 本次相关文件，避免 `git add -A` 混入无关修改。

### 分支

只保留一条开发线。`main` 是已上线位置，用 tag 标记版本，不靠来回合并制造发版提交。

**只有 `main`：** 所有开发都在 `main`。可以上线时，在当前提交打 tag，不另开分支。

**有 `dev`：** 日常只在 `dev` 上提交。`main` 永远是 `dev` 历史上的某个提交，只在用户明确发版、且 `dev` 顶端就是要上线的内容时，把 `main` 快进到该提交：

```bash
git switch main
git merge --ff-only origin/main
git merge --ff-only dev
```

快进不会产生新的合并提交，所以不用再把 `main` 合回 `dev`。发版边界看 tag，不看合并提交。

不能快进，说明有人在 `main` 上写过 `dev` 没有的提交。这时只做一次：把 `origin/main` 合并进 `dev`，冲突在本地解决，之后 `main` 继续只靠快进前移。

未完成的改动不要留在 `dev` 顶端，否则快进会把它们一起带上线。需要修已上线版本、但 `dev` 上已有不能上线的提交时，从当前 `main` 拉一个短修复分支，修完后快进 `main` 并打 tag，再把这个修复合并回 `dev` 一次，然后删掉该分支。这不是长期 release 分支。

共享的 `dev` / `main` 不要 rebase、不要 force push。同一改动不要 cherry-pick 成两份。

### 提交前同步

先确认当前就在开发线（只有 `main` 时是 `main`，有 `dev` 时是 `dev`）。未提交改动会被覆盖时，先收拾干净再同步。

```bash
git fetch origin
git merge --ff-only origin/<开发线>
```

不能快进说明本地和远端分叉：`git merge origin/<开发线>`，冲突在本地解决。确认文件里没有 `<<<<<<<`、`=======`、`>>>>>>>`，跑相关检查或测试，再写本次提交。

有 `dev` 时，只有 `git merge-base --is-ancestor origin/main HEAD` 失败才先把 `origin/main` 合并进 `dev`。正常情况下它应当一直成功，不必每次提交都合并 `main`。

推送只在明确要求时进行。远端拒绝时重新 fetch 并对齐，不要 force push。

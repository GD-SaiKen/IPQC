# Go 落地

先读 [SKILL.md](SKILL.md)「前后端统一约定」和 [backend.md](backend.md)。本节只说明 **Go** 如何落到文件。分层、业务载荷、软删与安全仍以 backend.md 为准。不要把 [nest.md](nest.md) 的 `modules/`、`__test__/`、装饰器套到 Go 上。

仓库里已经有 Go 目录时，新代码放进同一层的平行文件，不另起一套。下面的目录只用于还没有服务端布局的新模块。Web 框架以仓库为准（gin / echo / chi / 标准库 `net/http`），示例用 gin；**一个仓库只用一个框架**。

## 1. 技术栈与硬约束

- 以 `go.mod` 的 `go` 版本为准（建议 ≥ 1.21，`log/slog` 内置）；依赖集中在 `go.mod`，改动后跑 `go mod tidy`。
- 格式只信 **`gofmt` / `goimports`**，不手工排版、不争论缩进（tab）。
- 静态检查：`go vet ./...` 必跑；仓库配置了 `golangci-lint`（含 staticcheck）就一起跑，**不删规则**，豁免用 `//nolint:原因`。
- 业务失败用 `error`，**不用 panic**（初始化失败、不可能状态除外）；**不丢弃错误**（不写 `_, _ = f()`），要么处理要么上抛。
- 文件名全小写 **snake_case**（`user_handler.go`）；包名小写**单个单词**，不用下划线、连字符；路径里不加 kebab-case。这三条覆盖 [engineering.md](engineering.md) §1 的 kebab-case。

## 2. 和后端规范的对应

| [backend.md](backend.md) | Go |
|--------------------------|----|
| 接入层 | `internal/handler`：解析参数、鉴权标记、把领域结果写回响应 |
| 领域层 | `internal/<domain>`：校验、编排、事务边界、把冲突变成可识别的错误 |
| 数据访问层 | 需要替换实现时放 `internal/repository`；否则领域包里直接使用本模块的存储入口 |
| 入参 / 出参 | 请求与响应结构体（同包内 `dto` 或 `<domain>_dto.go`）。不在 handler 里组装信封 |
| 响应信封 | 全应用一个中间件。handler 只返回业务载荷或错误 |
| 模块装配 | `cmd/<app>/main.go` 与路由注册 |

## 3. 目录

```text
cmd/<app>/main.go            # 只做配置、依赖组装、优雅退出；不放业务
internal/
├── handler/
│   ├── user_handler.go      # 接入层
│   └── user_handler_test.go
├── user/                    # 领域层，包名单个单词
│   ├── user.go
│   ├── user_dto.go          # 仅本模块的请求/响应结构体
│   └── user_test.go
├── repository/              # 可选：需要替换实现时才建
│   └── user_repository.go
├── middleware/
│   ├── envelope.go          # 统一响应信封（见 §6）
│   ├── auth.go              # 鉴权（需要登录时）
│   └── logger.go            # 访问日志（脱敏）
├── model/                   # 跨模块复用的实体（GORM 模型等）
└── platform/                # 可选：数据库连接、外部系统客户端
migrations/
├── 0001_create_user.up.sql
└── 0001_create_user.down.sql
```

- 包名是路径最后一段：`internal/user`，不是 `internal/user_service`。**不用** `util` / `common` / `misc` / `base` 这类无信息包名。
- 导出的名字放包根；只被一个文件用的类型可以和实现同文件。别把一个包拆成十个小包再互相 import。
- `internal/` 以外不放业务实现（`internal` 是 Go 编译器强制的私有边界）。公开库才考虑 `pkg/`，应用仓库一般不需要。
- 没有 `index` 入口的概念。别的包只 import 包路径，不 import 到某个 `.go` 文件（对齐 [engineering.md](engineering.md) §2 的 Dart/Go 差异）。

## 4. 命名与语言细节（Effective Go + 官方 Code Review Comments 摘要）

| 对象 | 规则 | 例 |
|------|------|-----|
| 导出标识符 | UpperCamelCase（MixedCaps） | `UserRepository` |
| 包内标识符 | lowerCamelCase（mixedCaps） | `pageSize` |
| 非导出常量 | lowerCamelCase，**不是** `MAX_LENGTH` | `maxPageSize = 100` |
| 缩写词 | 保持一致大小写：`URL` / `url`，不写 `Url`；`appID` 不写 `appId` | `userID`、`ServeHTTP` |
| getter | 不加 `Get` 前缀 | `Owner()` / `SetOwner()` |
| 单方法接口 | 方法名 + `er` | `Reader`、`Validator` |
| 错误变量 | 哨兵以 `Err` 开头 | `ErrNotFound` |
| 错误类型 | 以 `Error` 结尾 | `ValidationError` |

- **接口属于使用方包**：在使用方定义需要的窄接口，实现方返回具体类型；不为 mock 提前抽象接口。
- `context.Context` 是业务函数的**第一个参数**；不存进 struct 字段，不自定义 Context 类型。
- 错误字符串小写开头、不加标点（`fmt.Errorf("user %d not found", id)`），便于嵌进日志。
- 包装错误用 `%w`，判断用 `errors.Is` / `errors.As`，不用字符串比对。
- 错误分支缩进、正常路径低缩进：

```go
if err != nil {
    return fmt.Errorf("create user: %w", err)
}
// 正常路径继续
```

- receiver 类型不混用：要么全值要么全指针（需要改 receiver、含 `sync.Mutex`、大结构体用指针）。
- 空切片用 `var items []User` 而非 `[]User{}`（需要 JSON 编码为 `[]` 而非 `null` 时例外）。
- 注释：导出声明的 doc comment **顶格**写在声明上一行、以标识符名开头、用中文（对齐 [engineering.md](engineering.md) §4；Go 不用 `@param` 标签，参数写在正文）：

```go
// GetUserList 返回分页用户列表。
// page 从 1 开始；pageSize 默认 10、上限 100，与 SKILL.md 分页约定一致。
func (s *UserService) GetUserList(ctx context.Context, q ListUserQuery) (PageData[User], error) {
```

## 5. Handler

handler 只做三件事：绑定与校验参数、调领域层、把结果交给信封中间件。不拼 SQL、不哈希密码、不做业务决策。

```go
func (h *UserHandler) Create(c *gin.Context) {
    var req CreateUserRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        c.Error(err)
        return
    }
    user, err := h.users.Create(c.Request.Context(), req)
    if err != nil {
        c.Error(err)
        return
    }
    c.JSON(http.StatusOK, user)
}
```

- 参数校验用 `binding:"required,max=64"` 标签（go-playground/validator）；校验失败 → 400 `bad_request`，`message` 写中文具体原因（「用户名已存在」「参数 name 不能为空」）。
- 业务函数第一个参数是 `context.Context`；handler 不自己造超时，由中间件或调用方设置。
- handler 方法不返回 `http.StatusInternalServerError` 手工拼 JSON；错误一律 `c.Error(err)` 交给统一中间件。
- 仓库里同类 handler 已有先例（直接返回结构体、字段 snake_case、分页 `offset`/`limit`）时，新接口跟随先例，不单独改成信封；**新服务没有先例时**用 §6 的中间件和 [SKILL.md](SKILL.md) 的 `data` 形状。

## 6. 响应信封（一个中间件，只包一次）

中间件在 `internal/middleware/envelope.go`，成功包信封、失败把领域错误写成失败信封，形状以 [SKILL.md](SKILL.md) 为准：

| 领域错误 | HTTP / `code` | `msg` |
|----------|---------------|-------|
| `ErrBadRequest` / 校验失败 | 400 | `bad_request` |
| `ErrUnauthorized` | 401 | `unauthorized` |
| `ErrForbidden` | 403 | `forbidden` |
| `ErrNotFound` | 404 | `not_found` |
| `ErrConflict`（唯一约束） | 409 | `conflict` |
| 其它（未预期） | 500 | `internal_error`；`message` 固定「服务器繁忙，请稍后重试」，堆栈只进日志 |

- 成功：handler 返回的业务载荷直接进 `data`；`code` 同 HTTP 状态；列表 `data` 是 `{ list, total, page, pageSize }`。
- `message` 中文给页面，`msg` 稳定英文标识给日志测试；日志去掉 `password`、`token`、`Authorization`、`Cookie`。
- 分页：`page` 从 1、`pageSize` 默认 10 上限 100；数据库侧换算 `offset = (page-1) * pageSize` 只发生在领域/存储层。

## 7. 领域层（Service）

- 校验、编排、事务边界在领域包；跨表写操作包在一个事务里，失败整体回滚。
- 唯一冲突映射成 `ErrConflict`，并在 `message` 里给中文文案；查询字段用白名单（显式 `SELECT` 列或 GORM `Select`），响应里不出现密码。
- 软删：删除默认置 `del_flag`，列表与详情查询排除已删行（规则见 [backend.md](backend.md)）。
- 部分更新：只保留非零/显式传入字段，一个可写字段都没有返回 `ErrBadRequest`。

## 8. 测试

测试是被测包旁边的 `*_test.go`，由 `go test` 收集。**不建** `__test__/`，也不写 `*.test.ts`。

| 被测 | 测试 |
|------|------|
| `internal/user/user.go` | `internal/user/user_test.go` |
| `internal/handler/user_handler.go` | `internal/handler/user_handler_test.go` |

- 测包内未导出行为用 `package user`（白盒）；只测导出 API 用 `package user_test`（黑盒）。一个包内不混用两种意图。
- **表驱动测试**是默认写法，子用例名字稳定：

```go
func TestGetUserList(t *testing.T) {
    tests := []struct {
        name    string
        query   ListUserQuery
        want    int
        wantErr error
    }{
        {"第一页默认条数", ListUserQuery{Page: 1}, 10, nil},
        {"pageSize 超上限收敛到 100", ListUserQuery{Page: 1, PageSize: 500}, 100, nil},
        {"page 为 0 报参数错误", ListUserQuery{}, 0, ErrBadRequest},
    }
    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            got, err := svc.GetUserList(context.Background(), tt.query)
            if !errors.Is(err, tt.wantErr) {
                t.Fatalf("GetUserList(%+v) error = %v, want %v", tt.query, err, tt.wantErr)
            }
            if got.Total != tt.want {
                t.Errorf("GetUserList(%+v) total = %d, want %d", tt.query, got.Total, tt.want)
            }
        })
    }
}
```

- 失败信息包含输入、实际值、期望值，顺序 `got != want`（`t.Errorf("Foo(%q) = %d; want %d", …)`）。
- HTTP 用 `httptest` + `gin.CreateTestContext`（或仓库框架等价物）直接测 handler；外部依赖（数据库、外部系统）用接口 + 假实现，**单元测试不连真实库**。
- 接口由使用方定义窄接口后，测试里手写 fake 或用 `mockery`/`gomock`（以仓库已有工具为准）。
- 命令写进实施计划，带包路径与用例名；`-count=1` 避免缓存假通过：

```bash
go test ./internal/user/ -run TestGetUserList -count=1        # 单个用例
go test ./internal/user/ ./internal/handler/ -count=1          # 收尾跑相关包
go test ./... -count=1                                         # 全量
```

## 9. 数据

- 表名、列名 snake_case；结构体字段 UpperCamelCase，`json` 与 `gorm` 标签写明列名。JSON 字段 camelCase（[SKILL.md](SKILL.md) 约定）：

```go
type User struct {
    ID        int64     `gorm:"column:id"        json:"id"`
    UserName  string    `gorm:"column:user_name" json:"userName"`
    CreatedAt time.Time `gorm:"column:created_at" json:"createdAt"`
}
```

- 生产环境不用启动时自动改表（AutoMigrate 只用于本地开发）。结构变更只走 `migrations/` 的成对 up / down，一次迁移做一件事。
- 删除默认软删；列表和详情查询排除已删行。
- 密码只存哈希（bcrypt）；不允许密码登录的账号用明确字段拒绝，不靠「哈希碰巧对不上」。
- 测试数据库层用 sqlmock 或容器化真实库（仓库已有哪种用哪种），不 mock 不存在的接口。

## 10. 并发、配置与生命周期

- goroutine 必须明确**何时退出**：接收 `ctx.Done()` 或由调用方等待；不启动「永远跑下去」的匿名 goroutine（会泄漏，GC 不回收）。
- 并发编排用 `errgroup`（带 context）；channel 优先于共享内存 + 锁，共享内存配 `sync.Mutex`。
- 请求路径上不用 `panic` 表达业务失败；recover 只放中间件（gin 已内置，自定义时写进访问日志）。
- 配置来自环境变量（结构体集中加载，示例文件不含真实口令）；不在代码里硬编码环境分支。
- HTTP 服务用 `http.Server` + `Shutdown(ctx)` 优雅退出：先停接流量，再等在途请求，最后关数据库连接。
- 日志用 `log/slog`（或仓库已有日志库），结构化字段而不是拼字符串；敏感字段脱敏规则见 §6。

## 11. 验证与常用命令

以仓库 Makefile / README / CI 为准，不写死；以下是等价默认：

```bash
go build ./...            # 编译
go vet ./...              # 静态检查
golangci-lint run         # 仓库配置了才跑
go test ./... -count=1    # 全量测试
go test ./internal/user/ -run TestGetUserList -count=1   # 单用例
go mod tidy               # 改完依赖
```

验收以 SDD 规格 + 实施计划为准；`go vet` 与测试不通过不交付。

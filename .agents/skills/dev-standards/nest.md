# NestJS 落地

先读 [SKILL.md](SKILL.md)「前后端统一约定」和 [backend.md](backend.md)。本节只说明 **Nest + Prisma** 如何落到文件。依赖均为公开包：`@nestjs/common`、`@nestjs/swagger`、`class-validator`、`class-transformer`、`@prisma/client`。

应用根目录是包根；monorepo 时是 `apps/<app>/`。路径里不写 `src`。多应用共用的拦截器、过滤器、Prisma 模块放 `libs/common`，由各应用引用，不在每个 app 里复制一份。业务模块与测试的对应关系见 [backend.md](backend.md) §2。

## 1. 和后端规范的对应

| [backend.md](backend.md) | Nest |
|--------------------------|------|
| 接入层 | `*.controller.ts` |
| 领域层 | `*.service.ts` |
| 数据访问层 | 默认注入 `PrismaService`；要替换实现时再写 `*.repository.ts` |
| 入参模型 | `dto/*.dto.ts` + `class-validator` |
| 出参模型 | `vo/*.vo.ts`，只给 Swagger，不做入参校验 |
| 响应信封 | `main.ts` 注册全局拦截器与异常过滤器；Controller `return` 业务载荷 |
| 模块装配 | `*.module.ts` |

## 2. 目录

```text
apps/<app>/
├── main.ts
├── app.module.ts
├── common/
│   ├── dto/page-query.dto.ts
│   ├── dto/operation-result.dto.ts    # OkDto / UpdatedDto / DeletedDto
│   ├── interceptors/api-response.interceptor.ts
│   ├── filters/http-exception.filter.ts
│   └── utils/pagination.ts
├── modules/
│   ├── auth/                          # 需要登录时
│   │   ├── auth.module.ts
│   │   ├── jwt-auth.guard.ts
│   │   ├── public.decorator.ts
│   │   └── current-user.decorator.ts
│   └── <domain>/
│       ├── <domain>.module.ts
│       ├── <domain>.controller.ts
│       ├── <domain>.service.ts
│       ├── dto/create-<domain>.dto.ts
│       ├── dto/update-<domain>.dto.ts        # PartialType(CreateXxxDto)
│       ├── dto/find-<domain>-query.dto.ts    # extends PageQueryDto
│       └── vo/<domain>.vo.ts
└── __test__/
    ├── common/utils/pagination.test.ts
    └── modules/<domain>/<domain>.service.test.ts
```

业务代码只放在 `modules/<domain>/`。`__test__/` 下的相对路径、文件名与被测文件相同，仅后缀为 `.test.ts`。例如 `modules/user/user.service.ts` 的测试是 `__test__/modules/user/user.service.test.ts`。

## 3. Controller

`@Inject` 字段注入 Service。路由 `@Controller('<resources>')`，资源用复数；管理端加统一前缀时写成 `@Controller('admin/<resources>')`，全应用同一个前缀。

```typescript
@ApiTags('User')
@Controller('admin/users')
export class UserController {
  @Inject(UserService)
  private readonly userService: UserService;

  @Post()
  @ApiBody({ type: CreateUserDto })
  @ApiOkResponseWrapped(UserListItemVo)
  create(@Body() dto: CreateUserDto, @CurrentUserId() userId: number) {
    return this.userService.create(dto, userId);
  }

  @Get()
  @ApiOkResponseWrapped(UserListResponseVo)
  findAll(@Query() query: FindUserQueryDto) {
    return this.userService.findAll(query);
  }
}
```

- 列表用 `@Query()`，主键用 `@Param('id', ParseIntPipe)`。
- 方法只 `return` Service 的结果，不组装 `{ code, data, msg }`。
- `@ApiOkResponseWrapped` 让 Swagger 展示信封后的 `data`。装饰器放在 `common/swagger/api-ok-response-wrapped.ts`：`ApiExtraModels` + `ApiOkResponse`，schema 为 `{ code, msg, data }`，`data` 指向具体 VO。OpenAPI 的 `$ref` 写法见 [@nestjs/swagger 文档](https://docs.nestjs.com/openapi/operations)。

`XxxModule` 只注册本模块的 Controller 与 Service。其它模块要用时 `exports: [XxxService]`。

## 4. Service

文件顶部声明查询字段，列表与详情分开，响应里不出现密码：

```typescript
const USER_LIST_SELECT = {
  id: true,
  userName: true,
  nickName: true,
  status: true,
  createTime: true,
} as const satisfies Prisma.UserSelect;
```

- 列表：`getPagination(query)` 得到 `page`、`pageSize`、`skip`、`take`，再 `count` + `findMany`（可放在 `$transaction`）。
- 唯一约束：捕获 `Prisma.PrismaClientKnownRequestError` 且 `code === 'P2002'`，按字段映射成中文后 `throw new BadRequestException(msg)`。
- 软删：`updateMany({ where: { id, delFlag: 0 }, data: { delFlag: 1, updateBy: userId } })`，`count === 0` 则 `NotFoundException`。
- 部分更新：只保留 `!== undefined` 的字段；一个可写字段都没有则 `BadRequestException('没有可更新的字段')`。
- Service 里对 DTO 使用 `import type`。

`getPagination` 放在 `common/utils/pagination.ts`：`page` 默认 1，`pageSize` 默认 10 且不超过 100，`skip` 超过上限（如 100000）则 `BadRequestException`。规则与 [SKILL.md](SKILL.md) 的分页参数一致。

## 5. 入参与出参

| 文件 | 写法 |
|------|------|
| `page-query.dto.ts` | `page = 1`、`pageSize = 10`，`@IsInt` `@Min` `@Max(100)`，`@Type(() => Number)` |
| `create-*.dto.ts` | `class-validator` 约束长度与格式 |
| `update-*.dto.ts` | `extends PartialType(CreateXxxDto)`（从 `@nestjs/swagger` 引入） |
| `find-*-query.dto.ts` | `extends PageQueryDto`，筛选项 `@IsOptional` + `@ApiPropertyOptional` |
| `vo/*.vo.ts` | 每个字段 `@ApiProperty`；可空字段标 `nullable: true` |
| `operation-result.dto.ts` | `UpdatedDto` `{ id, updated }`、`DeletedDto` `{ id, deleted }`、`OkDto` `{ ok }` |

时间范围用 ISO 字符串（`@IsDateString`）。结束时间不早于开始时间时，在 DTO 上用自定义 `ValidatorConstraint`，比较两个属性。

## 6. 入口：信封只包一次

`main.ts`：

```typescript
app.useGlobalFilters(new HttpExceptionFilter());
app.useGlobalInterceptors(new ApiResponseInterceptor());
app.useGlobalPipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
    transformOptions: { enableImplicitConversion: true },
  }),
);
```

`ApiResponseInterceptor`：若返回值已含 `code`、`data`、`msg`、`message` 则原样透出，否则改为 `{ code: 200, data, msg: 'success', message: '操作成功' }`。方法上可用 `@SuccessMessage('创建成功')` 覆盖这条 `message`，前端会直接拿它提示。

`HttpExceptionFilter`（`@Catch()`）按 [SKILL.md](SKILL.md) 写失败信封：

- `HttpException`：HTTP 状态即 `code`，`msg` 用上表英文标识。异常文案（数组则用 `'; '` 拼成一条）写入 **`message`**。`data` 为 `null`。
- 领域代码抛中文：`throw new BadRequestException('用户名已存在')`，过滤器把它放到 `message`，`msg` 仍是 `bad_request`。
- `PrismaClientKnownRequestError`：`P2002` → 409 / `conflict`，`P2025` → 404 / `not_found`，`P2003` / `P2000` → 400 / `bad_request`。`message` 用中文，不带 SQL。
- 其它异常：500，`msg` 为 `internal_error`，`message` 为「服务器繁忙，请稍后重试」，堆栈只写日志。
- 日志里的 query、body 去掉 `password`、`token`、`authorization`、`cookie`。

## 7. 鉴权

需要登录时，根模块注册全局守卫：

```typescript
{ provide: APP_GUARD, useClass: JwtAuthGuard }
```

`JwtAuthGuard` 继承 `AuthGuard('jwt')`。`@Public()` 用 `SetMetadata('isPublic', true)`，守卫里 `Reflector.getAllAndOverride` 为真则放行。Swagger 这类没有控制器方法的路径才用路径白名单，业务接口一律用 `@Public()`。

当前用户从 `request.user` 读取，做成参数装饰器 `@CurrentUserId()`，取不到则 `UnauthorizedException`。登录、刷新令牌的 Cookie 只写在 auth 的 Controller 里。

## 8. 数据

Prisma schema 与 migration 放在仓库的 `prisma/`。[Prisma 与 Nest 的接法](https://www.prisma.io/docs/orm/more/help-and-troubleshooting/prisma-and-nestjs) 用一个 `PrismaService extends PrismaClient`，由 `PrismaModule` 全局导出。软删字段 `delFlag`（0 正常，1 已删），审计字段 `createBy`、`updateBy`。密码用 `bcrypt` 或 `bcryptjs`。生产环境不开启自动同步表结构，结构变更只走 `prisma migrate`。

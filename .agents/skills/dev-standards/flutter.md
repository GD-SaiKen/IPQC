# 跨端规范 — Flutter / Dart

适用于移动端、桌面端与 Flutter Web 应用。先读 [SKILL.md](SKILL.md)「前后端统一约定」（信封、REST 动词、分页 `data` 对 Flutter 原样适用）与 [engineering.md](engineering.md)。**Dart 官方风格（Effective Dart + lints）对 Dart 源码的特有约定优先于 engineering.md 的通用命名**：文件与包名 snake_case、常量 lowerCamelCase，见 §2；其余工程共性（注释、Git、目录入口）仍按 engineering.md。

## 1. 技术栈与硬约束

- Dart 3 + **sound null safety**；不用 `dynamic` 蒙混类型，少用 `!` 硬断言。
- Lint 基线：`analysis_options.yaml` 引官方集——应用用 `package:flutter_lints/flutter.yaml`，纯 Dart 包用 `package:lints/recommended.yaml`。**不删规则、不加 `// ignore:`**，确需豁免时行注释写明原因与规格出处。
- 版本、依赖、资源、平台配置集中在 **`pubspec.yaml`**（等价 `package.json`）；应用仓库提交 `pubspec.lock`。版本号 `major.minor.patch+build`（如 `1.2.3+45`）。
- 界面默认 **Material 3**（Flutter 3.16 起默认）；iOS 风格页面用 Cupertino 组件；第三方 UI 库不与官方组件混用于同一模块。
- 代码生成统一走 **build_runner**（json_serializable、freezed 等）；生成文件 `*.g.dart` / `*.freezed.dart` **不手改**，可提交进仓库。
- 界面文案默认中文（engineering.md §5）；要多语言时用官方 `flutter gen-l10n` + `.arb`，不在代码里硬编码双语字符串。

## 2. Dart 语言风格（Effective Dart 摘要）

### 2.1 命名

| 对象 | 风格 | 例 |
|------|------|-----|
| 类、枚举、typedef、扩展、类型参数 | UpperCamelCase | `HttpRequest`、`OrderRepository` |
| **包、目录、源文件** | **snake_case**（覆盖 engineering kebab-case） | `http_client.dart`、`order_repository.dart` |
| 变量、参数、函数、类成员 | lowerCamelCase | `pageSize` |
| **常量（含枚举值）** | **lowerCamelCase**（覆盖 engineering 的 UPPER_SNAKE） | `const defaultTimeout = 1000;` |
| 私有成员 | 前导 `_`（Dart 的隐私机制） | `_cache` |
| 缩略词 | ≥3 字母按单词（`Http`、`Uri`）；2 字母惯用大写（`ID`、`UI`）；lowerCamelCase 开头时全小写（`httpConnection`） | |

- 不用匈牙利前缀：写 `defaultTimeout`，不写 `kDefaultTimeout`。
- **文件名 = 该文件主要类名的 snake_case**：`user_repository.dart` 放 `UserRepository`。一个文件一个主要类 + 同文件私有辅助；不往一个文件堆多个无关类。

### 2.2 import 顺序（lint `directives_ordering`，组间空行、组内按字母排序）

1. `dart:` SDK
2. `package:`（含本项目 `package:<包名>/…`）
3. 相对路径
4. `export`（单独一节，放最后）

### 2.3 格式与语句

- 格式只信 **`dart format`**，不手工排版；每行 ≤ 80 字符（URI、文件路径可例外）。
- 流程控制一律花括号；无 `else` 且整体单行的 `if` 可省略。
- 文档注释用 `///`，中文，写业务含义与规格出处；参数与返回值写在正文里（Dart 惯例不用 `@param` 标签），其余对齐 [engineering.md](engineering.md) §4。

## 3. 项目结构（官方 MVVM 指南）

分层 = **UI 层**（View + ViewModel）+ **数据层**（Repository + Service），可选领域层（UseCase）。官方案例研究按层分组，功能多时按 feature 分组，**同一仓库只选一种、不混用**：

```text
lib/                              # 按层分组（官方案例研究默认）
├── data/
│   ├── repositories/             # <domain>_repository.dart：缓存、重试、刷新
│   ├── services/                 # <source>_service.dart：REST / 平台 API / 文件
│   └── models/                   # 领域模型 + fromJson/toJson
├── ui/
│   └── <feature>/                # 每个功能一个目录
│       ├── <feature>_view.dart         # View：widget 组合，无业务逻辑
│       ├── <feature>_view_model.dart   # ViewModel：视图状态 + 命令
│       └── widgets/                    # 仅本功能复用的子 widget
├── routing/                      # 路由表 / Router 配置
├── core/                         # 跨功能：网络、信封、异常、主题、feedback
├── utils/
└── main.dart                     # 入口：DI 装配 + feedback 注入
```

按 feature 分组时，把 `data/` 与 `ui/<feature>/` 挪进 `features/<feature>/`，`core/` 留在根。要点：

- **命名后缀**（官方示例，不发明新词）：`XxxView`、`XxxViewModel`、`XxxRepository`、`XxxService`、`XxxUseCase`。
- **View 与 ViewModel 一对一**（对应一组 widget）；ViewModel ↔ Repository 多对多；Repository 是数据**唯一事实来源**（缓存、错误、重试），互相不引用，跨仓库合并放 ViewModel 或 UseCase。
- **Service 无状态**，一个数据源一个类，只暴露 `Future` / `Stream`。
- `domain/`（UseCase）只在逻辑需合并多仓库、被多个 ViewModel 复用时加；不过度分层（官方原话：更像「两主菜加一个配菜」，不是千层 lasagna）。
- **View 只允许**：按 flag/nullable 字段显隐、动画、按屏幕尺寸/方向的布局、简单路由；业务判断一律进 ViewModel。
- 目录对外入口：Dart 无 `index` 惯例，需要 barrel 时用同名 `<domain>.dart` 内 `export`，外部引用写到目录为止（对齐 [engineering.md](engineering.md) §2）。

小项目可退化为一层结构（`lib/api/`、`lib/models/`、`lib/pages/`、`lib/widgets/`），但命名后缀与 §4–§6 约定不变；项目变大后按 SDD 重构回 MVVM。

## 4. Widget 约定

- **优先 StatelessWidget**；只有需要本地可变状态、生命周期、`TextEditingController` 等才用 StatefulWidget。
- `build()` 是纯函数：不发请求、不写共享状态、不做重计算；副作用放 ViewModel / 初始化钩子。
- **能 `const` 就 `const`**：`const` widget 实例复用，子树不随父重建。构造器标 `const`，固定文案 `const Text('标题')`。
- 可复用子 UI **抽成 widget 类，不写返回 widget 的 helper 函数**（函数每次重建全量重算，widget 类可被框架停用优化）。
- 仅单文件使用的子 widget：`class _OrderCard extends StatelessWidget`，与主 widget 同文件；跨页复用移到 `widgets/` 或 `core/widgets/`。
- 构造参数：`final` 字段 + `const` 构造器 + `super.key`；必填用 `required`，合法性用 `assert(...)`。
- 列表项提供稳定 `key`（`ValueKey(item.id)`），不用下标或随机值。
- 颜色、字号从 `Theme.of(context)` 取，不散落硬编码。

## 5. 状态管理

- **临时状态**（表单、局部开关、动画）：`setState` / `ValueNotifier`，不引库。
- **应用状态**（跨页共享、登录态、购物车）：选**一种**社区方案全仓库统一，常见 **Riverpod** 或 **Bloc**；以仓库 `pubspec.yaml` 已有选型为准，新仓库按 SDD 决定。官方不钦定方案（Options 页只列内置方案 + 指向 pub.dev）。
- 不混用多套状态库；**Provider** 仅在维护遗留代码时沿用。
- UI 层只消费状态与命令，**不在 widget 里直接发 HTTP**：取数进 Repository，状态进 ViewModel。
- 命名随所选方案：Riverpod 用 `xxxProvider`；Bloc 用 `XxxBloc` / `XxxEvent` / `XxxState`，一文件一组。

## 6. 网络与模型（Dart 版 [http-client.md](http-client.md)）

分层职责与 axios 版一致，形状对齐 SKILL.md 信封：

| 层 | 位置 | 职责 |
|----|------|------|
| 传输 | `lib/core/network/http_client.dart` | 单例 dio（或 http）：baseURL、超时、拦截器、鉴权、**统一解包** |
| 业务 API | `…/data/services/<source>_service.dart`（小项目 `lib/api/<module>.dart`） | 路径常量 + 具名函数，一个 HTTP 调用一个函数 |
| 模型 | `…/data/models/<model>.dart` | json_serializable 模型，`fromJson` / `toJson` |
| 提示 | `lib/core/feedback/` | 适配门面，`main.dart` 注入；**transport 不 import 任何 UI 库** |

- HTTP 库：官方 cookbook 用 `http`；需要拦截器、刷新令牌、统一信封解包时用 **dio**（社区标准）。一仓库只用一个。
- **信封解包**：统一 `ApiResponse<T>` 模型；拦截器里 `code == 200` 返回 `data`，否则抛 `AppException(code, msg, message)` 并按 http-client.md §3.3 的文案优先级提示（`errorMessage` → `message` → `msg` → 兜底）；`showError: false` 静默失败。失败即抛，调用方 `await` 之后的语句不执行，收尾用 `try/finally`。
- 分页 `data` 对应 `PageData<T>`（`list` / `total` / `page` / `pageSize`），与 SKILL.md「`data` 形状」一致。

```dart
/// 订单模块路径常量。Dart 常量用 lowerCamelCase（Effective Dart）。
abstract final class OrderApi {
  static const list = '/admin/orders';
}

/// 分页查询订单。传输层已解包信封并统一提示，本函数只管路径、参数与模型映射。
/// @param {OrderQuery} query - 分页与筛选条件
/// @returns {PageData<Order>} 列表与总数
Future<PageData<Order>> getOrderList(OrderQuery query) async {
  final data = await request.get<Map<String, dynamic>>(
    OrderApi.list,
    queryParameters: query.toJson(),
  );
  return PageData.fromJson(data, Order.fromJson);
}
```

- JSON：模型集中处理序列化。中大型项目用 **json_serializable**：`flutter pub add json_annotation dev:build_runner dev:json_serializable`，生成 `dart run build_runner build --delete-conflicting-outputs`（开发期用 `watch`）。JSON 字段 camelCase（SKILL 约定）时默认零配置；后端 snake_case 字段用 `@JsonKey(name: 'xxx')` 映射；可空缺失字段给 `@JsonKey(defaultValue: …)`；嵌套对象在外层类加 `@JsonSerializable(explicitToJson: true)`。
- 大 JSON（超过一帧 16ms）解析放 isolate：`await compute(parseOrders, raw)` 或 `Isolate.run(() => …)`。
- 401 刷新令牌：与 http-client.md §3.3 同思路（刷新队列 + `skipRefresh`），登出跳转经注入回调，不写死路由。

## 7. 错误与空态

- 异常体系：`AppException`（携带 `code`、`msg`、`message`）；网络错误在传输层归一化为这一种，UI 不感知 `SocketException` / `DioException`。
- 页面显式四态：**加载 / 错误 / 空 / 数据**；空列表是 `list: []` 且 `total: 0`，不用 `null` 或 `0` 冒充无数据。
- 提示经 `feedback` 门面（`msgError` / `msgSuccess` / `confirm`），`main.dart` 注入 SnackBar/Dialog 实现；登出确认框属于 auth 流程，经注入的 `onSessionExpired` 回调处理。

## 8. 性能要点（官方 best-practices 摘要）

- `setState` 包住**最小子树**：拆小 widget，不在页面根部刷新整页。
- `AnimatedBuilder` 把静态子树放进 `child` 参数复用，不随动画帧重建。
- 列表一律 builder：`ListView.builder` / `GridView.builder`；等高长列表加 `itemExtent`。
- 少用 `Opacity`（改半透明色、`FadeInImage`、`AnimatedOpacity`）、少用裁剪与 `saveLayer`；圆角用 `borderRadius` 不用裁剪。
- 不重写 widget 的 `operator ==`（官方：得不偿失，O(N²)）；复用实例即可。
- 性能结论以 **profile mode** + DevTools 为准，不用 debug 模式下判断。

## 9. 测试

位置遵循 Flutter 官方（**不是** `__test__`）：`test/` **镜像 `lib/`**，文件以 **`_test.dart`** 结尾（Dart 测试发现的硬性要求）：

| 类型 | 位置 | 包 / 工具 | 命令 |
|------|------|-----------|------|
| 单元 | `test/`（镜像 lib） | `flutter_test` + mocktail/mockito | `flutter test` |
| Widget | `test/`（镜像 lib） | `flutter_test`：`testWidgets`、`pumpAndSettle`、`matchesGoldenFile` | `flutter test` |
| 集成 | `integration_test/` | `integration_test`（SDK 内置） | `flutter test integration_test -d <设备>` |

- 路径对应：`lib/features/order/data/repositories/order_repository.dart` → `test/features/order/data/repositories/order_repository_test.dart`。
- `test('中文一句话描述')`；mock 掉传输层与平台通道，模型 / 仓库可直测。
- Golden 基准更新：`flutter test --update-goldens`，基准图提交进仓库。
- 集成测试只覆盖关键路径；需操作原生 UI（权限弹窗、系统通知）时用 **patrol**，不硬刚 `integration_test`。
- 与 vue3 / nest 同一精神：**新建的主要类配一个同路径 `_test.dart`**；不在 `lib/` 生产目录旁放测试。

## 10. 平台与配置

- 网络：Android **release** 的 `AndroidManifest.xml` 需显式声明 `INTERNET` 权限（debug/profile 模板自带）；macOS 在 `*.entitlements` 开 `com.apple.security.network.client`。
- 多环境用 **flavors**（`--flavor`）或 `--dart-define`；不在业务代码里硬编码环境分支（`kDebugMode` 之外）。
- 资源在 `pubspec.yaml` 声明后使用；图标、启动屏按仓库选型（如 `flutter_launcher_icons`），不手改各平台生成产物。
- 国际化：`l10n.yaml` + `.arb` + `flutter gen-l10n`。
- `android/`、`ios/` 等平台目录的生成文件不手改；需要平台代码时集中在官方约定位置（`MainActivity` 等），通道名与方法名登记进 `docs/项目-业务约定.md`。
- 混合开发（Add-to-app）按官方文档，宿主侧改动单独提交。

## 11. 验证与常用命令

以仓库 README / Makefile / CI 脚本为准，不写死版本管理器；以下是等价默认：

```bash
flutter pub get                                            # 装依赖
dart format .                                              # 格式化（CI 常配 --set-exit-if-changed）
flutter analyze                                            # lint + 静态检查（纯 Dart 包用 dart analyze）
dart run build_runner build --delete-conflicting-outputs   # 代码生成（改模型后必跑）
flutter test                                               # 单元 + widget
flutter test integration_test -d <设备>                    # 集成
flutter build apk --release                                # 安卓产物（iOS：flutter build ipa）
```

验收以 SDD 规格 + 实施计划为准；`flutter analyze` 与测试不通过不交付。

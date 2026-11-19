# 后台壳层 · 品牌参考（勿原样拷进业务仓）

**业务仓库**在自家 `public/` 维护 `brand-mark.svg` 与 `favicon.ico`，侧栏与 `index.html` 同源。本节文件是 skill 内**通用示例**与导出脚本，仅供新建图形或对照尺寸时参考，**禁止**整包拷贝进各 Git 项目。

## 参考文件（skill 内）

| 文件 | 用途 |
|------|------|
| `admin-shell-brand-mark.svg` | 示例折线图（看板语义）；**非**各项目默认图形 |
| `favicon.ico` | 由示例 SVG 导出的 ICO，仅供对照 |
| `render-favicon.py` | Pillow：按脚本内几何画 ICO（改 `STROKES` 或复制到业务仓后改路径） |
| `render-favicon.mjs` | 可选：Node + `sharp` + `to-ico`，从任意 SVG 路径导出 |

## 业务仓接线（约定文件名）

```html
<link rel="icon" href="/favicon.ico" sizes="any" />
<link rel="icon" href="/brand-mark.svg" type="image/svg+xml" />
```

```vue
<div class="logo-icon" aria-hidden="true">
  <img class="logo-mark" src="/brand-mark.svg" width="32" height="32" alt="" />
</div>
```

满幅 32×32 SVG：`logo-icon` 不要叠蓝底，`logo-mark` 铺满 32×32。

规范正文见 [admin-shell.md § 品牌 Logo 与 Favicon](../../../admin-shell.md#品牌-logo-与-favicon)。

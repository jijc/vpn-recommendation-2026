<div align="center">
  <img src="img/feature-security.webp" width="72" alt="VPN 优选推荐">
  <h1>2026 VPN 推荐与机场推荐</h1>
  <p>站长亲测 · 更自由的网络，更大的世界</p>
  <p>五款品质网络服务 · AI 工具 · 高清流媒体 · 一页轻松了解</p>
</div>

一个轻量、响应式的中文 VPN 推荐页面。纯 HTML、CSS 与少量 JavaScript，页面正文直接可读，线上可用 Nginx 托管，无需数据库或前端框架。

> 说明：GitHub 仓库用于展示页面源码与部署方法；商业推广页面应部署到自己的 HTTPS 域名。GitHub Pages 不作为本项目的线上商业托管方案。

| 服务 | 页面入口 |
| --- | --- |
| ipequal | `/go/ipequal` |
| TAG | `/go/tag` |
| SSRDOG | `/go/ssrdog` |
| 闪电猫 | `/go/lightning-cat` |
| 肥猫云 | `/go/fat-cat` |

## 页面特点

- 浅蓝视觉、地球主图、纵向推荐卡，适配手机、平板与桌面。
- 真实可点击的站内推广短链接，服务器 302 跳转并完整保留推荐信息。
- 静态正文、语义化标题、正式域名 canonical、站点地图和社交分享卡片。
- 精简 WebP 本地素材，品牌图标无需访问第三方 CDN。
- 键盘焦点、跳过导航、减少动画支持，以及原生可折叠选购指南。
- 明确标注推广关系；没有虚构测速、星级评价或不可验证的服务保证。
- 围绕 2026 VPN 推荐、机场推荐、科学上网与中国用户选购需求组织可读正文，避免关键词堆砌。

## 本地查看

需要 Node.js 24 或更高版本，无需安装依赖。

```sh
npm run dev
```

打开 [本地预览](http://127.0.0.1:4173)。如端口被占用：

```sh
npm run dev -- --port 4187
```

直接双击 `index.html` 可以查看大部分视觉，但站内跳转需要本地预览服务或已配置的线上 Nginx。

## 验证与构建

```sh
npm test
npm run build
```

没有配置域名时输出为禁止收录的预览版本。正式部署时，把下方示例域名替换为自己的 HTTPS 域名：

```sh
SITE_URL=https://your-domain.com npm run build
```

生成文件：

- `dist/public/`：只包含应该公开的网站文件。
- `dist/nginx.conf`：包含五个精确匹配的推广跳转规则，安装到服务器配置目录。
- `dist/baota-locations.conf`：宝塔专用跳转片段，粘贴到现有站点配置内部，保留原 SSL 设置；与上面的完整配置二选一。

详细上线步骤见 [宝塔与服务器部署说明](deploy/README.md)。**仅上传静态文件，不安装跳转规则，`/go/…` 按钮就不能正常跳转。**

## GitHub 如何展示

仓库首页直接展示这个 README；GitHub 中打开 HTML 文件一般看到源码。正式页面部署到独立服务器后，将 HTTPS 地址填写到仓库 About → Website，同时在 README 顶部加入“访问网站”链接。

本项目主要用于推广转化。GitHub Pages 对主要用于促成商业交易的站点有用途限制，请查阅 [GitHub Pages 官方限制](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits)，不要把它默认当成此推广站的商业托管服务。

## 内容与链接维护

- 修改卡片与选购内容：`index.html`。
- 修改配色、尺寸和响应式排版：`styles.css`。
- 修改推广目标：`config/links.mjs`；然后重新构建并更新服务器上的 Nginx 配置。
- 图片来源与授权：[ASSETS.md](ASSETS.md)。

短链接方便分享和维护，但到达服务商后真实地址仍然可见。佣金归属由服务商的注册、Cookie 和推广规则决定；短链接不能保证佣金。公开仓库中的链接配置也可以被查看。

搜索收录需要真实域名、正常可访问的 HTTPS 网站与有帮助的原创内容。技术 SEO 并不保证收录或排名，可参考 [Google SEO 入门指南](https://developers.google.com/search/docs/fundamentals/seo-starter-guide)。

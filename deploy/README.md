# 服务器部署

采用“静态网站 + Nginx 精确跳转”方式。Node.js 仅用于在本地构建；线上可只运行 Nginx。网站必须部署在域名根路径，当前不支持 `/some/subpath/` 子目录。

## 宝塔面板：推荐按这个顺序操作

1. 在宝塔“网站”中新建静态站点，绑定自己的域名，记录网站目录。选择 Nginx；不需要数据库或 Node 项目。
2. 域名解析到服务器；在宝塔站点 SSL 设置申请证书并启用 HTTPS。具体按钮名称可能随宝塔版本变化。
3. **在本地项目目录**运行 `SITE_URL=https://你的真实域名 npm run build`。必须显示 `Production SEO`。不要直接上传源码里的 `index.html`，源码预览版禁止收录。
4. 先备份站点已有文件，再将 **`dist/public/` 里面的所有内容**上传到宝塔网站目录，让 `index.html` 直接位于根目录，而不是多套一层 public。默认首页设置为 `index.html`。
5. 打开本地生成的 **`dist/baota-locations.conf`**，复制内容。在宝塔该网站的“Nginx 配置文件”中，粘贴到已有的 `server { ... }` 内部、任何 `location` 外部。不要放到 PHP 设置，不要把它当完整配置覆盖原文件；保留原来的域名、目录、SSL 和证书校验规则。若已有 `/go/` 规则，替换对应旧规则，避免重复。
6. 通过宝塔检查并保存配置、重载 Nginx。访问首页，再点击五家“访问官网”，确认跳转和推荐码。`/go/unknown` 应返回 404。
7. 打开网站源代码搜索 `noindex`，正式首页不应出现它；确认 `/robots.txt` 允许首页抓取，`/sitemap.xml` 使用自己的 HTTPS 域名，再按文末说明提交搜索引擎。

线上只需静态文件与这段跳转配置；计划、参考图、源配置、测试和研究记录都不用上传到网站目录。宝塔自带的占位首页如与 `index.html` 冲突，先备份，再在站点默认首页设置中调整顺序。

`baota-locations.conf` 与完整 `nginx.conf` 从同一份推广链接配置生成，**二选一使用**，不要重复粘贴。它保留 URL 中的推荐信息，但无法保证佣金；商家归因、访客后续操作和优惠活动由商家决定。

## 1. 准备域名与构建

将域名 DNS 指向服务器。把下面的示例替换为真实域名，不要直接用示例域名上线：

```sh
npm test
SITE_URL=https://your-domain.com npm run build
```

输出 `Production SEO: https://你的域名` 表示已生成正式索引信息。没有 SITE_URL 时构建的是 noindex 预览版本；不要将预览版本当作正式版本上传。

可以本地查看已构建产物，跳转仍使用相同配置：

```sh
node scripts/server.mjs --production --port 4188
```

## 2. 上传静态文件

将 `dist/public/` 里面的文件上传到服务器 `/var/www/vpn-selection/`。使用服务器面板、SFTP 或其他现有部署工具均可。

不要把整个项目目录当作网站根目录。服务器只需要公开 `dist/public` 的文件；Nginx 配置放到服务器配置目录中。

## 3. 安装 Nginx 跳转配置

将 `dist/nginx.conf` 安装为该站点的 Nginx 配置。文件中的默认根目录是 `/var/www/vpn-selection`，可以按服务器实际目录修改。

如果服务器面板已有 `server { ... }`，请合并 `location = /go/...` 等规则到现有站点中，不要重复添加一个冲突的 server。保持每个跳转地址外面的双引号，它会保护 URL 中的 `#` 片段。

规则示例（生成文件已经包含五款服务及带尾斜杠的形式）：

```nginx
location = /go/ipequal {
    add_header Cache-Control "no-store" always;
    add_header X-Robots-Tag "noindex, nofollow" always;
    return 302 "https://www.ipequal.com/?ref=9a2c5456c5";
}
```

配置完成后，由服务器管理员运行：

```sh
sudo nginx -t
sudo systemctl reload nginx
```

只有语法检查成功后才重载。上述服务管理命令适用于使用 systemd 的 Linux；面板服务器可用其配置检查/重载功能。

## 4. 启用 HTTPS

用现有服务器面板或证书管理工具为域名申请有效证书，启用 HTTPS，再将 HTTP 重定向到 HTTPS。生成的 Nginx 文件是 HTTP 站点基础配置，不包含证书路径，不能在没有证书的情况下直接作为完成 HTTPS 的证明。

如果前面已经有反向代理终止 HTTPS，可将该配置用作内部 HTTP 源站。将 canonical 对应的 HTTPS 域名作为唯一正式地址，其他域名统一重定向过去。

建议开启 gzip / Brotli（按现有服务器支持情况）并沿用生成的缓存与安全响应头。静态文件缓存七天；修改样式或图片后如使用 CDN，清除对应缓存。推广跳转不缓存。

## 5. 线上核验

```sh
curl -I https://your-domain.com/
curl -I https://your-domain.com/go/ipequal
curl -I https://your-domain.com/go/tag
curl -I https://your-domain.com/go/ssrdog
curl -I https://your-domain.com/go/lightning-cat
curl -I https://your-domain.com/go/fat-cat
curl https://your-domain.com/robots.txt
curl https://your-domain.com/sitemap.xml
```

首页应为 200、五个 go 路径应为 302，Location 与 `config/links.mjs` 完全一致，特别检查 TAG / SSRDOG 的 `#` 片段和推荐信息。最后用手机和桌面浏览器实际点击按钮，确认进入服务商的正确页面；本地测试不能代替目标商家当前可达性检查。

正式首页不能有 `noindex`，canonical 和 sitemap 必须使用真实 HTTPS 域名。`/go/unknown` 应为 404。搜索引擎只应索引首页，不应索引 go 跳转路径。

## 6. 提交搜索引擎

- [Google Search Console](https://search.google.com/search-console/)：添加域名资源，按提示完成 DNS 所有权验证，提交 `https://你的域名/sitemap.xml`，用 URL 检查工具核验首页并请求编入索引。
- [Bing Webmaster Tools](https://www.bing.com/webmasters/)：验证站点并提交同一 sitemap。
- [百度搜索资源平台](https://ziyuan.baidu.com/)：如目标包含百度搜索，登录后按照平台当时可用的站点验证与提交方式操作。平台要求及账号权限可能变化。

技术 SEO 让网页更容易被抓取、理解与索引，不保证收录、排名或收入。后续最有价值的内容是注明条件和日期的真实测速、清晰的套餐比较、适用人群与限制；维护现有页面即可，不必为了关键词重复生成低质量页面。

参考：[Google SEO 入门指南](https://developers.google.com/search/docs/fundamentals/seo-starter-guide)、[付费及推广链接标注](https://developers.google.com/search/docs/crawling-indexing/qualify-outbound-links)。

## 7. GitHub 展示与更新

GitHub 仓库首页渲染 `README.md`；真实页面使用上面的独立托管。将正式域名填入仓库的 About → Website，并在 README 中加“访问网站”链接。

修改目标 URL 后重新构建，将新生成的 Nginx 规则部署并核验。302 使用 no-store，方便未来更换活动或域名。短链接只是转发入口，不是不可见的推荐码保护，也不保证商家佣金归因。

本项目不默认提供 GitHub Pages 自动发布；其商业用途边界请参阅 [GitHub Pages 官方限制](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits)。

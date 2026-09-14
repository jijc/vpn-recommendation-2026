import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { affiliateLinks } from '../config/links.mjs';
import { projectRoot, publicFiles } from './build.mjs';

const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml', '.xml': 'application/xml; charset=utf-8', '.txt': 'text/plain; charset=utf-8' };
const previewRobots = 'User-agent: *\nDisallow: /\n';
const errorPage = '<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>页面未找到 · VPN 优选推荐</title><h1>页面未找到</h1><p>这个链接可能已变更，请返回推荐列表。</p><a href="/">返回 VPN 优选推荐</a></html>';

export function createSiteServer({ root = projectRoot, production = false } = {}) {
  const files = new Set([...publicFiles, ...(production ? ['robots.txt', 'sitemap.xml'] : [])]);
  return createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'");
    res.setHeader('Cache-Control', 'no-store');
    if (!production) res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    const respond = (status, body, type = 'text/html; charset=utf-8') => {
      res.writeHead(status, { 'Content-Type': type });
      res.end(req.method === 'HEAD' ? undefined : body);
    };
    if (!['GET', 'HEAD'].includes(req.method)) {
      res.setHeader('Allow', 'GET, HEAD');
      return respond(405, 'Method not allowed', 'text/plain; charset=utf-8');
    }
    const rawPath = req.url.split('?')[0];
    if (!rawPath.startsWith('/') || /[%\\\0]/.test(rawPath) || rawPath.split('/').some(part => part === '.' || part === '..')) {
      return respond(400, 'Invalid path', 'text/plain; charset=utf-8');
    }
    if (rawPath.startsWith('/go/')) {
      res.setHeader('X-Robots-Tag', 'noindex, nofollow');
      const slug = rawPath.slice(4).replace(/\/$/, '');
      if (!Object.hasOwn(affiliateLinks, slug)) return respond(404, errorPage);
      res.writeHead(302, { Location: affiliateLinks[slug] });
      return res.end();
    }
    if (rawPath === '/index.html') { res.writeHead(308, { Location: '/' }); return res.end(); }
    if (rawPath === '/robots.txt' && !production) return respond(200, previewRobots, types['.txt']);
    const file = rawPath === '/' ? 'index.html' : rawPath.slice(1);
    if (!files.has(file)) return respond(404, errorPage);
    try {
      const data = await readFile(path.join(root, file));
      return respond(200, data, types[path.extname(file)] || 'text/plain; charset=utf-8');
    } catch (error) {
      if (error.code !== 'ENOENT') console.error(`Unable to read ${file}: ${error.code}`);
      return respond(error.code === 'ENOENT' ? 404 : 500, errorPage);
    }
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const portIndex = process.argv.indexOf('--port');
  const hostIndex = process.argv.indexOf('--host');
  const port = Number(portIndex >= 0 ? process.argv[portIndex + 1] : process.env.PORT || 4173);
  const host = hostIndex >= 0 ? process.argv[hostIndex + 1] : '127.0.0.1';
  const production = process.argv.includes('--production');
  const server = createSiteServer({ production, root: production ? path.join(projectRoot, 'dist/public') : projectRoot });
  server.listen(port, host, () => console.log(`VPN 优选推荐: http://${host}:${server.address().port}${production ? ' (built site)' : ''}`));
  server.on('error', error => { console.error(error.message); process.exitCode = 1; });
}

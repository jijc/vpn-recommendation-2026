import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { request } from 'node:http';
import { mkdtemp, readFile, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createSiteServer } from '../scripts/server.mjs';
import { buildSite, normalizeSiteUrl, projectRoot } from '../scripts/build.mjs';

const expectedLinks = {
  ipequal: 'https://www.ipequal.com/?ref=9a2c5456c5',
  tag: 'https://user.tagss14.pro/#/auth/ywBm89WI',
  ssrdog: 'https://st2.hosbb.com/#/register?code=j8tF9pBh',
  'lightning-cat': 'https://appinv01.sc-vipaff.cc/auth/register?code=156d8e2b',
  'fat-cat': 'https://inv03.fcweba.cc/register?aff=CxLWXDX5',
};

async function serve(t, options) {
  const server = createSiteServer(options);
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => { server.closeAllConnections(); return new Promise(resolve => server.close(resolve)); });
  return `http://127.0.0.1:${server.address().port}`;
}

test('all referral destinations preserve exact query and fragment with uncached 302 responses', async t => {
  const base = await serve(t);
  for (const [slug, destination] of Object.entries(expectedLinks)) {
    for (const method of ['GET', 'HEAD']) {
      const response = await fetch(`${base}/go/${slug}`, { redirect: 'manual', method });
      assert.equal(response.status, 302, slug);
      assert.equal(response.headers.get('location'), destination, slug);
      assert.equal(response.headers.get('cache-control'), 'no-store');
      assert.equal(response.headers.get('x-robots-tag'), 'noindex, nofollow');
    }
    const slash = await fetch(`${base}/go/${slug}/`, { redirect: 'manual' });
    assert.equal(slash.headers.get('location'), destination);
  }
});

test('unknown slugs, unsafe paths, unsupported methods and redirect injection fail safely', async t => {
  const base = await serve(t);
  for (const route of ['/go/unknown', '/go/constructor', '/go/toString', '/go/https://example.com', '/config/links.mjs', '/plans/2026-09-14-vpn-landing-page.md', '/img/reference-ui.png', '/img/hero-globe.png', '/.git/config', '/styles.css/nope']) {
    assert.equal((await fetch(base + route, { redirect: 'manual' })).status, 404, route);
  }
  const unsafe = await fetch(`${base}/go/ipequal?url=https://evil.example&ref=removed`, { redirect: 'manual' });
  assert.equal(unsafe.headers.get('location'), expectedLinks.ipequal);
  const encoded = await fetch(`${base}/%2e%2e%2fconfig%2flinks.mjs`);
  assert.equal(encoded.status, 400);
  const traversed = await new Promise(resolve => {
    request(`${base}/`, { path: '/img/../config/links.mjs' }, res => { res.resume(); resolve(res.statusCode); }).end();
  });
  assert.equal(traversed, 400);
  const post = await fetch(`${base}/go/tag`, { method: 'POST', redirect: 'manual' });
  assert.equal(post.status, 405);
  assert.equal(post.headers.get('allow'), 'GET, HEAD');
});

test('static content and all referenced local assets are accessible without client-side rendering', async t => {
  const base = await serve(t);
  const response = await fetch(base);
  const html = await response.text();
  assert.equal(response.status, 200);
  assert.match(html, /<html lang="zh-CN">/);
  assert.equal((html.match(/<h1\b/g) || []).length, 1);
  assert.equal((html.match(/class="provider-card"/g) || []).length, 5);
  assert.equal((html.match(/rel="sponsored nofollow noopener"/g) || []).length, 5);
  for (const destination of Object.values(expectedLinks)) assert.ok(!html.includes(destination));
  assert.ok(!/\d+\s?ms|100%\s*独立|AggregateRating/.test(html));
  assert.match(html, /class="header-offer" href="#recommendations"/);
  assert.match(html, /查看专属优惠/);
  assert.match(html, /VPN 优选免费推荐/);
  assert.equal((html.match(/class="provider-benefits"/g) || []).length, 5);
  assert.equal((html.match(/class="tool-badge"/g) || []).length, 5);
  for (const id of ['ai-tools', 'streaming']) {
    const section = html.match(new RegExp(`<section[^>]* id="${id}"[\\s\\S]*?<\\/section>`))[0];
    assert.ok(!/<a\b|<button\b|tabindex=/.test(section), `${id} logos must be display-only`);
  }
  const css = await (await fetch(`${base}/styles.css`)).text();
  for (const match of css.matchAll(/url\("\.\/([^"#]+)"\)/g)) {
    assert.equal((await fetch(`${base}/${match[1]}`)).status, 200, match[1]);
  }
  for (const match of html.matchAll(/(?:src|href)="\.\/([^"#]+)"/g)) {
    if (match[1].startsWith('go/')) continue;
    const asset = await fetch(`${base}/${match[1]}`);
    assert.equal(asset.status, 200, match[1]);
    assert.ok((await asset.arrayBuffer()).byteLength > 0, match[1]);
  }
  assert.match((await fetch(`${base}/img/brands/chatgpt.svg`)).headers.get('content-type'), /image\/svg\+xml/);
  // A newly selected logo must be served in both preview and production, not just exist on disk.
  const logo = await fetch(`${base}/img/brands/shield-lock.svg`);
  assert.equal(logo.status, 200);
  assert.match(await logo.text(), /<svg\b/);
  assert.equal((await fetch(`${base}/index.html`, { redirect: 'manual' })).status, 308);
  const head = await fetch(base, { method: 'HEAD' });
  assert.equal((await head.text()).length, 0);
});

test('production build contains valid SEO, exact Nginx redirects, and only public assets', async t => {
  const outDir = await mkdtemp(path.join(tmpdir(), 'vpn-site-production-'));
  const { publicDir } = await buildSite({ siteUrl: 'https://vpn.example.org', outDir });
  const html = await readFile(path.join(publicDir, 'index.html'), 'utf8');
  assert.match(html, /rel="canonical" href="https:\/\/vpn\.example\.org\/"/);
  assert.ok(!html.includes('content="noindex, nofollow"'));
  const graph = JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1]);
  const list = graph['@graph'][1].mainEntity;
  assert.equal(list.numberOfItems, 5);
  for (const item of list.itemListElement) assert.ok(html.includes(`id="${new URL(item.url).hash.slice(1)}"`));
  const robots = await readFile(path.join(publicDir, 'robots.txt'), 'utf8');
  assert.match(robots, /Allow: \/\nDisallow: \/go\//);
  const sitemap = await readFile(path.join(publicDir, 'sitemap.xml'), 'utf8');
  assert.ok(sitemap.includes('<loc>https://vpn.example.org/</loc>'));
  const nginx = await readFile(path.join(outDir, 'nginx.conf'), 'utf8');
  for (const target of Object.values(expectedLinks)) assert.ok(nginx.includes(`return 302 "${target}";`));
  const baota = await readFile(path.join(outDir, 'baota-locations.conf'), 'utf8');
  assert.ok(!/server\s*\{|listen\s+\d|ssl_certificate/.test(baota));
  assert.equal((baota.match(/return 302/g) || []).length, 10);
  assert.ok(baota.includes('location ^~ /go/ { return 404; }'));
  for (const [slug, target] of Object.entries(expectedLinks)) {
    assert.ok(baota.includes(`location = /go/${slug} {`));
    assert.ok(baota.includes(`location = /go/${slug}/ {`));
    assert.ok(baota.includes(`return 302 "${target}";`));
  }
  const files = await readdir(publicDir, { recursive: true });
  assert.ok(files.every(file => !/reference|plans|qa|config|ChatGPT Image/.test(file)));
  const base = await serve(t, { root: publicDir, production: true });
  assert.equal((await fetch(`${base}/img/brands/shield-lock.svg`)).status, 200);
  assert.equal((await fetch(base)).headers.get('x-robots-tag'), null);
  assert.equal((await fetch(`${base}/sitemap.xml`)).status, 200);
  // Rebuilding the same output in preview mode must not leave a production sitemap.
  await buildSite({ outDir });
  assert.ok(!(await readdir(publicDir)).includes('sitemap.xml'));
  assert.match(await readFile(path.join(publicDir, 'index.html'), 'utf8'), /content="noindex, nofollow"/);
  assert.equal(await readFile(path.join(publicDir, 'robots.txt'), 'utf8'), 'User-agent: *\nDisallow: /\n');
});

test('invalid publishing origins are rejected and local-only files remain ignored', async () => {
  for (const value of ['http://vpn.example.org', 'https://localhost', 'https://127.0.0.1', 'https://vpn.example.org/page', 'https://vpn.example.org/?x=1', 'https://vpn.example.org/#x', 'https://user:password@vpn.example.org', 'https://vpn.example.org:8443', 'https://foo.local']) {
    assert.throws(() => normalizeSiteUrl(value), undefined, value);
  }
  assert.equal(normalizeSiteUrl('https://vpn.example.org/'), 'https://vpn.example.org');
  const ignore = await readFile(path.join(projectRoot, '.gitignore'), 'utf8');
  for (const entry of ['/plans/', '/qa/', '/design-qa.md', '/img/reference-ui.png']) assert.ok(ignore.includes(entry));
});

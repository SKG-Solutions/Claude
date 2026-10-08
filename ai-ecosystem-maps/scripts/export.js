// Export poster PDFs and PNG previews of both maps from dist/standalone.html.
// Usage: node scripts/export.js   (needs the playwright package and Chromium)
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const PAGE = 'file://' + path.join(ROOT, 'dist', 'standalone.html');
const OUT = path.join(ROOT, 'exports');

(async () => {
  require('fs').mkdirSync(OUT, { recursive: true });
  const launch = process.env.HTTPS_PROXY ? { proxy: { server: process.env.HTTPS_PROXY } } : {};
  const browser = await chromium.launch(launch);

  // Map 1: the whole canvas at 1:1 on one large page.
  const p1 = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  await p1.goto(PAGE + '?poster=1');
  await p1.waitForSelector('body[data-ready="true"]', { timeout: 30000 });
  const size = await p1.evaluate(() => ({ w: document.getElementById('world').offsetWidth, h: document.getElementById('world').offsetHeight }));
  await p1.pdf({ path: path.join(OUT, 'map-1-ai-by-output-and-workflow.pdf'), width: size.w + 'px', height: size.h + 'px', printBackground: true, pageRanges: '1' });
  // PNG preview at half size; the PDF carries full resolution.
  const ctx = await browser.newContext({ viewport: { width: size.w, height: size.h }, deviceScaleFactor: 0.5 });
  const p1b = await ctx.newPage();
  await p1b.goto(PAGE + '?poster=1');
  await p1b.waitForSelector('body[data-ready="true"]', { timeout: 30000 });
  await p1b.screenshot({ path: path.join(OUT, 'map-1-ai-by-output-and-workflow.png'), clip: { x: 0, y: 0, width: size.w, height: size.h } });
  console.log('map 1', size);

  // Map 2: one tall page at desktop width.
  const p2 = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2 });
  await p2.goto(PAGE + '?poster=2');
  await p2.waitForSelector('body[data-ready="true"]', { timeout: 30000 });
  const h2 = await p2.evaluate(() => document.documentElement.scrollHeight);
  await p2.pdf({ path: path.join(OUT, 'map-2-choosing-a-model.pdf'), width: '1440px', height: h2 + 'px', printBackground: true, pageRanges: '1' });
  await p2.screenshot({ path: path.join(OUT, 'map-2-choosing-a-model.png'), fullPage: true });
  console.log('map 2', h2);
  await browser.close();
})();

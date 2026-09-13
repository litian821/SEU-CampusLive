const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');

(async () => {
  const base = process.env.BASE_URL || 'http://127.0.0.1:8080';
  const browser = await chromium.launch({ headless: true, ...(process.env.BROWSER_CHANNEL ? { channel: process.env.BROWSER_CHANNEL } : {}) });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    await page.goto(base);
    await page.getByRole('heading', { level: 1 }).waitFor();
    await page.getByRole('link', { name: '浏览点播' }).click();
    const items = await (await page.request.get(base + '/api/vod')).json();
    const item = items.find(item => item.filename.startsWith('自动验收_'));
    assert(item, 'Run KEEP_TEST_VIDEO=1 make test-media first');
    await page.getByLabel('搜索比赛').fill(item.filename);
    await page.getByRole('heading', { name: item.title, exact: true }).click();
    const video = page.locator('video');
    await video.waitFor();
    await page.waitForFunction(() => document.querySelector('video')?.readyState >= 2);
    await video.evaluate(video => { video.muted = true; return video.play(); });
    await page.waitForFunction(() => document.querySelector('video').currentTime > 1);
    await video.evaluate(video => video.pause());
    assert(await video.evaluate(video => video.paused));
    await video.evaluate(video => { video.currentTime = 12; });
    await page.waitForFunction(() => { const v = document.querySelector('video'); return !v.seeking && v.currentTime >= 11.5 && v.readyState >= 2; });
    await video.evaluate(video => video.play());
    await page.waitForFunction(() => document.querySelector('video').currentTime > 13);
    console.log('PASS browser MP4 play, pause, seek and resume with percent filename');

    await page.goto(base + '/vod/does-not-exist.mp4');
    await page.getByRole('alert').filter({ hasText: '视频不存在或已下架' }).waitFor();
    assert.equal(await page.locator('video').count(), 0);
    await page.goto(base + '/moments');
    await page.getByRole('heading', { level: 1, name: '赛场瞬间' }).waitFor();
    const albums = await (await page.request.get(base + '/api/photos')).json();
    if (albums.length) {
      await page.locator('.photo-button').first().click();
      const dialog = page.getByRole('dialog');
      await dialog.waitFor();
      await page.waitForFunction(() => { const img = document.querySelector('dialog img'); return img && img.complete && img.naturalWidth > 0; });
      await page.keyboard.press('Escape');
      await dialog.waitFor({ state: 'hidden' });
      assert(await page.locator('.photo-button').first().evaluate(button => button === document.activeElement));
      console.log('PASS real photo catalog, image loading, lightbox and focus restoration');
    }
    await page.goto(base + '/not-found');
    await page.getByRole('heading', { name: '页面不存在' }).waitFor();

    await page.goto(base + '/live');
    await page.locator('.event-card').first().waitFor();
    const out = process.env.SCREENSHOT_DIR;
    if (out) { fs.mkdirSync(out, { recursive: true }); await page.screenshot({ path: path.join(out, 'live-desktop.png'), fullPage: true }); }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(base + '/vod');
    await page.getByLabel('搜索比赛').waitFor();
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Mobile horizontal overflow');
    if (out) await page.screenshot({ path: path.join(out, 'vod-mobile.png'), fullPage: true });
    console.log('PASS missing video, unknown route and mobile layout');

    if (process.env.LIVE_TEST_ID) {
      await page.setViewportSize({ width: 1280, height: 900 });
      let unavailable = true;
      await page.route('**/media/live/*.m3u8', route => unavailable ? route.fulfill({ status: 404, body: 'not yet live' }) : route.continue());
      await page.goto(base + '/live/' + encodeURIComponent(process.env.LIVE_TEST_ID));
      await page.getByRole('status').filter({ hasText: '自动重试' }).waitFor({ timeout: 60000 });
      unavailable = false;
      await page.waitForFunction(() => document.querySelector('video')?.readyState >= 2, null, { timeout: 60000 });
      await page.locator('video').evaluate(video => { video.muted = true; return video.play(); });
      const start = await page.locator('video').evaluate(video => video.currentTime);
      await page.waitForFunction(t => document.querySelector('video').currentTime > t + 2, start);
      if (out) await page.screenshot({ path: path.join(out, 'live-playing.png'), fullPage: true });
      console.log('PASS real browser HLS recovery after initial 404, audio/video media ready and progressing playback');
    }
    assert.deepEqual(errors, []);
    console.log('PASS no uncaught page errors');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });

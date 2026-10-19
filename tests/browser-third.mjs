import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'chrome',headless:true});
try {
  const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const state=()=>page.evaluate(()=>window.__precision());
  await page.goto('http://127.0.0.1:5173/?stage=third');await page.waitForSelector('canvas');
  assert.equal((await state()).stageId,'third');assert.equal((await state()).remaining,240);
  await page.locator('#start').click();await page.waitForTimeout(100);assert.equal((await state()).previewing,true);assert.equal((await state()).time,0);
  await page.waitForFunction(()=>window.__precision().state==='playing',{},{timeout:20000});
  assert.deepEqual((await state()).position,{x:100,y:650});assert.equal((await state()).remaining,240);
  await page.waitForTimeout(100);assert.ok((await state()).time>0);assert.equal((await state()).remaining,240);
  await page.locator('#retry').click();await page.locator('#skipPreview').click();assert.equal((await state()).state,'playing');
  await page.locator('#settings').click();assert.equal(await page.locator('#stageId option').count(),4);await page.selectOption('#mode','practice');await page.selectOption('#checkpoint','windmills');await page.uncheck('#timed');await page.getByRole('button',{name:'適用',exact:true}).click();assert.deepEqual((await state()).position,{x:1090,y:700});await page.locator('#start').click();await page.screenshot({path:'tests/third-rotor.png'});
  await page.locator('#settings').click();await page.selectOption('#checkpoint','elevator');await page.check('#timed');await page.getByRole('button',{name:'適用',exact:true}).click();await page.locator('#start').click();await page.keyboard.down('ArrowDown');await page.waitForTimeout(100);await page.keyboard.up('ArrowDown');assert.equal((await state()).resting,true);const before=(await state()).remaining;await page.waitForTimeout(100);assert.equal((await state()).remaining,before);
  await page.goto('http://127.0.0.1:5173/?stage=third&dev=1');await page.waitForSelector('canvas');await page.locator('#settings').click();await page.check('#custom');await page.fill('#spawnX','1280');await page.fill('#spawnY','700');await page.getByRole('button',{name:'適用',exact:true}).click();await page.locator('#start').click();
  await page.waitForFunction(()=>window.__precision().state==='failed');assert.equal((await state()).failureBurstCount,1);await page.locator('#retry').click();assert.equal((await state()).state,'playing');
  await page.locator('#settings').click();const beforePressBurst=(await state()).failureBurstCount;await page.fill('#spawnX','3230');await page.fill('#spawnY','850');await page.fill('#elapsed','2.4');await page.getByRole('button',{name:'適用',exact:true}).click();assert.equal((await state()).time,2.4);await page.locator('#start').click();await page.waitForFunction(()=>window.__precision().state==='failed');assert.equal((await state()).failureBurstCount,beforePressBurst+1);
  await page.locator('#settings').click();await page.fill('#elapsed','0');await page.check('#invincible');await page.check('#freeze');await page.check('#hitboxes');await page.fill('#obstacleSpeed','2');await page.getByRole('button',{name:'適用',exact:true}).click();await page.locator('#start').click();await page.keyboard.down('ArrowRight');await page.waitForTimeout(150);await page.keyboard.up('ArrowRight');assert.equal((await state()).state,'playing');assert.equal((await state()).remaining,240);assert.ok((await state()).time>.15);
  await page.screenshot({path:'tests/third-press.png'});
  for(const [width,height]of [[320,568],[430,932],[1440,900]]){await page.setViewportSize({width,height});await page.waitForTimeout(80);assert.ok(await page.locator('#stick').isVisible());assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
  await page.locator('#settings').click();await page.selectOption('#stageId','second');await page.getByRole('button',{name:'適用',exact:true}).click();assert.equal((await state()).stageId,'second');
  assert.deepEqual(errors,[]);console.log('PASS 3rd: both-branch preview, offscreen clock, movement timer, skip, practice, rest, rotor/press failures, burst/retry, elapsed phase, invincibility, speed, timer freeze, viewports, stage switch');
} finally {await browser.close();}

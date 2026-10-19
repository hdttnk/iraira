import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'chrome',headless:true});
try {
  const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const state=()=>page.evaluate(()=>window.__precision());
  await page.goto('http://127.0.0.1:5173/?stage=second');await page.waitForSelector('canvas');
  assert.equal((await state()).stageId,'second');assert.equal((await state()).remaining,180);
  await page.locator('#start').click();await page.waitForTimeout(150);assert.equal((await state()).previewing,true);assert.equal((await state()).remaining,180);
  await page.waitForFunction(()=>window.__precision().state==='playing',{},{timeout:15000});
  assert.equal((await state()).remaining,180);assert.deepEqual((await state()).position,{x:100,y:450});
  await page.locator('#settings').click();await page.selectOption('#mode','practice');await page.selectOption('#checkpoint','rest');await page.getByRole('button',{name:'適用',exact:true}).click();await page.locator('#start').click();
  await page.keyboard.down('ArrowRight');await page.waitForTimeout(100);await page.keyboard.up('ArrowRight');
  assert.equal((await state()).resting,true);const before=(await state()).remaining;await page.waitForTimeout(200);assert.equal((await state()).remaining,before);
  await page.keyboard.down('ArrowRight');await page.waitForTimeout(650);await page.keyboard.up('ArrowRight');assert.equal((await state()).resting,false);assert.ok((await state()).remaining<before);
  await page.screenshot({path:'tests/second-mobile.png'});
  // Fail against the corridor side, then retry while the burst is still running.
  await page.keyboard.down('ArrowUp');await page.waitForFunction(()=>window.__precision().state==='failed');await page.keyboard.up('ArrowUp');
  let s=await state();assert.equal(s.failureBurstCount,1);assert.ok(s.failureParticles>0);
  await page.waitForTimeout(90);await page.screenshot({path:'tests/second-burst.png'});
  await page.locator('#retry').click();assert.equal((await state()).state,'playing');assert.deepEqual((await state()).position,{x:1900,y:850});
  await page.waitForTimeout(550);assert.equal((await state()).failureParticles,0);
  await page.locator('#settings').click();await page.selectOption('#stageId','first');await page.getByRole('button',{name:'適用',exact:true}).click();assert.equal((await state()).stageId,'first');
  for(const [id,key]of [['first','ArrowUp'],['prototype','ArrowRight']]) {
    await page.goto(`http://127.0.0.1:5173/?dev=1&stage=${id}`);await page.waitForSelector('canvas');await page.locator('#start').click();
    await page.keyboard.down(key);await page.waitForFunction(()=>window.__precision().state==='failed');await page.keyboard.up(key);
    assert.equal((await state()).failureBurstCount,1);await page.locator('#retry').click();assert.equal((await state()).state,'playing');
  }
  await page.goto('http://127.0.0.1:5173/?dev=1&stage=second');await page.waitForSelector('canvas');await page.locator('#settings').click();await page.fill('#limit','1');await page.selectOption('#checkpoint','brows');await page.getByRole('button',{name:'適用',exact:true}).click();await page.locator('#start').click();await page.keyboard.down('ArrowRight');await page.waitForTimeout(100);await page.keyboard.up('ArrowRight');await page.waitForFunction(()=>window.__precision().state==='failed');assert.equal((await state()).failureBurstCount,1);await page.waitForTimeout(200);assert.ok((await page.locator('#message').textContent()).includes('タイムアップ'));
  await page.goto('http://127.0.0.1:5173/?dev=1&stage=second');await page.waitForSelector('canvas');await page.locator('#settings').click();await page.selectOption('#checkpoint','spiral');await page.fill('#elapsed','20');await page.check('#hitboxes');await page.getByRole('button',{name:'適用',exact:true}).click();assert.equal((await state()).time,20);assert.deepEqual((await state()).position,{x:1110,y:550});await page.locator('#start').click();await page.screenshot({path:'tests/second-spiral.png'});
  await page.locator('#settings').click();await page.selectOption('#checkpoint','narrow');await page.fill('#elapsed','0');await page.getByRole('button',{name:'適用',exact:true}).click();await page.locator('#start').click();
  await page.keyboard.down('ArrowRight');await page.waitForTimeout(800);await page.keyboard.up('ArrowRight');assert.equal((await state()).state,'playing');assert.ok((await state()).position.x>1250);
  const narrowX=(await state()).position.x;await page.waitForTimeout(120);assert.equal((await state()).position.x,narrowX);await page.screenshot({path:'tests/second-narrow.png'});
  await page.keyboard.down('ArrowDown');await page.waitForFunction(()=>window.__precision().state==='failed');await page.keyboard.up('ArrowDown');
  for(const [width,height]of [[320,568],[430,932],[1440,900]]){await page.setViewportSize({width,height});await page.waitForTimeout(80);assert.ok(await page.locator('#stick').isVisible());assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
  assert.deepEqual(errors,[]);console.log('PASS 2nd: preview, movement timer, rest stop/resume, practice, developer, stage switch, failure burst, immediate retry, particle cleanup, viewports');
} finally {await browser.close();}

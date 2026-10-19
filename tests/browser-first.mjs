import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'chrome',headless:true});
try {
  const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const state=()=>page.evaluate(()=>window.__precision());
  await page.goto('http://127.0.0.1:5173/');await page.waitForSelector('canvas');
  assert.equal((await state()).stageId,'first');assert.equal((await state()).remaining,90);
  await page.locator('#start').click();await page.waitForTimeout(250);
  let p=await state();assert.equal(p.previewing,true);assert.equal(p.remaining,90);assert.equal(p.time,0);
  assert.equal(await page.locator('#skipPreview').isVisible(),false);
  await page.waitForFunction(()=>window.__precision().state==='playing',{},{timeout:15000});
  p=await state();assert.deepEqual(p.position,{x:100,y:500});assert.equal(p.remaining,90);assert.equal(p.timerStarted,false);
  await page.waitForTimeout(150);assert.equal((await state()).remaining,90);
  await page.keyboard.down('ArrowRight');await page.waitForTimeout(150);await page.keyboard.up('ArrowRight');
  await page.waitForTimeout(30);const stopped=(await state()).position.x;assert.ok(stopped>100);assert.equal((await state()).timerStarted,true);const remaining=(await state()).remaining;await page.waitForTimeout(90);assert.equal((await state()).position.x,stopped);assert.ok((await state()).remaining<remaining);
  await page.locator('#retry').click();assert.equal((await state()).previewing,true);await page.locator('#skipPreview').click();assert.equal((await state()).state,'playing');
  const cdp=await page.context().newCDPSession(page);
  assert.equal(await page.locator('#app').evaluate(el=>getComputedStyle(el).touchAction),'none');
  assert.equal(await page.locator('header').evaluate(el=>getComputedStyle(el).userSelect),'none');
  await page.mouse.move(15,30);await page.mouse.down();await page.mouse.move(170,30,{steps:12});await page.mouse.up();
  assert.equal(await page.evaluate(()=>window.getSelection().toString()),'');
  const canceled=await page.evaluate(()=>{
    const gesture=new Event('gesturestart',{bubbles:true,cancelable:true});document.dispatchEvent(gesture);
    const multi=new TouchEvent('touchmove',{bubbles:true,cancelable:true,touches:[new Touch({identifier:1,target:document.body,clientX:100,clientY:200}),new Touch({identifier:2,target:document.body,clientX:200,clientY:200})]});document.dispatchEvent(multi);
    return gesture.defaultPrevented&&multi.defaultPrevented;
  });assert.ok(canceled);
  await cdp.send('Input.synthesizePinchGesture',{x:180,y:300,scaleFactor:1.5,relativeSpeed:800,gestureSourceType:'touch'});
  assert.equal(await page.evaluate(()=>visualViewport.scale),1);
  await page.screenshot({path:'tests/first-mobile.png'});
  await page.locator('#settings').click();await page.selectOption('#mode','practice');await page.selectOption('#checkpoint','n');await page.uncheck('#timed');await page.getByRole('button',{name:'適用',exact:true}).click();
  assert.deepEqual((await state()).position,{x:1570,y:775});
  await page.locator('#start').click();assert.equal((await state()).previewing,false);assert.equal((await state()).settings.timed,false);
  await page.locator('#settings').click();await page.selectOption('#stageId','prototype');assert.equal(await page.inputValue('#limit'),'90');await page.getByRole('button',{name:'適用',exact:true}).click();assert.equal((await state()).stageId,'prototype');
  await page.goto('http://127.0.0.1:5173/?dev=1');await page.waitForSelector('canvas');await page.locator('#settings').click();
  await page.selectOption('#checkpoint','zigzag');await page.fill('#elapsed','20');await page.check('#invincible');await page.check('#hitboxes');await page.fill('#playerRadius','8');await page.fill('#corridorWidth','48');await page.fill('#playerSpeed','2');await page.getByRole('button',{name:'適用',exact:true}).click();
  p=await state();assert.equal(p.time,20);assert.equal(p.settings.playerRadius,8);assert.equal(p.settings.corridorWidth,48);
  await page.locator('#start').click();await page.waitForTimeout(100);assert.ok((await state()).time>20);
  await page.screenshot({path:'tests/first-developer.png'});
  for(const [width,height] of [[320,568],[430,932],[1440,900]]) {await page.setViewportSize({width,height});await page.waitForTimeout(100);assert.ok(await page.locator('#stick').isVisible());assert.ok(await page.locator('#retry').isVisible());assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
  assert.deepEqual(errors,[]);
  console.log('PASS 1st: preview timer/time frozen, automatic start return, second skip, movement/release, practice, stage switch, developer size/width/time, four viewports');
} finally {await browser.close();}

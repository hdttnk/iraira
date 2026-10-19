import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:5173/?dev=1&stage=prototype');await page.waitForSelector('canvas');
 const state=()=>page.evaluate(()=>window.__precision());
 const cdp=await page.context().newCDPSession(page);
 const center=async selector=>{await page.locator(selector).scrollIntoViewIfNeeded();const b=await page.locator(selector).boundingBox();return {x:b.x+b.width/2,y:b.y+b.height/2};};
 const tap=async selector=>{const p=await center(selector);await page.touchscreen.tap(p.x,p.y);};
 await page.evaluate(()=>{for(const id of ['start','retry','settings'])document.getElementById(id).addEventListener('click',()=>{const el=document.getElementById(id);el.dataset.clicks=String(Number(el.dataset.clicks??0)+1);});});
 await tap('#start');assert.equal((await state()).state,'playing');assert.equal(await page.locator('#start').getAttribute('data-clicks'),'1');
 // Real touch drag + immediate release; canceling touchstart must not break pointer movement.
 const stick=await center('#stick');
 const start=()=>cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[stick]});
 const move=(x,y)=>cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y}]});
 const end=()=>cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 const initial=(await state()).position.y;
 await start();await move(stick.x,stick.y-35);await page.waitForTimeout(150);await end();
 await page.waitForTimeout(35);const stopped=(await state()).position.y;assert.ok(stopped<initial);await page.waitForTimeout(100);assert.equal((await state()).position.y,stopped);
 // Rapid directional changes until collision, then lift finger and immediately tap retry twice.
 await start();await move(stick.x+44,stick.y);await page.waitForFunction(()=>window.__precision().state==='failed');await move(stick.x-44,stick.y);await end();
 await tap('#retry');await tap('#retry');assert.equal(await page.locator('#retry').getAttribute('data-clicks'),'2');assert.equal((await state()).state,'playing');assert.equal((await state()).viewportScale,1);
 await page.waitForTimeout(350);assert.equal((await state()).viewportScale,1);
 // A drag onto a button is not a tap and must not activate it.
 const retry=await center('#retry');await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[retry]});await move(retry.x-100,retry.y);await end();assert.equal(await page.locator('#retry').getAttribute('data-clicks'),'2');
 // Multi-touch on a button must never synthesize a button action.
 const blocked=await page.evaluate(()=>{
  const b=document.getElementById('retry'),r=b.getBoundingClientRect();const t1=new Touch({identifier:100,target:b,clientX:r.x+5,clientY:r.y+5}),t2=new Touch({identifier:101,target:b,clientX:r.x+20,clientY:r.y+5});
  const ev=new TouchEvent('touchstart',{bubbles:true,cancelable:true,touches:[t1,t2],changedTouches:[t1,t2]});b.dispatchEvent(ev);return ev.defaultPrevented;
 });assert.ok(blocked);assert.equal(await page.locator('#retry').getAttribute('data-clicks'),'2');
 await tap('#settings');assert.ok(await page.locator('#panel').isVisible());assert.equal(await page.locator('#settings').getAttribute('data-clicks'),'1');
 assert.equal(await page.locator('#checkpoint').evaluate(el=>getComputedStyle(el).fontSize),'16px');
 const input=await page.locator('#limit').evaluate(el=>{
  const touch=new Touch({identifier:9,target:el,clientX:1,clientY:1});const ev=new TouchEvent('touchstart',{bubbles:true,cancelable:true,touches:[touch],changedTouches:[touch]});el.dispatchEvent(ev);return !ev.defaultPrevented;
 });assert.ok(input);
 // Native one-finger dialog scroll starts outside guarded game content.
 const dialog=await page.locator('#panel').evaluate(el=>{
  const touch=new Touch({identifier:10,target:el,clientX:100,clientY:200});const ev=new TouchEvent('touchmove',{bubbles:true,cancelable:true,touches:[touch],changedTouches:[touch]});el.dispatchEvent(ev);return !ev.defaultPrevented;
 });assert.ok(dialog);
 await page.locator('#limit').fill('120');
 const scrollBefore=await page.locator('#panel').evaluate(el=>el.scrollTop);await cdp.send('Input.synthesizeScrollGesture',{x:180,y:450,yDistance:-500,gestureSourceType:'touch'});assert.ok(await page.locator('#panel').evaluate((el,before)=>el.scrollTop>before,scrollBefore));
 await tap('button[type=submit]');assert.equal((await state()).settings.limit,120);assert.equal(await page.locator('#panel').isVisible(),false);
 await tap('#start');assert.equal((await state()).state,'playing');assert.equal((await state()).viewportScale,1);
 await cdp.send('Input.synthesizePinchGesture',{x:180,y:300,scaleFactor:1.5,relativeSpeed:800,gestureSourceType:'touch'});assert.equal((await state()).viewportScale,1);
 // Touchend is blocked even when no pointer/tap remains after a collision or cancellation.
 assert.ok(await page.locator('#stick').evaluate(el=>{const ev=new TouchEvent('touchend',{bubbles:true,cancelable:true,touches:[],changedTouches:[]});el.dispatchEvent(ev);return ev.defaultPrevented;}));
 await page.screenshot({path:'tests/touch-guards-mobile.png'});
 assert.deepEqual(errors,[]);console.log('PASS: touch buttons once, rapid retry twice, touch drag/release, collision+direction change+lift, drag rejection, multi-touch rejection, native settings editing/scroll, apply, touchend cancellation, pinch scale');
}finally{await browser.close();}

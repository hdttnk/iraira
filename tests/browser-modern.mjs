import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'chrome',headless:true});
try {
 const page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true,deviceScaleFactor:2});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const state=()=>page.evaluate(()=>window.__precision());
 await page.goto('http://127.0.0.1:5173/?stage=prototype');await page.waitForSelector('canvas');
 assert.equal(await page.locator('#app').getAttribute('data-skin'),'modern');
 await page.screenshot({path:'tests/modern-title.png'});
 await page.locator('#start').click();await page.keyboard.down('ArrowUp');await page.waitForTimeout(200);await page.keyboard.up('ArrowUp');await page.waitForTimeout(40);const stopped=(await state()).position.y;assert.ok(stopped<1550);await page.waitForTimeout(100);assert.equal((await state()).position.y,stopped);
 await page.screenshot({path:'tests/modern-start.png'});
 await page.locator('#settings').click();await page.selectOption('#mode','practice');await page.selectOption('#checkpoint','windmill');await page.uncheck('#timed');await page.getByRole('button',{name:'適用',exact:true}).click();await page.locator('#start').click();await page.waitForTimeout(150);await page.screenshot({path:'tests/modern-rotor.png'});
 await page.locator('#settings').click();await page.selectOption('#checkpoint','press');await page.getByRole('button',{name:'適用',exact:true}).click();await page.locator('#start').click();await page.waitForTimeout(150);await page.screenshot({path:'tests/modern-press.png'});
 for(const [width,height]of [[320,568],[430,932],[1440,900]]){await page.setViewportSize({width,height});await page.waitForTimeout(80);assert.ok(await page.locator('#stick').isVisible());assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
 await page.locator('#settings').click();await page.selectOption('#stageId','second');await page.getByRole('button',{name:'適用',exact:true}).click();await page.waitForTimeout(100);assert.equal(await page.locator('#app').getAttribute('data-skin'),'modern');assert.equal(await page.locator('h1').textContent(),'PRECISION');
 assert.deepEqual(errors,[]);console.log('PASS modern trial: title, movement/release, rotor/press practice, four viewports, copper skin retained on stage switch, no page errors');
} finally {await browser.close();}

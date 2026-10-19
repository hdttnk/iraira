import {chromium} from '@playwright/test';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true,deviceScaleFactor:2});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const state=()=>page.evaluate(()=>window.__precision());
 for(const [id,checkpoint]of [['first','hairpin'],['second','narrow'],['third','windmills']]){
  const data=JSON.parse(readFileSync(`docs/stages/${id}-stage-data.json`,'utf8'));
  await page.goto(`http://127.0.0.1:5173/?stage=${id}`);await page.waitForSelector('canvas');
  assert.equal(await page.locator('#app').getAttribute('data-skin'),'modern');
  await page.locator('#settings').click();await page.selectOption('#mode','practice');await page.selectOption('#checkpoint',checkpoint);await page.uncheck('#timed');await page.getByRole('button',{name:'適用',exact:true}).click();await page.locator('#start').click();await page.waitForTimeout(100);
  assert.deepEqual((await state()).position,data.checkpoints[checkpoint]);assert.equal((await state()).state,'playing');
  await page.screenshot({path:`tests/copper-${id}.png`});
  if(id==='second'){
   await page.keyboard.down('ArrowRight');await page.waitForTimeout(800);await page.keyboard.up('ArrowRight');assert.equal((await state()).state,'playing');await page.waitForTimeout(40);const x=(await state()).position.x;await page.waitForTimeout(100);assert.equal((await state()).position.x,x);await page.screenshot({path:'tests/copper-second-narrow.png'});
   await page.keyboard.down('ArrowDown');await page.waitForFunction(()=>window.__precision().state==='failed');await page.keyboard.up('ArrowDown');assert.equal((await state()).failureBurstCount,1);await page.locator('#retry').click();assert.equal((await state()).state,'playing');
  }
  if(id==='third'){
   await page.locator('#settings').click();await page.selectOption('#checkpoint','press');await page.getByRole('button',{name:'適用',exact:true}).click();await page.locator('#start').click();await page.waitForTimeout(150);await page.screenshot({path:'tests/copper-third-press.png'});
  }
  for(const [width,height]of [[320,568],[430,932],[1440,900]]){await page.setViewportSize({width,height});await page.waitForTimeout(60);assert.ok(await page.locator('#stick').isVisible());assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
  await page.setViewportSize({width:390,height:844});
 }
 assert.deepEqual(errors,[]);console.log('PASS copper all stages: shared skin, practice spawns, narrow passage/release/contact/burst/retry, 3rd rotor and press, four viewports, no errors');
}finally{await browser.close();}

import {assertGeometryClose} from './assert-geometry';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {second} from '../src/stages/legacy/second';
import {Simulation,defaults} from '../src/engine';
function simulation(checkpoint='start'){return new Simulation({...defaults,limit:second.limit,mode:'practice',checkpoint},second);}
function move(s:Simulation,target:{x:number;y:number}) {
  for(let i=0;i<4000&&s.state==='playing';i++) {
    const dx=target.x-s.position.x,dy=target.y-s.position.y,d=Math.hypot(dx,dy);if(d<.65)return;
    const amount=d<1.1?.55:1;s.advance(1/120,{x:dx/d*amount,y:dy/d*amount});
  }
  assert.ok(s.state==='playing'||s.state==='clear',`${s.reason} at ${JSON.stringify(s.position)}, target=${JSON.stringify(target)}`);
}
test('2nd completes entire route without invincibility, including spiral reversal',()=>{
  const s=simulation();s.start();for(const target of second.route.slice(1))move(s,target);
  assert.equal(s.state,'clear');assert.ok(s.remaining>0);console.log(`2nd clear ${s.time.toFixed(2)}s, remaining ${s.remaining.toFixed(2)}s`);
});
test('2nd every practice checkpoint is safe and resets consistently',()=>{
  for(const [id,p] of Object.entries(second.checkpoints)){const s=simulation(id);assert.ok(!s.hitsWall(p,6),id);s.start();s.advance(.02,{x:0,y:0});assert.equal(s.state,'playing',id);s.reset();assert.deepEqual(s.position,p);}
});
test('2nd rest stops countdown, exiting resumes, front deadline is enforced',()=>{
  const s=simulation('rest');s.start();move(s,{x:2240,y:850});assert.ok(s.timerStarted);assert.ok(s.resting);const before=s.remaining;
  for(let i=0;i<120;i++)s.advance(1/120,{x:0,y:0});assert.equal(s.remaining,before);
  move(s,{x:2350,y:850});assert.ok(!s.resting);assert.ok(s.remaining<before);
  const t=new Simulation({...defaults,limit:.1},second);t.start();t.advance(.1,{x:1,y:0});assert.equal(t.reason,'前半の制限時間超過');
});
test('2nd supported width/radius extremes can traverse and remain separated',()=>{
  for(const [corridorWidth,playerRadius]of [[36,10],[52,3]]){const s=new Simulation({...defaults,limit:180,corridorWidth,playerRadius},second);s.start();for(const p of second.route.slice(1))move(s,p);assert.equal(s.state,'clear');}
  // Adjacent Iroha rows must not connect vertically through the intervening wall.
  const s=new Simulation({...defaults,mode:'developer',custom:true,spawnX:2800,spawnY:350,corridorWidth:52},second);s.start();s.advance(.2,{x:0,y:1});assert.equal(s.state,'failed');
});
test('2nd has one connected route with no unintended loops or crossovers at all widths',async()=>{
  const {makeCourseGeometry}=await import('../src/course-geometry');
  for(const width of [36,44,52]){const g=makeCourseGeometry(second,width)!;assert.equal(g.polygons.length,1);assert.equal(g.polygons[0].length,1,`unexpected shortcut loop width=${width}`);}
});
test('2nd overview export matches runtime geometry',async()=>{
  const {readFileSync}=await import('node:fs');const {makeCourseGeometry}=await import('../src/course-geometry');
  const saved=JSON.parse(readFileSync('docs/stages/legacy/second-stage-data.json','utf8'));assertGeometryClose(saved.geometry,makeCourseGeometry(second));assert.deepEqual(saved.route,second.route);assert.deepEqual(saved.rest,second.rest);
});

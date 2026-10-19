import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation,defaults} from '../src/engine';
import {first} from '../src/stages/legacy/first';
import {makeCourseGeometry,hitsCourseWall} from '../src/course-geometry';
import {obstaclesAt} from '../src/stage';
const near=(a:number,b:number)=>assert.ok(Math.abs(a-b)<1e-6);
function follow(route:typeof first.route,width=44,playerRadius=6) {
  const s=new Simulation({...defaults,limit:first.limit,corridorWidth:width,playerRadius},first);s.start();
  for(const target of route.slice(1)) {
    for(let i=0;i<3000&&s.state==='playing';i++) {
      const dx=target.x-s.position.x,dy=target.y-s.position.y,d=Math.hypot(dx,dy);
      if(d<.65)break;
      // Slow only for the last 1px to hit route vertices without overshooting.
      const amount=d<1.1?.55:1;
      s.advance(1/120,{x:dx/d*amount,y:dy/d*amount});
    }
    assert.ok(s.state==='playing'||s.state==='clear',`${s.reason} at ${JSON.stringify(s.position)}, target ${JSON.stringify(target)}`);
  }
  assert.equal(s.state,'clear');assert.ok(s.time<first.limit);return s.time;
}
test('1st normal complete without invincibility within stage limit',()=>{console.log(`1st clear ${follow(first.route).toFixed(2)}s`);});
test('1st lower fork also reaches goal',()=>{
  const branch=first.branches[0],start=first.route.findIndex(p=>p.x===branch[0].x&&p.y===branch[0].y),end=first.route.findIndex(p=>p.x===branch.at(-1)!.x&&p.y===branch.at(-1)!.y);
  assert.ok(start>=0&&end>start);follow([...first.route.slice(0,start),...branch,...first.route.slice(end+1)]);
});
test('all first checkpoints safe, retry, developer stage time, no invented moving traps',()=>{
  const geometry=makeCourseGeometry(first)!;
  for(const [id,p] of Object.entries(first.checkpoints)) {
    assert.ok(!hitsCourseWall(p,6,geometry),id);
    const s=new Simulation({...defaults,limit:first.limit,mode:'practice',checkpoint:id},first);assert.deepEqual(s.position,p);s.start();s.advance(.1,{x:0,y:0});s.reset();assert.deepEqual(s.position,p);
  }
  const d=new Simulation({...defaults,mode:'developer',elapsed:20,checkpoint:'crank'},first);near(d.time,20);
  assert.deepEqual(obstaclesAt(20,first),[]);
});
test('configured widths and player radius preserve passage at supported extremes',()=>{follow(first.route,36,10);follow(first.route,52,3);});
test('1st failure, timeout, stage switching preserves prototype',()=>{
  const s=new Simulation({...defaults,limit:first.limit},first);s.start();s.advance(.2,{x:0,y:1});assert.equal(s.state,'failed');s.reset();assert.deepEqual(s.position,first.checkpoints.start);
  const t=new Simulation({...defaults,limit:.01},first);t.start();t.advance(.1,{x:1,y:0});assert.equal(t.reason,'タイムアップ');
});
test('saved overview input matches current runtime geometry',async()=>{
  const {readFileSync}=await import('node:fs');
  const saved=JSON.parse(readFileSync('docs/stages/legacy/first-stage-data.json','utf8'));
  assert.deepEqual(saved.geometry,makeCourseGeometry(first));assert.deepEqual(saved.route,first.route);
  assert.deepEqual(saved.branches,first.branches);assert.deepEqual(saved.checkpoints,first.checkpoints);assert.deepEqual(saved.goal,first.goal);
});
test('hairpin outbound/return lanes cannot be crossed horizontally at any supported width',()=>{
  const point=(x:number,y:number)=>({x:Math.round((80+(x+Math.max(0,Math.min(x,740)-435)-40)*2.2)*10)/10,y:Math.round((80+(y-190)*2.2)*10)/10});
  // Source-space intersections with the actual long straight sides of each turn.
  const cuts=[
    [566+(600-566)*(344-320)/(344-252),619+(560-619)*(320-254)/(479-254),320],
    [641+(698-641)*(477-400)/(477-318),719+(668-719)*(400-320)/(454-320),400],
    [681+(724-681)*(469-440)/(469-420),742+(728-742)*(440-423)/(452-423),440],
  ];
  for(const width of [36,44,52]) for(const [a,b,y] of cuts) {
    for(const reverse of [false,true]) {
      const from=point(reverse?b:a,y),to=point(reverse?a:b,y);
      const s=new Simulation({...defaults,mode:'developer',custom:true,spawnX:from.x,spawnY:from.y,corridorWidth:width},first);
      assert.ok(!s.hitsWall(from,6),'cut must start on a clear lane');
      s.start();for(let i=0;i<240&&s.state==='playing'&&Math.abs(s.position.x-to.x)>1;i++)s.advance(1/120,{x:Math.sign(to.x-from.x),y:0});
      assert.equal(s.state,'failed',`shortcut width=${width} y=${y} reverse=${reverse}`);
    }
  }
});

import {test} from 'node:test';
import assert from 'node:assert/strict';
import {stages,obstaclesAt} from '../src/stage';
import {Simulation,defaults,circleRect} from '../src/engine';
import {simple,runRevisedThird,move} from './revised-driver';
test('mobile compaction preserves moving traps, rotor rooms and refuge dimensions',async()=>{
 const {readFileSync}=await import('node:fs');
 const before=JSON.parse(readFileSync('docs/stages/pre-compaction/third-stage-data.json','utf8'));
 const data=stages.third;
 for(const key of ['windmills','singlePresses','chambers','rooms'] as const)assert.deepEqual(data[key],before[key],key);
 for(const id of ['first','second','third']){
  const old=JSON.parse(readFileSync(`docs/stages/pre-compaction/${id}-stage-data.json`,'utf8'));
  const length=(r:{x:number;y:number}[])=>r.slice(1).reduce((sum,p,i)=>sum+Math.hypot(p.x-r[i].x,p.y-r[i].y),0);
  assert.ok(length(stages[id].route)<length(old.route)*.93,'transit must be meaningfully shorter');
  assert.equal(stages[id].corridorWidth,old.corridorWidth);assert.equal(stages[id].limit,old.limit);
 }
});
test('2nd narrow straight has abrupt lower-side 30px passage with a fixed bottom wall',()=>{
 const data=stages.second,s=new Simulation({...defaults},data);
 assert.equal(s.hitsWall({x:1500,y:865.99},6),false);
 assert.equal(s.hitsWall({x:1500,y:866},6),true);
 assert.equal(s.hitsWall({x:1500,y:848},6),true);
 assert.equal(s.hitsWall({x:1950,y:865},6),false,'rest/exit retains standard width');
 for(const [corridorWidth,playerRadius]of [[36,10],[44,6],[52,3]]){
  const check=new Simulation({...defaults,corridorWidth,playerRadius},data);
  for(let x=1190;x<=1900;x+=2){const y=x<1210?850+(x-1190)*7/20:x<=1820?857:x<1840?857-(x-1820)*7/20:850;assert.equal(check.hitsWall({x,y},playerRadius),false,`transition x=${x}, width=${corridorWidth}`);}
  const bottom=850+corridorWidth/2;
  assert.equal(check.hitsWall({x:1500,y:bottom-playerRadius+.01},playerRadius),true);
 }
 assert.equal(s.hitsWall({x:1210,y:835},6),false);
 assert.equal(s.hitsWall({x:1230,y:835},6),true,'upper wall changes abruptly');
 for(const x of [1200,1500,1850]){assert.equal(s.hitsWall({x,y:865.99},6),false);assert.equal(s.hitsWall({x,y:866},6),true,'bottom wall stays fixed');}
 const fast=new Simulation({...defaults,mode:'developer',custom:true,spawnX:1500,spawnY:850,maxSpeed:500,playerSpeed:4},data);fast.start();fast.advance(.1,{x:0,y:1});assert.equal(fast.state,'failed');
});
test('revised 1st and 2nd clear using real collision at supported sizes',()=>{
 for(const id of ['first','second'])for(const [corridorWidth,playerRadius]of [[44,6],[36,10],[52,3]]){const s=simple(stages[id],{corridorWidth,playerRadius});console.log(`${id} width=${corridorWidth}: ${s.time.toFixed(2)}s`);}
});
test('revised 3rd upper route clears without invincibility',()=>{const s=runRevisedThird(stages.third);console.log(`3rd upper ${s.time.toFixed(2)}s remaining=${s.remaining.toFixed(2)}`);});
test('revised 3rd lower route clears without invincibility',()=>{const s=runRevisedThird(stages.third,true);console.log(`3rd lower ${s.time.toFixed(2)}s`);});
test('revised 3rd moving traps clear at both supported size extremes',()=>{
 runRevisedThird(stages.third,false,{corridorWidth:36,playerRadius:10});
 runRevisedThird(stages.third,true,{corridorWidth:52,playerRadius:3});
});
test('revised practice checkpoints safe, retry and obstacle states reproducible',()=>{
 for(const data of [stages.first,stages.second,stages.third])for(const [checkpoint,p]of Object.entries(data.checkpoints)){const s=new Simulation({...defaults,mode:'practice',checkpoint,limit:data.limit},data);s.start();s.advance(.1,{x:0,y:0});assert.equal(s.state,'playing',`${data.id}/${checkpoint}`);s.reset();assert.deepEqual(s.position,p);}
 assert.equal(obstaclesAt(0,stages.third).filter(b=>b.kind==='press').length,4);
});
test('3rd rest covers first descent only and countdown resumes after bottom turn',()=>{
 const s=new Simulation({...defaults,mode:'practice',checkpoint:'elevator',limit:240},stages.third);s.start();move(s,{x:2550,y:900});assert.ok(s.resting);assert.equal(s.remaining,240);move(s,{x:2550,y:950});move(s,{x:2650,y:950});assert.ok(!s.resting);assert.ok(s.remaining<240);
});
test('four single presses sweep the passage while their opposite pockets stay safe',()=>{
 const data=stages.third;
 for(const p of data.singlePresses!){
  const s=new Simulation({...defaults,mode:'developer',custom:true,spawnX:p.x,spawnY:850},data);s.start();
  for(let i=0;i<120*7&&s.state==='playing';i++)s.advance(1/120,{x:0,y:0});assert.equal(s.state,'failed');
  const pocket={x:p.x,y:p.side==='top'?925:775};
  const safe=new Simulation({...defaults,mode:'developer',custom:true,spawnX:pocket.x,spawnY:pocket.y,playerRadius:10},data);safe.start();
  for(let i=0;i<120*7;i++)safe.advance(1/120,{x:0,y:0});assert.equal(safe.state,'playing');
 }
});
test('closed presses leave no player-sized gap on either wall, even at minimum radius',()=>{
 const data=stages.third,s=new Simulation({...defaults},data);
 for(const press of data.singlePresses!){
  const closed=obstaclesAt(press.period/2,data).filter(b=>b.kind==='press').find(b=>b.x===press.x)!;
  for(const radius of [3,6,10])for(let y=790+radius;y<=910-radius;y+=.5){
   const q={x:press.x,y};assert.ok(s.hitsWall(q,radius)||circleRect(q,radius,closed,true),`wall hiding gap at x=${q.x}, y=${y}, r=${radius}`);
  }
  // The pocket must remain reachable while open and safe when fully closed.
  const sign=press.side==='top'?1:-1;
  for(let d=0;d<=75;d+=1){const q={x:press.x,y:850+sign*d};assert.equal(s.hitsWall(q,10),false);assert.equal(obstaclesAt(0,data).some(b=>circleRect(q,10,b,true)),false);}
  const pocket={x:press.x,y:850+sign*75};assert.equal(circleRect(pocket,10,closed,true),false);
 }
});
test('active PNG data matches runtime boundaries, rest and dynamic obstacles',async()=>{
 const {readFileSync}=await import('node:fs');const {makeCourseGeometry}=await import('../src/course-geometry');
 for(const id of ['first','second','third']){
  const data=stages[id],saved=JSON.parse(readFileSync(`docs/stages/${id}-stage-data.json`,'utf8'));
  assert.deepEqual(saved.geometry,makeCourseGeometry(data));assert.deepEqual(saved.obstacles,obstaclesAt(saved.obstacleTime,data));assert.deepEqual(saved.rest,data.rest);
  for(const width of [36,44,52]){const g=makeCourseGeometry(data,width)!;assert.equal(g.polygons.length,1);assert.equal(g.polygons[0].length,id==='third'?5:1,'unexpected shortcut or disconnected wall');}
 }
});

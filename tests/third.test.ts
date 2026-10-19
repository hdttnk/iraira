import {test} from 'node:test';
import assert from 'node:assert/strict';
import {runThird} from './third-driver';
import {third} from '../src/stages/legacy/third';
import {Simulation,defaults} from '../src/engine';
import {obstaclesAt} from '../src/stage';
test('3rd upper route clears with real rotating blades and four moving presses',()=>{const s=runThird();console.log(`3rd upper clear ${s.time.toFixed(2)}s, remaining ${s.remaining.toFixed(2)}`);});
test('3rd lower branch clears through opposite rotor and Nakasendo',()=>{const s=runThird(true);console.log(`3rd lower clear ${s.time.toFixed(2)}s`);});
test('all 3rd practice starts are initially safe, replay is deterministic',()=>{
  for(const [checkpoint,p]of Object.entries(third.checkpoints)){
    const s=new Simulation({...defaults,mode:'practice',checkpoint,limit:240},third);s.start();s.advance(.1,{x:0,y:0});assert.equal(s.state,'playing',checkpoint);s.reset();assert.deepEqual(s.position,p);
  }
  assert.equal(obstaclesAt(0,third).filter(r=>r.kind==='windmill').length,24);assert.equal(obstaclesAt(0,third).filter(r=>r.kind==='press').length,8);
  assert.notDeepEqual(obstaclesAt(0,third),obstaclesAt(1,third));assert.deepEqual(obstaclesAt(20,third),obstaclesAt(20,third));
});
test('rotor and press hit a stationary player; offscreen motion, retry and elapsed time repeat',()=>{
  for(const [x,y,duration]of [[1180,650,2],[3230,850,4]]){
    const s=new Simulation({...defaults,mode:'developer',custom:true,spawnX:x,spawnY:y,limit:240},third);s.start();
    for(let i=0;i<120*duration&&s.state==='playing';i++)s.advance(1/120,{x:0,y:0});assert.equal(s.state,'failed',`trap ${x}`);
  }
  const s=new Simulation({...defaults,mode:'developer',elapsed:20,limit:240},third);s.start();
  assert.deepEqual(obstaclesAt(s.time,third),obstaclesAt(20,third));s.advance(.1,{x:0,y:0});const moved=obstaclesAt(s.time,third);
  s.reset();s.start();s.advance(.1,{x:0,y:0});assert.deepEqual(obstaclesAt(s.time,third),moved);
});
test('3rd both supported size extremes can complete moving traps',()=>{
  runThird(false,{corridorWidth:36,playerRadius:10});runThird(true,{corridorWidth:52,playerRadius:3});
});
test('3rd exported moving shapes and polygon match runtime',async()=>{
  const {readFileSync}=await import('node:fs');const {makeCourseGeometry}=await import('../src/course-geometry');
  const saved=JSON.parse(readFileSync('docs/stages/legacy/third-stage-data.json','utf8'));
  assert.deepEqual(saved.geometry,makeCourseGeometry(third));assert.deepEqual(saved.obstacles,obstaclesAt(saved.obstacleTime,third));assert.deepEqual(saved.branches,third.branches);assert.deepEqual(saved.checkpoints,third.checkpoints);
});
test('windmill hubs and elevator partitions cannot be used as shortcuts',async()=>{
  const {makeCourseGeometry}=await import('../src/course-geometry');
  for(const corridorWidth of [36,44,52]){
    const s=new Simulation({...defaults,corridorWidth},third);
    for(const w of third.windmills)assert.ok(s.hitsWall(w,6));
    const g=makeCourseGeometry(third,corridorWidth)!;assert.equal(g.polygons.length,1);assert.equal(g.polygons[0].length,2,'only the intended upper/lower branch may form a loop');
  }
  const s=new Simulation({...defaults,mode:'developer',custom:true,spawnX:2550,spawnY:700,maxSpeed:500,playerSpeed:4},third);s.start();s.advance(.1,{x:1,y:0});assert.equal(s.state,'failed');
});
test('fast rotor cannot sweep through a stationary circle unnoticed',()=>{
  const s=new Simulation({...defaults,mode:'developer',custom:true,spawnX:1180,spawnY:650,obstacleSpeed:4},third);s.start();s.advance(.2,{x:0,y:0});assert.equal(s.state,'failed');
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Simulation, defaults, velocity, circleRect } from '../src/engine';
import { obstaclesAt, stage, walls } from '../src/stage';
const near = (a:number,b:number) => assert.ok(Math.abs(a-b)<1e-6, `${a} != ${b}`);
test('analog curve: dead zone, precision speed, max speed, diagonal normalization, release',()=>{
  assert.deepEqual(velocity({x:.04,y:0},defaults),{x:0,y:0});
  const low=velocity({x:.2,y:0},defaults).x;
  assert.ok(low>0 && low<15); near(velocity({x:1,y:0},defaults).x,125);
  const d=velocity({x:1,y:1},defaults); near(Math.hypot(d.x,d.y),125);
  const s=new Simulation(); s.start(); s.advance(.1,{x:0,y:-1}); const p={...s.position}; s.advance(.1,{x:0,y:0}); assert.deepEqual(s.position,p);
});
test('circle vs rotated rectangle and tangent contact',()=>{
  assert.ok(circleRect({x:16,y:0},6,{x:0,y:0,w:20,h:10},true));
  assert.ok(circleRect({x:0,y:20},6,{x:0,y:0,w:40,h:4,angle:Math.PI/2},true));
  assert.ok(!circleRect({x:20,y:0},6,{x:0,y:0,w:40,h:4,angle:Math.PI/2},true));
});
test('wall collision cannot tunnel even at developer maximum speed',()=>{
  const s=new Simulation({...defaults,mode:'developer',maxSpeed:500,playerSpeed:4}); s.start();
  s.advance(.2,{x:1,y:0}); assert.equal(s.state,'failed'); assert.ok(s.position.x<235);
});
test('obstacles run offscreen, reproducible retry, stage-time spawn',()=>{
  const s=new Simulation(); s.start(); s.advance(.2,{x:0,y:0}); assert.ok(s.time>.19);
  assert.notDeepEqual(obstaclesAt(0),obstaclesAt(s.time));
  const first=obstaclesAt(s.time); s.reset();s.start();s.advance(.2,{x:0,y:0});assert.deepEqual(obstaclesAt(s.time),first);
  const d=new Simulation({...defaults,mode:'developer',elapsed:20,checkpoint:'windmill'});
  near(d.time,20);assert.deepEqual(d.position,stage.checkpoints.windmill);assert.deepEqual(obstaclesAt(d.time),obstaclesAt(20));
});
test('practice checkpoint retry and timer off',()=>{
  const s=new Simulation({...defaults,mode:'practice',checkpoint:'press',timed:false});assert.deepEqual(s.position,stage.checkpoints.press);
  s.start();s.advance(.2,{x:0,y:0});near(s.remaining,90);s.reset();assert.deepEqual(s.position,stage.checkpoints.press);
});
test('frame rate independent at 30,60,120 Hz',()=>{
  const runs=[30,60,120].map(hz=>{const s=new Simulation();s.start();for(let i=0;i<hz;i++)s.advance(1/hz,{x:0,y:-1});return s;});
  for(const s of runs){near(s.time,1);near(s.position.y,1425);assert.equal(s.state,'playing');}
});
test('moving rotor and press hit stationary player, including full closure sweep',()=>{
  const w=new Simulation({...defaults,mode:'developer',custom:true,spawnX:720,spawnY:600,elapsed:0});w.start();w.advance(.01,{x:0,y:0});assert.equal(w.state,'failed');
  const p=new Simulation({...defaults,mode:'developer',checkpoint:'press',custom:true,spawnX:1100,spawnY:850});p.start();
  for(let i=0;i<300&&p.state==='playing';i++)p.advance(1/120,{x:0,y:0});assert.equal(p.state,'failed');
});
test('developer speed, invincibility, frozen countdown, elapsed phase',()=>{
  const s=new Simulation({...defaults,mode:'developer',invincible:true,freeze:true,obstacleSpeed:2,playerSpeed:2,custom:true,spawnX:10,spawnY:10});s.start();s.advance(.1,{x:1,y:0});
  assert.equal(s.state,'playing');near(s.position.x,35);near(s.time,.2);near(s.remaining,90);
});
test('timeout, goal, stall pause and timer restart',()=>{
  const s=new Simulation({...defaults,limit:.01});s.start();s.advance(.02,{x:0,y:-1});assert.equal(s.state,'failed');assert.equal(s.reason,'タイムアップ');
  const g=new Simulation({...defaults,mode:'developer',custom:true,spawnX:1280,spawnY:190});g.start();g.advance(.01,{x:0,y:0});assert.equal(g.state,'clear');
  const a=new Simulation();a.start();a.advance(1,{x:1,y:0});assert.equal(a.state,'paused');near(a.time,0);
});
test('all checkpoints are collision free and complete navigable route can be traversed',()=>{
  for(const p of Object.values(stage.checkpoints))assert.ok(!walls.some(w=>circleRect(p,6,w)));
  // Invincible route confirms connected corridor geometry independently of obstacle timing.
  const route=[{x:200,y:1090},{x:645,y:1090},{x:645,y:760},{x:530,y:760},{x:530,y:480},{x:770,y:480},{x:770,y:600},{x:1100,y:600},{x:1100,y:1010},{x:1280,y:1010},{x:1280,y:180}];
  let from={...stage.checkpoints.start};
  for(const to of route){const len=Math.hypot(to.x-from.x,to.y-from.y);for(let i=0;i<=len;i++){const p={x:from.x+(to.x-from.x)*i/len,y:from.y+(to.y-from.y)*i/len};assert.ok(!walls.some(w=>circleRect(p,6,w)),JSON.stringify(p));}from=to;}
});
test('normal mode full course clear with safe rotor route and timed press passage',()=>{
  const s=new Simulation();s.start();
  const move=(x:number,y:number)=>{
    for(let i=0;i<4000&&s.state==='playing';i++){
      const dx=x-s.position.x,dy=y-s.position.y,d=Math.hypot(dx,dy);
      if(d<1.1)return;
      s.advance(1/120,{x:dx/d,y:dy/d});
    }
    assert.ok(s.state==='playing'||s.state==='clear',`${s.reason} at ${JSON.stringify(s.position)} t=${s.time}`);
  };
  for(const [x,y] of [[200,1090],[645,1090],[645,760],[515,760],[515,455],[785,455],[785,600],[1100,600],[1100,790]])move(x,y);
  while(s.time%stage.press.period>.4&&s.state==='playing')s.advance(1/120,{x:0,y:0});
  for(const [x,y] of [[1100,920],[1100,1010],[1280,1010],[1280,180]])move(x,y);
  assert.equal(s.state,'clear');assert.ok(s.time>=30&&s.time<=60,`course duration ${s.time}`);
});
test('countdown waits for actual movement, continues after release, resets on retry',()=>{
  const s=new Simulation();s.start();
  for(let i=0;i<120;i++)s.advance(1/120,{x:0,y:0});
  near(s.remaining,90);assert.equal(s.timerStarted,false);near(s.time,1);
  s.advance(.1,{x:.04,y:0});near(s.remaining,90);assert.equal(s.timerStarted,false);
  s.advance(.1,{x:0,y:-.2});assert.equal(s.timerStarted,true);assert.ok(s.remaining<90);
  const stopped={...s.position},remaining=s.remaining;
  s.advance(.1,{x:0,y:0});assert.deepEqual(s.position,stopped);near(s.remaining,remaining-.1);
  s.state='paused';s.advance(.1,{x:0,y:0});near(s.remaining,remaining-.1);
  s.start();s.advance(.1,{x:0,y:0});near(s.remaining,remaining-.2);
  s.reset();s.start();s.advance(.1,{x:0,y:0});near(s.remaining,90);assert.equal(s.timerStarted,false);
});

import assert from 'node:assert/strict';
import {Simulation,defaults,circleRect,type Settings} from '../src/engine';
import {obstaclesAt,type Stage,type Vec} from '../src/stage';
export function move(s:Simulation,target:Vec){
 for(let n=0;n<10000&&s.state==='playing';n++){
  const dx=target.x-s.position.x,dy=target.y-s.position.y,d=Math.hypot(dx,dy);if(d<.2)return;
  const speed=Math.min(125,d*120),amount=s.settings.deadZone+(1-s.settings.deadZone)*Math.max(0,(speed-s.settings.minSpeed)/(s.settings.maxSpeed-s.settings.minSpeed))**(1/s.settings.curve);
  s.advance(1/120,{x:dx/d*amount,y:dy/d*amount});
 }
 assert.ok(s.state==='playing'||s.state==='clear',`${s.reason} at ${JSON.stringify(s.position)} t=${s.time}, target ${JSON.stringify(target)}`);
}
export function simple(data:Stage,settings:Partial<Settings>={}){
 const s=new Simulation({...defaults,limit:data.limit,...settings},data);s.start();for(const p of data.route.slice(1))move(s,p);assert.equal(s.state,'clear');return s;
}
// Space/time A*: all returned actions are replayed through real Simulation collisions.
// This searches only the connected rotor chamber, not the remaining static course.
export function rotorPlan(s:Simulation,target:Vec){
 const size=6,dt=2*Math.PI/(.55*6*24),origin={...s.position};
 type Node={x:number;y:number;t:number;g:number;f:number;prev?:Node};
 const heap:Node[]=[];function push(n:Node){let i=heap.length;heap.push(n);while(i){const j=(i-1)>>1;if(heap[j].f<=n.f)break;heap[i]=heap[j];i=j;}heap[i]=n;}
 function pop(){const n=heap[0],v=heap.pop()!;if(heap.length){let i=0;while(i*2+1<heap.length){let j=i*2+1;if(j+1<heap.length&&heap[j+1].f<heap[j].f)j++;if(heap[j].f>=v.f)break;heap[i]=heap[j];i=j;}heap[i]=v;}return n;}
 const pos=(n:{x:number;y:number})=>({x:origin.x+n.x*size,y:origin.y+n.y*size});
 const score=(p:Vec)=>Math.hypot(p.x-target.x,p.y-target.y)/(size*Math.SQRT2);
 const best=new Map<string,number>(),wall=new Map<string,boolean>();
 const boxes=Array.from({length:24},(_,i)=>Array.from({length:5},(_,j)=>obstaclesAt(s.time+(i+j/4)*dt,s.data)));
 const key=(x:number,y:number,t:number)=>`${x},${y},${t%24}`;
 push({x:0,y:0,t:0,g:0,f:score(origin)});let end:Node|undefined,expanded=0;
 while(heap.length&&expanded++<700000){
  const n=pop(),p=pos(n);if(n.g>(best.get(key(n.x,n.y,n.t))??Infinity))continue;
  if(Math.hypot(p.x-target.x,p.y-target.y)<5){end=n;break;}
  for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++){
   const x=n.x+dx,y=n.y+dy,q=pos({x,y});if(q.x<1050||q.x>1900||q.y<190||q.y>970)continue;
   const k=key(x,y,n.t+1),g=n.g+1;if(g>=(best.get(k)??Infinity))continue;
   const wk=`${x},${y}`;let solid=wall.get(wk);if(solid===undefined){solid=s.hitsWall(q,s.settings.playerRadius+1);wall.set(wk,solid);}if(solid)continue;
   let safe=true;
   for(let j=0;j<=4&&safe;j++){
    const a={x:p.x+(q.x-p.x)*j/4,y:p.y+(q.y-p.y)*j/4};
    if(s.hitsWall(a,s.settings.playerRadius+.5)||boxes[n.t%24][j].some(b=>circleRect(a,s.settings.playerRadius+2,b,true)))safe=false;
   }
   if(!safe)continue;best.set(k,g);push({x,y,t:n.t+1,g,f:g+score(q)*1.05,prev:n});
  }
 }
 assert.ok(end,`no rotor path after ${expanded} nodes at t=${s.time}`);
 const route:Node[]=[];for(let n=end;n.prev;n=n.prev)route.unshift(n);
 for(const n of route){const q=pos(n),dx=q.x-s.position.x,dy=q.y-s.position.y,d=Math.hypot(dx,dy);
  if(d<1e-8)s.step(dt,{x:0,y:0});else {const speed=d/dt,amount=s.settings.deadZone+(1-s.settings.deadZone)*((speed-s.settings.minSpeed)/(s.settings.maxSpeed-s.settings.minSpeed))**(1/s.settings.curve);s.step(dt,{x:dx/d*amount,y:dy/d*amount});}
  assert.equal(s.state,'playing',`rotor replay ${s.reason} at ${JSON.stringify(s.position)}, t=${s.time}`);
 }
 move(s,target);
}
export function runRevisedThird(data:Stage,lower=false,settings:Partial<Settings>={}){
 const s=new Simulation({...defaults,limit:data.limit,...settings},data);s.start();
 const entrance=data.checkpoints.windmills;for(const p of data.route.slice(1)){if(p.x===entrance.x&&p.y===entrance.y)break;move(s,p);}move(s,entrance);
 const exit=lower?data.checkpoints.lower:data.checkpoints.upper;rotorPlan(s,exit);
 if(lower){const index=data.branches[0].findIndex(p=>p.x===exit.x&&p.y===exit.y);for(const p of data.branches[0].slice(index+1))move(s,p);}
 const start=data.route.findIndex(p=>p.x===(lower?2450:exit.x)&&p.y===(lower?420:exit.y));
 for(let i=start+1;i<data.route.length;i++){
  const p=data.route[i];if(p.y===850&&p.x>=3180&&p.x<=3800){
   // Replace the annotated centerline by safe stop points on either side of each plate.
   if(p.x!==3180)continue;
   move(s,{x:3155,y:850});
   for(const press of data.singlePresses!){
    const target={x:press.x+70,y:850},from={...s.position},duration=(target.x-from.x)/125;
    let waited=0;
    const safe=()=>Array.from({length:Math.ceil(duration*240)+1},(_,j)=>{const t=Math.min(duration,j/240),q={x:from.x+125*t,y:850};return !obstaclesAt(s.time+t,data).some(b=>circleRect(q,s.settings.playerRadius+.5,b,true));}).every(Boolean);
    while(!safe()&&waited++<120*15)s.advance(1/120,{x:0,y:0});assert.equal(s.state,'playing');assert.ok(waited<1800);move(s,target);
   }
   move(s,{x:3800,y:850});continue;
  }
  move(s,p);
 }
 assert.equal(s.state,'clear',`${s.reason} at ${JSON.stringify(s.position)} t=${s.time}`);return s;
}

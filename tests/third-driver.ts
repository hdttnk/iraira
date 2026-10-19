import assert from 'node:assert/strict';
import {Simulation,defaults,circleRect, type Settings} from '../src/engine';
import {obstaclesAt,type Vec} from '../src/stage';
import {third,rotorPasses} from '../src/stages/legacy/third';
const dt=1/120;
type Step={from:Vec;to:Vec};
const same=(a:Vec,b:Vec)=>Math.hypot(a.x-b.x,a.y-b.y)<.01;
function line(a:Vec,b:Vec):Step[] {
  const n=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/(125*dt)));
  return Array.from({length:n},(_,i)=>({from:{x:a.x+(b.x-a.x)*i/n,y:a.y+(b.y-a.y)*i/n},to:{x:a.x+(b.x-a.x)*(i+1)/n,y:a.y+(b.y-a.y)*(i+1)/n}}));
}
function rotorMotion(r:typeof rotorPasses[number]):Step[] {
  const n=Math.ceil(Math.PI/(.55*dt)),points=Array.from({length:n+1},(_,i)=>({x:r.x+120*Math.cos(Math.PI+r.direction*Math.PI*i/n),y:r.y+120*Math.sin(Math.PI+r.direction*Math.PI*i/n)}));
  return [...line(r.before,points[0]),...points.slice(1).map((p,i)=>({from:points[i],to:p})),...line(points.at(-1)!,r.after)];
}
function safe(motion:Step[],time:number,radius:number):boolean {
  return motion.every((step,i)=>!obstaclesAt(time+(i+.5)*dt,third).some(box=>circleRect({x:(step.from.x+step.to.x)/2,y:(step.from.y+step.to.y)/2},radius+.25,box,true)));
}
function execute(s:Simulation,motion:Step[],wait=false) {
  if(wait) {
    let tries=0;
    while(!safe(motion,s.time,s.settings.playerRadius)&&tries++<3600)s.advance(dt,{x:0,y:0});
    assert.ok(tries<3600,'no safe dynamic window in 30s');assert.equal(s.state,'playing',s.reason);
  }
  for(const step of motion) {
    if(s.state==='clear')break;
    const dx=step.to.x-step.from.x,dy=step.to.y-step.from.y,speed=Math.hypot(dx,dy)/dt;
    const amount=s.settings.deadZone+(1-s.settings.deadZone)*((speed-s.settings.minSpeed)/(s.settings.maxSpeed-s.settings.minSpeed))**(1/s.settings.curve);
    s.advance(dt,{x:dx/Math.hypot(dx,dy)*amount,y:dy/Math.hypot(dx,dy)*amount});
    assert.ok(['playing','clear'].includes(s.state),`${s.reason} at ${JSON.stringify(s.position)}, t=${s.time}`);
  }
}
export function runThird(lower=false,settings:Partial<Settings>={}) {
  const s=new Simulation({...defaults,limit:third.limit,...settings},third);s.start();
  const split=third.route.findIndex(p=>same(p,rotorPasses[0].after)),join=third.route.findIndex(p=>same(p,third.branches[0].at(-1)!));
  const route=lower?[...third.route.slice(0,split),...third.branches[0],...third.route.slice(join+1)]:third.route;
  for(let i=0;i<route.length-1&&s.state==='playing';i++) {
    const rotor=rotorPasses.find(r=>same(route[i],r.before));
    if(rotor) {
      execute(s,rotorMotion(rotor),true);
      const exit=route.findIndex((p,j)=>j>i&&same(p,rotor.after));assert.ok(exit>i);i=exit-1;continue;
    }
    const from=route[i],to=route[i+1];
    if(same(from,to))continue;
    const press=third.presses.some(p=>from.y===850&&to.y===850&&from.x<p.x&&to.x>p.x);
    execute(s,line(from,to),press);
  }
  assert.equal(s.state,'clear',`${s.reason}, t=${s.time}`);
  return s;
}

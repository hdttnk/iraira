import {test} from 'node:test';
import assert from 'node:assert/strict';
import {makeCourseGeometry,hitsCourseWall} from '../src/course-geometry';
import {first} from '../src/stages/legacy/first';
import {Simulation,defaults} from '../src/engine';
test('diagonal visible boundary gives precise circle tangency without grid steps',()=>{
  const data={...first,route:[{x:100,y:100},{x:300,y:300}],branches:[]};
  const g=makeCourseGeometry(data,44)!;
  const at=(offset:number)=>({x:200-offset/Math.SQRT2,y:200+offset/Math.SQRT2});
  assert.equal(hitsCourseWall(at(15.99),6,g),false);
  assert.equal(hitsCourseWall(at(16),6,g),true);
  assert.equal(hitsCourseWall(at(16.01),6,g),true);
  // The long sloping edge is one segment, not a staircase of tiny rectangles.
  assert.ok(g.polygons.flat().some(r=>r.some((a,i)=>i>0&&Math.hypot(a[0]-r[i-1][0],a[1]-r[i-1][1])>280)));
});
test('overlapping corridor joints do not leave internal collision seams',()=>{
  const g=makeCourseGeometry({...first,route:[{x:100,y:100},{x:200,y:100},{x:200,y:200}],branches:[]},44)!;
  for(const p of [{x:195,y:100},{x:200,y:100},{x:200,y:105}])assert.equal(hitsCourseWall(p,10,g),false);
});
test('branch island remains solid and off-course positions fail',()=>{
  const g=makeCourseGeometry(first)!;
  const hole=g.polygons[0][1];assert.ok(hole);
  const p=hole.slice(0,-1).reduce((p,v)=>({x:p.x+v[0]/(hole.length-1),y:p.y+v[1]/(hole.length-1)}),{x:0,y:0});
  assert.ok(hitsCourseWall(p,3,g));assert.ok(hitsCourseWall({x:0,y:0},6,g));
});
test('vector wall cannot be tunneled through at maximum developer speed',()=>{
  const s=new Simulation({...defaults,mode:'developer',maxSpeed:500,playerSpeed:4},first);
  s.start();s.advance(.2,{x:0,y:1});assert.equal(s.state,'failed');assert.ok(s.position.y<first.checkpoints.start.y+22);
});

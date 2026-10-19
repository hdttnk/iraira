import Phaser from 'phaser';
import clipping,{type Pair,type Polygon} from 'polygon-clipping';
import type {Stage,Rect,Vec} from './stage';
import type {CourseGeometry} from './course-geometry';

/** Offset into solid space so the inner edge of the copper tube matches collision. */
function wirePath(ring:Pair[],hole:boolean,distance:number) {
 const points=ring.slice(0,-1);
 const area=points.reduce((sum,p,i)=>{const q=points[(i+1)%points.length];return sum+p[0]*q[1]-q[0]*p[1];},0);
 const sign=(area>0?1:-1)*(hole?-1:1);
 const normal=(a:Pair,b:Pair)=>{const dx=b[0]-a[0],dy=b[1]-a[1],d=Math.hypot(dx,dy);return {x:dy/d*sign,y:-dx/d*sign};};
 return points.map((p,i)=>{
  const a=normal(points[(i+points.length-1)%points.length],p),b=normal(p,points[(i+1)%points.length]);
  const k=distance/Math.max(.1,1+a.x*b.x+a.y*b.y);
  return {x:p[0]+(a.x+b.x)*k,y:p[1]+(a.y+b.y)*k};
 });
}
// Visual treatment only: two copper boundaries suspended against a near-black backdrop.
export function drawCopperWorld(scene:Phaser.Scene,data:Stage,geometry:CourseGeometry|null) {
 const g=scene.add.graphics();
 g.fillStyle(0x050608).fillRect(0,0,data.width,data.height);
 const parts:Polygon[]=data.paths.map(r=>[[[r.x,r.y],[r.x+r.w,r.y],[r.x+r.w,r.y+r.h],[r.x,r.y+r.h]] as Pair[]]);
 const polygons=geometry?.polygons??clipping.union(parts[0],...parts.slice(1));
 for(const poly of polygons)for(const [i,ring]of poly.entries()) {
  // Layered strokes create a cylindrical metallic highlight, entirely wall-side.
  g.lineStyle(16,0xc77848,.035).strokePoints(wirePath(ring,i>0,8),true);
  g.lineStyle(9,0x1e100b,1).strokePoints(wirePath(ring,i>0,4.5),true);
  g.lineStyle(7,0x68371f,1).strokePoints(wirePath(ring,i>0,3.5),true);
  g.lineStyle(5,0xb87345,1).strokePoints(wirePath(ring,i>0,3.5),true);
  g.lineStyle(3,0xdfa16a,.95).strokePoints(wirePath(ring,i>0,3),true);
  g.lineStyle(1,0xffdab0,.85).strokePoints(wirePath(ring,i>0,1.5),true);
 }
 const marks=scene.add.graphics();
 // Quiet, widely spaced inlaid direction markers, never mistaken for a wall.
 const arrows:[number,number,number][]=data.id==='prototype'?[[200,1390,-Math.PI/2],[200,1260,-Math.PI/2],[330,1090,0],[470,1090,0],[645,960,-Math.PI/2],[900,600,0],[1100,720,Math.PI/2],[1100,960,Math.PI/2],[1190,1010,0],[1280,850,-Math.PI/2],[1280,650,-Math.PI/2],[1280,450,-Math.PI/2]]:[];
 marks.lineStyle(1,0x967558,.5);
 for(const [x,y,a]of arrows){marks.lineBetween(x-5*Math.cos(a-.65),y-5*Math.sin(a-.65),x,y);marks.lineBetween(x,y,x-5*Math.cos(a+.65),y-5*Math.sin(a+.65));}
 // Start dock and goal gate occupy their existing safe areas.
 const start=data.checkpoints.start;
 marks.lineStyle(1,0xd9a16e,.25).strokeCircle(start.x,start.y,23);
 marks.lineStyle(1,0xd9a16e,.6).strokeCircle(start.x,start.y,17);
 for(let i=-1;i<=1;i++)marks.lineStyle(1,0xd9a16e,.15).lineBetween(start.x-22,start.y+32+i*5,start.x+22,start.y+32+i*5);
 const goal=data.goal;
 marks.fillStyle(0xd9a16e,.07).fillRect(goal.x,goal.y,goal.w,goal.h);
 marks.lineStyle(1,0xf6c58e,.9).strokeRect(goal.x,goal.y,goal.w,goal.h);
 scene.add.text(goal.x+goal.w/2,goal.y+goal.h/2,'EXIT',{fontFamily:'system-ui',fontSize:'13px',fontStyle:'bold',color:'#ffdab0',letterSpacing:3}).setOrigin(.5);
}
export function drawCopperObstacle(g:Phaser.GameObjects.Graphics,r:Rect) {
 g.fillStyle(0x62351f).fillRect(-r.w/2,-r.h/2,r.w,r.h);
 // A warm cylindrical surface, with highlights inside the exact collision shape.
 if(r.w>=r.h){
  g.fillStyle(0xb57448).fillRect(-r.w/2,-r.h/2+1,r.w,r.h*.65);
  g.fillStyle(0xe8b17d).fillRect(-r.w/2,-r.h*.25,r.w,Math.max(1,r.h*.18));
  g.lineStyle(1,0xffddad,.85).lineBetween(-r.w/2+1,-r.h/2+2,r.w/2-1,-r.h/2+2);
 } else {
  g.fillStyle(0xb57448).fillRect(-r.w/2+1,-r.h/2,r.w*.65,r.h);
  g.fillStyle(0xe8b17d).fillRect(-r.w*.25,-r.h/2,Math.max(1,r.w*.18),r.h);
  g.lineStyle(1,0xffddad,.85).lineBetween(-r.w/2+2,-r.h/2+1,-r.w/2+2,r.h/2-1);
 }
 g.lineStyle(.7,0xe0a270,.8).strokeRect(-r.w/2,-r.h/2,r.w,r.h);
}
export function drawPlayerAura(g:Phaser.GameObjects.Graphics,p:Vec,r:number) {
 g.fillStyle(0xf3c697,.035).fillCircle(p.x,p.y,r+10);
 g.fillStyle(0xf3c697,.09).fillCircle(p.x,p.y,r+4);
}

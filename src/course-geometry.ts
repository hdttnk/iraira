import clipping, {type MultiPolygon, type Polygon, type Pair} from 'polygon-clipping';
import type {Stage,Vec} from './stage';

/** Closed vector boundaries. Shared by rendering, collision and PNG export. */
export interface CourseGeometry { polygons:MultiPolygon }
function capsule(a:Vec,b:Vec,r:number):Polygon {
  const angle=Math.atan2(b.y-a.y,b.x-a.x),ring:Pair[]=[];
  // 24 segments per half circle: maximum radial error <0.06px at width 52.
  for(const [center,start] of [[b,angle-Math.PI/2],[a,angle+Math.PI/2]] as const) {
    for(let i=0;i<=24;i++) {const t=start+i*Math.PI/24;ring.push([center.x+Math.cos(t)*r,center.y+Math.sin(t)*r]);}
  }
  return [ring];
}
/** Convex hull of the endpoint disks: tangent sides give a smooth width transition. */
function taperedCapsule(a:Vec,b:Vec,ra:number,rb:number):Polygon {
  if(ra===rb)return capsule(a,b,ra);
  const length=Math.hypot(b.x-a.x,b.y-a.y),ring:Pair[]=[];
  if(length<=Math.abs(ra-rb)) {
    const c=ra>rb?a:b,r=Math.max(ra,rb);
    return [Array.from({length:97},(_,i)=>[c.x+r*Math.cos(i*Math.PI/48),c.y+r*Math.sin(i*Math.PI/48)] as Pair)];
  }
  const angle=Math.atan2(b.y-a.y,b.x-a.x),theta=Math.acos((ra-rb)/length);
  for(const [c,r,start,span] of [[b,rb,angle-theta,2*theta],[a,ra,angle+theta,2*Math.PI-2*theta]] as const)
    for(let i=0;i<=48;i++){const t=start+span*i/48;ring.push([c.x+r*Math.cos(t),c.y+r*Math.sin(t)]);}
  return [ring];
}
export function makeCourseGeometry(data:Stage,width=data.corridorWidth):CourseGeometry|null {
  if(!data.route.length)return null;
  const pieces:Polygon[]=[];
  const key=(p:Vec)=>`${p.x},${p.y}`;
  const local=new Map((data.corridorWidths??[]).map(w=>[key(w.point),w.width]));
  const radius=(p:Vec)=>(local.get(key(p))??data.corridorWidth)*width/data.corridorWidth/2;
  const profiles=data.straightPassages??[];
  for(const route of [data.route,...data.branches])for(let i=1;i<route.length;i++) {
    const a=route[i-1],b=route[i];
    if(profiles.some(p=>[a,b].every(q=>q.x>=p.from.x&&q.x<=p.to.x&&Math.abs(q.y-p.from.y)<width/2)))continue;
    pieces.push(taperedCapsule(a,b,radius(a),radius(b)));
  }
  for(const p of profiles) {
    const top=p.from.y-width/2,bottom=p.from.y+width/2,narrow=p.width*width/data.corridorWidth;
    const upper=p.align==='lower'?bottom-narrow:top,lower=p.align==='upper'?top+narrow:bottom;
    pieces.push([[[p.from.x,top],[p.narrowFrom,top],[p.narrowFrom,upper],[p.narrowTo,upper],[p.narrowTo,top],[p.to.x,top],[p.to.x,bottom],[p.narrowTo,bottom],[p.narrowTo,lower],[p.narrowFrom,lower],[p.narrowFrom,bottom],[p.from.x,bottom]]]);
  }
  for(const r of data.rooms??[])pieces.push([[[r.x,r.y],[r.x+r.w,r.y],[r.x+r.w,r.y+r.h],[r.x,r.y+r.h]]]);
  const disk=(x:number,y:number,r:number):Polygon=>[Array.from({length:97},(_,i)=>[x+r*Math.cos(i*Math.PI/48),y+r*Math.sin(i*Math.PI/48)] as Pair)];
  for(const c of data.chambers??[])pieces.push(disk(c.x,c.y,c.radius));
  let polygons=clipping.union(pieces[0],...pieces.slice(1));
  if(data.chambers?.length)for(const w of data.windmills??[])polygons=clipping.difference(polygons,disk(w.x,w.y,9));
  return {polygons};
}
export function segmentDistanceSquared(p:Vec,a:Pair,b:Pair):number {
  const dx=b[0]-a[0],dy=b[1]-a[1],length=dx*dx+dy*dy;
  const t=length?Math.max(0,Math.min(1,((p.x-a[0])*dx+(p.y-a[1])*dy)/length)):0;
  return (p.x-a[0]-t*dx)**2+(p.y-a[1]-t*dy)**2;
}
function insideRing(p:Vec,ring:Pair[]):boolean {
  let inside=false;
  for(let i=0,j=ring.length-1;i<ring.length;j=i++) {
    const a=ring[i],b=ring[j];
    if((a[1]>p.y)!==(b[1]>p.y)&&p.x<(b[0]-a[0])*(p.y-a[1])/(b[1]-a[1])+a[0])inside=!inside;
  }
  return inside;
}
export function hitsCourseWall(p:Vec,r:number,geometry:CourseGeometry):boolean {
  if(!geometry.polygons.some(poly=>insideRing(p,poly[0])&&!poly.slice(1).some(hole=>insideRing(p,hole))))return true;
  const rr=r*r;
  for(const poly of geometry.polygons)for(const ring of poly)for(let i=1;i<ring.length;i++) {
    const a=ring[i-1],b=ring[i];
    if(p.x+r<Math.min(a[0],b[0])||p.x-r>Math.max(a[0],b[0])||p.y+r<Math.min(a[1],b[1])||p.y-r>Math.max(a[1],b[1]))continue;
    if(segmentDistanceSquared(p,a,b)<=rr+1e-9)return true;
  }
  return false;
}

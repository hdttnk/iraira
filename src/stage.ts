import {third} from './stages/third';
import { prototype } from './stages/prototype';
import {second} from './stages/second';
import { first } from './stages/first';
export type { Vec, Rect } from './stages/prototype';
import type { Vec, Rect } from './stages/prototype';
export interface Stage {
  id:string;name:string;limit:number;width:number;height:number;grid:number;corridorWidth:number;
  paths:Rect[];route:Vec[];branches:Vec[][];checkpoints:Record<string,Vec>;checkpointNames:Record<string,string>;
  sections:{id:string;name:string;x:number;y:number}[];goal:Rect;
  previewRoute?:Vec[];previewSeconds?:number;rooms?:Rect[];windmills?:(typeof prototype.windmill)[];presses?:(typeof prototype.press & {axis?:'x'|'y'})[];
  chambers?:{x:number;y:number;radius:number}[];
  /** Local widths at centerline vertices; omitted vertices use corridorWidth. */
  corridorWidths?:{point:Vec;width:number}[];
  /** Horizontal passage with abrupt, one-sided narrowing; guide vertices lie inside. */
  straightPassages?:{from:Vec;to:Vec;narrowFrom:number;narrowTo:number;width:number;align:'lower'|'upper'}[];
  singlePresses?:{x:number;y:number;side:'top'|'bottom';width:number;height:number;travel:number;period:number;phase:number}[];
  rest?:{area:Rect;frontFraction:number;start?:Vec;end?:Vec};
  windmill:typeof prototype.windmill|null;press:typeof prototype.press|null;
}
export const stages:Record<string,Stage> = { first, second, third, prototype };
// Legacy exports keep v0.1 tests and consumers unchanged.
export const stage = prototype;
export function makeWalls(data:Stage=prototype,width=data.corridorWidth):Rect[] {
  const g=data.grid, cols=Math.ceil(data.width/g), rows=Math.ceil(data.height/g);
  const open=new Uint8Array(cols*rows);
  if(data.route.length) {
    const r=width/2;
    for(const route of [data.route,...data.branches]) for(let i=1;i<route.length;i++) {
      const a=route[i-1],b=route[i],dx=b.x-a.x,dy=b.y-a.y,len=dx*dx+dy*dy;
      for(let y=Math.max(0,Math.floor((Math.min(a.y,b.y)-r)/g));y<Math.min(rows,Math.ceil((Math.max(a.y,b.y)+r)/g));y++)
        for(let x=Math.max(0,Math.floor((Math.min(a.x,b.x)-r)/g));x<Math.min(cols,Math.ceil((Math.max(a.x,b.x)+r)/g));x++) {
          const px=(x+.5)*g,py=(y+.5)*g;
          const t=len?Math.max(0,Math.min(1,((px-a.x)*dx+(py-a.y)*dy)/len)):0;
          if(Math.hypot(px-a.x-t*dx,py-a.y-t*dy)<r)open[y*cols+x]=1;
        }
    }
  } else {
    for(let y=0;y<rows;y++)for(let x=0;x<cols;x++)if(data.paths.some(p=>x*g>=p.x&&x*g<p.x+p.w&&y*g>=p.y&&y*g<p.y+p.h))open[y*cols+x]=1;
  }
  const merged:Rect[]=[];let previous=new Map<string,Rect>();
  for(let y=0;y<rows;y++) {
    const current=new Map<string,Rect>();let start=-1;
    for(let x=0;x<=cols;x++) {
      const solid=x<cols&&!open[y*cols+x];
      if(solid&&start<0)start=x;
      if(!solid&&start>=0) {
        const key=`${start},${x-start}`,prev=previous.get(key);
        const rect=prev??{x:start*g,y:y*g,w:(x-start)*g,h:0,kind:'wall'};
        rect.h+=g; if(!prev)merged.push(rect);current.set(key,rect);start=-1;
      }
    }
    previous=current;
  }
  return merged;
}
export const walls=makeWalls();
export function obstacleSurfaceSpeed(data:Stage):number {
  return Math.max(0,...(data.windmills??(data.windmill?[data.windmill]:[])).map(w=>Math.hypot(w.length,w.thickness/2)*Math.abs(w.speed)),
    ...(data.presses??(data.press?[data.press]:[])).map(p=>p.travel*Math.PI/p.period),
    ...(data.singlePresses??[]).map(p=>p.travel*Math.PI/p.period));
}
export function obstaclesAt(t:number,data:Stage=prototype):Rect[] {
  const result:Rect[]=[];
  for(const p of data.singlePresses??[]) {
    const extension=p.travel*(1-Math.cos(t*Math.PI*2/p.period+p.phase))/2;
    const sign=p.side==='top'?-1:1;
    result.push({x:p.x,y:p.y+sign*(60+p.height/2-extension),w:p.width,h:p.height,angle:0,kind:'press'});
  }
  for(const w of data.windmills??(data.windmill?[data.windmill]:[])) for(let i=0;i<w.blades;i++) {
    const angle=w.phase+t*w.speed*w.direction+i*Math.PI*2/w.blades;
    result.push({x:w.x+Math.cos(angle)*w.length/2,y:w.y+Math.sin(angle)*w.length/2,w:w.length,h:w.thickness,angle,kind:'windmill'});
  }
  for(const p of data.presses??(data.press?[data.press]:[])) {
    const extension=p.travel*(1-Math.cos(t*Math.PI*2/p.period+p.phase))/2,gap=p.width-2*(10+extension);
    for(const sign of [-1,1])result.push('axis' in p&&p.axis==='y'
      ?{x:p.x,y:p.y+sign*(gap/2+50),w:p.thickness,h:100,angle:0,kind:'press'}
      :{x:p.x+sign*(gap/2+50),y:p.y,w:100,h:p.thickness,angle:0,kind:'press'});
  }
  return result;
}

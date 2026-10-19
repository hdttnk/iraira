import type {Vec} from '../prototype';
const p=(x:number,y:number):Vec=>({x:Math.round(x*1000)/1000,y:Math.round(y*1000)/1000});
const pts=(items:number[][])=>items.map(([x,y])=>p(x,y));
const hairpin=pts([[100,450],[480,450],[530,430],[575,280],[595,250],[620,250],[638,280],[540,930],[550,965],[580,992],[620,1000],[655,980],[680,945],[1040,550],[1110,550]]);
// Interleaved inward/outward spiral. Radial lane separation >=80px avoids
// the overlap shortcuts found in the first raster prototype. Coordinates are
// a playable 2D interpretation, not a measurement of the broadcast set.
const inward:Vec[]=[],turn:Vec[]=[],outward:Vec[]=[];
for(let i=1;i<=100;i++){const t=i/100,a=Math.PI+2*Math.PI*t,r=240-140*t;inward.push(p(1350+Math.cos(a)*r,550+Math.sin(a)*r));}
for(let i=1;i<=32;i++){const a=Math.PI+Math.PI*i/32;turn.push(p(1290+40*Math.cos(a),550+40*Math.sin(a)));}
// Turn exits at x=1330, i.e. the 20px inner radius of the return spiral.
for(let i=1;i<=100;i++){const t=i/100,a=3*Math.PI-2*Math.PI*t,r=20+140*t;outward.push(p(1350+Math.cos(a)*r,550+Math.sin(a)*r));}
const narrow=pts([[1190,850],[2050,850],[2200,850],[2400,850],[2400,350]]);
const slopes=pts([[3000,350],[3000,450],[2500,450],[2500,550],[3000,550],[3000,650],[2500,650],[2500,750],[3120,750],[3200,1100],[3290,1100],[3300,200]]);
const twist=pts([[3390,455],[3430,570],[3460,585],[3480,610],[3478,635],[3440,665],[3438,687],[3465,715],[3490,790],[3560,1100],[3600,1100],[3600,200]]);
const flash=pts([[3750,480],[3680,480],[3860,700],[3790,700],[4010,980],[4100,980]]);
const brows:Vec[]=[];
for(let i=1;i<=60;i++){const t=i/60;brows.push(p(4100+350*t,980-26*(1-Math.cos(t*4*Math.PI))/2));}
export const second={
  id:'second',name:'2nd',limit:180,width:4580,height:1250,grid:4,corridorWidth:44,
  paths:[],route:[...hairpin,...inward,...turn,...outward,...narrow,...slopes,...twist,...flash,...brows],branches:[] as Vec[][],
  checkpoints:{start:hairpin[0],hairpin:p(530,430),spiral:p(1110,550),narrow:p(1190,850),rest:p(2200,850),slopes:p(2400,350),twist:p(3290,1100),flash:p(3600,200),brows:p(4100,980)} as Record<string,Vec>,
  checkpointNames:{start:'スタート',hairpin:'01 ヘアピン',spiral:'02 うずまき',narrow:'03 奥の細道',rest:'休憩地点',slopes:'04 いろは坂',twist:'05 N字ひねり（2D）',flash:'06 フラッシュ',brows:'07 まゆげ'} as Record<string,string>,
  sections:[{id:'01',name:'スーパーヘアピン',x:530,y:1080},{id:'02',name:'うずまき / 中心で反転',x:1340,y:200},{id:'03',name:'奥の細道 →',x:1700,y:910},{id:'R',name:'休憩 / 時計停止',x:2190,y:980},{id:'04',name:'いろは坂 / 5段',x:2720,y:250},{id:'05',name:'N字ひねり / 2D置換',x:3420,y:1190},{id:'06',name:'フラッシュ',x:3860,y:390},{id:'07',name:'つながりまゆげ',x:4260,y:1080}],
  rest:{area:{x:2120,y:810,w:160,h:80},frontFraction:.5},
  goal:{x:4430,y:960,w:40,h:40},windmill:null,press:null,
};

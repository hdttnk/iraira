/** Image-only candidates. Deliberately not imported by the playable stage registry. */
import {mkdirSync,writeFileSync} from 'node:fs';
import clipping,{type Polygon,type Pair} from 'polygon-clipping';
import {makeCourseGeometry,hitsCourseWall} from '../src/course-geometry';
import {first} from '../src/stages/legacy/first';
import {second} from '../src/stages/legacy/second';
import {third} from '../src/stages/legacy/third';
import {obstaclesAt,type Stage,type Vec} from '../src/stage';
const out='docs/stages/n64-proposals';mkdirSync(out,{recursive:true});
const p=(x:number,y:number):Vec=>({x,y});
const pts=(a:number[][])=>a.map(([x,y])=>p(x,y));
const section=(id:string,name:string,x:number,y:number)=>({id,name,x,y});
const arc=(x:number,y:number,r:number,a:number,b:number,n=64)=>Array.from({length:n+1},(_,i)=>p(x+r*Math.cos(a+(b-a)*i/n),y+r*Math.sin(a+(b-a)*i/n)));
const brows=(x:number,y:number)=>pts([[x,y],[x+60,y],[x+125,y-45],[x+205,y-45],[x+270,y],[x+330,y],[x+395,y-45],[x+475,y-45],[x+540,y],[x+600,y]]);
const initialRoute=pts([[100,500],[350,500],[430,440],[500,500],[560,450],[620,220],[660,220],[540,820],[600,860],[660,820],[900,300],[940,300],[820,730],[870,760],[1010,540],[1050,540],[970,700],[1030,720],[1100,630],[1350,630],[1410,490],[1470,580],[1530,490],[1640,880],[1740,880],[1740,180],[1890,470],[1840,500],[2030,820],[2030,180],[2220,490],[2290,430],[2380,530],[2460,460],[2540,540],[2650,480]]);
const a:Stage={...first,width:2800,height:1050,route:initialRoute,branches:[],checkpoints:{start:initialRoute[0],hairpin:p(560,450),straight:p(1100,630),zigzag:p(1350,630),n:p(1640,880),finish:p(2220,490)},checkpointNames:{},sections:[section('01','導入の折れ',340,340),section('02','大小のヘアピン',620,950),section('03','直線 / 分岐は保留',1080,770),section('04','鋭い山谷',1360,350),section('05','N字＋中央の折れ',1760,50),section('06','終盤のジグザグ',2240,650)],goal:{x:2630,y:460,w:40,h:40}};
// Preserve the old spiral as a provisional interpretation: exact return lane is not
// resolved by a single oblique frame. The adjacent straight and three traverses change.
const spiralEnd=second.route.findIndex(q=>q.x===1190&&q.y===850);
const bRoute=[...second.route.slice(0,spiralEnd),...pts([[1190,850],[2050,850],[2200,850],[2400,850],[2400,350],[3000,350],[3000,550],[2500,550],[2500,750],[3120,750],[3200,1100],[3290,1100],[3300,200],[3400,200],[3400,410],[3550,720],[3640,1100],[3740,1100],[3740,200],[4000,450],[3910,450],[4140,730],[4050,730],[4270,980]]),...brows(4270,980).slice(1)];
const b:Stage={...second,width:5030,route:bRoute,checkpoints:{start:bRoute[0],hairpin:p(530,430),spiral:p(1110,550),narrow:p(1190,850),rest:p(2200,850),slopes:p(2400,350),twist:p(3290,1100),flash:p(3740,200),brows:p(4270,980)},sections:[section('01','縦長ヘアピン',530,1100),section('02','うずまき / 戻り方は暫定',1100,170),section('03','長い水平通路',1700,930),section('R','休憩',2150,1020),section('04','横3往復路（映像解釈）',2500,240),section('05','N字 / 立体ひねりを展開',3300,1180),section('06','稲妻状の折れ',3950,330),section('07','平らな頂点を持つ2山',4380,1100)],goal:{x:4850,y:960,w:40,h:40}};
// Connected circular chambers replace the old isolated semicircular corridors.
const rotorCenters=[p(1280,700),p(1460,420),p(1640,700)];
const hairpin=third.route.slice(0,third.route.findIndex(q=>q.x===1100&&q.y===650));
const leftArc=arc(1280,700,145,Math.PI,Math.PI*1.6);
const upperArc=arc(1460,420,145,Math.PI,Math.PI*2);
const entry=[...hairpin,p(1090,700),...leftArc];
const upper=[...upperArc,p(1740,420),p(2250,420),p(2450,420)];
const lower=[leftArc[leftArc.length-1],p(1320,760),...arc(1640,700,145,Math.PI,0),...pts([[1840,750],[1910,860],[1990,900],[2060,800],[2140,820],[2210,760],[2270,800],[2350,650],[2450,420]])];
const elevator=pts([[2550,420],[2550,1050],[2650,1050],[2650,370],[2750,370],[2750,1050],[2850,1050],[2850,370],[2950,370],[2950,1050],[3050,1050],[3050,850],[3180,850],[3280,850],[3420,850],[3560,850],[3700,850],[3800,850]]);
const loop=pts([[3890,1130],[3990,1130],[4000,250],[4100,250],[4340,650],[4410,730],[4490,720],[4550,660],[4550,560],[4470,430],[4390,360],[4440,280],[4540,280],[4660,480],[4740,780],[4740,1130],[4840,1130],[4840,250],[4930,250],[4930,850],[5030,850]]);
const cRoute=[...entry,...upper,...elevator,...loop,...brows(5030,850).slice(1)];
const c:Stage={...third,width:5780,height:1300,route:cRoute,branches:[lower],previewRoute:undefined,windmills:rotorCenters.map((q,i)=>({...third.windmills[i],...q,length:175,blades:6,phase:Math.PI/6})),presses:[],rooms:[{x:3140,y:790,w:600,h:120},...[3230,3370,3510,3650].map((x,i)=>({x:x-18,y:i%2?905:755,w:36,h:40}))],rest:{area:{x:2528,y:398,w:44,h:674},frontFraction:.5},checkpoints:{start:cRoute[0],hairpin:p(515,620),windmills:p(1090,700),upper:p(1740,420),lower:p(1840,750),rest:p(2450,420),elevator:p(2550,420),press:p(3180,850),twist:p(3990,1130),brows:p(5030,850)},sections:[section('01','縦長ヘアピン',500,1120),section('02','連結した3風車 / 6枚案※',1110,80),section('03','上：水平の細道',1800,300),section('04','下：折れた迂回路',1860,1050),section('R','休憩：P6手前から最下部まで',2330,200),section('05','縦の折り返し',2630,1190),section('06','4区画・各1物体 / 小さい待避所',3170,1080),section('07','大きな巻き返し / 立体を展開',4030,80),section('08','角のある2山',5200,1010)],goal:{x:5610,y:830,w:40,h:40}};
for(const data of [a,b,c]){
 let geometry=makeCourseGeometry(data)!;
 if(data.id==='third'){
  const chambers:Polygon[]=rotorCenters.map(q=>[arc(q.x,q.y,205,0,Math.PI*2).map(v=>[v.x,v.y] as Pair)]);
  geometry={polygons:clipping.union(geometry.polygons,...chambers)};
 }
 // Image proposal sanity only: centerline connectivity/bounds; not dynamic playability.
 for(const line of [data.route,...data.branches]) for(let i=1;i<line.length;i++){
  const u=line[i-1],v=line[i],n=Math.ceil(Math.hypot(v.x-u.x,v.y-u.y)/4);
  for(let j=0;j<=n;j++){
   const q=p(u.x+(v.x-u.x)*j/n,u.y+(v.y-u.y)*j/n);
   if(q.x<0||q.y<0||q.x>data.width||q.y>data.height||hitsCourseWall(q,6,geometry))throw new Error(`${data.id}: invalid proposal centerline`);
  }
 }
 const singlePresses=[3230,3370,3510,3650].map((x,i)=>({x,y:i%2?830:870,w:110,h:80,angle:0}));
 const extra=data.id==='third'?{restSpan:[p(2550,420),p(2550,1050)],pressZones:singlePresses.map((box,i)=>({box,side:i%2?'top':'bottom',pocket:p(box.x,i%2?925:775)}))}:{};
 writeFileSync(`${out}/${data.id}-stage-data.json`,JSON.stringify({...data,...extra,geometry,obstacles:[...obstaclesAt(0,data),...(data.id==='third'?singlePresses:[])],obstacleTime:0,proposal:true,reference:'https://www.youtube.com/watch?v=OZ1x8U874Yc',overviewTitle:`${data.name} — N64動画参考・修正案 / ゲーム未反映・寸法は仮 / ※不確定箇所あり`},null,2));
 console.log(`${data.id}: proposal centerline radius 6 clearance and world bounds passed`);
}

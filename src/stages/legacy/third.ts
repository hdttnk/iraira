import type {Vec,Rect} from '../prototype';
const p=(x:number,y:number):Vec=>({x:Math.round(x*1000)/1000,y:Math.round(y*1000)/1000});
const pts=(a:number[][])=>a.map(([x,y])=>p(x,y));
const arc=(x:number,y:number,direction:number)=>Array.from({length:97},(_,i)=>p(x+120*Math.cos(Math.PI+direction*Math.PI*i/96),y+120*Math.sin(Math.PI+direction*Math.PI*i/96)));
export const rotorPasses=[
  {id:'rotorLeft',x:1300,y:650,direction:1,before:p(1100,650),after:p(1500,650),arc:arc(1300,650,1)},
  {id:'rotorTop',x:1700,y:370,direction:1,before:p(1500,370),after:p(1900,370),arc:arc(1700,370,1)},
  {id:'rotorRight',x:1900,y:650,direction:-1,before:p(1700,650),after:p(2100,650),arc:arc(1900,650,-1)},
];
const hairpin=pts([[100,650],[470,650],[515,620],[565,380],[585,350],[610,350],[628,375],[540,980],[550,1010],[580,1030],[615,1020],[650,980],[1010,650],[1100,650]]);
const left=[...rotorPasses[0].arc,rotorPasses[0].after];
const top=[rotorPasses[1].before,...rotorPasses[1].arc,rotorPasses[1].after,...pts([[2300,370],[2450,370],[2550,370]])];
const lower=[rotorPasses[0].after,rotorPasses[2].before,...rotorPasses[2].arc,rotorPasses[2].after,...pts([[2125,880],[2160,900],[2200,860],[2220,790],[2260,780],[2300,805],[2340,755],[2370,650],[2400,590],[2450,370]])];
const elevator=pts([[2550,1050],[2650,1050],[2650,370],[2750,370],[2750,1050],[2850,1050],[2850,370],[2950,370],[2950,1050],[3050,1050],[3050,850],[3180,850],[3280,850],[3320,850],[3420,850],[3460,850],[3560,850],[3600,850],[3700,850],[3800,850]]);
const finish=pts([[3890,1130],[3990,1130],[4000,250],[4090,500],[4130,540],[4165,550],[4175,580],[4150,610],[4115,625],[4110,650],[4140,675],[4175,685],[4180,715],[4150,745],[4155,775],[4220,960],[4280,1130],[4360,1130],[4360,250],[4420,250],[4420,850],[4520,850]]);
const brows:Vec[]=Array.from({length:61},(_,i)=>p(4520+i*6,850-32*(1-Math.cos(i/60*Math.PI*4))/2));
const windmills=rotorPasses.map(r=>({x:r.x,y:r.y,length:150,thickness:6,blades:8,speed:.55,direction:r.direction,phase:Math.PI/8}));
const presses=[3230,3370,3510,3650].map((x,i)=>({x,y:850,width:120,thickness:28,travel:44,period:i%2?6.4:4.8,phase:0,axis:'y' as const}));
export const third={
  id:'third',name:'3rd',limit:240,width:5050,height:1280,grid:4,corridorWidth:44,
  previewSeconds:12,previewRoute:[...hairpin,...left,...top.slice(0,-3),rotorPasses[2].before,...rotorPasses[2].arc,...lower.slice(lower.findIndex(p=>p.x===2100&&p.y===650)),...elevator,...finish,...brows.slice(1)],
  paths:[],route:[...hairpin,...left,...top,...elevator,...finish,...brows.slice(1)],branches:[lower],
  rooms:[{x:3140,y:790,w:600,h:120}] as Rect[],windmills,presses,
  checkpoints:{start:hairpin[0],hairpin:p(515,620),rotorLeft:rotorPasses[0].before,rotorTop:rotorPasses[1].before,rotorRight:rotorPasses[2].before,narrow:p(2000,370),lower:p(2100,650),rest:p(2450,370),elevator:p(2550,370),press:p(3180,850),twist:p(3990,1130),brows:p(4520,850)} as Record<string,Vec>,
  checkpointNames:{start:'スタート',hairpin:'01 ヘアピン',rotorLeft:'02 風車・左下',rotorTop:'02 風車・上',rotorRight:'02 風車・右下',narrow:'03 奥の細道',lower:'04 中山道',rest:'休憩',elevator:'05 エレベーター',press:'06 4連プレス',twist:'07 2回ひねり（2D）',brows:'08 まゆげ'} as Record<string,string>,
  sections:[{id:'01',name:'ウルトラヘアピン',x:520,y:1110},{id:'02-L',name:'風車 左下 CW',x:1280,y:870},{id:'02-U',name:'風車 上 CW',x:1680,y:140},{id:'02-R',name:'風車 右下 CCW',x:1880,y:445},{id:'03',name:'奥の細道 →',x:2030,y:300},{id:'04',name:'中山道 / 下分岐',x:2120,y:990},{id:'R',name:'合流・休憩',x:2420,y:250},{id:'05',name:'エレベーター / 縦5段',x:2720,y:1170},{id:'06',name:'4連プレス / 退避可',x:3330,y:1010},...[3230,3370,3510,3650].map((x,i)=>({id:`06-${i+1}`,name:'プレス',x,y:735})),{id:'07',name:'2回ひねり / 2D',x:4100,y:1200},{id:'08',name:'まゆげ / 2D',x:4660,y:960}],
  rest:{area:{x:2410,y:330,w:80,h:80},frontFraction:.5},
  goal:{x:4860,y:830,w:40,h:40},windmill:null,press:null,
};

import type { Vec } from '../prototype';
// Source drawing coordinates, manually interpreted; not surveyed TV dimensions.
// Side-view layout with explicit mobile-clearance corrections below.
// Expand the hairpin region horizontally: neighboring return lanes must not merge
// even at the maximum configurable 52px corridor width. Later sections translate.
const point = (x:number,y:number):Vec => {
  const spacedX=x+Math.max(0,Math.min(x,740)-435);
  return {x:Math.round((80+(spacedX-40)*2.2)*10)/10,y:Math.round((80+(y-190)*2.2)*10)/10};
};
const points = (data:number[][]) => data.map(([x,y])=>point(x,y));
const lead = points([[60,385],[270,385],[415,370],[435,350],[450,335],[465,333],[480,345],[497,369],[514,377],[533,374],[552,362],[566,344],[600,252],[609,242],[617,243],[619,254],[560,479],[560,494],[568,508],[581,518],[597,520],[613,515],[627,503],[641,477],[698,318],[707,303],[717,300],[722,308],[719,320],[668,454],[667,465],[672,472],[681,469],[724,420],[735,409],[742,413],[742,423],[728,452],[740,455]]);
const upper = points([[740,455],[748,440],[810,440],[832,455]]);
const lower = points([[740,455],[748,485],[810,485],[832,455]]);
const tail = points([[832,455],[847,455],[881,370],[902,400],[927,350],[947,529],[974,529],[979,244],[1036,381],[1017,389],[1070,511],[1069,255],[1145,343],[1168,329],[1195,360],[1240,339]]);
export const first = {
  id:'first',name:'1st',limit:90,width:3512,height:940,grid:4,corridorWidth:44,
  paths:[], route:[...lead,...upper.slice(1),...tail.slice(1)],branches:[lower],
  checkpoints:{start:lead[0],hairpin:point(435,350),fork:point(740,455),zigzag:point(847,455),nCurve:point(947,529),crank:point(1005,307),finish:point(1145,343)} as Record<string,Vec>,
  checkpointNames:{start:'スタート',hairpin:'01 ヘアピン入口',fork:'02 分岐入口',zigzag:'03 ギザギザ入口',nCurve:'04 N字入口',crank:'05 中央クランク入口',finish:'06 終盤入口'} as Record<string,string>,
  sections:[
    {id:'01',name:'ウッチャンヘアピン',...point(590,550)},
    {id:'02',name:'分岐（上下で再合流）',...point(775,555)},
    {id:'03',name:'ギザギザ道',...point(870,310)},
    {id:'04',name:'ナンチャンカーブ / N字',...point(965,580)},
    {id:'05',name:'中央クランク',...point(1008,190)},
    {id:'06',name:'ゴール前の折れ',...point(1180,415)},
  ],
  goal:{...point(1230,329),w:44,h:44},
  windmill:null,press:null,
};

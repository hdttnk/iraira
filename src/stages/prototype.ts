export interface Vec { x: number; y: number }
export interface Rect extends Vec { w: number; h: number; angle?: number; kind?: string }
export const prototype = {
  id: 'prototype', name: 'v0.1 試験', limit: 90, grid: 10, corridorWidth: 60,
  route: [] as Vec[], branches: [] as Vec[][], sections: [] as {id:string; name:string; x:number; y:number}[],
  checkpointNames: {start:'スタート', crank:'クランク入口', windmill:'風車入口', press:'プレス入口'} as Record<string,string>,
  width: 1400, height: 1700,
  // Walkable areas are rectangles; all remaining space is solid wall.
  paths: [
    { x: 160, y: 1480, w: 80, h: 120 },
    { x: 170, y: 1050, w: 60, h: 470 },
    { x: 170, y: 1050, w: 510, h: 80 },
    { x: 610, y: 730, w: 70, h: 400 },
    { x: 490, y: 430, w: 320, h: 360 },
    { x: 780, y: 560, w: 370, h: 80 },
    { x: 1050, y: 560, w: 100, h: 490 },
    { x: 1050, y: 970, w: 270, h: 80 },
    { x: 1240, y: 160, w: 80, h: 890 },
    { x: 1200, y: 120, w: 160, h: 120 },
  ] as Rect[],
  checkpoints: {
    start: { x: 200, y: 1550 }, crank: { x: 200, y: 1170 },
    windmill: { x: 645, y: 820 }, press: { x: 1100, y: 710 },
  } as Record<string, Vec>,
  goal: { x: 1220, y: 140, w: 120, h: 70 },
  windmill: { x: 650, y: 600, length: 116, thickness: 18, blades: 3, speed: 0.48, direction: 1, phase: 0 },
  press: { x: 1100, y: 850, width: 100, thickness: 32, travel: 36, period: 4.8, phase: 0 },
};

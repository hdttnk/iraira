import {makeCourseGeometry,hitsCourseWall,type CourseGeometry} from './course-geometry';
import { obstaclesAt, obstacleSurfaceSpeed, stage, makeWalls, type Stage, type Vec, type Rect } from './stage';
export interface Settings {
  mode: 'normal' | 'practice' | 'developer'; checkpoint: string; timed: boolean; limit: number;
  custom: boolean; spawnX: number; spawnY: number; invincible: boolean; hitboxes: boolean;
  freeze: boolean; elapsed: number; obstacleSpeed: number; playerSpeed: number;
  playerRadius: number; corridorWidth: number; maxSpeed: number; minSpeed: number; deadZone: number; curve: number;
}
export const defaults: Settings = { mode: 'normal', checkpoint: 'start', timed: true, limit: 90,
  custom: false, spawnX: 200, spawnY: 1550, invincible: false, hitboxes: false, freeze: false,
  elapsed: 0, obstacleSpeed: 1, playerSpeed: 1, playerRadius: 6, corridorWidth: 44, maxSpeed: 125, minSpeed: 2, deadZone: .08, curve: 1.8 };
export const radius = 6;
export function velocity(input: Vec, s: Settings): Vec {
  const m = Math.hypot(input.x, input.y);
  if (m <= s.deadZone) return { x: 0, y: 0 };
  const amount = (Math.min(1, m) - s.deadZone) / (1 - s.deadZone);
  const speed = (s.minSpeed + (s.maxSpeed - s.minSpeed) * amount ** s.curve) * s.playerSpeed;
  return { x: input.x / m * speed, y: input.y / m * speed };
}
export function circleRect(p: Vec, r: number, box: Rect, centered = false): boolean {
  const cx = centered ? box.x : box.x + box.w / 2, cy = centered ? box.y : box.y + box.h / 2;
  const a = -(box.angle ?? 0), dx = p.x - cx, dy = p.y - cy;
  const x = dx * Math.cos(a) - dy * Math.sin(a), y = dx * Math.sin(a) + dy * Math.cos(a);
  return Math.hypot(Math.max(Math.abs(x) - box.w / 2, 0), Math.max(Math.abs(y) - box.h / 2, 0)) <= r;
}
export class Simulation {
  geometry:CourseGeometry|null; data: Stage; walls: Rect[]; settings: Settings; position: Vec = { ...stage.checkpoints.start };
  resting = false; frontPassed = false; timerStarted = false; time = 0; remaining = 90; state: 'ready' | 'playing' | 'failed' | 'clear' | 'paused' = 'ready';
  reason = ''; accumulator = 0;
  constructor(settings: Settings = { ...defaults }, data:Stage=stage) { this.data=data; this.geometry=makeCourseGeometry(data,settings.corridorWidth); this.walls=this.geometry?[]:makeWalls(data,settings.corridorWidth); this.settings = { ...settings }; this.reset(); }
  setStage(data:Stage) { this.data=data; this.geometry=makeCourseGeometry(data,this.settings.corridorWidth); this.walls=this.geometry?[]:makeWalls(data,this.settings.corridorWidth); this.reset(); }
  inRest(p:Vec) { const r=this.data.rest?.area; return !!r && p.x>=r.x && p.x<=r.x+r.w && p.y>=r.y && p.y<=r.y+r.h; }
  hitsWall(p:Vec,r:number) { return this.geometry ? hitsCourseWall(p,r,this.geometry) : this.walls.some(box=>circleRect(p,r,box)); }
  reset() {
    const s = this.settings, dev = s.mode === 'developer';
    this.position = { ...(s.mode === 'normal' ? this.data.checkpoints.start : this.data.checkpoints[s.checkpoint] ?? this.data.checkpoints.start) };
    if (dev && s.custom) this.position = { x: s.spawnX, y: s.spawnY };
    this.resting = this.inRest(this.position);
    this.frontPassed = !!this.data.rest && this.position.x>=this.data.rest.area.x;
    this.timerStarted = false; this.time = dev ? s.elapsed : 0; this.remaining = s.limit; this.state = 'ready'; this.reason = ''; this.accumulator = 0;
  }
  start() { this.state = 'playing'; this.accumulator = 0; }
  advance(delta: number, input: Vec) {
    if (this.state !== 'playing') { this.accumulator = 0; return; }
    // Long stalls pause explicitly; no discarded simulation time or invisible leap.
    if (delta > .25) { this.state = 'paused'; this.accumulator = 0; return; }
    this.accumulator += delta;
    while (this.accumulator + 1e-10 >= 1 / 120 && this.state === 'playing') {
      this.step(1 / 120, input); this.accumulator -= 1 / 120;
    }
  }
  step(dt: number, input: Vec) {
    const s = this.settings, dev = s.mode === 'developer', v = velocity(input, s);
    const rate = dev ? s.obstacleSpeed : 1;
    // Upper bound on moving obstacle surface speed, including rotating blade tips.
    const surfaceSpeed = obstacleSurfaceSpeed(this.data) * rate;
    const bound = Math.hypot(v.x, v.y) + surfaceSpeed;
    const slices = Math.max(1, Math.ceil(bound * dt / .5));
    const h = dt / slices;
    for (let i = 0; i < slices && this.state === 'playing'; i++) {
      const mid = { x: this.position.x + v.x * h / 2, y: this.position.y + v.y * h / 2 };
      const next = { x: this.position.x + v.x * h, y: this.position.y + v.y * h };
      const t = this.time + h * rate / 2;
      // Conservative swept bound: at most 0.25px enlargement, prevents tunneling
      // for both player motion and moving/rotating geometry between samples.
      const hit = this.hitsWall(mid, s.playerRadius + Math.hypot(v.x, v.y) * h / 2) ||
        obstaclesAt(t,this.data).some(r => circleRect(mid, s.playerRadius + bound * h / 2, r, true));
      this.time += h * rate;
      // Arm only after a successful displacement, not touch-down or dead-zone input.
      if ((!hit || (dev && s.invincible)) && (next.x !== this.position.x || next.y !== this.position.y)) this.timerStarted = true;
      if (this.timerStarted && !this.resting && !(dev && s.freeze) && s.timed) this.remaining = Math.max(0, this.remaining - h);
      if (hit && !(dev && s.invincible)) { this.state = 'failed'; this.reason = '壁・障害物に接触'; break; }
      this.position = next;
      this.resting=this.inRest(next);
      if(this.resting)this.frontPassed=true;
      if(this.data.rest&&!this.frontPassed&&s.timed&&this.timerStarted&&s.limit-this.remaining>=s.limit*this.data.rest.frontFraction) {
        this.state='failed';this.reason='前半の制限時間超過';break;
      }
      if (this.remaining <= 0 && s.timed) { this.state = 'failed'; this.reason = 'タイムアップ'; break; }
      if (circleRect(this.position, s.playerRadius, this.data.goal)) this.state = 'clear';
    }
  }
}

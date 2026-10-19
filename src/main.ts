import {installTouchGuards} from './touch-guards';
import Phaser from 'phaser';
import './style.css';
import {drawCopperWorld,drawCopperObstacle,drawPlayerAura} from './copper-renderer';
import { Simulation, defaults, type Settings } from './engine';
import { stages, obstaclesAt, type Vec } from './stage';
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const dev = new URLSearchParams(location.search).get('dev') === '1';
const requestedStage=new URLSearchParams(location.search).get('stage');
const initialStage=requestedStage&&Object.hasOwn(stages,requestedStage)?requestedStage:'first';
const sim = new Simulation({...defaults,limit:stages[initialStage].limit},stages[initialStage]);
let stage = sim.data;
const seenPreviews = new Set<string>();
let previewing = false, previewElapsed = 0;
let failureRevealAt=0, failureBurstCount=0, failureParticles=0;
$<HTMLSelectElement>('stageId').value=initialStage;
function syncStageFields() {
  const selected=stages[$<HTMLSelectElement>('stageId').value];
  $<HTMLInputElement>('limit').value=String(selected.limit);
  $<HTMLInputElement>('spawnX').max=String(selected.width);
  $<HTMLInputElement>('spawnY').max=String(selected.height);
  $<HTMLInputElement>('spawnX').value=String(selected.checkpoints.start.x);
  $<HTMLInputElement>('spawnY').value=String(selected.checkpoints.start.y);
  $<HTMLSelectElement>('checkpoint').innerHTML=Object.entries(selected.checkpoints).map(([id])=>`<option value="${id}">${selected.checkpointNames[id]??id}</option>`).join('');
  $<HTMLInputElement>('corridorWidth').disabled=selected.id==='prototype';
}
syncStageFields();
$('stageId').onchange=syncStageFields;
const stick = $('stick'), knob = $('knob'), panel = $<HTMLDialogElement>('panel');
installTouchGuards($('app'),panel);
let analog: Vec = { x: 0, y: 0 }, pointer: number | null = null;
const keys = new Set<string>();
function release() { analog = { x: 0, y: 0 }; pointer = null; knob.style.transform = ''; stick.setAttribute('aria-valuenow', '0'); }
function clearInput() { release(); keys.clear(); }
function drag(e: PointerEvent) {
  const rect = stick.getBoundingClientRect(), scale = rect.width / 124;
  let x = (e.clientX - rect.left - rect.width / 2) / (44 * scale);
  let y = (e.clientY - rect.top - rect.height / 2) / (44 * scale);
  const magnitude = Math.hypot(x, y); if (magnitude > 1) { x /= magnitude; y /= magnitude; }
  analog = { x, y }; knob.style.transform = `translate(${x * 44}px, ${y * 44}px)`;
  stick.setAttribute('aria-valuenow', String(Math.round(Math.min(1, magnitude) * 100)));
}
stick.addEventListener('pointerdown', e => { if (pointer !== null) return; e.preventDefault(); pointer = e.pointerId; stick.setPointerCapture(pointer); drag(e); });
stick.addEventListener('pointermove', e => { if (e.pointerId === pointer) drag(e); });
for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) stick.addEventListener(type, e => { if ((e as PointerEvent).pointerId === pointer) release(); });
window.addEventListener('keydown', e => {
  if (panel.open || /INPUT|SELECT|TEXTAREA/.test((e.target as HTMLElement).tagName)) return;
  if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key)) e.preventDefault();
  keys.add(e.key.toLowerCase());
  if (e.key.toLowerCase() === 'r') { reset(); begin(); }
  if (e.key === ' ' && sim.state !== 'playing') begin();
});
window.addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));
function input(): Vec {
  if (pointer !== null) return analog;
  let x = Number(keys.has('arrowright') || keys.has('d')) - Number(keys.has('arrowleft') || keys.has('a'));
  let y = Number(keys.has('arrowdown') || keys.has('s')) - Number(keys.has('arrowup') || keys.has('w'));
  const m = Math.hypot(x, y); if (m) { const scale = keys.has('shift') ? .28 : 1; x = x / m * scale; y = y / m * scale; }
  return { x, y };
}
function pause() { if(previewing) { previewing=false; snapCamera=true; refresh(); } clearInput(); if (sim.state === 'playing') { sim.state = 'paused'; refresh(); } }
window.addEventListener('blur', pause);
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
function reset() { previewing=false; clearInput(); sim.reset(); snapCamera = true; refresh(); }
function finishPreview() { previewing=false; seenPreviews.add(stage.id); snapCamera=true; clearInput(); sim.start(); refresh(); }
function begin() {
  if(previewing)return;
  clearInput(); if(sim.state==='paused') {sim.start();refresh();return;}
  sim.reset();snapCamera=true;
  if(stage.route.length&&sim.settings.mode==='normal') {previewing=true;previewElapsed=0;} else sim.start();
  refresh();
}
$('skipPreview').onclick=finishPreview;
$('start').onclick = begin;
$('retry').onclick = () => { reset(); begin(); };
$('settings').onclick = () => { pause(); panel.showModal(); };
$('close').onclick = () => panel.close();
if (dev) {
  $('developer').hidden = false;
  const option = document.createElement('option'); option.value = 'developer'; option.textContent = '開発者'; $('mode').append(option);
  $<HTMLSelectElement>('mode').value = 'developer'; sim.settings.mode = 'developer';
}
$('options').onsubmit = e => {
  e.preventDefault();
  const result = { ...defaults };
  for (const k of Object.keys(defaults) as (keyof Settings)[]) {
    const el = $<HTMLInputElement | HTMLSelectElement>(k); if (!el) continue;
    const d = defaults[k];
    (result as unknown as Record<string, unknown>)[k] = typeof d === 'boolean' ? (el as HTMLInputElement).checked : typeof d === 'number' ? Number(el.value) : el.value;
  }
  if (!dev && result.mode === 'developer') result.mode = 'normal';
  if (result.mode === 'normal') { result.timed = true; result.checkpoint = 'start'; }
  result.minSpeed = Math.min(result.minSpeed, result.maxSpeed);
  sim.settings = result; stage=stages[$<HTMLSelectElement>('stageId').value]; sim.setStage(stage); panel.close(); reset(); if(game.scene.isActive('course')) game.scene.getScene('course').scene.restart();
};
let lastState = '', snapCamera = true;
function refresh() {
  const state = sim.state;
  $('notice').hidden = state === 'playing' || previewing || (state==='failed'&&performance.now()<failureRevealAt);
  $('skipPreview').hidden=!(previewing&&seenPreviews.has(stage.id));
  $('start').textContent = state === 'paused' ? '再開' : state === 'ready' ? 'スタート' : 'リトライ';
  $('message').innerHTML = state === 'failed' ? `${sim.reason}<br>同じ条件ですぐ再挑戦。` : state === 'clear' ? 'CLEAR！<br>おつかれさま、ゴール到達。' : state === 'paused' ? '一時停止中' : '白い丸を、ゴールまで。<br>壁に触れたら即リトライ。';
  lastState = state;
}
class CourseScene extends Phaser.Scene {
  constructor() {super('course');}
  private ink!: Phaser.GameObjects.Graphics;
  private debug!: Phaser.GameObjects.Graphics;
  private player!: Phaser.GameObjects.Arc;
  private burst() {
    failureRevealAt=performance.now()+180;failureBurstCount++;
    for(let i=0;i<18;i++) {
      const angle=i*Math.PI*2/18,travel=20+(i%5)*7;
      const dot=this.add.circle(sim.position.x,sim.position.y,1.5+(i%3)*.5,[0xffba76,0xf6d9b2,0xffffff][i%3]).setDepth(10);
      failureParticles++;
      this.tweens.add({targets:dot,x:dot.x+Math.cos(angle)*travel,y:dot.y+Math.sin(angle)*travel,alpha:0,scale:.1,duration:380+(i%3)*40,ease:'Cubic.Out',onComplete:()=>{dot.destroy();failureParticles--;}});
    }
    const ring=this.add.circle(sim.position.x,sim.position.y,sim.settings.playerRadius).setStrokeStyle(1,0xffffff).setDepth(9);
    this.tweens.add({targets:ring,scale:4,alpha:0,duration:300,onComplete:()=>ring.destroy()});
  }
  create() {
    failureParticles=0;
    $('app').dataset.skin='modern';
    document.querySelector('header span')!.firstChild!.textContent='PRECISION ';
    document.querySelector('h1')!.textContent='PRECISION';
    drawCopperWorld(this,stage,sim.geometry);

    const labels = stage.id==='prototype' ? [
      [200,1580,'START ↑'],[200,1200,'01 / STRAIGHT'],[420,1090,'02 / CRANK →'],[645,765,'03 / ROTOR ↑'],[945,595,'→ PRESS'],[1100,745,'04 / PRESS ↓'],[1280,190,'GOAL']
    ] : [[stage.checkpoints.start.x,stage.checkpoints.start.y-38,'START →'],[stage.route.at(-1)!.x,stage.route.at(-1)!.y-38,'GOAL'],...stage.sections.map(p=>[p.x,p.y,p.id+' / '+p.name])];
    for (const [x,y,t] of labels) this.add.text(Number(x),Number(y),String(t),{fontFamily:'system-ui',fontSize:'11px',color:'#9e846d'}).setOrigin(.5);
    if(stage.route.length) {
      const arrows=this.add.graphics().lineStyle(1,0x967558,.5);
      // Local directional cues before folds; no complete map during gameplay.
      for(let i=1;i<stage.route.length;i++) {
        const a=stage.route[i-1],b=stage.route[i],d=Math.hypot(b.x-a.x,b.y-a.y);
        if(d<80)continue;
        const x=(a.x+b.x)/2,y=(a.y+b.y)/2,angle=Math.atan2(b.y-a.y,b.x-a.x);
        arrows.lineBetween(x-7*Math.cos(angle-.5),y-7*Math.sin(angle-.5),x,y);
        arrows.lineBetween(x-7*Math.cos(angle+.5),y-7*Math.sin(angle+.5),x,y);
      }
    }
    if(stage.rest) {
      const r=stage.rest.area,cy=r.y+r.h/2;
      const gates=this.add.graphics().lineStyle(1,0xffffff,.6);
      if(stage.rest.start&&stage.rest.end) {
        for(const p of [stage.rest.start,stage.rest.end])gates.lineBetween(p.x-18,p.y,p.x+18,p.y);
        this.add.text(stage.rest.start.x,stage.rest.start.y+35,'REST ↓',{fontSize:'12px',color:'#aaa'}).setOrigin(.5);
      } else {
        gates.lineBetween(r.x,cy-12,r.x,cy+12);gates.lineBetween(r.x+r.w,cy-12,r.x+r.w,cy+12);
        this.add.text(r.x+r.w/2,cy-38,'REST',{fontSize:'12px',color:'#555'}).setOrigin(.5);
      }
    }
    this.ink = this.add.graphics(); this.debug = this.add.graphics();
    this.player = this.add.circle(sim.position.x,sim.position.y,sim.settings.playerRadius,0xffffff);
    this.cameras.main.setBounds(0,0,stage.width,stage.height);
    document.querySelector('header small')!.textContent=stage.name;
    refresh();
  }
  update(_time: number, delta: number) {
    if(previewing&&!panel.open) { previewElapsed+=Math.min(delta/1000,.1); if(previewElapsed>=(stage.previewSeconds??8))finishPreview(); }
    if (!panel.open&&!previewing) sim.advance(delta / 1000, input());
    if (lastState !== sim.state) { if(sim.state==='failed')this.burst(); clearInput(); refresh(); }
    if(sim.state==='failed'&&$('notice').hidden&&performance.now()>=failureRevealAt)refresh();
    $('timer').textContent = sim.settings.timed ? sim.remaining.toFixed(1) : '∞';
    $('status').textContent = `${stage.name} / ${previewing ? 'プレビュー' : ''}${sim.settings.mode === 'normal' ? '通常' : sim.settings.mode === 'practice' ? '練習' : '開発'} / ${sim.state === 'playing' ? (sim.resting ? '休憩中 / 区間を出ると再開' : sim.timerStarted ? '進行中' : '移動で計測開始') : sim.state === 'clear' ? 'クリア' : sim.state === 'failed' ? '失敗' : '待機'}${dev ? `  t=${sim.time.toFixed(2)}  (${Math.round(sim.position.x)}, ${Math.round(sim.position.y)})` : ''}`;
    this.ink.clear().fillStyle(0xffffff);
    for (const r of obstaclesAt(sim.time,stage)) {
      this.ink.save(); this.ink.translateCanvas(r.x,r.y); this.ink.rotateCanvas(r.angle ?? 0);
      drawCopperObstacle(this.ink,r);
      this.ink.restore();
    }
    for(const w of stage.windmills??(stage.windmill?[stage.windmill]:[])) { this.ink.fillStyle(0xffc98a).fillCircle(w.x,w.y,9); }
    if(sim.state!=='failed'&&!previewing)drawPlayerAura(this.ink,sim.position,sim.settings.playerRadius);
    this.player.setFillStyle(0xfff1dc);
    this.player.setPosition(sim.position.x,sim.position.y);
    this.debug.clear();
    if (sim.settings.mode === 'developer' && sim.settings.hitboxes) {
      this.debug.lineStyle(1,0xffffff,.65);
      for (const r of sim.walls) this.debug.strokeRect(r.x,r.y,r.w,r.h);
      if(sim.geometry)for(const polygon of sim.geometry.polygons)for(const ring of polygon)
        this.debug.strokePoints(ring.map(([x,y])=>({x,y})),true);

      for (const r of obstaclesAt(sim.time,stage)) {
        this.debug.save(); this.debug.translateCanvas(r.x,r.y); this.debug.rotateCanvas(r.angle ?? 0);
        this.debug.strokeRect(-r.w/2-1,-r.h/2-1,r.w+2,r.h+2); this.debug.restore();
      }
      this.debug.strokeCircle(sim.position.x,sim.position.y,sim.settings.playerRadius+1);
      this.debug.lineBetween(sim.position.x-12,sim.position.y,sim.position.x+12,sim.position.y);
      this.debug.lineBetween(sim.position.x,sim.position.y-12,sim.position.x,sim.position.y+12);
    }
    const cam = this.cameras.main;
    let focus={...sim.position};
    if(previewing) {
      const route=stage.previewRoute??stage.route;
      const lengths=route.slice(1).map((p,i)=>Math.hypot(p.x-route[i].x,p.y-route[i].y));
      let distance=lengths.reduce((a,b)=>a+b,0)*Math.min(1,previewElapsed/((stage.previewSeconds??8)-.2));
      focus=route.at(-1)!;
      for(let i=0;i<lengths.length;i++) { if(distance<=lengths[i]) {const t=distance/lengths[i];focus={x:route[i].x+(route[i+1].x-route[i].x)*t,y:route[i].y+(route[i+1].y-route[i].y)*t};break;}distance-=lengths[i];}
    }
    this.player.setVisible(!previewing&&sim.state!=='failed');
    const alpha = snapCamera ? 1 : 1-Math.exp(-delta/100);
    // Keep the player near center; dedicated control area never covers course geometry.
    cam.scrollX += (focus.x-cam.width/2-cam.scrollX)*alpha;
    cam.scrollY += (focus.y-cam.height*.58-cam.scrollY)*alpha;
    snapCamera = false;
  }
}
const container = $('game');
const game = new Phaser.Game({ type: Phaser.AUTO, parent: container, backgroundColor:'#000000',
  width:container.clientWidth, height:container.clientHeight, scene:CourseScene,
  render:{antialias:true, pixelArt:false}, input:{activePointers:3}, scale:{mode:Phaser.Scale.RESIZE},
  fps:{target:60,forceSetTimeOut:false}, banner:false });
new ResizeObserver(() => { game.scale.resize(container.clientWidth,container.clientHeight); snapCamera = true; }).observe(container);
// Read-only state hook used for browser verification; no gameplay controls exposed.
Object.defineProperty(window,'__precision',{value:()=>({viewportScale:window.visualViewport?.scale??1,stageId:stage.id,previewing,previewElapsed,canSkip:seenPreviews.has(stage.id),timerStarted:sim.timerStarted,resting:sim.resting,frontPassed:sim.frontPassed,failureBurstCount,failureParticles,position:{...sim.position},state:sim.state,time:sim.time,remaining:sim.remaining,settings:{...sim.settings}})});

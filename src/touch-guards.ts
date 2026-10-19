/** Suppress Safari native zoom on the game surface, including touchend smart zoom.
 * Canceling touchstart/end also suppresses synthetic clicks. Activate a button
 * once only when the same single finger starts and ends on it without a drag.
 * Native settings inputs/selects and one-finger dialog scrolling remain native.
 */
export function installTouchGuards(app:HTMLElement,panel:HTMLDialogElement) {
  let tap:{id:number;button:HTMLButtonElement|null;x:number;y:number;valid:boolean}|null=null;
  const element=(target:EventTarget|null)=>target instanceof Element?target:null;
  const guarded=(target:EventTarget|null)=>{
    const el=element(target);
    return !!el&&(app.contains(el)||!!el.closest('#panel button'));
  };
  const cancel=(e:Event)=>{if(e.cancelable)e.preventDefault();};
  document.addEventListener('touchstart',e=>{
    if(e.touches.length!==1){tap=null;cancel(e);return;}
    if(!guarded(e.target)){tap=null;return;}
    cancel(e);
    const t=e.changedTouches[0];
    tap={id:t.identifier,button:element(e.target)?.closest('button')??null,x:t.clientX,y:t.clientY,valid:true};
  },{capture:true,passive:false});
  document.addEventListener('touchmove',e=>{
    if(e.touches.length>1){tap=null;cancel(e);return;}
    if(tap){
      const t=Array.from(e.touches).find(t=>t.identifier===tap!.id);
      if(!t||Math.hypot(t.clientX-tap.x,t.clientY-tap.y)>12)tap.valid=false;
    }
    if(guarded(e.target))cancel(e);
  },{capture:true,passive:false});
  document.addEventListener('touchend',e=>{
    // Even when failure clears the virtual stick, suppress the native touchend.
    // This gesture's target stays its original element, not the new fail overlay.
    if(guarded(e.target))cancel(e);
    const ended=tap;tap=null;
    if(!ended||!ended.valid||!ended.button||e.touches.length)return;
    const t=Array.from(e.changedTouches).find(t=>t.identifier===ended.id);
    if(!t||Math.hypot(t.clientX-ended.x,t.clientY-ended.y)>12)return;
    const button=ended.button;
    if(!button.isConnected||button.disabled||!button.getClientRects().length)return;
    if(document.elementFromPoint(t.clientX,t.clientY)?.closest('button')!==button)return;
    // Pointerup + click remain the normal path for mouse and keyboard.
    button.click();
  },{capture:true,passive:false});
  document.addEventListener('touchcancel',e=>{tap=null;if(guarded(e.target))cancel(e);},{capture:true,passive:false});
  for(const type of ['gesturestart','gesturechange','gestureend'])document.addEventListener(type,cancel,{capture:true,passive:false});
  app.addEventListener('contextmenu',cancel);
  document.addEventListener('selectstart',e=>{
    if(!(element(e.target)?.closest('input,textarea')))cancel(e);
  });
  // A dismissed dialog must not leave the on-screen keyboard/focus zoom active.
  panel.addEventListener('close',()=>{
    const focused=document.activeElement;
    if(focused instanceof HTMLElement&&panel.contains(focused))focused.blur();
  });
}

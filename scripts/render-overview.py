"""Render runtime-exported geometry, no hand-drawn substitute. Requires Pillow."""
import json, math, hashlib, sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
root=Path(__file__).resolve().parents[1]
stage_id=sys.argv[1] if len(sys.argv)>1 else 'first'
output=root/(sys.argv[2] if len(sys.argv)>2 else 'docs/stages')
source=output/f'{stage_id}-stage-data.json'
s=json.loads(source.read_text())
if s.get('rest',{}).get('start'):
    s['restSpan']=[s['rest']['start'],s['rest']['end']]
if s.get('singlePresses'):
    s['pressZones']=[{'box':{'x':p['x'],'y':p['y']},'side':p['side'],'pocket':{'x':p['x'],'y':925 if p['side']=='top' else 775}} for p in s['singlePresses']]
font_path='/System/Library/Fonts/ヒラギノ角ゴシック W3.ttc'
def font(size):
    try:return ImageFont.truetype(font_path,size)
    except OSError:return ImageFont.truetype('DejaVuSans.ttf',size)
def label(d,pos,text,size=22):
    d.text(pos,text,font=font(size),fill='#111111',stroke_width=3,stroke_fill='white')
w,h=s['width'],s['height']
# Supersampling smooths only coverage; the vertices are the runtime collision boundary.
scale=3
hi=Image.new('RGB',(w*scale,h*scale),'white');hd=ImageDraw.Draw(hi)
for polygon in s['geometry']['polygons']:
    for i,ring in enumerate(polygon):hd.polygon([(x*scale,y*scale) for x,y in ring],fill='black' if i==0 else 'white')
# Dynamic geometry is exported at an explicit stage time and drawn from the
# same rotated rectangles as Phaser, including every blade and press plate.
for box in s.get('obstacles',[]):
    a=box.get('angle',0);co,si=math.cos(a),math.sin(a)
    corners=[]
    for dx,dy in [(-box['w']/2,-box['h']/2),(box['w']/2,-box['h']/2),(box['w']/2,box['h']/2),(-box['w']/2,box['h']/2)]:
        corners.append(((box['x']+dx*co-dy*si)*scale,(box['y']+dx*si+dy*co)*scale))
    hd.polygon(corners,fill='white',outline='#888888',width=2)
for rotor in s.get('windmills',[]):
    x,y=rotor['x']*scale,rotor['y']*scale;hd.ellipse((x-9*scale,y-9*scale,x+9*scale,y+9*scale),fill='white',outline='#555555',width=scale)
base=hi.resize((w,h),Image.Resampling.LANCZOS);draw=ImageDraw.Draw(base)
# Rest gate markers use the same area as the running game.
if s.get('rest') and not s.get('restSpan'):
    r=s['rest']['area'];cy=r['y']+r['h']/2
    for x in [r['x'],r['x']+r['w']]:draw.line((x,cy-12,x,cy+12),fill='#aaaaaa',width=1)
# Goal and start match runtime world coordinates.
g=s['goal'];draw.rectangle((g['x'],g['y'],g['x']+g['w'],g['y']+g['h']),outline='white',width=2)
p=s['checkpoints']['start'];draw.ellipse((p['x']-6,p['y']-6,p['x']+6,p['y']+6),fill='white')
base.save(output/f'{stage_id}-stage-game.png')
img=Image.new('RGB',(w,h+170),'white');img.paste(base,(0,100));d=ImageDraw.Draw(img)
label(d,(40,20),s.get('overviewTitle',f'{s["name"]} — N64参考の2D検証版 / 寸法・立体の展開・動作速度は調整'),30)
if s.get('restSpan'):
    a,b=s['restSpan'];x=a['x']-38
    d.line((x,a['y']+100,x,b['y']+100),fill='#777777',width=4)
    for q,text in [(a,'休憩開始'),(b,'休憩終了')]:
        y=q['y']+100
        d.line((x,y,q['x']+22,y),fill='#777777',width=4)
        label(d,(x-180,y-28),text,20)
for i,z in enumerate(s.get('pressZones',[])):
    box=z['box'];x=box['x'];y=box['y']+100
    sign=1 if z['side']=='top' else -1
    d.line((x,y-sign*22,x,y+sign*22),fill='#777777',width=3)
    d.line((x-8,y+sign*12,x,y+sign*22,x+8,y+sign*12),fill='#777777',width=3)
    q=z['pocket'];label(d,(q['x']-35,q['y']+100),'待避',18)
    label(d,(x-22,850+100),f'Z{i+1}',18)
# Annotations use gray route so the monochrome course can still be compared.
for route in [s['route'],*s['branches']]:
    pts=[(p['x'],p['y']+100) for p in route]
    d.line(pts,fill='#999999',width=3)
    carry=0
    for a,b in zip(pts,pts[1:]):
        length=math.dist(a,b);carry+=length
        if carry<95:continue
        carry=0;mx,my=(a[0]+b[0])/2,(a[1]+b[1])/2;angle=math.atan2(b[1]-a[1],b[0]-a[0])
        d.line([(mx-10*math.cos(angle-.6),my-10*math.sin(angle-.6)),(mx,my),(mx-10*math.cos(angle+.6),my-10*math.sin(angle+.6))],fill='#999999',width=3)
for section in s['sections']:
    label(d,(section['x'],section['y']+100),section['id']+' '+section['name'],20)
for i,(name,p) in enumerate(s['checkpoints'].items()):
    x,y=p['x'],p['y']+100
    d.rectangle((x-10,y-10,x+10,y+10),outline='#777777',width=3)
    label(d,(x-18,y-42),'P'+str(i),18)
p=s['checkpoints']['start'];label(d,(p['x']-30,p['y']+130),'START →',25)
end=s['route'][-1];label(d,(end['x']-35,end['y']+130),'GOAL',25)
width_note=f'基準通路{s["corridorWidth"]}px'
local_widths={v['width'] for v in s.get('corridorWidths',[])}|{v['width'] for v in s.get('straightPassages',[])}
if local_widths:width_note+=' / 細道'+','.join(str(w) for w in sorted(local_widths))+'px'
label(d,(40,h+115),f'灰線・矢印 = 進行ルート / 四角P0–P{len(s["checkpoints"])-1} = 練習開始地点 / {width_note}・半径6px・{s["limit"]}秒',21)
label(d,(40,h+145),'Source geometry SHA-256: '+hashlib.sha256(source.read_bytes()).hexdigest()[:20]+f' / 実データ: {stage_id}-stage-data.json',16)
img.save(output/f'{stage_id}-stage-overview.png')
for path in [f'{stage_id}-stage-game.png',f'{stage_id}-stage-overview.png']:
    with Image.open(output/path) as check:check.verify()
print(f'Verified PNG: game {w}×{h}, annotated {w}×{h+170}')

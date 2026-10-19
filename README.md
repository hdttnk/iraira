# PRECISION v0.1 — 操作性検証プロトタイプ

v0.1試験コースと、N64版を参考にした1st〜3rdを実装した銅線コースの2D精密アクション。TypeScript / Phaser 3.90 / Vite 7。外部アセット・アカウント・保存機能は不要。公開先は https://hdttnk.github.io/iraira/ 。mainへのpush後にGitHub Actionsでテスト・ビルド・Pages公開する。

## 全ステージの銅線ビジュアル

試験コース・1st・2nd・3rdすべて、黒っぽい背景に光沢のある2本の銅線を配した表示へ更新。「練習」からステージを選択できる。コース形状・操作・当たり判定は維持。[画像・検証記録](docs/visuals/prototype-copper.md)。

## 最新コース更新（2026-10-19）

確認済みの画像案を1st〜3rdへ反映済み。3rdはP6付近から最初の下降の最下部まで休憩、片側プレス4個と反対側の小さな待避所。入力・移動の操作感は維持。風車・プレス・小部屋を保ち、直線や長い折り返しを短縮済み。2nd「奥の細道」は幅30px（通常44px）。下壁固定・上壁のみが急に下がる段差形状に変更。

- `?stage=first` / `?stage=second` / `?stage=third` で選択。画面上部「練習」のステージ選択からも切替可能。
- 開発者モードは `?stage=third&dev=1` など。各コースに練習開始地点を設定済み。
- [変更・検証記録](docs/stages/n64-runtime-revision.md)。[1st俯瞰](docs/stages/first-stage-overview.png) / [2nd俯瞰](docs/stages/second-stage-overview.png) / [3rd俯瞰](docs/stages/third-stage-overview.png)。
- 現行48件のロジックテスト成功。新コースのiPhone Safari実機確認は未実施。
- 以下のv0.1試験コースの説明は `?stage=prototype` を対象とする。以前のコース調査・検証節は当時の記録として保持している。

## 起動

このMacでは `start.command` をダブルクリック（または `./start.command`）で起動できる。現在のCodex付属Nodeも検出する。
ブラウザで http://127.0.0.1:5173/ を開く。停止はTerminalで Control+C。

別環境でのセットアップ（Node.js 22.12以降推奨、pnpm）：

```sh
pnpm install
pnpm dev
pnpm test
pnpm build
pnpm test:browser
```

ブラウザテストはGoogle Chromeが必要で、開発サーバーが5173で起動済みであること。`tests/mobile.png` と `tests/developer.png` が確認用画像として生成される。
依存は `pnpm-lock.yaml` に固定。`pnpm-workspace.yaml` ではesbuildのみビルドスクリプトを許可。

## iPhoneで試す

1. MacとiPhoneを信頼できる同じWi-Fiにつなぐ。
2. Macで `pnpm dev:lan`（このMacでNode未導入なら `./start.command --host 0.0.0.0`）。
3. Viteが表示するNetwork URLをiPhone Safariで開く。ファイアウォールの許可が必要な場合がある。
4. 縦持ちで遊ぶ。終了時はMacでControl+C。

LAN起動は同一ネットワークから開発サーバーとソースへアクセス可能になる。通常の `start.command` / `pnpm dev` はMac内部限定。初回は自動承認レビューに拒否されたが、その後ユーザーが同一Wi-Fiへの公開を明示承認。LAN起動を実施済み。

## 操作

- スタートで開始。下の固定スティックをドラッグ。倒し量に応じて速度が変わり、離すと即停止。
- PCは矢印 / WASD。Shift併用で低速。斜めも同じ最高速度。マウスでスティック操作も可能。
- 壁・風車・プレスへの接触、または時間切れで失敗。リトライボタン / Rですぐ再開。
- Spaceは開始・再開。タブ切替、フォーカス喪失、250ms超のフレーム停止は一時停止。再開ボタンで続行。
- 通路は最初に上、クランクで右・上、風車室から右、プレスを下、右へ曲がって上のゴールへ進む。
- 風車室の外周に余裕があり、初期難度は低め。プレス手前は安全に待てる。

## 練習 / 開発者設定

上部の「練習」で設定画面を開く。練習モードではスタート・クランク入口・風車入口・プレス入口を選べる。失敗時も同じ地点から再開。タイマーOFF可、制限時間を変更可（初期90秒）。通常モードでは開始地点とタイマー有効を固定。

URL末尾に `?dev=1` を付けると開発者モードが選べる。通常画面には開発者操作を表示しない（セキュリティ制限ではない）。

- 任意X/Y座標、無敵、判定輪郭表示
- 障害物速度0〜4倍、プレイヤー速度0.1〜4倍
- タイマー停止（障害物は動く）、ステージ経過時間指定
- 最高/最低速度、デッドゾーン、速度カーブ

「適用」で待機状態へ戻り、スタートで指定条件から開始する。閉じるだけなら現在の進行を維持して一時停止。リトライ時は位相・経過時間・制限時間も同条件へ戻る。障害物速度倍率は障害物用ステージ時計の進みを変え、カウントダウンは実時間で進む。経過時間20秒・速度2倍なら20秒時点から倍速で進行。

## 構成 / パラメータ

- `src/engine.ts`：描画非依存の入力曲線、進行、円対矩形判定、固定1/120秒ステップ。
- `src/stage.ts`：通路矩形、開始点、風車・プレス・ゴールのデータ。障害物の状態は `obstaclesAt(t)` で再現。
- `src/main.ts`：Phaser描画、カメラ追従、Pointer Events、設定UI。
- `src/style.css`：縦画面・safe-area・ゲーム領域と操作領域の分離。

プレイヤー半径6px、最高125px/s、最低2px/s、デッドゾーン0.08、速度カーブ1.8。風車は羽根3本・長さ116px・角速度0.48rad/s、`direction`の符号で方向変更。プレスは振幅36px・周期4.8秒・位相0。プレスの最大速度は振幅×π÷周期で決まる（周期と速度は独立した値ではない）。

壁は10pxグリッドに揃えた通路の和集合の外側。データ変更時も位置・幅・高さを10px単位にする。描画と衝突は同じ矩形データを使う。風車中心9pxの円は羽根領域の内側。

高速移動と回転物の衝突には、プレイヤーと障害物表面の相対移動が0.5px以下になる細分化を使用。中間時点の判定を最大0.25pxだけ保守的に膨らませ、サンプル間のすり抜けを防止。表示輪郭と衝突に最大0.25pxの差がある。判定表示は白い外側輪郭・プレイヤーの十字線。大きな処理停止は時間を捨てず一時停止する。

## 検証結果

- ロジック11件：低速/高速・デッドゾーン・離した瞬間の停止・斜め速度・回転矩形・接線接触・2000px/sの壁抜け防止・画面外動作・リトライ再現性・時刻指定・練習地点・タイマー無効・開発設定・タイムアップ・クリア・長い停止の一時停止。
- 30/60/120fpsで同じ経過時間・移動位置。
- 無敵なしの通常モードで、風車室の安全ルートとプレス開放待ちを使い30〜60秒以内に全コースクリア。
- Chrome：キー操作、マウススティック、タッチイベント、離した後の停止、練習・開発UI、390×844 / 320×568 / 430×932 / 1440×900でのUI表示。ページ例外なし。
- TypeScript型チェック / 本番ビルド成功。

## 未検証 / Phase 2前の改善

**iPhone Safari実機は未検証。** ブラウザのモバイル設定は実機の代わりではない。Safari固有のPointer取消、アドレスバー伸縮、画面回転後の復帰、ホームインジケーター、指での低速調整、触れた感覚と判定の一致、発熱・フレーム落ちを確認すること。

30〜60秒は自動ルートでの目安。人間が初見で遊ぶ所要時間は未計測。Phase 2前に実機で最高速度・速度曲線・通路幅・カメラ位置を調整し、風車の追従体験とプレスの待ち時間を評価する。初期コースは外周を通れるため、風車の攻略圧は弱め。実機で判断して詰める。

GitHub Pages用には相対 `base: './'` を指定済み。`pnpm build` の `dist/` が配信対象。公開にはGitHubリポジトリとPages設定が別途必要。今回は公開していない。

技術参照：[Phaser導入](https://docs.phaser.io/phaser/getting-started/installation)、[Vite静的配信](https://vite.dev/guide/static-deploy)。

# 1st 更新（2026-10-18）

起動直後はテレビ初代を参考にした **1st / 90秒**。指定資料から読める構造を採用した検証版で、正確な寸法の再現ではない。
[調査・根拠・差異・検証](docs/stages/first-stage-research.md) を参照。

- 上部「練習」→ステージで1stとv0.1試験コースを切替。`?stage=prototype` でも旧コースへ直行。
- 1stは開始前8秒プレビュー。時計は止まる。2回目以降スキップ可。練習・開発モードは省略。
- 練習モードは7地点とタイマーOFF。開発者は `?dev=1`。既存の任意座標・無敵・判定・速度・時刻機能を維持。
- 設定で半径3〜10、1st通路幅36〜52、時間を調整。速度曲線の初期値はv0.1と同じ。旧コースの通路幅は従来どおり。
- ヘアピンの往復間隔を拡張し、自動操作62.49秒。実機フィードバックを受け、制限時間を60秒から90秒へ延長。練習では変更・OFFも可能。
- [ゲーム再現PNG](docs/stages/first-stage-game.png) / [注釈付き俯瞰PNG](docs/stages/first-stage-overview.png)。標準データから生成。

```sh
pnpm test
pnpm build
pnpm test:browser
pnpm test:browser:first
node --import tsx scripts/export-stage.ts
python3 scripts/render-overview.py
```

1stのiPhone Safari実機は未検証。以前のREADME内のv0.1検証結果は旧コースの記録として保持する。

## 実機フィードバック修正

ヘアピン領域の横方向の中心間隔を2倍にし、後続区間を平行移動。全体3512×940。最初の版では2本目の中心間隔が約44pxしかなく、通路幅44pxで往復が接続していた。図の見かけをそのまま等幅化したことが原因。3つの折返しの往復横断を、幅36/44/52px・両方向で失敗する回帰テストを追加した。

ゲーム画面の文字選択・長押しメニューを抑制。設定の入力欄は編集可能。ゲーム領域のtouch-action、Safariのgestureイベント、複数指touchmoveでズームを抑止する。設定パネルの1本指スクロールは許可。Chromeではピンチでviewport倍率が変わらないことを確認。iPhone Safariでの選択・ズーム抑止の実機再確認は未実施。

## 1stの輪郭をベクトル化

1stの4pxグリッド壁を廃止。中心線を丸い端を持つ通路ポリゴンへ変換し、polygon-clippingで結合した輪郭を描画・円との衝突・俯瞰PNGで共有する。斜線は直線になり、角の外側は丸くつながる。コースの意図したクランクや中心線の折れは維持。円弧の多角形近似誤差は幅52でも0.06px未満。グリッド由来の階段判定や通路パーツ間の内部境界はない。

`src/course-geometry.ts` が共通輪郭。`first-stage-data.json` の `geometry.polygons` が画像とゲームの元データ。PNGも更新済み。旧v0.1の矩形方式は比較用に維持。操作曲線・90秒・ヘアピン間隔は変更していない。

22件のロジックテスト成功（斜線に対する円の接線接触、ジョイント内部の誤判定防止、分岐島、高速壁抜け防止を追加）。Chromeで1st表示と設定・操作を確認。新しい輪郭のiPhone Safari実機確認は未実施。

## タイマー開始条件

スタート・プレビュー終了後は、丸が初めて実際に移動した時点からカウントダウンを開始する。スティックに触れただけ・デッドゾーン内の入力では開始しない。一度動いた後は止まっても時間が進み、リトライ時は移動待ちへ戻る。通常・練習・開発・両ステージ共通。タイマーOFFや開発者のタイマー停止は引き続き優先。障害物用のステージ時計は従来どおりスタート後から進む。

# 2nd追加：スーパー参考ステージ

[2ndを直接開く](http://127.0.0.1:5173/?stage=second)。上部「練習」→ステージ→2ndでも選択可能。1stと試験コースは維持。

ヘアピン・うずまき・細道・休憩・5段いろは坂・N字ひねり（2D）・フラッシュ・まゆげを実装。標準180秒、前半90秒（休憩まで）。休憩の時計停止、練習9地点、開発者モード `?stage=second&dev=1`。詳細と本家との差は [調査記録](docs/stages/second-stage-research.md)。

[2nd全体PNG](docs/stages/second-stage-game.png) / [注釈付き俯瞰PNG](docs/stages/second-stage-overview.png)。図は推定とスマホ向け調整を含む。

失敗時に丸が18粒へ弾けて消える演出を全ステージに追加。演出中もリトライできる。

```sh
node tests/browser-second.mjs
node --import tsx scripts/export-stage.ts second
python3 scripts/render-overview.py second
```

2ndのiPhone実機は未検証。最高速度・操作曲線は1stの設定を維持。

# 3rd追加：ウルトラ参考ステージ

[3rdへ直行](http://127.0.0.1:5173/?stage=third)、または「練習」→ステージ→3rd。

8枚羽×3の風車と上下分岐、休憩、縦5段の折返し、4連プレス、2回ひねり・まゆげの2D置換を実装。検証用240秒・前半120秒。練習12地点、12秒プレビュー、既存の操作・開発機能・破裂演出を維持。1st・2nd・旧試験コースも残している。

風車は隙間に合わせて半円通路を追従し、プレスは間で待って開放時に通過する。実物の噛み合い・立体ひねりは再現していない。[根拠と調整・検証記録](docs/stages/third-stage-research.md)に明記。

[ゲーム再現PNG](docs/stages/third-stage-game.png) / [注釈付き俯瞰PNG](docs/stages/third-stage-overview.png)。動く障害物はt=0の姿。

```sh
pnpm test:browser:third
node --import tsx scripts/export-stage.ts third
python3 scripts/render-overview.py third
```

開発者モードは `?stage=third&dev=1`。iPhone Safariの3rd実機確認は未実施。上/下の自動完走は無敵なしで約113/116秒。操作感と難易度は実機で調整する。

## iPhoneで意図せず拡大する症状への対策（2026-10-18）

ユーザー報告：衝突付近、指を離す/素早く方向変更した可能性のあるタイミングで画面が拡大し戻らない。ゲーム側にカメラの拡大処理はなく、Safariのネイティブズームが有力な仮説。iOSバージョンと実機のイベント記録は未取得のため原因確定ではない。

以前はCSSとgesturestart/change・複数指touchmoveだけの対策で、1本指のtouchendに対する抑止がなかった。`src/touch-guards.ts` に分離し、ゲーム面のtouchstart/move/end/cancelを非passiveのcaptureリスナーで抑止。衝突でスティック状態が消えても、元のタッチ終了を止める。ゲーム面の子要素にもtouch-action:noneを明示し、gestureendと長押しメニューも抑止する。

タッチのデフォルトclickも抑止されるため、ゲーム/設定ボタンは「1本指・同じボタンで開始/終了・12px以内・ドラッグ/多指でない」場合だけ1度clickを発火。マウス・キーボードのclickは従来どおり。設定input/select/textareaはネイティブのまま、文字サイズ16pxでフォーカス時の拡大も避ける。設定の1本指スクロールを維持。既にズームしている表示倍率をJSで強制リセットする処理は入れていない。

Chromeのモバイル設定で実タッチによるスティック移動/離指、衝突・急な方向変更・連続リトライ、ボタンの1回発火、ドラッグ/多指時の誤クリック防止、設定パネルのタッチスクロール/入力/適用、ピンチ時の倍率維持、touchendのdefaultPreventedを確認。**iPhone Safariでの症状再現と修正後確認は未実施。** 更新後はページを再読み込みして確認する。

```sh
pnpm test:browser:touch
```

参考：[WebKitの絶対配置要素でのダブルタップズーム報告](https://bugs.webkit.org/show_bug.cgi?id=218015)、[Appleのタッチイベントとデフォルト動作](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/HandlingEvents/HandlingEvents.html)。これらは今回の実機トリガーの証明ではなく、対策の根拠。

## GitHub Pages

リポジトリの Settings → Pages → Source は GitHub Actions。`.github/workflows/pages.yml` がmain更新時に公開する。CIでは `VITE_BASE_PATH=/iraira/` を指定し、ローカルの起動URLは維持する。公開内容は `dist/` のみ。

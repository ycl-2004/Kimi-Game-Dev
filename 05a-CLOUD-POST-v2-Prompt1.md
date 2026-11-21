# CLOUD POST! v2 · Kimi Prompt 1（从零生成，第一关）

> 11-21 比赛日定稿，取代 `04-CLOUD-POST-Prompt.md`。按规则练手版代码不能带进场，这份和 `05b` 都是交给 Kimi 从零写的。
> 参考图全部放在 `reference/` 文件夹，做法见 `06-reference-image-prompts.md`。prompt 里已经写了让 Kimi 开工前先用 `ReadMediaFile` 把这些图看一遍。

## 相对 04 改了什么

- **一关 30 秒**：05a 跑出来是 30 秒一局，只有第一关；05b 加上第二关后变成 60 秒
- **金区不再固定在中间**：金区的高低跟着目标岛离柜台的远近走。岛一直在漂，所以蓄力时金区也会跟着上下移动
- **每 15 秒升一档**：传送带加速，分数倍率按 x1 → x1.5 → x2 → x2.5 升，每次升档有横幅和猫头鹰语音
- **Fever 改成连送 4 件攒满，攒满后自己点开**，没用掉就一直保持满格
- **每个功能第一次出现的时间写死**：10 秒出第一件易碎件，20 秒出第一件急件，05b 再加上气球和组合键的时间点，保证每个玩家一局里都碰得到
- 3D 场景里只画一小段方向虚线，不画落点光圈
- 去掉的：难度选择、在线排行榜（只保留本机排行榜）、随机突发事件
- 能砍的功能全部做成 `src/config/gameConfig.ts` 里的开关，砍一个功能就是把对应开关改成 `false`

## 怎么用

| 时间 | 做什么 |
|---|---|
| 10:00 | 两个人各自从零跑这份 prompt，各出一版。开跑前把 `reference/` 文件夹复制进各自的项目，里面先放那两张旧 mockup |
| 10:00 起 | 第三个人按 06 用 GPT 出 4 张新参考图 |
| 10:45–11:00 | 一起玩两版，挑一版推到仓库 main，另一版丢掉。同时挑好新参考图，放进仓库的 `reference/`，删掉旧 mockup |
| 之后 | 在选中的版本上跑 `05b-CLOUD-POST-v2-Prompt2.md`，再跑 06 里的视觉打磨 prompt |

05b 跑不成功也不要紧：这份生成出来就是一局完整的 30 秒游戏，只有第一关。

## Kimi 和人的分工（Kimi 写八成以上）

规则要求 Kimi 是主要开发工具，所以代码全部由 Kimi 写，人只做 Kimi 做不了或不该做的事。

| 谁 | 做什么 |
|---|---|
| **Kimi（八成以上）** | 05a、05b 生成的全部代码。之后所有 bug 和手感问题，都由人描述清楚，交给 Kimi 改 |
| 人 | 挑版本、试玩、找问题 |
| 人 | 用 GPT 按 `06-reference-image-prompts.md` 出参考图，挑好后放进 `reference/` |
| 人 | 在 `src/config/gameConfig.ts` 里调数字，比如金区宽度、等待时间、评级分数线 |
| 人 | 用 ElevenLabs 按 prompt 里的文件名做音频，放进 `public/audio/` |
| 人 | 部署到 Vercel，在后台设好 `KIMI_API_KEY`（platform.kimi.ai 的密钥，走 `api.moonshot.ai`）和 `KIMI_MODEL=kimi-k3.1-pro-highspeed`。11-21 实测这把密钥能用 `kimi-k3`、`kimi-k3.1-pro`、`kimi-k3.1-pro-highspeed`；highspeed 回一句话约 1.3 秒，pro 约 1.9 秒，highspeed 更容易赶上 2.5 秒的超时 |
| 人 | 做二维码，录备份视频 |

规矩：

- 人不手写功能代码。除了调 `gameConfig.ts` 里的数字，其他改动都按下面的格式交给 Kimi
- 每次给 Kimi 的指令和它的回复都留着，被问「是不是用 Kimi 做的」时拿得出来
- 跟 Kimi 说一次改一件事，攒好一批再提。Kimi 跑一轮要 10 到 55 分钟，等的时候去做音频、去试玩

改 bug 或手感时，复制这段交给 Kimi：

```markdown
Bug / feel issue in CLOUD POST!:
- What I did:
- What happened:
- What should happen:
- Device / screen size:

Only change the files needed for this fix. Keep `npm run build` passing.
Do not change values in src/config/gameConfig.ts unless this request asks for it.
```

## 一局 60 秒（05b 做完之后）

| 时间 | 关卡 | 岛 | 操作 | 倍率 |
|---|---|---|---|---|
| 0–15s | 第一关 | 3 座 | 单键 | x1 |
| 15–30s | 第一关 | 3 座 | 单键 | x1.5 |
| 30s | 过场 2 秒，计时暂停 | | | |
| 30–45s | 第二关（日落） | 5 座 | 单键 + 组合键 | x2 |
| 45–60s | 第二关（日落） | 5 座 | 单键 + 组合键 | x2.5 |

每个功能第一次出现的时间点：10s 易碎件、12s 气球（05b）、20s 急件、32s 组合键包裹（05b）、38s 气球（05b）。

## 砍功能顺序

时间不够时从第 1 条往下砍，每条对应一个开关：

1. Kimi 实时点评 → `kimiReview: false`，结算小票改用本地兜底句子
2. 空中特技分 → `trickShot: false`（05b）
3. 日落换色 → `sunset: false`（05b），第二关保留，光照不变
4. 配音 → `voice: false`，保留合成音效和猫头鹰的文字气泡
5. Fever 手动点开 → `manualFever: false`，改回连送 4 件自动触发
6. 整个第二关 → `stage2: false`（05b），整局只剩第一关的 30 秒

这几样不砍：金区会动的力度条、加速加分阶梯、界面、音效。

## 验收

15:00 冻结之后，找 3 个没玩过的人，不做讲解，看两件事：

- 3 个人都能自己玩到第二关，而且都用过一次组合键
- 至少 2 个人结束后自己点了「再来一局」

达不到就只修他们卡住的地方，不再加功能。

## 协作提醒

`src/config/gameConfig.ts` 算共享文件，只由集成人改。要把它加进 Team 那份协作规矩的共享文件清单。

---

## 复制下面这段发给 Kimi Code

```markdown
You are building a polished browser game called **"CLOUD POST!"** from scratch for a live game jam demo, playable on desktop and mobile web. Build it complete and playable in this one pass. **This pass builds a 30-second run (stage 1).** A follow-up prompt will add a second 30-second stage, making the run 60 seconds, so keep the architecture data-driven exactly as described in §8.

**Reference images**: before writing any scene or UI code, open every image in the `reference/` folder with your `ReadMediaFile` tool and study them. Match their palette, clay materials, cloud sea, character design and HUD layout. Files named `00-old-*` are older mockups; use them only for mood, because their extra FRAGILE / EXPRESS buttons and the sleeping cat on a parcel are NOT part of this game. Wherever an image conflicts with this text, follow the text.

## 1. Pitch (also the 10-second onboarding)
You are a chubby clay postal cat working a floating conveyor desk above the clouds. Parcels roll toward you. **Hold the button of the parcel's island, watch the needle on the Power Bar, and release inside the gold zone** to catapult the parcel onto that island. The gold zone sits at the height that matches how far away the target island is right now: near islands need a soft throw, far islands need a strong one. The islands slowly drift closer and farther, so the gold zone slides up and down while you charge. Every 15 seconds the belt speeds up and points are worth more.

Onboarding line on the title screen and on the first parcel: *"Hold the island's button. Release when the needle is in the gold!"*

## 2. Aesthetic direction
A warm, sunlit pastel **miniature clay diorama** in **Three.js (WebGL, NOT WebGPU)**, with a tactile editorial HTML/CSS UI on top: perforated paper tickets, brass gauges, chunky press-and-hold buttons, a thermal paper receipt.

**Strict palette** (use only these across 3D materials and UI):
- Paper Cream `#FFF6E9`
- Sky gradient `#DDF1FF` → `#FFF6E9`
- Terracotta Express Red `#FF6B4A`
- Fragile Sky Blue `#4A90E2`
- Butter Yellow (gold zone, perfect, fever) `#FFD166`
- Mint Sage (Cake Isle, good zone) `#4CC9A0`
- Honey Wood desk `#E8B88A`
- Deep Cocoa Ink, used instead of black everywhere `#2B211E`

**3D rules**
- Procedural rounded geometry only (RoundedBoxGeometry, spheres, cylinders, cones, capsules). No external model files.
- Matte clay: `MeshStandardMaterial` with `roughness: 0.78`, `metalness: 0.04`.
- Lighting: `HemisphereLight(0xfff9f0, 0xd8c3a5, 1.0)` + `DirectionalLight(0xfff2dc, 1.4)` with `PCFSoftShadowMap` soft shadows.
- Every entity has squash-and-stretch, idle bobbing and springy easing.
- Fonts from Google Fonts: `Fredoka` (titles, buttons), `Plus Jakarta Sans` (body), `JetBrains Mono` (receipt numbers).

## 3. Stage and avatar
- **Full-bleed canvas (100vw × 100vh)** with a fixed, slightly top-down 3/4 camera looking over a long floating wooden conveyor desk toward **3 floating islands** in a drifting cloud sea.
- **Islands** (left to right), each with a floating label:
  1. `1 • Cake Isle`: mint green island, giant frosted cupcake, spinning windmill, pink hot-air balloon nearby.
  2. `2 • Cat Harbor`: sandy cove, striped lighthouse, little dock, yellow hot-air balloon nearby.
  3. `3 • Volcano Spa`: terracotta mini-volcano puffing smoke rings, turquoise hot-spring pool, coral hot-air balloon nearby.
  - Each island has a small brass **mailbox** at its center. Landing in the mailbox is the PERFECT throw.
- **Island distance and drift (this drives the core mechanic)**:
  - Each island has a *normalized distance* `d` in [0, 1], where 0 is the NEAR depth and 1 is the FAR depth from the launch point (for example 8 and 18 world units).
  - `d(t) = clamp(baseDistance + driftAmp * sin(2π t / driftPeriod + driftPhase), 0, 1)`. Starting values: Cake `base 0.30`, Harbor `base 0.70`, Spa `base 0.50`, all with `driftAmp 0.18`, periods `7s / 9s / 8s`, and different phases.
  - The island visibly moves toward and away from the desk along the camera depth axis, so players can see it is far or near. It also bobs a little vertically (cosmetic, no effect on gameplay).
- **Conveyor belt**: wood and brass, running from the left edge to a **Launch Zone** at center-right, animated slats, 3 to 5 parcels visibly queued. Slat speed follows the current speed step.
- **The player avatar is the postal cat**: round, chubby, matte-clay orange tabby with a tiny blue postal cap, standing beside the Launch Zone.
  - Idle: breathing, blinking bean eyes, wagging tail.
  - While charging: crouches and squashes down, ears twitching, body turned toward the selected island.
  - On release: springs up (stretch) and flings the parcel.
  - PERFECT: tiny joyful spin with sparkles. Miss: comical head-bonk wobble.
- **Aim cue**: while charging, draw only a **short dotted arc** (the first ~30% of the trajectory) from the cat toward the selected island. Do NOT draw a landing marker; the Power Bar is where players read power.

## 4. Core mechanic: the moving-zone Power Bar
- **Controls (desktop and mobile must feel identical)**:
  - Desktop: press and HOLD `1`, `2` or `3`, or mouse-hold the matching bottom button. Release to launch.
  - Mobile: press and HOLD one of the 3 big bottom buttons (`pointerdown` starts, `pointerup` / `pointercancel` releases). Use `touch-action: none`, `user-select: none`, `-webkit-touch-callout: none` and block `contextmenu`, so long-press never selects text, scrolls, zooms or opens menus.
- **Power Bar**: a bold vertical bar beside the Launch Zone, 0% at the bottom and 100% at the top.
  - While holding, the needle ping-pongs between 0% and 100%. Base sweep speed `0.75` bar-heights per second; EXPRESS parcels use `1.2`; each speed step adds `+8%`.
  - Bands, from bottom to top: red **TOO WEAK**, green **GOOD**, gold **PERFECT** inside the green, green **GOOD**, red **TOO STRONG**.
  - **Zone position**: `zoneCenter = lerp(0.26, 0.74, d)`, where `d` is the selected island's current normalized distance. Recompute it every frame, so the gold and green bands slide up and down as the island drifts.
  - **Zone widths** (half-widths around the center): NORMAL green `±0.17`, gold `±0.065`; FRAGILE green `±0.11`, gold `±0.035`. FEVER adds `+0.025` to the gold half-width.
  - Before the player holds anything, show the zone dimmed for the front parcel's target island with a small "HOLD TO CHARGE" hint. While charging, show it at full strength for the island being aimed at.
  - Judge the release against the zone **at the moment of release**.
- **Results**
  - **PERFECT** (gold): the parcel arcs into the mailbox. Island bounce, confetti, `PERFECT!` popup, `+1` streak.
  - **GOOD** (green): lands on the island rim with a playful bounce. Base score, `+1` streak.
  - **TOO WEAK** (below green): falls short into the clouds with a comical *poof*. Streak resets.
  - **TOO STRONG** (above green): sails past the island into the clouds behind it. A FRAGILE parcel instead slams into the island's far edge and shatters into clay shards. Streak resets.
  - **WRONG ISLAND**: wrong button, whatever the power. The parcel flies to that island, bounces off awkwardly, and a `WRONG ISLAND!` toast appears. Streak resets.
  - For PERFECT, snap the landing to the mailbox so perfects always look perfect. For GOOD, land on the rim. Compute the flight as a parabola to the island's position at landing time.
- **Belt timing**: the front parcel waits in the Launch Zone for up to `3.0s` at speed step 1, down to `1.9s` at step 4, then tumbles off the belt edge into the clouds (`DROPPED!`, streak resets). After any launch or drop, the next parcel slides into the Launch Zone within `0.6s`.

## 5. Parcels, scoring, speed ladder, fever
- **Parcel types** (no extra buttons):
  1. **NORMAL**: kraft clay box with a destination ribbon and island icon badge. `GOOD +100`, `PERFECT +150`.
  2. **FRAGILE**: translucent sky-blue crate with a teacup emblem and `FRAGILE` tape. Narrower zone; overshooting shatters it. `GOOD +130`, `PERFECT +200`.
  3. **EXPRESS**: terracotta winged parcel with a rocket tail and a countdown ring that starts at `6s` as soon as it is on the belt. The needle is faster. If the ring runs out before launch, the parcel puffs away as a miss. `GOOD +200`, `PERFECT +250`, golden fiery arc trail.
- **Final points** = base × speed-step multiplier × (2 if FEVER is active).
- **Run length**: this build is a **30-second run**. Define all four speed steps in config now; steps 3 and 4 simply never trigger until the follow-up prompt extends the run to 60 seconds.
- **Speed ladder** (a visible staircase, not a hidden ramp):

  | Time | Step | Belt / wait window | Multiplier | Random parcel mix |
  |---|---|---|---|---|
  | 0–15s | 1 | 1.0× / 3.0s | x1 | NORMAL only |
  | 15–30s | 2 | 1.2× / 2.6s | x1.5 | NORMAL 50% / FRAGILE 30% / EXPRESS 20% |
  | 30–45s | 3 | 1.45× / 2.2s | x2 | NORMAL 35% / FRAGILE 35% / EXPRESS 30% |
  | 45–60s | 4 "RUSH HOUR" | 1.7× / 1.9s | x2.5 | NORMAL 20% / FRAGILE 40% / EXPRESS 40% |

  On every step-up: a bouncy `SPEED UP!` banner (`RUSH HOUR!` for step 4), the multiplier pill in the HUD pops to its new value, the belt slats visibly speed up, the BGM playback rate rises about 4%, and the owl reacts.
- **Scripted firsts (every player must meet every parcel type)**: `SCRIPTED_FIRSTS` in config fixes the time each feature first appears: `{ at: 10, parcelType: 'FRAGILE' }` and `{ at: 20, parcelType: 'EXPRESS' }`. The first parcel that becomes launchable at or after `at` seconds of run time is forced to that type. A type never comes from the random mix before its scripted first has appeared. The follow-up prompt will add more entries (balloons, chord parcels), so make the entry shape extensible.
- **Fever (manual)**: 4 successful deliveries in a row fill the brass FEVER tube. A miss before it is full empties it. **Once full, it stays full until the player uses it**: it glows, pulses and shows `TAP!`. Activate with `Space`, by clicking the tube, or by tapping it on mobile. FEVER lasts `8s`: golden glow over the scene, 2× points, wider gold zone, celebratory chime. The choice of when to spend it (save it for RUSH HOUR or use it now) is intentional.

## 6. UI screens
1. **Title screen (attract mode, meant to pull people in from 3 meters away)**
   - Chunky 3D-extruded `CLOUD POST!` logo, cream ribbon tagline (the onboarding line from §1), big terracotta `START SHIFT` button (`Enter` also starts).
   - Behind it the 3D world plays a **live autonomous demo**: the cat charges and launches parcels, islands drift, the zone moves. Demo AI: 70% release in gold, 25% in green, 5% misses. It sometimes triggers fever.
   - Bottom-left pill: `LIVE DEMO • AUTO-PLAYING` with a pulsing mint dot. Bottom-right: round sound toggle and trophy button (opens the local leaderboard).
2. **Gameplay HUD (zero clutter)**
   - **Top-left**: SVG portrait of the **Owl Postmaster** in a postal cap, with bouncy speech bubbles (see §7).
   - **Top-center**: perforated paper **parcel ticket** hanging from a brass rail. It shows the front parcel's island icon and name, its type badge (`NORMAL` / `FRAGILE` / `EXPRESS`), and a mini strip with the next 2 parcels.
   - **Top-right**: cream pills for the remaining time (`0:30` in this build), `SCORE`, `xN COMBO`, and the speed multiplier (`x1.5`).
   - **Right side**: the Power Bar (§4) next to the Launch Zone, and the vertical brass FEVER tube at the screen edge.
   - **Bottom console**: 3 big, chunky, pressable buttons: `1 • CAKE` (mint), `2 • HARBOR` (butter yellow), `3 • SPA` (coral). Each has an island icon, a hard bottom shadow and real press-down depth while held.
3. **End screen: printed thermal "Postal Inspection Receipt"**
   - Slides up like a freshly printed serrated receipt over the blurred 3D sky, with a printer sound.
   - Tilted rubber-stamp grade. Thresholds live in config, defined for a 60-second run (`S+ ≥ 9000`, `S ≥ 7000`, `A ≥ 5000`, `B ≥ 3000`, otherwise `C`) and scaled by `runLength / 60`, so this 30-second build uses half of each.
   - Stats grid: Parcels Delivered, Perfect Bullseyes, Fragile Smashed, Dropped / Missed, plus Max Streak.
   - **Chief Inspector review box**: see §10.
   - Name input + `SAVE SCORE` writes to the **local leaderboard**: `localStorage` only, top 10, pre-seeded with 5 fun demo entries, the new entry highlighted. Wrap every storage access in try/catch so private mode still works. **No online leaderboard and no `/api/leaderboard`.**
   - Big bouncy `PLAY AGAIN` button (`Enter` or tap).

## 7. Audio (MP3 first, synthesized fallback)
- `src/audio/SoundManager.ts` checks `/audio/*.mp3` once at startup, caches which files exist, and plays them. Any missing file falls back to **Web Audio synthesized SFX**, so the game sounds good with zero files.
- SFX files: `charge_loop.mp3`, `launch.mp3`, `perfect.mp3`, `good.mp3`, `shatter.mp3`, `miss.mp3`, `drop.mp3`, `fever.mp3`, `speedup.mp3`, `receipt.mp3`, `bgm.mp3`.
- Synth fallbacks: a rising-pitch charge tone that follows the needle, a springy launch *fwoosh*, rising pentatonic marimba chimes on combos, a glass clink for shatters, a low *boing* for misses, a cozy marimba BGM loop.
- **Owl voice lines** (only when `FEATURES.voice` is true; the speech bubble text always shows):

  | Event | Bubble text | File |
  |---|---|---|
  | Run start | "Shift starts! Hold and release!" | `voice_start.mp3` |
  | PERFECT | "PERFECT THROW!" | `voice_perfect.mp3` |
  | Miss / drop | "Oof! Watch the gold!" | `voice_miss.mp3` |
  | EXPRESS appears | "EXPRESS! Hurry!" | `voice_express.mp3` |
  | Fever full | "Fever's ready! Tap it!" | `voice_fever_ready.mp3` |
  | Fever on | "FEVER TIME!!" | `voice_fever.mp3` |
  | Step 2 / 3 | "Speed up!" | `voice_speedup.mp3` |
  | Step 4 | "RUSH HOUR!" | `voice_rush.mp3` |
  | Run end | "Shift over! Let's see your receipt." | `voice_end.mp3` |

- Unlock audio on the first user interaction. Respect the sound toggle everywhere.

## 8. Architecture (data-driven so a second stage can be added later)
- **Stack**: Vite + TypeScript + Three.js (`three`) + modular CSS.
- `src/config/gameConfig.ts`: **the single home of every tunable**. Nothing below hard-codes these values.
  - `ISLANDS`: array of `{ id, name, short, color, icon, inputs, baseDistance, driftAmp, driftPeriod, driftPhase, x }`. For now `inputs` is a single key, for example `['1']`. The follow-up prompt will add islands whose `inputs` are two keys.
  - `STAGES`: for now one stage `{ id: 'day', start: 0, end: 30, islandIds: [0, 1, 2], driftScale: 1 }`. The run length is the last stage's `end`; nothing else may hard-code 30 or 60.
  - `SPEED_STEPS` (all four), `SCRIPTED_FIRSTS`, `PARCEL_TYPES` (scores, zone widths, needle speed), `FEVER`, `GRADES`, `OWL_LINES`.
  - `FEATURES = { kimiReview: true, voice: true, manualFever: true }`. Each flag must cleanly turn its feature off: `kimiReview: false` means local fallback reviews only; `voice: false` means no voice files are requested; `manualFever: false` means fever auto-triggers at 4 streak.
- `src/game/PowerBar.ts`: pure functions for needle motion, `zoneFor(islandDistance, parcelType, feverActive)` and `judge(power, zone)`. This is the **only** place that maps distance to power.
- `src/game/InputController.ts`: keyboard and pointer hold/release. It tracks the set of currently held inputs (by key and by `pointerId`, multi-touch safe) and resolves that set to a target island by matching `ISLANDS[].inputs`. The engine never reads keys directly. This is what lets the follow-up add two-key chords without touching the engine.
- `src/game/GameEngine.ts`: state machine (`title` / `playing` / `ended`), run timeline driven by `STAGES`, `SPEED_STEPS` and `SCRIPTED_FIRSTS`, parcel queue and wait windows, judging via `PowerBar`, scoring, fever, attract-mode AI. Emits typed events: `onSnapshot`, `onResult`, `onStepUp`, `onFeverReady`, `onEnd`.
- `src/scene/DioramaScene.ts`: the Three.js world. Islands are built from `ISLANDS` through one builder function per island, so a new island is a new builder plus a config entry. Exposes `getIslandDistance(id)` (normalized, current frame), which the engine passes to `PowerBar` every frame.
- `src/audio/SoundManager.ts`: §7.
- `src/services/review.ts`: §10. `src/services/leaderboard.ts`: localStorage leaderboard.
- `src/ui/`: `TitleScreen`, `Hud` (ticket, pills, Power Bar view, fever tube, console), `Receipt`, `Leaderboard`.
- `api/review.ts`: Vercel serverless function (§10).
- **Do NOT add**: a difficulty selector, an online leaderboard, random events, or a landing marker.

## 9. Mobile layout
- Must work at `390×844` portrait and `1280×800` landscape with zero overlap between the ticket, pills, owl bubble, Power Bar, fever tube and console.
- On narrow screens, shrink the islands' labels and the owl portrait first. Never shrink the 3 console buttons below 30% of the screen width each, and keep the Power Bar at least 40% of the viewport height.

## 10. Chief Inspector review (Kimi)
- On the receipt, call `POST /api/review` with `{ name, score, grade, delivered, perfect, fragileSmashed, missed, maxStreak, feverUsed }`.
- `api/review.ts` calls the OpenAI-compatible endpoint `https://api.moonshot.ai/v1/chat/completions` with `process.env.KIMI_API_KEY` and model `process.env.KIMI_MODEL`. It asks for strict JSON `{ "title": "...", "review": "..." }`: a funny job title (for example "Supreme Catapult Whiskers") and one witty sentence about the run's stats.
- The client waits at most **2.5s**. On timeout, error, bad JSON, or `FEATURES.kimiReview === false`, it immediately uses a **local fallback pool of 15+ stat-aware reviews** with matching titles (lines for many perfects, many smashed fragiles, many drops, long streak, never used fever, and so on). The receipt never waits on the network.
- Never expose the API key to the client.

## 11. Verification
- `npm run build` passes with zero TypeScript errors.
- Hold and release behave identically with keys `1/2/3`, mouse hold and touch hold. Long-press never selects text, scrolls, zooms or opens a menu.
- The gold zone sits at visibly different heights for the three islands and slides as each island drifts. A release is judged against the zone at release time.
- At 15s the step-up happens with banner, owl line, multiplier pill change and faster belt. The run ends at 30s and the receipt appears.
- The first FRAGILE parcel appears at 10s and the first EXPRESS parcel at 20s in every run, and neither appears earlier.
- Fever fills at 4 streak, stays full until used, and activates with `Space` or a tap. With `manualFever: false` it auto-triggers.
- With `/api/review` unreachable, the receipt still shows a review within 2.5s.
- Each `FEATURES` flag set to `false` still produces a working game.
- No UI overlap at `390×844` and `1280×800`. The attract-mode demo runs on the title screen and the sound toggle works.
```

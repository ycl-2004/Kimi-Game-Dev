# CLOUD POST! v2 · 参考图（GPT 生成，给 Kimi 参考）

> 只用 GPT 生图。每个画面出一张，挑好后放进 `reference/`，Kimi Code 开工前会用 `ReadMediaFile` 读这些图。
> `~/Desktop/temp/Kimi-Game-Dev/reference/` 已经建好，先放了两张旧 mockup（`00-old-gameplay.jpg`、`00-old-idle.jpg`）。10:00 跑 05a 时就用这两张。

## 流程

1. 每张图在 ChatGPT 里新开一个对话，把下面对应的整段 prompt 贴进去
2. 不满意就重新生成，每张最多试 3 次，别在一张图上耗太久
3. 按下面的 6 条挑图，由负责界面的人拍板
4. 下载下来，按名字存进 `reference/`：`01-stage1.png`、`02-stage2.png`、`03-characters.png`、`04-receipt.png`
5. 缩小图片，再复制进游戏仓库（命令在下面）
6. 新图放进仓库后，把仓库里 `reference/` 下的 `00-old-*` 删掉，免得 Kimi 被旧图带偏

图里的字出现乱码不要紧，Kimi 参考的是画面和布局，字以 prompt 为准。

## 挑图的 6 条

1. 颜色只用 prompt 里列的那几个色
2. 哑光黏土质感，所有东西都是圆的
3. 能用球、圆柱、圆角方块这些基本形状拼出来。太复杂的东西 Kimi 拼不出来，参考价值就低
4. HUD 布局对得上：猫头鹰在左上，包裹票在中上，计时和分数胶囊在右上，力度条和 Fever 管在右侧，3 个按钮在底部
5. 力度条的金区明显不在正中间
6. 缩到手机大小还看得清

两张图打平时，选更容易用基本形状拼出来的那张。

## 缩小图片、复制进游戏仓库

每张图的长边缩到 1600 像素，单张大约 1 到 3 MB，4 张加起来不会碰到 Kimi Code 20 MB 的上限：

```bash
cd ~/Desktop/temp/Kimi-Game-Dev
sips -Z 1600 reference/*
ls -lh reference/
```

游戏代码如果不在 `Kimi-Game-Dev` 根目录（比如两个人各跑一版、各在一个文件夹），在那个文件夹的根目录执行：

```bash
mkdir -p reference
cp ~/Desktop/temp/Kimi-Game-Dev/reference/* reference/
```

---

## 01 · 第一关游戏画面（白天）

```text
Create a wide landscape (16:9) in-game screenshot of an arcade game called CLOUD POST!.

SCENE: fixed camera, slightly top-down 3/4 view. In the lower foreground, a long floating wooden-and-brass conveyor desk runs from the left edge to a round brass launch pad at center-right, floating above a sea of puffy white clouds. Three floating islands sit in the middle distance at clearly DIFFERENT distances from the desk:
- left, CLOSEST and largest: Cake Isle, a mint green island with a giant frosted cupcake and a small windmill;
- center, FARTHEST and smallest: Cat Harbor, a sandy cove island with a striped lighthouse and a little dock;
- right, MIDDLE distance: Volcano Spa, a terracotta mini volcano puffing round smoke rings next to a turquoise hot-spring pool.
Each island has a small brass mailbox at its center and a cream pill label: "1 • Cake Isle", "2 • Cat Harbor", "3 • Volcano Spa". Two pastel hot-air balloons float in the sky.

CHARACTER: a round, chubby orange tabby clay cat wearing a tiny blue postal cap stands beside the launch pad, crouched and squashed down as if charging a throw, body turned toward Cat Harbor. A kraft-paper parcel with a yellow ribbon sits on the launch pad. Behind it on the belt: a translucent sky-blue crate with FRAGILE tape, and a terracotta parcel with tiny wings and a countdown ring. A SHORT dotted arc (only the first third of a throw) rises from the cat toward Cat Harbor. No landing marker.

UI OVERLAY:
- top-left: round portrait badge of an owl postmaster in a postal cap, with a speech bubble "PERFECT THROW!";
- top-center: a perforated cream paper ticket hanging from a thin brass rail, showing a lighthouse icon, "CAT HARBOR", a small "NORMAL" badge, and two tiny icons for the next parcels;
- top-right: four rounded cream pills: "0:24", "1,450", "x3 COMBO", and a butter-yellow pill "x1.5";
- right side, next to the launch pad: a tall vertical POWER BAR. Red at the bottom and at the top, a green band with a narrower gold band inside it placed HIGH on the bar at about 70% height (clearly NOT centered), and a pointer needle currently inside the gold band;
- far right edge: a vertical brass-and-glass FEVER tube, half filled with golden liquid;
- bottom: three big chunky pressable buttons side by side: "1 CAKE" in mint with a cupcake icon, "2 HARBOR" in butter yellow with a lighthouse icon (shown pressed down), "3 SPA" in coral with a volcano icon.
Keep the HUD uncluttered with plenty of breathing room.

STYLE: a warm, sunlit pastel miniature clay diorama, like a handmade tabletop model. Matte clay / plasticine surfaces with soft roughness and no gloss. Every object is built from simple rounded primitives (spheres, capsules, cylinders, cones, rounded boxes) with no fine texture detail, so it could be rebuilt in Three.js from basic shapes. Soft warm ambient light plus one warm key light, soft shadows, slight tilt-shift miniature depth of field. Clean, editorial, tactile game UI on top. STRICT PALETTE, use only: Paper Cream #FFF6E9, sky gradient #DDF1FF to #FFF6E9, Terracotta Red #FF6B4A, Sky Blue #4A90E2, Butter Yellow #FFD166, Mint Sage #4CC9A0, Honey Wood #E8B88A, and Deep Cocoa #2B211E for all dark lines and text (never pure black). Not photorealistic. Keep all text short and crisp.
```

## 02 · 第二关游戏画面（日落）

```text
Create a wide landscape (16:9) in-game screenshot of the SECOND STAGE ("Sunset Shift") of the arcade game CLOUD POST!.

SCENE: same fixed, slightly top-down 3/4 camera, same long wooden-and-brass conveyor desk and cloud sea, but at SUNSET: sky gradient from lavender haze #CDB8E8 at the top to peach #FFD3B0 at the horizon, a low warm sun, clouds with soft peach rims, long warm shadows. FIVE floating islands in a shallow arc at varied distances, left to right:
1. Cake Isle (mint island, frosted cupcake, windmill), label "1 • Cake Isle";
2. Berry Farm (berry pink #FF8FB1 island with a strawberry patch, a tiny cream barn with a pink roof and a little scarecrow), label "1+2 • Berry Farm";
3. Cat Harbor (sandy cove, striped lighthouse), label "2 • Cat Harbor";
4. Star Observatory (lavender #B39DDB island with a small domed observatory, a brass telescope and a few floating star sparkles), label "2+3 • Star Observatory";
5. Volcano Spa (terracotta mini volcano with smoke rings, turquoise hot spring), label "3 • Volcano Spa".
Berry Farm and Star Observatory sit slightly higher than their neighbors so nothing overlaps. Each island has a small brass mailbox. A pastel hot-air balloon drifts across the path toward Berry Farm.

CHARACTER: the chubby orange tabby clay cat in a tiny blue postal cap, crouched and charging, aimed at Berry Farm, with a short dotted arc toward it. A parcel with a berry-pink ribbon sits on the launch pad.

UI OVERLAY (same layout as stage 1):
- top-left: owl postmaster portrait badge with a speech bubble "Two buttons at once!";
- top-center: perforated paper ticket showing a strawberry icon, "BERRY FARM", and a key badge "1+2";
- top-right pills: "0:41", "6,820", "x5 COMBO", and a butter-yellow pill "x2";
- right: the tall vertical POWER BAR with its green and gold bands placed LOW-MIDDLE at about 40% height; directly above the green band, a narrow extra band marked with a tiny hot-air balloon icon (the trick-shot band); red at the top and bottom;
- far right: the FEVER tube completely full, glowing gold, with a small "TAP!" label;
- bottom: the three chunky buttons "1 CAKE" (mint), "2 HARBOR" (butter yellow), "3 SPA" (coral). Between button 1 and button 2, a small glowing berry-pink pill-shaped bridge, lit and pulsing; between button 2 and button 3, a small lavender bridge, dim. Buttons 1 and 2 are both shown pressed down.
Keep the HUD uncluttered.

STYLE: a warm pastel miniature clay diorama at sunset, like a handmade tabletop model. Matte clay / plasticine surfaces with soft roughness and no gloss. Every object is built from simple rounded primitives (spheres, capsules, cylinders, cones, rounded boxes) with no fine texture detail, so it could be rebuilt in Three.js from basic shapes. Warm low-sun key light, soft shadows, slight tilt-shift miniature depth of field. Clean, editorial, tactile game UI on top. STRICT PALETTE, use only: Paper Cream #FFF6E9, Lavender Haze #CDB8E8, Peach #FFD3B0, Terracotta Red #FF6B4A, Sky Blue #4A90E2, Butter Yellow #FFD166, Mint Sage #4CC9A0, Honey Wood #E8B88A, Berry Pink #FF8FB1, Lavender #B39DDB, and Deep Cocoa #2B211E for all dark lines and text (never pure black). Not photorealistic. Keep all text short and crisp.
```

## 03 · 角色和道具设定图

```text
Create a wide landscape character and prop reference sheet for the game CLOUD POST!, on a plain Paper Cream #FFF6E9 background, with items arranged in a tidy grid and a small Deep Cocoa caption under each item.

Row 1, the postal cat (a round, chubby orange tabby clay cat with bean eyes and a tiny blue postal cap), three poses: "IDLE" standing with tail up; "CHARGE" crouched and squashed down, ears back, looking up and to the right; "LAUNCH" stretched tall, springing upward with paws raised.
Row 2, the Owl Postmaster: a round clay owl bust with big eyes and a postal cap, shown as a 3D clay figure, and next to it the same owl as a flat circular portrait badge for the game UI.
Row 3, three parcels: "NORMAL" kraft clay box with a colored ribbon and a round island badge; "FRAGILE" translucent sky-blue crate with a white teacup emblem and FRAGILE tape; "EXPRESS" terracotta box with tiny wings, a little rocket tail and a countdown ring.
Row 4, props: a small brass mailbox on a post, a pastel hot-air balloon, a round smoke ring, a confetti burst, and a few broken clay shards from a smashed fragile crate.

Every item must be buildable from simple rounded primitives (spheres, capsules, cylinders, cones, rounded boxes). Even soft lighting, soft contact shadows, no background scenery.

STYLE: matte clay / plasticine look with soft roughness and no gloss, warm and cute, no fine texture detail, not photorealistic. STRICT PALETTE, use only: Paper Cream #FFF6E9, Terracotta Red #FF6B4A, Sky Blue #4A90E2, Butter Yellow #FFD166, Mint Sage #4CC9A0, Honey Wood #E8B88A, and Deep Cocoa #2B211E for all dark lines and text (never pure black). Keep captions short and crisp.
```

## 04 · 结算小票（手机竖屏）

```text
Create a tall portrait image with phone-screen proportions (about 390 x 844) showing the END SCREEN of the game CLOUD POST!.

A long thermal-paper receipt with serrated top and bottom edges slides up over a softly blurred view of a sunny pastel clay diorama sky with clouds. The receipt paper is Paper Cream #FFF6E9 with Deep Cocoa #2B211E monospace text. Contents from top to bottom:
- header "CLOUD POST!" and "POSTAL INSPECTION RECEIPT";
- a tilted terracotta rubber-ink stamp with the grade "S";
- a 2 x 3 stats grid: "DELIVERED 18", "PERFECT 9", "TRICK SHOTS 2", "CHORD 3", "SMASHED 1", "MISSED 2", then one line "MAX STREAK 7";
- a boxed "CHIEF INSPECTOR REVIEW" with a tiny owl icon, a funny job title "Supreme Catapult Whiskers" and one short witty sentence;
- a name input field and a "SAVE SCORE" button;
- "LOCAL LEADERBOARD" with 5 short rows of names and scores, the player's row highlighted in Butter Yellow #FFD166;
- a big bouncy terracotta #FF6B4A "PLAY AGAIN" button with a hard bottom shadow.
The receipt fills most of the width with comfortable margins, and everything is readable at phone size.

STYLE: tactile, editorial, cute. Matte paper texture, rubber-stamp ink, soft shadows. STRICT PALETTE, use only: Paper Cream #FFF6E9, sky gradient #DDF1FF to #FFF6E9, Terracotta Red #FF6B4A, Sky Blue #4A90E2, Butter Yellow #FFD166, Mint Sage #4CC9A0, Honey Wood #E8B88A, and Deep Cocoa #2B211E (never pure black). Not photorealistic. Keep all text short and crisp.
```

---

## 视觉打磨 prompt（交给 Kimi Code）

什么时候跑：05b 跑完，4 张新参考图也都放进仓库的 `reference/` 之后。05b 没跑成的话，在 05a 的版本上也能跑。

```markdown
Visual polish pass for CLOUD POST!. Do not change gameplay rules, timings, scores, or any value in src/config/gameConfig.ts.

1. Open every image in reference/ with your ReadMediaFile tool. If you can take screenshots of the running game, compare them against the references; otherwise compare the scene and UI code against them. List the 8 biggest visual differences: palette, materials, island shapes, cat and owl design, parcel looks, HUD layout and spacing, button feel, receipt.
2. Fix the 5 most visible differences, most visible first. Only change files under src/scene/, src/ui/ and the CSS.
3. Keep the layout working at 390x844 and 1280x800 with no overlap, and keep `npm run build` passing.
4. At the end, list what you changed and which of the 8 differences remain.
```

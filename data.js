"use strict";
const TILE_IDS = [
  "grass",
  "dirt",
  "floor",
  "wall",
  "water",
  "water_2",
  "tree",
  "door",
  "stairs",
  "chest",
  "chest_open",
  "goal",
  "rock",
  "hero_down",
  "hero_up",
  "hero_left",
  "hero_right",
  "villager",
  "oldman",
  "enemy",
  "boss",
  "warp",
  "reverse",
  "pit",
  "pit_edit",
  "invisible_wall_edit",
  "mimic",
  "mimic_edit",
  "loop_edit",
  "fake_goal_edit",
  "badge",
];
const NAMES = {
  grass: "草地",
  dirt: "土の道",
  floor: "石の床",
  wall: "壁",
  water: "水",
  water_2: "水（2）",
  tree: "木",
  door: "扉",
  stairs: "階段",
  hero_down: "主人公",
  villager: "村人",
  chest: "宝箱",
  enemy: "ドロドロ",
  goal: "ゴール",
  invisible_wall: "見えない壁",
  pit: "落とし穴",
  mimic: "ミミック",
  warp: "ワープ床",
  reverse: "あべこべ床",
  loop: "ループ階段",
  fake_goal: "ニセのゴール",
  oldman: "長話のおじいさん",
  boss: "黒い騎士",
};
const GROUND = [
  "grass",
  "dirt",
  "floor",
  "wall",
  "water",
  "water_2",
  "tree",
  "door",
  "stairs",
];
const NORMAL = ["hero_down", "villager", "chest", "enemy", "goal"];
const TRAPS = [
  "invisible_wall",
  "pit",
  "mimic",
  "warp",
  "reverse",
  "loop",
  "fake_goal",
  "oldman",
  "boss",
];
const OBJECTS = [
  ...NORMAL.filter((x) => x !== "hero_down"),
  ...TRAPS,
  "door",
  "stairs",
];
const CHARS = {
  grass: ".",
  dirt: "d",
  floor: "f",
  wall: "#",
  water: "~",
  water_2: "w",
  tree: "T",
  door: "D",
  stairs: "S",
};
const LEGEND = Object.fromEntries(
  Object.entries(CHARS).map(([a, b]) => [b, a]),
);
const clone = (o) => JSON.parse(JSON.stringify(o));
function blankMap(name = "マップ1", ground = "grass") {
  return {
    name,
    ground: Array(12).fill(CHARS[ground].repeat(16)),
    legend: clone(LEGEND),
    objects: [],
  };
}
function freshGame() {
  return {
    format: "kusoge-maker/1",
    title: "名もなき理不尽",
    author: "ななし",
    description: "ゴールまで、たどりつける？",
    hero: { hp: 20, atk: 5 },
    openingMessage: "矢印キー・WASDで移動。前のマスをしらべよう。",
    kuso: {
      encounterRate: 0,
      textSpeed: "normal",
      vision: "all",
      walkSpeed: "normal",
      bgmSpeedUp: false,
      reallyConfirm: false,
      respawn: "start",
    },
    start: { map: 0, x: 2, y: 10 },
    maps: [blankMap()],
    authorCleared: false,
  };
}
function makeSamples() {
  const a = freshGame();
  a.title = "はじめての村";
  a.author = "Claude × ChatGPT";
  a.description = "まっすぐ進むだけ。たぶん。";
  a.openingMessage = "ゴールは右上。見えない何かは、よけて進もう。";
  a.maps[0].name = "はじまりの村";
  a.maps[0].objects = [
    { type: "invisible_wall", x: 6, y: 7 },
    {
      type: "villager",
      x: 4,
      y: 9,
      lines: ["こんにちは！", "右上の旗をめざそう。"],
    },
    { type: "chest", x: 3, y: 9, item: "herb" },
    { type: "goal", x: 13, y: 2 },
  ];
  const b = freshGame();
  b.title = "やさしい洞くつ";
  b.author = a.author;
  b.description = "宝箱もおじいさんも、あなたを歓迎。";
  b.hero.hp = 60;
  b.hero.atk = 12;
  b.openingMessage = "出口は右上。土の道をたどろう。";
  b.maps = [blankMap("やさしい洞くつ", "floor")];
  b.maps[0].objects = [
    { type: "mimic", x: 5, y: 10, hp: 24, atk: 8 },
    { type: "pit", x: 9, y: 10 },
    { type: "reverse", x: 13, y: 7 },
    { type: "warp", x: 8, y: 7 },
    { type: "oldman", x: 10, y: 4, lines: ["出口は、右上じゃ。"] },
    { type: "goal", x: 13, y: 2 },
  ];
  b.kuso.vision = "near";
  b.kuso.textSpeed = "slow";
  const c = freshGame();
  c.title = "ぜったいクリアさせない城";
  c.author = a.author;
  c.description = "全部入り。でも、右端に希望がある。";
  c.hero.hp = 30;
  c.hero.atk = 8;
  c.openingMessage = "右端を上へ。旗をめざそう。";
  c.maps = [blankMap("いやがらせの城", "floor")];
  c.maps[0].objects = [
    { type: "invisible_wall", x: 10, y: 10 },
    { type: "pit", x: 8, y: 10 },
    { type: "mimic", x: 5, y: 10, hp: 30, atk: 8 },
    { type: "warp", x: 6, y: 8 },
    { type: "reverse", x: 14, y: 7 },
    { type: "loop", x: 8, y: 8 },
    { type: "fake_goal", x: 14, y: 5 },
    { type: "oldman", x: 10, y: 8, lines: ["急ぐでない。"] },
    { type: "boss", x: 14, y: 3, allowLose: true },
    { type: "goal", x: 14, y: 1 },
    { type: "chest", x: 2, y: 9, item: "key" },
  ];
  c.kuso = {
    encounterRate: 8,
    textSpeed: "hell",
    vision: "near",
    walkSpeed: "slow",
    bgmSpeedUp: true,
    reallyConfirm: true,
    respawn: "entrance",
  };
  // Visible shortcuts meet hidden traps; longer bypasses always remain open.
  const paint = (g, x, y, tile) => {
    const m = g.maps[0], row = m.ground[y];
    m.ground[y] = row.slice(0, x) + CHARS[tile] + row.slice(x + 1);
  };
  const line = (g, x1, y1, x2, y2, tile) => {
    for (let y = y1; y <= y2; y++)
      for (let x = x1; x <= x2; x++) paint(g, x, y, tile);
  };
  for (let y = 0; y < 12; y++)
    for (let x = 0; x < 16; x++)
      if (x === 0 || x === 15 || y === 0 || y === 11)
        paint(a, x, y, "tree");
  // The near opening is blocked invisibly; the far opening at x=1 is safe.
  line(a, 1, 7, 14, 7, "tree");
  paint(a, 1, 7, "dirt");
  paint(a, 6, 7, "dirt");
  line(a, 2, 8, 2, 10, "dirt");
  line(a, 1, 8, 6, 8, "dirt");
  line(a, 1, 6, 13, 6, "dirt");
  line(a, 13, 2, 13, 6, "dirt");
  line(a, 7, 3, 9, 5, "water");
  for (const [x, y] of [[3, 2], [4, 2], [11, 3], [5, 5], [11, 9]])
    paint(a, x, y, "tree");

  // Narrow main roads, with small stone detours around blocking/reset traps.
  for (const [g, right, top] of [[b, 13, 2], [c, 14, 1]]) {
    g.maps[0].ground = Array(12).fill("#".repeat(16));
    line(g, 2, 10, right, 10, "dirt");
    line(g, right, top, right, 10, "dirt");
    line(g, 4, 9, 6, 9, "floor"); // mimic bypass
  }
  line(b, 8, 9, 10, 9, "floor"); // pit bypass
  line(b, 10, 4, 10, 9, "floor"); // old man's side passage
  line(b, 8, 7, 10, 7, "floor"); // optional warp, no shortcut to the flag

  line(c, 7, 9, 11, 9, "floor"); // pit and invisible-wall bypasses
  paint(c, 2, 9, "floor"); // key chest
  for (const x of [6, 8, 10]) paint(c, x, 8, "floor"); // optional traps
  line(c, 13, 2, 13, 6, "floor"); // fake flag and black-knight bypass
  paint(c, 14, 4, "wall"); // fake flag is a dead end, not the route to the real flag
  paint(c, 13, 5, "wall");
  line(c, 12, 4, 12, 6, "floor");
  return [a, b, c];
}
const SAMPLES = makeSamples();
// All three bundled versions were cleared in the browser before release.
SAMPLES.forEach((g) => {
  g.authorCleared = true;
});
function validate(data) {
  const err = (path, msg) => {
    throw new Error(`${path}: ${msg}`);
  };
  const obj = (v, p) => {
    if (!v || typeof v !== "object" || Array.isArray(v))
      err(p, "オブジェクトが必要です");
  };
  const str = (v, p, n) => {
    if (typeof v !== "string" || v.length > n)
      err(p, `${n}文字以内の文字列が必要です`);
  };
  const num = (v, p, min, max) => {
    if (!Number.isInteger(v) || v < min || v > max)
      err(p, `${min}〜${max}の整数が必要です`);
  };
  obj(data, "全体");
  if (data.format !== "kusoge-maker/1")
    err("format", "kusoge-maker/1 を指定してください");
  str(data.title, "title", 80);
  str(data.author, "author", 40);
  str(data.description, "description", 40);
  str(data.openingMessage, "openingMessage", 2000);
  obj(data.hero, "hero");
  num(data.hero.hp, "hero.hp", 1, 9999);
  num(data.hero.atk, "hero.atk", 1, 999);
  obj(data.kuso, "kuso");
  num(data.kuso.encounterRate, "kuso.encounterRate", 0, 100);
  for (const [k, vs] of Object.entries({
    textSpeed: ["normal", "slow", "hell"],
    vision: ["all", "near"],
    walkSpeed: ["normal", "slow"],
    respawn: ["start", "entrance"],
  }))
    if (!vs.includes(data.kuso[k]))
      err("kuso." + k, vs.join(" / ") + " を指定してください");
  for (const k of ["bgmSpeedUp", "reallyConfirm"])
    if (typeof data.kuso[k] !== "boolean")
      err("kuso." + k, "true / false が必要です");
  if (!Array.isArray(data.maps) || data.maps.length < 1 || data.maps.length > 5)
    err("maps", "1〜5枚が必要です");
  const pos = (v, p) => {
    obj(v, p);
    num(v.map, p + ".map", 0, data.maps.length - 1);
    num(v.x, p + ".x", 0, 15);
    num(v.y, p + ".y", 0, 11);
  };
  pos(data.start, "start");
  data.maps.forEach((m, i) => {
    const p = `maps[${i}]`;
    obj(m, p);
    str(m.name, p + ".name", 40);
    obj(m.legend, p + ".legend");
    for (const [k, v] of Object.entries(m.legend))
      if (k.length !== 1 || !GROUND.includes(v))
        err(p + ".legend", `不明な地面 ${k}: ${v}`);
    if (!Array.isArray(m.ground) || m.ground.length !== 12)
      err(p + ".ground", "12行が必要です");
    m.ground.forEach((r, y) => {
      if (typeof r !== "string" || r.length !== 16)
        err(`${p}.ground[${y}]（地面${y + 1}行目）`, "16文字が必要です");
      for (const ch of r)
        if (!m.legend[ch])
          err(
            `${p}.ground[${y}]（地面${y + 1}行目）`,
            `${ch} がlegendにありません`,
          );
    });
    if (!Array.isArray(m.objects) || m.objects.length > 192)
      err(p + ".objects", "192個までの配列が必要です");
    const seen = new Set();
    m.objects.forEach((o, j) => {
      const q = `${p}.objects[${j}]`;
      obj(o, q);
      if (!OBJECTS.includes(o.type)) err(q + ".type", "不明な部品です");
      num(o.x, q + ".x", 0, 15);
      num(o.y, q + ".y", 0, 11);
      const key = o.x + "," + o.y;
      if (seen.has(key)) err(q, "同じマスに部品が重複しています");
      seen.add(key);
      if (o.lines !== undefined) {
        if (!Array.isArray(o.lines) || !o.lines.length || o.lines.length > 30)
          err(q + ".lines", "1〜30ページの配列が必要です");
        o.lines.forEach((s, k) => str(s, q + ".lines[" + k + "]", 1000));
      }
      if (o.to !== undefined) pos(o.to, q + ".to");
      if (o.type === "stairs" && !o.to) err(q + ".to", "行き先が必要です");
      if (
        o.item !== undefined &&
        !["herb", "sword", "key", "rock"].includes(o.item)
      )
        err(q + ".item", "herb / sword / key / rock が必要です");
      for (const k of ["hp", "atk"])
        if (o[k] !== undefined) num(o[k], q + "." + k, 1, 9999);
      for (const k of ["locked", "allowLose"])
        if (o[k] !== undefined && typeof o[k] !== "boolean")
          err(q + "." + k, "true / false が必要です");
    });
  });
  if (blockedGround(data.maps[data.start.map], data.start.x, data.start.y))
    err("start", "通れない地面には配置できません");
  return clone(data);
}
function groundAt(m, x, y) {
  return m.legend[m.ground[y]?.[x]];
}
function blockedGround(m, x, y) {
  return (
    !groundAt(m, x, y) ||
    ["wall", "water", "water_2", "tree"].includes(groundAt(m, x, y))
  );
}
function rating(g) {
  const rows = [],
    weights = {
      invisible_wall: 15,
      pit: 12,
      mimic: 10,
      warp: 8,
      reverse: 8,
      loop: 12,
      fake_goal: 15,
      oldman: 10,
      boss: 15,
    };
  for (const t of TRAPS) {
    const n = g.maps.reduce(
      (s, m) => s + m.objects.filter((o) => o.type === t).length,
      0,
    );
    if (n) rows.push([`${NAMES[t]} × ${n}`, weights[t] * n]);
  }
  const k = g.kuso;
  for (const [name, pts] of [
    ["エンカウント", Math.ceil(k.encounterRate / 5)],
    ["文字送り", k.textSpeed === "hell" ? 20 : k.textSpeed === "slow" ? 8 : 0],
    ["暗い洞くつ", k.vision === "near" ? 18 : 0],
    ["のろい歩行", k.walkSpeed === "slow" ? 8 : 0],
    ["加速するBGM", k.bgmSpeedUp ? 8 : 0],
    ["本当に？確認", k.reallyConfirm ? 8 : 0],
    ["最初へ戻る復活", k.respawn === "start" ? 5 : 0],
  ])
    if (pts) rows.push([name, pts]);
  const normal = g.maps.reduce(
    (n, m) =>
      n +
      m.objects.filter((o) => ["villager", "chest", "goal"].includes(o.type))
        .length,
    0,
  );
  rows.push(["ちゃんとゲームしてる分", -Math.min(15, normal * 2)]);
  const points = Math.max(
      0,
      rows.reduce((n, r) => n + r[1], 0),
    ),
    stars =
      points < 25
        ? 1
        : points < 50
          ? 2
          : points < 85
            ? 3
            : points < 120
              ? 4
              : 5;
  return {
    points,
    stars,
    title: [
      "わりと良作",
      "ちょっといじわる",
      "理不尽見習い",
      "コントローラー投げたい",
      "クソゲー・オブ・ザ・イヤー候補",
    ][stars - 1],
    rows,
  };
}

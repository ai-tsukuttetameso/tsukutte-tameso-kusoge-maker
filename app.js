"use strict";
const $ = (s) => document.querySelector(s),
  root = $("#root"),
  modal = $("#modal"),
  body = $("#modalBody");
const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
let game = freshGame(),
  screen = "home",
  mapIndex = 0,
  tab = 0,
  brush = "grass",
  tool = "paint",
  history = [],
  run = null,
  certified = "",
  dialogTimer = null,
  gameToken = 0,
  painting = false,
  strokeChanged = false;
const sheet = new Image();
sheet.src = "tilesheet.png";
let noticeTimer;
function notice(s) {
  $("#notice").textContent = s;
  clearTimeout(noticeTimer);
  noticeTimer = setTimeout(() => ($("#notice").textContent = ""), 8000);
}
function sprite(id, cls = "") {
  const i = TILE_IDS.indexOf(id);
  return `<span aria-hidden="true" class="sprite ${cls}" style="background-position:${-(i % 8) * 32}px ${-Math.floor(i / 8) * 32}px"></span>`;
}
function closeModal() {
  clearInterval(dialogTimer);
  dialogTimer = null;
  if (modal.open) modal.close();
  body.replaceChildren();
}
function showModal(html, locked = false) {
  closeModal();
  body.innerHTML = html;
  modal.dataset.locked = String(locked);
  modal.showModal();
  body.querySelector("[autofocus]")?.focus();
}
modal.addEventListener("cancel", (e) => {
  if (modal.dataset.locked === "true") e.preventDefault();
  else closeModal();
});
function fingerprint(g) {
  const x = clone(g);
  delete x.authorCleared;
  return JSON.stringify(x);
}
function invalidate() {
  game.authorCleared = false;
  certified = "";
}
function save() {
  try {
    localStorage.setItem(
      "kusoge-maker-draft",
      JSON.stringify({ game, certified }),
    );
    $("#saveState")?.replaceChildren(document.createTextNode("自動保存済み"));
  } catch {
    notice("自動保存できません。JSONを書き出して保管してください。");
    $("#saveState")?.replaceChildren(document.createTextNode("保存失敗"));
  }
}
function remember() {
  history.push(clone(game));
  if (history.length > 60) history.shift();
}
function changed() {
  invalidate();
  save();
  updateEditorLabels();
}
function updateEditorLabels() {
  if ($("#cert"))
    $("#cert").textContent = game.authorCleared
      ? "作者クリア済み ✓"
      : "作者未クリア";
}
function undo() {
  if (!history.length) return;
  game = history.pop();
  invalidate();
  mapIndex = Math.min(mapIndex, game.maps.length - 1);
  save();
  editor();
}
function home() {
  gameToken++;
  run = null;
  screen = "home";
  closeModal();
  root.innerHTML = `<section class="home"><p class="eyebrow">EP.14 / MAKE A LITTLE TROUBLE</p><h1>その親切、<br><span class="pink">罠かもしれない。</span></h1><p class="muted">見た目はふつう。遊ぶと理不尽。<br>部品を置いて、あなただけのRPGをつくろう。</p><div class="home-grid"><div class="stack panel"><button class="primary" id="newGame">あたらしくつくる</button><button id="continueGame">つづきからつくる</button><button id="samples">見本であそぶ</button><button id="importGame">ファイルを読みこむ</button></div><div class="hero-art">${sprite("hero_down")}${sprite("chest")}${sprite("mimic_edit")}${sprite("goal")}</div></div><p class="help">PC：矢印キー／WASD・Enterでしらべる ｜ スマホ：十字ボタン<br>作ったゲームはブラウザに自動保存。作者がクリアするとURLで共有できます。</p></section>`;
  $("#newGame").onclick = () => {
    const start = () => {
      game = freshGame();
      certified = "";
      history = [];
      mapIndex = 0;
      save();
      editor();
    };
    let draftExists = false;
    try {
      draftExists = !!localStorage.getItem("kusoge-maker-draft");
    } catch {}
    if (draftExists)
      confirmBox(
        "新しくつくると、このブラウザの下書きを置きかえます。必要なら先に書き出してください。",
        start,
      );
    else start();
  };
  $("#continueGame").onclick = () => {
    try {
      const d = JSON.parse(localStorage.getItem("kusoge-maker-draft"));
      if (!d) throw Error("保存されたゲームがありません");
      game = validate(d.game);
      certified = d.certified === fingerprint(game) ? d.certified : "";
      game.authorCleared = !!certified;
      history = [];
      mapIndex = 0;
      editor();
    } catch (e) {
      notice(e.message);
    }
  };
  $("#samples").onclick = sampleMenu;
  $("#importGame").onclick = () => $("#fileInput").click();
}
function confirmBox(text, yes) {
  showModal(
    `<p>${esc(text)}</p><div class="dialog-actions"><button id="no">やめる</button><button class="primary" id="yes">はい</button></div>`,
  );
  $("#no").onclick = closeModal;
  $("#yes").onclick = () => {
    closeModal();
    yes();
  };
}
$("#homeLink").onclick = (e) => {
  e.preventDefault();
  if (screen === "editor") save();
  home();
};
function sampleMenu() {
  showModal(
    `<h2>見本であそぶ</h2>${SAMPLES.map((s, i) => {
      const r = rating(s);
      return `<div class="sample"><h3>${esc(s.title)}</h3><p>${esc(s.description)}</p><p class="pink">${"★".repeat(r.stars)} ${r.title}</p><div class="row"><button class="primary" data-sample="${i}">あそぶ</button><button data-edit="${i}">コピーしてつくる</button></div></div>`;
    }).join(
      "",
    )}<div class="dialog-actions"><button id="close">もどる</button></div>`,
  );
  $("#close").onclick = closeModal;
  body
    .querySelectorAll("[data-sample]")
    .forEach(
      (b) => (b.onclick = () => intro(clone(SAMPLES[+b.dataset.sample]))),
    );
  body.querySelectorAll("[data-edit]").forEach(
    (b) =>
      (b.onclick = () => {
        confirmBox("見本で下書きを置きかえますか？", () => {
          game = clone(SAMPLES[+b.dataset.edit]);
          game.authorCleared = false;
          certified = "";
          history = [];
          mapIndex = 0;
          save();
          closeModal();
          editor();
        });
      }),
  );
}
function editor() {
  gameToken++;
  run = null;
  screen = "editor";
  closeModal();
  root.innerHTML = `<div class="row"><h2>つくる</h2><span class="badge" id="cert"></span><small id="saveState">自動保存済み</small></div><div class="row toolbar"><label>題名<input id="titleInput" maxlength="80" value="${esc(game.title)}"></label><label>作者<input id="authorInput" maxlength="40" value="${esc(game.author)}"></label><label>マップ<select id="mapSelect">${game.maps.map((m, i) => `<option value="${i}" ${i === mapIndex ? "selected" : ""}>${i + 1}：${esc(m.name)}</option>`).join("")}</select></label><button id="addMap" ${game.maps.length >= 5 ? "disabled" : ""}>＋追加</button><button id="deleteMap" ${game.maps.length <= 1 ? "disabled" : ""}>削除</button><button id="renameMap">名前</button></div><div class="editor-layout"><section><div class="map-scroll"><canvas class="editing" id="map" width="256" height="192" aria-label="16列12行のマップ。部品を選んでタップして配置"></canvas></div><p class="help">タップ／ドラッグで配置。「設定する」でマスを選ぶと部品の詳細。<br>細い画面はマップを横にスクロールできます。座標は左上が (0, 0)。</p><div class="row"><button id="test" class="primary">テストプレイ</button><button id="settings">設定</button><button id="score">クソゲー度</button><button id="share">共有</button><button id="export">書き出し</button><button id="read">読みこみ</button></div></section><aside class="panel"><div class="row tabs">${["地面", "物・キャラ", "クソゲー部品"].map((n, i) => `<button data-tab="${i}" class="${i === tab ? "selected" : ""}">${n}</button>`).join("")}</div><div id="palette" class="palette"></div><h3>道具</h3><div class="row">${[
    ["paint", "置く"],
    ["inspect", "設定する"],
    ["erase", "消しゴム"],
    ["fill", "塗りつぶし"],
  ]
    .map(
      ([t, n]) =>
        `<button data-tool="${t}" class="${t === tool ? "selected" : ""}">${n}</button>`,
    )
    .join(
      "",
    )}<button id="undo">元に戻す</button></div><p id="selection" class="help"></p><p class="help">消しゴム：上の部品→地面の順。<br>塗りつぶし：地面だけに使えます。<br>Ctrl / ⌘ + Z：元に戻す</p></aside></div>`;
  for (const [id, key] of [
    ["titleInput", "title"],
    ["authorInput", "author"],
  ])
    $("#" + id).onchange = (e) => {
      remember();
      game[key] = e.target.value;
      changed();
    };
  $("#mapSelect").onchange = (e) => {
    mapIndex = +e.target.value;
    editor();
  };
  $("#addMap").onclick = () => {
    remember();
    game.maps.push(blankMap("マップ" + (game.maps.length + 1)));
    mapIndex = game.maps.length - 1;
    changed();
    editor();
  };
  $("#deleteMap").onclick = () =>
    confirmBox("このマップを削除しますか？行き先の番号も調整します。", () => {
      remember();
      game.maps.splice(mapIndex, 1);
      const adjust = (p) => {
        if (p.map === mapIndex) {
          p.map = 0;
          p.x = 2;
          p.y = 10;
        } else if (p.map > mapIndex) p.map--;
      };
      adjust(game.start);
      game.maps.forEach((m) =>
        m.objects.forEach((o) => {
          if (o.to) adjust(o.to);
        }),
      );
      mapIndex = 0;
      changed();
      editor();
    });
  $("#renameMap").onclick = () => {
    showModal(
      '<h2>マップ名</h2><input id="mapName" maxlength="40"><div class="dialog-actions"><button id="apply">保存</button><button id="close">閉じる</button></div>',
    );
    $("#mapName").value = game.maps[mapIndex].name;
    $("#apply").onclick = () => {
      remember();
      game.maps[mapIndex].name = $("#mapName").value;
      changed();
      editor();
    };
    $("#close").onclick = closeModal;
  };
  root.querySelectorAll("[data-tab]").forEach(
    (b) =>
      (b.onclick = () => {
        tab = +b.dataset.tab;
        brush = [GROUND, NORMAL, TRAPS][tab][0];
        editor();
      }),
  );
  root.querySelectorAll("[data-tool]").forEach(
    (b) =>
      (b.onclick = () => {
        tool = b.dataset.tool;
        editor();
      }),
  );
  $("#undo").onclick = undo;
  $("#test").onclick = () => {
    try {
      validate(game);
      startPlay(game, true);
    } catch (e) {
      notice(e.message);
    }
  };
  $("#settings").onclick = settings;
  $("#score").onclick = () => scoreModal(game);
  $("#share").onclick = share;
  $("#export").onclick = () => download(game);
  $("#read").onclick = () => $("#fileInput").click();
  palette();
  updateEditorLabels();
  const c = $("#map");
  c.onpointerdown = (e) => {
    if (e.button !== 0) return;
    painting = true;
    strokeChanged = false;
    if (e.pointerType === "mouse") {
      c.setPointerCapture(e.pointerId);
      paintEvent(e);
    } else {
      c.dataset.tx = e.clientX;
      c.dataset.ty = e.clientY;
    }
  };
  c.onpointermove = (e) => {
    if (painting && e.pointerType === "mouse" && tool !== "inspect")
      paintEvent(e);
  };
  c.onpointerup = (e) => {
    if (
      e.pointerType !== "mouse" &&
      Math.abs(e.clientX - Number(c.dataset.tx)) < 12 &&
      Math.abs(e.clientY - Number(c.dataset.ty)) < 12
    )
      paintEvent(e);
    painting = false;
    if (strokeChanged) changed();
  };
  c.onpointercancel = () => {
    painting = false;
    if (strokeChanged) changed();
  };
}
function palette() {
  const ids = [GROUND, NORMAL, TRAPS][tab];
  $("#palette").innerHTML = ids
    .map(
      (id) =>
        `<button class="tile-button ${brush === id ? "selected" : ""}" data-brush="${id}">${sprite(editorTile(id))}<span>${NAMES[id]}</span></button>`,
    )
    .join("");
  $("#selection").textContent =
    `選択：${NAMES[brush]} ／ ${{ paint: "置く", inspect: "設定する", erase: "消しゴム", fill: "塗りつぶし" }[tool]}`;
  $("#palette")
    .querySelectorAll("button")
    .forEach(
      (b) =>
        (b.onclick = () => {
          brush = b.dataset.brush;
          tool = "paint";
          editor();
        }),
    );
}
function editorTile(t) {
  return (
    {
      pit: "pit_edit",
      invisible_wall: "invisible_wall_edit",
      mimic: "mimic_edit",
      loop: "loop_edit",
      fake_goal: "fake_goal_edit",
    }[t] || t
  );
}
function defaultObject(type, x, y) {
  const o = { type, x, y };
  if (["villager", "oldman"].includes(type))
    o.lines = [
      type === "oldman" ? "急がず、ゆっくり進むのじゃ。" : "こんにちは！",
    ];
  if (type === "chest") o.item = "rock";
  if (["enemy", "mimic"].includes(type)) {
    o.hp = type === "mimic" ? 30 : 10;
    o.atk = type === "mimic" ? 8 : 3;
  }
  if (type === "stairs") o.to = { map: mapIndex, x: 2, y: 10 };
  if (type === "door") o.locked = false;
  if (type === "boss") o.allowLose = false;
  return o;
}
function setGround(m, x, y, type) {
  let char = Object.keys(m.legend).find((c) => m.legend[c] === type);
  if (!char) {
    char = CHARS[type];
    m.legend[char] = type;
  }
  const r = m.ground[y];
  m.ground[y] = r.slice(0, x) + char + r.slice(x + 1);
}
function paintEvent(e) {
  const rect = $("#map").getBoundingClientRect(),
    x = Math.floor(((e.clientX - rect.left) / rect.width) * 16),
    y = Math.floor(((e.clientY - rect.top) / rect.height) * 12);
  if (x < 0 || x > 15 || y < 0 || y > 11) return;
  const m = game.maps[mapIndex],
    o = m.objects.find((o) => o.x === x && o.y === y);
  if (tool === "inspect") {
    if (o) objectSettings(o);
    else if (["door", "stairs"].includes(groundAt(m, x, y))) {
      remember();
      const n = defaultObject(groundAt(m, x, y), x, y);
      m.objects.push(n);
      changed();
      objectSettings(n);
    } else
      notice(
        `(${x}, ${y}) ${NAMES[groundAt(m, x, y)]}：細かい設定はありません`,
      );
    return;
  }
  if (!strokeChanged) {
    remember();
    strokeChanged = true;
  }
  if (tool === "erase") {
    if (o) m.objects.splice(m.objects.indexOf(o), 1);
    else setGround(m, x, y, "grass");
  } else if (tool === "fill") {
    if (!GROUND.includes(brush)) {
      notice("地面の部品を選んでください");
      return;
    }
    const original = groundAt(m, x, y),
      q = [[x, y]],
      seen = new Set();
    while (q.length) {
      const [a, b] = q.pop(),
        k = a + "," + b;
      if (
        a < 0 ||
        a > 15 ||
        b < 0 ||
        b > 11 ||
        seen.has(k) ||
        groundAt(m, a, b) !== original
      )
        continue;
      seen.add(k);
      setGround(m, a, b, brush);
      q.push([a + 1, b], [a - 1, b], [a, b + 1], [a, b - 1]);
    }
  } else if (brush === "hero_down") {
    game.start = { map: mapIndex, x, y };
  } else if (GROUND.includes(brush)) {
    setGround(m, x, y, brush);
    if (o && ["door", "stairs"].includes(o.type))
      m.objects.splice(m.objects.indexOf(o), 1);
    if (["door", "stairs"].includes(brush))
      m.objects.push(defaultObject(brush, x, y));
  } else {
    if (o) {
      if (o.type === brush) {
        if (e.type === "pointerdown" || e.pointerType !== "mouse")
          objectSettings(o);
        return;
      }
      m.objects.splice(m.objects.indexOf(o), 1);
    }
    m.objects.push(defaultObject(brush, x, y));
  }
  invalidate();
}
function objectSettings(o) {
  const lines = ["villager", "oldman"].includes(o.type),
    fight = ["enemy", "mimic"].includes(o.type);
  showModal(
    `<h2>${esc(NAMES[o.type])} (${o.x}, ${o.y})</h2>${lines ? '<label>セリフ（1行＝1ページ）<textarea id="lines"></textarea></label>' : ""}${o.type === "chest" ? '<label>中身<select id="item"><option value="herb">やくそう（全回復）</option><option value="sword">つるぎ（攻撃＋5）</option><option value="key">カギ</option><option value="rock">ただの石</option></select></label>' : ""}${fight ? '<div class="field-grid"><label>HP<input id="objHp" type="number" min="1" max="9999"></label><label>攻撃力<input id="objAtk" type="number" min="1" max="9999"></label></div>' : ""}${o.type === "stairs" ? `<div class="field-grid"><label>行き先マップ<select id="toMap">${game.maps.map((m, i) => `<option value="${i}">${i + 1}：${esc(m.name)}</option>`).join("")}</select></label><label>X（0〜15）<input id="toX" type="number" min="0" max="15"></label><label>Y（0〜11）<input id="toY" type="number" min="0" max="11"></label></div>` : ""}${o.type === "door" ? '<label class="inline"><input id="locked" type="checkbox">カギが必要</label>' : ""}${o.type === "boss" ? '<label class="inline"><input id="allowLose" type="checkbox">負けても先に進める</label>' : ""}<p class="help">${{ pit: "マップ1の開始地点へ落下。", invisible_wall: "プレイ中は見えません。", warp: "歩けるマスにランダム転送。", reverse: "踏むたびに操作が反転。", loop: "このマップの入口へ戻ります。", fake_goal: "3秒後にうそが判明。" }[o.type] || "設定を変更したら保存してください。"}</p><p id="objError" class="danger"></p><div class="dialog-actions"><button id="objDelete">取り除く</button><button id="close">閉じる</button><button class="primary" id="objSave">保存</button></div>`,
  );
  if (lines) $("#lines").value = (o.lines || ["こんにちは！"]).join("\n");
  if (fight) {
    $("#objHp").value = o.hp || 10;
    $("#objAtk").value = o.atk || 3;
  }
  if ($("#item")) $("#item").value = o.item || "rock";
  if (o.type === "stairs") {
    const t = o.to || { map: 0, x: 2, y: 10 };
    $("#toMap").value = t.map;
    $("#toX").value = t.x;
    $("#toY").value = t.y;
  }
  for (const k of ["locked", "allowLose"])
    if ($("#" + k)) $("#" + k).checked = !!o[k];
  $("#close").onclick = closeModal;
  $("#objDelete").onclick = () => {
    remember();
    game.maps[mapIndex].objects = game.maps[mapIndex].objects.filter(
      (a) => a !== o,
    );
    changed();
    closeModal();
  };
  $("#objSave").onclick = () => {
    const n = clone(o);
    if (lines) n.lines = $("#lines").value.split("\n");
    if (fight) {
      n.hp = +$("#objHp").value;
      n.atk = +$("#objAtk").value;
    }
    if ($("#item")) n.item = $("#item").value;
    if (o.type === "stairs")
      n.to = {
        map: +$("#toMap").value,
        x: +$("#toX").value,
        y: +$("#toY").value,
      };
    for (const k of ["locked", "allowLose"])
      if ($("#" + k)) n[k] = $("#" + k).checked;
    const test = clone(game);
    const i = game.maps[mapIndex].objects.indexOf(o);
    test.maps[mapIndex].objects[i] = n;
    try {
      validate(test);
      remember();
      Object.assign(o, n);
      changed();
      closeModal();
    } catch (e) {
      $("#objError").textContent = e.message;
    }
  };
}
function settings() {
  showModal(
    `<h2>ゲームの設定</h2><form id="config"><h3>ふつうの設定</h3><div class="field-grid"><label>題名<input name="title" maxlength="80"></label><label>作者名<input name="author" maxlength="40"></label><label>主人公HP<input name="hp" type="number" min="1" max="9999" required></label><label>攻撃力<input name="atk" type="number" min="1" max="999" required></label></div><label>ひとこと説明（40文字まで）<input name="description" maxlength="40"></label><label>最初のメッセージ<textarea name="openingMessage" maxlength="2000"></textarea></label><h3 class="pink">クソ設定</h3><div class="field-grid"><label>エンカウント率（%）<input name="encounterRate" type="number" min="0" max="100" required></label><label>文字送り<select name="textSpeed"><option value="normal">ふつう</option><option value="slow">おそい</option><option value="hell">地獄（1文字0.5秒）</option></select></label><label>見える範囲<select name="vision"><option value="all">ぜんぶ</option><option value="near">まわり3マスだけ</option></select></label><label>歩く速さ<select name="walkSpeed"><option value="normal">ふつう</option><option value="slow">のろい</option></select></label><label>やられたら<select name="respawn"><option value="entrance">そのマップの入口から</option><option value="start">さいしょから</option></select></label></div><label class="inline"><input name="bgmSpeedUp" type="checkbox">BGMがだんだん速くなる</label><label class="inline"><input name="reallyConfirm" type="checkbox">宝箱の「本当に？」確認</label><p id="configError" class="danger"></p><div class="dialog-actions"><button type="button" id="close">閉じる</button><button class="primary">保存</button></div></form>`,
  );
  const f = $("#config");
  for (const k of ["title", "author", "description", "openingMessage"])
    f.elements[k].value = game[k];
  for (const k of ["hp", "atk"]) f.elements[k].value = game.hero[k];
  for (const [k, v] of Object.entries(game.kuso)) {
    if (typeof v === "boolean") f.elements[k].checked = v;
    else f.elements[k].value = v;
  }
  $("#close").onclick = closeModal;
  f.onsubmit = (e) => {
    e.preventDefault();
    const g = clone(game);
    for (const k of ["title", "author", "description", "openingMessage"])
      g[k] = f.elements[k].value;
    g.hero = { hp: +f.elements.hp.value, atk: +f.elements.atk.value };
    for (const k of Object.keys(g.kuso))
      g.kuso[k] =
        typeof g.kuso[k] === "boolean"
          ? f.elements[k].checked
          : k === "encounterRate"
            ? +f.elements[k].value
            : f.elements[k].value;
    try {
      validate(g);
      remember();
      game = g;
      changed();
      editor();
    } catch (e) {
      $("#configError").textContent = e.message;
    }
  };
}
function scoreHTML(g) {
  const r = rating(g);
  return `<p class="score">${"★".repeat(r.stars)}${"☆".repeat(5 - r.stars)}</p><p>${r.title} ／ ${r.points}点</p><ul class="score-list">${r.rows.map(([n, p]) => `<li>${esc(n)}：${p > 0 ? "+" : ""}${p}点</li>`).join("")}</ul>`;
}
function scoreModal(g) {
  showModal(
    `<h2>クソゲー度</h2>${scoreHTML(g)}<div class="dialog-actions"><button id="close">閉じる</button></div>`,
  );
  $("#close").onclick = closeModal;
}
function download(g) {
  const blob = new Blob([JSON.stringify(g, null, 2)], {
      type: "application/json",
    }),
    a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = (g.title || "kusoge").replace(/[\\/:*?"<>|]/g, "_") + ".json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
async function compress(text) {
  const stream = new Blob([text])
    .stream()
    .pipeThrough(new CompressionStream("deflate-raw"));
  const bytes = new Uint8Array(await new Response(stream).arrayBuffer());
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
async function decompress(s) {
  if (!/^[\w-]+$/.test(s) || s.length > 150000)
    throw Error("共有データの形式または長さが不正です");
  const bytes = Uint8Array.from(
    atob(s.replace(/-/g, "+").replace(/_/g, "/")),
    (c) => c.charCodeAt(0),
  );
  const reader = new Blob([bytes])
    .stream()
    .pipeThrough(new DecompressionStream("deflate-raw"))
    .getReader();
  let chunks = [],
    size = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > 2000000) {
      await reader.cancel();
      throw Error("共有データが大きすぎます");
    }
    chunks.push(value);
  }
  return new Blob(chunks).text();
}
async function share() {
  const can = game.authorCleared && certified === fingerprint(game);
  showModal(
    `<h2>ゲームを共有</h2><p>${can ? "作者クリア済み ✓" : "先にテストプレイでクリアしてください。編集するとクリア済みマークが消えます。"}</p><p class="help">URLにはゲームの全データが入ります。公開したページで発行すれば、そのURLを友だちに送れます。現在のページがlocalhostの場合、別端末では開けません。</p><textarea class="share-url" id="url" readonly aria-label="共有URL"></textarea><p id="shareStatus" role="status"></p><div class="dialog-actions"><button id="close">閉じる</button><button id="json">JSONで書き出し</button><button id="copy" ${can ? "" : "disabled"}>共有URLをコピー</button></div>`,
  );
  $("#close").onclick = closeModal;
  $("#json").onclick = () => download(game);
  if (!can) {
    $("#url").hidden = true;
    return;
  }
  try {
    const encoded = await compress(JSON.stringify(game));
    if (!$("#url")) return;
    const url = location.href.split("#")[0] + "#g=" + encoded;
    if (url.length > 8000) {
      $("#shareStatus").textContent =
        `URLが${url.length}文字あります。JSONで書き出して送ってね。`;
      $("#copy").disabled = true;
      return;
    }
    $("#url").value = url;
    $("#shareStatus").textContent = `${url.length}文字 ／ 作者クリア済み ✓`;
    $("#copy").onclick = async () => {
      try {
        await navigator.clipboard.writeText(url);
        $("#shareStatus").textContent = "コピーしました！";
      } catch {
        $("#url").select();
        $("#shareStatus").textContent =
          "コピーできない場合は、この欄のURLを選択してコピーしてください。";
      }
    };
  } catch {
    $("#shareStatus").textContent =
      "このブラウザはURL圧縮に対応していません。JSONで書き出して送ってね。";
    $("#copy").disabled = true;
  }
}
$("#fileInput").onchange = async (e) => {
  const f = e.target.files[0];
  if (!f) return;
  try {
    if (f.size > 2000000) throw Error("JSONは2MB以内にしてください");
    const text = await f.text();
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (e) {
      const pos = /position (\d+)/.exec(e.message);
      const line = pos ? text.slice(0, +pos[1]).split("\n").length : "不明";
      throw Error(`JSON構文エラー（${line}行目）：${e.message}`);
    }
    let imported;
    try {
      imported = validate(parsed);
    } catch (e) {
      throw Error(
        `JSON ${jsonLine(text, e.message.split(":")[0])}行目：${e.message}`,
      );
    }
    confirmBox("読み込んだゲームで下書きを置きかえますか？", () => {
      game = imported;
      invalidate();
      mapIndex = 0;
      history = [];
      save();
      editor();
      notice(
        "読みこみました。共有するにはこのブラウザでテストクリアしてください。",
      );
    });
  } catch (e) {
    showModal(
      `<h2>読みこめませんでした</h2><p class="danger">${esc(e.message)}</p><div class="dialog-actions"><button id="close">閉じる</button></div>`,
    );
    $("#close").onclick = closeModal;
  } finally {
    e.target.value = "";
  }
};
// Web Audio: synthesis only, no downloaded audio.
let audio = null,
  soundOn = false,
  nextNote = 0,
  noteIndex = 0;
function tone(freq, duration = 0.06, kind = "square", gain = 0.025) {
  if (!soundOn || !audio) return;
  const o = audio.createOscillator(),
    v = audio.createGain();
  o.type = kind;
  o.frequency.setValueAtTime(freq, audio.currentTime);
  v.gain.setValueAtTime(gain, audio.currentTime);
  v.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + duration);
  o.connect(v);
  v.connect(audio.destination);
  o.start();
  o.stop(audio.currentTime + duration);
}
function sfx(type) {
  const fs = {
    step: 180,
    inspect: 430,
    chest: 880,
    damage: 90,
    wall: 60,
    pit: 130,
    warp: 1200,
    clear: 1046,
    over: 70,
  };
  tone(
    fs[type] || 440,
    type === "clear" ? 0.6 : 0.1,
    type === "wall" ? "triangle" : "square",
  );
}
$("#sound").onclick = async () => {
  try {
    if (!audio)
      audio = new (window.AudioContext || window.webkitAudioContext)();
    await audio.resume();
    soundOn = !soundOn;
    $("#sound").textContent = "音 " + (soundOn ? "ON" : "OFF");
    $("#sound").setAttribute("aria-pressed", soundOn);
    nextNote = 0;
    if (soundOn) sfx("chest");
  } catch {
    notice("このブラウザでは音を使えません。");
  }
};
function music(now) {
  if (!soundOn || !run || run.ended || now < nextNote) return;
  const battle = !!run.battle;
  const melody = battle
    ? [
        220, 261, 329, 220, 392, 329, 261, 196, 220, 329, 440, 392, 329, 261,
        246, 196, 220, 261, 329, 392, 440, 392, 329, 261, 246, 293, 369, 440,
        392, 329, 293, 246,
      ]
    : [
        261, 329, 392, 329, 293, 349, 440, 349, 329, 392, 493, 392, 293, 349,
        440, 349, 261, 329, 392, 523, 493, 440, 392, 329, 293, 349, 440, 392,
        349, 329, 293, 196,
      ];
  const speed = run.data.kuso.bgmSpeedUp
    ? Math.min(3, 1 + (Date.now() - run.began) / 60000)
    : 1;
  nextNote = now + (battle ? 180 : 300) / speed;
  tone(melody[noteIndex++ % melody.length], 0.16, "square", 0.015);
  if (noteIndex % 4 === 0)
    tone(melody[(noteIndex - 1) % melody.length] / 2, 0.25, "triangle", 0.025);
}
function intro(g) {
  closeModal();
  gameToken++;
  run = null;
  screen = "intro";
  root.innerHTML = `<section class="home panel"><p class="eyebrow">SOMEONE MADE THIS TROUBLE FOR YOU</p><h1>${esc(g.title)}</h1><p>作者：${esc(g.author)}</p><p>${esc(g.description)}</p><p>${g.authorCleared ? '<span class="badge">作者クリア済み ✓</span>' : ""}</p>${scoreHTML(g)}<div class="row"><button id="begin" class="primary">あそぶ</button><button id="backHome">タイトルへ</button></div></section>`;
  $("#begin").onclick = () => startPlay(g, false);
  $("#backHome").onclick = home;
}
function startPlay(g, test = false, carry = null) {
  closeModal();
  gameToken++;
  screen = "play";
  const data = clone(g),
    start = carry?.pos || data.start;
  run = {
    data,
    test,
    map: start.map,
    x: start.x,
    y: start.y,
    dir: "down",
    hp: data.hero.hp,
    atk: data.hero.atk,
    items: [],
    deaths: carry?.deaths || 0,
    traps: carry?.traps || 0,
    began: carry?.began || Date.now(),
    entries: { [start.map]: clone(start) },
    reverse: false,
    nextMove: 0,
    ended: false,
    battle: null,
    flashPit: null,
    token: gameToken,
  };
  nextNote = 0;
  root.innerHTML = `<section class="play-layout"><div class="row"><h2>${esc(data.title)}</h2><button id="exitPlay">${test ? "つくる画面にもどる" : "タイトルへ"}</button><button id="restart">さいしょから</button></div><div id="hud" class="hud"></div><div class="map-scroll"><canvas id="map" width="256" height="192" aria-label="ゲームマップ"></canvas></div><p id="gameMsg" class="game-msg" role="status"></p><div class="controls"><div class="dpad"><button data-dir="up" aria-label="上へ">↑</button><button data-dir="left" aria-label="左へ">←</button><button data-dir="down" aria-label="下へ">↓</button><button data-dir="right" aria-label="右へ">→</button></div><button class="inspect primary" id="inspect">しらべる</button></div><p class="help">矢印キー／WASD：移動 ｜ Enter／スペース：前のマスをしらべる<br>十字ボタンはタップで1歩。宝箱・扉・村人は、となりに立ってしらべよう。</p></section>`;
  $("#exitPlay").onclick = test ? editor : home;
  $("#restart").onclick = () =>
    confirmBox("最初からやり直しますか？", () => startPlay(g, test));
  $("#inspect").onclick = inspect;
  root
    .querySelectorAll("[data-dir]")
    .forEach((b) => (b.onclick = () => move(b.dataset.dir)));
  hud();
  if (data.openingMessage) speech([data.openingMessage]);
}
function hud() {
  if (!run || !$("#hud")) return;
  const viewport = $(".play-layout .map-scroll"),
    canvas = $("#map");
  if (viewport && canvas)
    viewport.scrollLeft = Math.max(
      0,
      ((run.x + 0.5) * canvas.getBoundingClientRect().width) / 16 -
        viewport.clientWidth / 2,
    );
  $("#hud").textContent =
    `HP ${run.hp} / ${run.data.hero.hp}　攻撃 ${run.atk}　持ち物：${run.items.map((i) => ({ key: "カギ", sword: "つるぎ", herb: "やくそう", rock: "石" })[i]).join("・") || "なし"}　${Math.floor((Date.now() - run.began) / 1000)}秒　やられた ${run.deaths}回${run.reverse ? "　操作あべこべ！" : ""}`;
}
function say(t) {
  if ($("#gameMsg")) $("#gameMsg").textContent = t;
}
function trap() {
  run.traps++;
}
function speech(lines, done = () => {}, old = false) {
  const r = run,
    token = gameToken;
  let page = 0;
  function next() {
    if (run !== r || token !== gameToken) return;
    if (page >= lines.length) {
      if (old) {
        showModal(
          '<h2>わかったかの？</h2><div class="dialog-actions"><button id="oldNo">いいえ</button><button class="primary" id="oldYes">はい</button></div>',
          true,
        );
        $("#oldNo").onclick = () => {
          page = 0;
          next();
        };
        $("#oldYes").onclick = () => {
          closeModal();
          done();
        };
      } else {
        closeModal();
        done();
      }
      return;
    }
    showModal(
      '<p class="speech" id="speechText"></p><div class="dialog-actions"><button id="nextText" disabled>つぎへ</button></div>',
      true,
    );
    const text = String(lines[page++]),
      chars = Array.from(text);
    let i = 0;
    const speed = old
      ? 500
      : { normal: 25, slow: 140, hell: 500 }[r.data.kuso.textSpeed];
    const tick = () => {
      if (token !== gameToken) {
        clearInterval(dialogTimer);
        return;
      }
      if (i < chars.length) $("#speechText").textContent += chars[i++];
      if (i >= chars.length) {
        clearInterval(dialogTimer);
        $("#nextText").disabled = false;
        $("#nextText").focus();
      }
    };
    tick();
    dialogTimer = setInterval(tick, speed);
    $("#nextText").onclick = next;
  }
  next();
}
const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] },
  OPPOSITE = { up: "down", down: "up", left: "right", right: "left" };
function objectAt(x, y) {
  return run.data.maps[run.map].objects.find(
    (o) => o.x === x && o.y === y && !o.removed,
  );
}
function canStand(m, x, y) {
  if (blockedGround(m, x, y)) return false;
  const o = m.objects.find((o) => o.x === x && o.y === y && !o.removed);
  if (
    o &&
    [
      "invisible_wall",
      "villager",
      "oldman",
      "chest",
      "mimic",
      "enemy",
      "boss",
    ].includes(o.type) &&
    !o.opened
  )
    return false;
  if ((groundAt(m, x, y) === "door" || o?.type === "door") && !o?.opened)
    return false;
  return true;
}
function move(direction) {
  if (!run || run.ended || modal.open || performance.now() < run.nextMove)
    return;
  run.nextMove =
    performance.now() + (run.data.kuso.walkSpeed === "slow" ? 550 : 130);
  if (run.reverse) direction = OPPOSITE[direction];
  run.dir = direction;
  const [dx, dy] = DIRS[direction],
    x = run.x + dx,
    y = run.y + dy,
    m = run.data.maps[run.map],
    o = objectAt(x, y);
  if (x < 0 || x > 15 || y < 0 || y > 11 || blockedGround(m, x, y)) return;
  if (o?.type === "invisible_wall") {
    sfx("wall");
    trap();
    say("ゴン！ ……何もないのに進めない。");
    return;
  }
  if (o && ["enemy", "boss"].includes(o.type)) {
    if (o.type === "boss") trap();
    battle(o);
    return;
  }
  if (
    o &&
    ["villager", "oldman", "chest", "mimic"].includes(o.type) &&
    !o.opened
  )
    return;
  if ((o?.type === "door" || groundAt(m, x, y) === "door") && !o?.opened) {
    say("扉だ。前に立って、しらべよう。");
    return;
  }
  run.x = x;
  run.y = y;
  sfx("step");
  if (o) {
    if (o.type === "goal") {
      clearGame();
      return;
    }
    if (o.type === "pit") {
      trap();
      sfx("pit");
      run.flashPit = { x, y };
      const r = run;
      showModal("<p>足もとに穴が！</p>", true);
      setTimeout(() => {
        if (run !== r) return;
        closeModal();
        run.flashPit = null;
        teleportStart();
        say("落とし穴だった……。");
      }, 650);
      return;
    }
    if (o.type === "reverse") {
      trap();
      run.reverse = !run.reverse;
      sfx("warp");
      say(run.reverse ? "操作があべこべになった！" : "操作が元に戻った。");
    }
    if (o.type === "warp") {
      trap();
      sfx("warp");
      const cells = [];
      run.data.maps.forEach((m, i) => {
        for (let y = 0; y < 12; y++)
          for (let x = 0; x < 16; x++)
            if (
              canStand(m, x, y) &&
              !(i === run.map && x === run.x && y === run.y)
            )
              cells.push({ map: i, x, y });
      });
      if (cells.length)
        teleport(cells[Math.floor(Math.random() * cells.length)]);
      say("どこへ飛ばされた……？");
      return;
    }
    if (o.type === "loop") {
      trap();
      teleport(run.entries[run.map] || entryFor(run.map));
      say("……さっきの場所だ。");
      return;
    }
    if (o.type === "fake_goal") {
      trap();
      const r = run;
      showModal("<h2>おめでとう！</h2>", true);
      setTimeout(() => {
        if (run !== r) return;
        showModal(
          '<h2>……うそでした</h2><div class="dialog-actions"><button id="fakeBack">もどされる</button></div>',
          true,
        );
        $("#fakeBack").onclick = () => {
          closeModal();
          teleportStart();
        };
      }, 3000);
      return;
    }
    if (o.type === "stairs") {
      teleport(o.to || entryFor(run.map));
      say("階段を進んだ。");
      return;
    }
  }
  if (groundAt(m, x, y) === "stairs" && !o) {
    say("行き先のない階段だ。");
  }
  if (Math.random() * 100 < run.data.kuso.encounterRate)
    battle({ type: "enemy", hp: 10, atk: 3, random: true });
  hud();
}
function entryFor(map) {
  if (map === run.data.start.map) return clone(run.data.start);
  if (map === 0 && run.data.start.map === 0) return clone(run.data.start);
  const m = run.data.maps[map];
  for (let y = 0; y < 12; y++)
    for (let x = 0; x < 16; x++)
      if (canStand(m, x, y) && !m.objects.some((o) => o.x === x && o.y === y))
        return { map, x, y };
  return { map, x: 0, y: 0 };
}
function teleport(to) {
  const p = to || run.data.start;
  run.map = p.map;
  run.x = p.x;
  run.y = p.y;
  if (!run.entries[p.map]) run.entries[p.map] = clone(p);
  hud();
}
function teleportStart() {
  teleport(entryFor(0));
}
function inspect() {
  if (!run || run.ended || modal.open) return;
  sfx("inspect");
  const [dx, dy] = DIRS[run.dir],
    x = run.x + dx,
    y = run.y + dy;
  let o = objectAt(x, y);
  if (!o && groundAt(run.data.maps[run.map], x, y) === "door") {
    o = { type: "door", x, y, locked: false };
    run.data.maps[run.map].objects.push(o);
  }
  if (!o) {
    say("特に何もない。");
    return;
  }
  if (["villager", "oldman"].includes(o.type)) {
    if (o.type === "oldman") trap();
    speech(o.lines || ["……。"], () => {}, o.type === "oldman");
    return;
  }
  if (o.type === "door") {
    if (o.opened) {
      say("扉は開いている。");
      return;
    }
    if (o.locked && !run.items.includes("key")) {
      say("カギが必要だ。");
      return;
    }
    o.opened = true;
    sfx("chest");
    say("扉が開いた。");
    return;
  }
  if (["chest", "mimic"].includes(o.type)) {
    if (o.opened) {
      say("宝箱は空っぽだ。");
      return;
    }
    const open = () => {
      if (o.type === "mimic") {
        trap();
        o.revealed = true;
        battle(o);
        return;
      }
      o.opened = true;
      const item = o.item || "rock";
      run.items.push(item);
      if (item === "herb") run.hp = run.data.hero.hp;
      if (item === "sword") run.atk += 5;
      sfx("chest");
      say(
        {
          herb: "やくそう！ HPが全回復した。",
          sword: "つるぎ！ 攻撃力が5上がった。",
          key: "カギを手に入れた。",
          rock: "ただの石だった……。",
        }[item],
      );
      hud();
    };
    if (run.data.kuso.reallyConfirm)
      confirmBox("本当に開けますか？", () =>
        confirmBox("本当の本当に？", open),
      );
    else open();
    return;
  }
  if (["enemy", "boss"].includes(o.type)) {
    if (o.type === "boss") trap();
    battle(o);
    return;
  }
  say("特に何もない。");
}
function battle(o) {
  const r = run;
  run.battle = {
    object: o,
    hp: o.type === "boss" ? 9999 : o.hp || 10,
    atk: o.type === "boss" ? 9999 : o.atk || 3,
  };
  const draw = (text) => {
    const b = r.battle;
    if (!b) return;
    const id = o.type === "mimic" ? "mimic" : o.type;
    const i = TILE_IDS.indexOf(id);
    showModal(
      `<h2>${esc(NAMES[o.type])}との戦闘</h2><span id="battleArt" class="sprite battle-sprite" style="background-position:${-(i % 8) * 64}px ${-Math.floor(i / 8) * 64}px"></span><p id="battleMsg">${esc(text)}</p><p>自分 HP ${r.hp} ／ 相手 HP ${b.hp}</p><div class="dialog-actions"><button id="fight" class="primary">たたかう</button><button id="escape">にげる</button></div>`,
      true,
    );
    $("#fight").onclick = () => {
      const hit = Math.max(1, Math.round(r.atk * (0.8 + Math.random() * 0.4)));
      b.hp = Math.max(o.type === "boss" ? 1 : 0, b.hp - hit);
      sfx("damage");
      $("#battleArt").classList.add("flash");
      if (b.hp <= 0 && o.type !== "boss") {
        o.removed = true;
        r.battle = null;
        closeModal();
        say("勝った！");
        hud();
        return;
      }
      enemyAttack(`${hit}のダメージ！`);
    };
    $("#escape").onclick = () => {
      if (o.type !== "boss" && Math.random() < 0.5) {
        r.battle = null;
        closeModal();
        say("なんとか逃げきれた。");
        return;
      }
      enemyAttack(
        o.type === "boss"
          ? "黒い騎士からは逃げられない！"
          : "逃げられなかった！",
      );
    };
  };
  function enemyAttack(msg) {
    const b = r.battle;
    const hit = Math.max(1, Math.round(b.atk * (0.8 + Math.random() * 0.4)));
    r.hp = Math.max(0, r.hp - hit);
    sfx("damage");
    $("#map")?.classList.add("shake");
    setTimeout(() => $("#map")?.classList.remove("shake"), 400);
    hud();
    if (r.hp <= 0) {
      if (o.type === "boss" && o.allowLose) {
        r.deaths++;
        r.hp = r.data.hero.hp;
        o.removed = true;
        r.battle = null;
        closeModal();
        say("騎士は去っていった。負けても道は開いた。");
        hud();
      } else gameOver();
      return;
    }
    draw(msg + ` 相手から${hit}のダメージ！`);
  }
  draw("敵があらわれた！");
}
function gameOver() {
  run.deaths++;
  run.ended = true;
  run.battle = null;
  sfx("over");
  const r = run;
  showModal(
    `<h2>ゲームオーバー</h2><p>やられた回数：${r.deaths}</p><div class="dialog-actions"><button id="retry" class="primary">${r.data.kuso.respawn === "entrance" ? "入口からやり直す" : "さいしょから"}</button><button id="fromStart">さいしょから</button>${r.test ? '<button id="backEdit">つくる画面にもどる</button>' : '<button id="backTitle">タイトルへ</button>'}</div>`,
    true,
  );
  $("#retry").onclick = () => {
    if (r.data.kuso.respawn === "entrance") {
      r.hp = r.data.hero.hp;
      r.ended = false;
      teleport(r.entries[r.map] || entryFor(r.map));
      closeModal();
      say("入口から、もう一度。");
      hud();
    } else
      startPlay(r.test ? game : r.data, r.test, {
        deaths: r.deaths,
        traps: r.traps,
        began: r.began,
        pos: r.data.start,
      });
  };
  $("#fromStart").onclick = () =>
    startPlay(r.test ? game : r.data, r.test, {
      deaths: r.deaths,
      traps: r.traps,
      began: r.began,
      pos: r.data.start,
    });
  if ($("#backEdit")) $("#backEdit").onclick = editor;
  if ($("#backTitle")) $("#backTitle").onclick = home;
}
function clearGame() {
  run.ended = true;
  sfx("clear");
  if (run.test) {
    game.authorCleared = true;
    certified = fingerprint(game);
    save();
  }
  const elapsed = Math.floor((Date.now() - run.began) / 1000);
  showModal(
    `<h2>クリア！ おつかれさま。</h2><p>かかった時間：${elapsed}秒<br>やられた回数：${run.deaths}回<br>引っかかった仕掛け：${run.traps}回</p>${scoreHTML(run.data)}${run.test ? '<p class="badge">作者クリア済み ✓ 共有できるようになりました</p>' : ""}<div class="dialog-actions">${run.test ? '<button id="backEdit">つくる画面にもどる</button>' : '<button id="backTitle">タイトルへ</button>'}</div>`,
    true,
  );
  if ($("#backEdit")) $("#backEdit").onclick = editor;
  if ($("#backTitle")) $("#backTitle").onclick = home;
}
function tile(ctx, id, x, y) {
  const i = TILE_IDS.indexOf(id);
  if (i < 0 || !sheet.complete) return;
  ctx.drawImage(
    sheet,
    (i % 8) * 16,
    Math.floor(i / 8) * 16,
    16,
    16,
    x * 16,
    y * 16,
    16,
    16,
  );
}
function draw(now) {
  const c = $("#map");
  if (c) {
    const ctx = c.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    const editing = screen === "editor",
      g = editing ? game : run?.data,
      mi = editing ? mapIndex : run?.map,
      m = g?.maps[mi];
    if (m) {
      ctx.fillStyle = "#080e12";
      ctx.fillRect(0, 0, 256, 192);
      for (let y = 0; y < 12; y++)
        for (let x = 0; x < 16; x++) {
          let t = groundAt(m, x, y);
          if (["water", "water_2"].includes(t))
            t = Math.floor(now / 500) % 2 ? "water_2" : "water";
          if (
            t === "door" &&
            m.objects.some((o) => o.x === x && o.y === y && o.opened)
          )
            t = "floor";
          tile(ctx, t, x, y);
        }
      for (const o of m.objects) {
        if (o.removed) continue;
        let id = o.type;
        if (editing) id = editorTile(id);
        else {
          if (["invisible_wall", "pit"].includes(id)) continue;
          if (id === "mimic") id = o.revealed ? "mimic" : "chest";
          if (id === "loop") id = "stairs";
          if (id === "fake_goal") id = "goal";
          if (o.opened && o.type === "chest") id = "chest_open";
          if (o.type === "door" && o.opened) continue;
        }
        tile(ctx, id, o.x, o.y);
      }
      if (editing) {
        const s = g.start;
        if (s.map === mi) tile(ctx, "hero_down", s.x, s.y);
        ctx.strokeStyle = "#ffffff18";
        ctx.lineWidth = 0.5;
        for (let x = 0; x <= 16; x++) {
          ctx.beginPath();
          ctx.moveTo(x * 16, 0);
          ctx.lineTo(x * 16, 192);
          ctx.stroke();
        }
        for (let y = 0; y <= 12; y++) {
          ctx.beginPath();
          ctx.moveTo(0, y * 16);
          ctx.lineTo(256, y * 16);
          ctx.stroke();
        }
      } else if (run) {
        if (run.flashPit) tile(ctx, "pit", run.flashPit.x, run.flashPit.y);
        tile(ctx, "hero_" + run.dir, run.x, run.y);
        if (g.kuso.vision === "near") {
          ctx.fillStyle = "#080e12";
          for (let y = 0; y < 12; y++)
            for (let x = 0; x < 16; x++)
              if (Math.max(Math.abs(x - run.x), Math.abs(y - run.y)) > 3)
                ctx.fillRect(x * 16, y * 16, 16, 16);
        }
      }
    }
  }
  music(now);
  if (run && Math.floor(now / 1000) !== draw.lastSecond) {
    hud();
    draw.lastSecond = Math.floor(now / 1000);
  }
  requestAnimationFrame(draw);
}
window.addEventListener("keydown", (e) => {
  if (["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement.tagName))
    return;
  if (
    screen === "editor" &&
    (e.ctrlKey || e.metaKey) &&
    e.key.toLowerCase() === "z" &&
    !modal.open
  ) {
    e.preventDefault();
    undo();
    return;
  }
  if (screen !== "play" || modal.open) return;
  const dir = {
    ArrowUp: "up",
    ArrowDown: "down",
    ArrowLeft: "left",
    ArrowRight: "right",
    w: "up",
    s: "down",
    a: "left",
    d: "right",
  }[e.key];
  if (dir) {
    e.preventDefault();
    move(dir);
  } else if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    inspect();
  }
});
async function loadHash() {
  if (!location.hash.startsWith("#g=")) return false;
  try {
    const g = validate(JSON.parse(await decompress(location.hash.slice(3))));
    intro(g);
  } catch (e) {
    home();
    notice("共有ゲームを読みこめません：" + e.message);
  }
  return true;
}
window.addEventListener("hashchange", loadHash);
home();
loadHash();
requestAnimationFrame(draw);
// Map schema paths back to physical source lines without depending on a parser package.
function jsonLine(text, path) {
  let at = 0;
  const positions = new Map();
  function ws() {
    while (/\s/.test(text[at] || "") && at < text.length) at++;
  }
  function string() {
    const from = at++;
    while (at < text.length) {
      if (text[at] === "\\") {
        at += 2;
        continue;
      }
      if (text[at++] === '"') break;
    }
    return JSON.parse(text.slice(from, at));
  }
  function value(p) {
    ws();
    positions.set(p, at);
    if (text[at] === "{") {
      at++;
      ws();
      if (text[at] === "}") {
        at++;
        return;
      }
      while (at < text.length) {
        ws();
        const key = string();
        ws();
        at++;
        value(p ? p + "." + key : key);
        ws();
        if (text[at++] === "}") break;
      }
    } else if (text[at] === "[") {
      at++;
      ws();
      if (text[at] === "]") {
        at++;
        return;
      }
      let i = 0;
      while (at < text.length) {
        value(p + "[" + i++ + "]");
        ws();
        if (text[at++] === "]") break;
      }
    } else if (text[at] === '"') string();
    else while (at < text.length && !/[\s,}\]]/.test(text[at])) at++;
  }
  try {
    value("");
    let p = path.replace(/（.*?）/g, "");
    while (!positions.has(p) && p) p = p.replace(/(\.[^.\[]+|\[\d+\])$/, "");
    return text.slice(0, positions.get(p) || 0).split("\n").length;
  } catch {
    return 1;
  }
}

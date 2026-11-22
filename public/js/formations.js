/**
 * formations.js
 * K-POP 舞台 4 人陣型與交叉走位時間軸設定
 *
 * 座標說明：
 * - x: 橫向位置百分比 (0 = 最左, 50 = 舞台正中, 100 = 最右)
 * - y: 縱深位置百分比 (70 = 後排靠大螢幕, 98 = 最前排靠近延伸花道入口)
 * - scale: 景深縮放倍率 (後排較小, 前排 C 位放大)
 * - easing: 移動加減速曲線 ("easeInOutQuad" | "easeOutCubic" | "linear")
 *
 * 提示：兩位成員左右換位時，讓前進者 y 稍大、退位者 y 稍小，
 * 搭配程式自動 Y-Sorting (z-index)，就能呈現自然的前後錯身而不互撞。
 */

window.KPOP_MEMBERS = [
  { id: "m1", name: "M1", color: "#ff4fa3", hair: "#9b6b4c" },
  { id: "m2", name: "M2", color: "#2de2e6", hair: "#4a332d" },
  { id: "m3", name: "M3", color: "#b388ff", hair: "#c49464" },
  { id: "m4", name: "M4", color: "#ffd166", hair: "#2b2429" }
];

// 預設 7.375 秒示範走位循環（可依實際整首歌秒數自由新增關鍵幀）
window.FORMATION_TIMELINE = [
  {
    time: 0.0,
    easing: "easeInOutQuad",
    label: "微弧一字開場",
    members: {
      m1: { x: 19, y: 84, scale: 0.94 },
      m2: { x: 39, y: 92, scale: 1.02 },
      m3: { x: 61, y: 92, scale: 1.02 },
      m4: { x: 81, y: 84, scale: 0.94 }
    }
  },
  {
    time: 1.85,
    easing: "easeInOutQuad",
    label: "V字交錯換位",
    members: {
      m1: { x: 34, y: 94, scale: 1.04 },
      m2: { x: 18, y: 78, scale: 0.88 },
      m3: { x: 82, y: 78, scale: 0.88 },
      m4: { x: 66, y: 94, scale: 1.04 }
    }
  },
  {
    time: 3.65,
    easing: "easeOutCubic",
    label: "M1 走近花道前緣 C 位（菱形陣型）",
    members: {
      m1: { x: 50, y: 100, scale: 1.12 },
      m2: { x: 25, y: 84,  scale: 0.93 },
      m3: { x: 75, y: 84,  scale: 0.93 },
      m4: { x: 50, y: 73,  scale: 0.82 }
    }
  },
  {
    time: 5.55,
    easing: "easeInOutQuad",
    label: "兩側展開回歸",
    members: {
      m1: { x: 26, y: 88, scale: 0.98 },
      m2: { x: 44, y: 95, scale: 1.05 },
      m3: { x: 56, y: 78, scale: 0.88 },
      m4: { x: 78, y: 88, scale: 0.98 }
    }
  },
  {
    time: 7.375,
    easing: "easeInOutQuad",
    label: "循環回位",
    members: {
      m1: { x: 19, y: 84, scale: 0.94 },
      m2: { x: 39, y: 92, scale: 1.02 },
      m3: { x: 61, y: 92, scale: 1.02 },
      m4: { x: 81, y: 84, scale: 0.94 }
    }
  }
];

/**
 * 隊形庫：songs.js 的走位計畫用名稱引用這些隊形
 * 每位成員 [x, y]：x = 左右位置 0~100，y = 前後位置（72 後排 ~ 100 最前排），縮放依 y 自動計算
 * 舞者框寬約 22%，x 建議在 12~88 之間，避免超出舞台
 */
window.FORMATION_SHAPES = {
  BACK_TIGHT:        { m1: [30, 76], m2: [43, 77], m3: [57, 77], m4: [70, 76] },   // 舞台後方（靠大螢幕）一字排開
  BACK_WIDE:         { m1: [18, 78], m2: [39, 79], m3: [61, 79], m4: [82, 78] },   // 舞台後方拉開間距
  FRONT_CLUSTER:     { m1: [36, 94], m2: [45, 98], m3: [55, 98], m4: [64, 94] },   // 走到前方中間聚成一團
  FRONT_LINE:        { m1: [20, 96], m2: [40, 98], m3: [60, 98], m4: [80, 96] },   // 前排一字排開
  WIDE_LINE:         { m1: [14, 93], m2: [38, 94], m3: [62, 94], m4: [86, 93] },   // 大間距寬橫排
  CENTER_CLUSTER_MID:{ m1: [38, 90], m2: [47, 93], m3: [55, 92], m4: [63, 89] },   // 中間聚攏（伴舞進場）
  CHORUS_BEHIND:     { m1: [16, 86], m2: [38, 88], m3: [62, 88], m4: [84, 86] },   // 伴舞跪在前，成員站後一排
  CHORUS_FRONT:      { m1: [14, 97], m2: [38, 98], m3: [62, 98], m4: [86, 97] },   // 副歌成員站前排
  CENTER_PAIRS:      { m1: [33, 92], m2: [43, 95], m3: [60, 95], m4: [70, 92] },   // 往中間靠攏（兩兩一組）
  CENTER_FRONT_LINE: { m1: [28, 97], m2: [43, 99], m3: [57, 99], m4: [72, 97] },   // 中間前排
  LEFT:              { m1: [13, 92], m2: [27, 94], m3: [41, 94], m4: [55, 92] },   // 集中舞台左半邊
  SOLO_M1:           { m1: [50, 100], m2: [24, 77], m3: [50, 73], m4: [76, 77] },  // M1 獨唱站中間最前面
  CENTER_MID_LINE:   { m1: [30, 90], m2: [43, 92], m3: [57, 92], m4: [70, 90] },   // 中間一排
  CENTER_CLUSTER:    { m1: [38, 93], m2: [46, 96], m3: [54, 96], m4: [62, 93] },   // 聚到中間
  CONVERGE:          { m1: [42, 94], m2: [48, 97], m3: [54, 97], m4: [60, 94] },   // 緊密聚在中間
  SOLO_M2:           { m1: [22, 77], m2: [50, 100], m3: [76, 77], m4: [50, 73] },  // M2 獨唱站中間最前面
  DUO_FRONT:         { m1: [22, 82], m2: [44, 98], m3: [56, 98], m4: [78, 82] },   // 中間兩人在前
  RIGHT_CLUSTER:     { m1: [48, 90], m2: [58, 94], m3: [68, 94], m4: [78, 90] },   // 偏右聚集
  CENTER_RIGHT_LINE: { m1: [34, 95], m2: [48, 97], m3: [62, 97], m4: [76, 95] },   // 中間偏右前排
  FINAL:             { m1: [40, 93], m2: [47, 98], m3: [55, 98], m4: [62, 93] }    // 結尾聚中間擺 POSE
};

window.FormationEngine = (function () {
  const easings = {
    linear: (t) => t,
    easeInOutQuad: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
    easeOutCubic: (t) => 1 - Math.pow(1 - t, 3),
    // 更平緩的起步與停步，適合慢慢走的優雅換位
    easeInOutSine: (t) => -(Math.cos(Math.PI * t) - 1) / 2
  };

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  /**
   * 依據目前秒數計算 4 位成員的即時座標、縮放、zIndex 與 C 位亮度
   * - customTimeline: 指定走位時間軸（例如 songs.js 裡整首歌的 formation）；沒給就用 FORMATION_TIMELINE
   * - loop:           false = 不循環（整首歌走位，超過最後一個關鍵幀就停在最後位置）
   */
  function evaluate(timeSec, enabled, loopDuration, customTimeline, loop) {
    const timeline = customTimeline || window.FORMATION_TIMELINE;
    if (!enabled || !timeline || timeline.length === 0) {
      return {
        m1: { x: 19, y: 88, scale: 0.95, zIndex: 880, brightness: 0.96 },
        m2: { x: 39, y: 94, scale: 1.02, zIndex: 940, brightness: 1.03 },
        m3: { x: 61, y: 94, scale: 1.02, zIndex: 940, brightness: 1.03 },
        m4: { x: 81, y: 88, scale: 0.95, zIndex: 880, brightness: 0.96 }
      };
    }

    const lastTime = timeline[timeline.length - 1].time;
    let tNow = timeSec;
    if (loop !== false) {
      const cycle = loopDuration > 0 ? Math.min(loopDuration, lastTime) : lastTime;
      tNow = cycle > 0 ? ((timeSec % cycle) + cycle) % cycle : timeSec;
    }

    let prev = timeline[0];
    let next = timeline[timeline.length - 1];
    for (let i = 0; i < timeline.length - 1; i++) {
      if (tNow >= timeline[i].time && tNow <= timeline[i + 1].time) {
        prev = timeline[i];
        next = timeline[i + 1];
        break;
      }
    }

    const span = Math.max(0.0001, next.time - prev.time);
    const rawT = Math.max(0, Math.min(1, (tNow - prev.time) / span));
    const easeFn = easings[next.easing] || easings.easeInOutQuad;
    const k = easeFn(rawT);

    const out = {};
    for (const m of window.KPOP_MEMBERS) {
      const a = prev.members[m.id];
      const b = next.members[m.id];
      const x = lerp(a.x, b.x, k);
      const y = lerp(a.y, b.y, k);
      const scale = lerp(a.scale, b.scale, k);
      // 越靠前排 (y 越大)，zIndex 越高且聚光燈打亮越明顯
      const zIndex = Math.round(y * 10);
      const depthNorm = Math.max(0, Math.min(1, (y - 72) / 28));
      const brightness = 0.80 + depthNorm * 0.28;
      out[m.id] = { x, y, scale, zIndex, brightness };
    }
    return out;
  }

  // 前後位置換算景深縮放：後排小、前排大（差距加大，前後站位比較看得出來）
  function scaleForY(y) {
    const depth = Math.max(0, Math.min(1, (y - 72) / 28));
    return Number((0.74 + depth * 0.42).toFixed(3));
  }

  /**
   * 用「隊形計畫」產生整首歌的走位時間軸
   * plan: [[到位秒數, "隊形名稱", 移動秒數(選填)], ...]
   *       例如 [[0, "BACK_TIGHT"], [21, "FRONT_CLUSTER", 5]] = 第 16 秒開始花 5 秒慢慢走到前方、第 21 秒到位
   * opts.moveSec: 換隊形預設花幾秒移動（預設 1.6）。每個隊形會保持不動，到下一個隊形前才開始移動
   * opts.offset:  整體往後（+）或往前（−）挪幾秒，用來對齊歌曲
   * opts.shapes:  額外自訂隊形（會和 FORMATION_SHAPES 合併）
   */
  function fromPlan(plan, opts) {
    const o = opts || {};
    const shapes = Object.assign({}, window.FORMATION_SHAPES, o.shapes || {});
    const moveSec = o.moveSec > 0 ? o.moveSec : 1.6;
    const offset = Number(o.offset) || 0;

    function membersOf(name) {
      const shape = shapes[name];
      if (!shape) throw new Error(`走位計畫裡的隊形「${name}」不存在`);
      const out = {};
      for (const id of Object.keys(shape)) {
        const [x, y, scale] = shape[id];
        out[id] = { x, y, scale: scale || scaleForY(y) };
      }
      return out;
    }

    const keyframes = [];
    plan.forEach(([at, name, move], i) => {
      const t = at + offset;
      const thisMove = move > 0 ? move : moveSec;
      if (i > 0) {
        const [prevAt, prevName] = plan[i - 1];
        const holdEnd = Math.max(prevAt + offset, t - thisMove);
        // 保持上一個隊形到開始移動的時間點
        if (holdEnd > prevAt + offset + 0.01) {
          keyframes.push({ time: holdEnd, easing: "linear", members: membersOf(prevName) });
        }
      }
      // 移動時間 2.5 秒以上視為慢慢走：用更平緩的 easeInOutSine
      const easing = thisMove >= 2.5 ? "easeInOutSine" : "easeInOutQuad";
      keyframes.push({ time: t, easing, label: name, members: membersOf(name) });
    });
    return keyframes;
  }

  return { evaluate, fromPlan, scaleForY };
})();

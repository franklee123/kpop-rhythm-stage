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
 * 舞者框寬約 28%，x 建議在 15~85 之間，避免超出舞台
 */
window.FORMATION_SHAPES = {
  PAIRS:         { m1: [33, 86], m2: [43, 90], m3: [57, 90], m4: [67, 86] }, // 兩兩一組靠中間
  LINE:          { m1: [20, 89], m2: [40, 92], m3: [60, 92], m4: [80, 89] }, // 一字排開（微弧）
  V_CENTER:      { m1: [22, 85], m2: [43, 95], m3: [57, 95], m4: [78, 85] }, // V 字，中間兩人在前
  STAGGER:       { m1: [18, 88], m2: [39, 95], m3: [61, 89], m4: [82, 95] }, // 前後交錯
  CHORUS:        { m1: [17, 94], m2: [39, 96], m3: [61, 96], m4: [83, 94] }, // 副歌拉開站前排
  RIGHT:         { m1: [36, 90], m2: [51, 93], m3: [66, 93], m4: [81, 90] }, // 整體偏右
  LEFT:          { m1: [16, 92], m2: [31, 94], m3: [46, 94], m4: [61, 92] }, // 集中左半邊
  DIAMOND:       { m1: [50, 100], m2: [31, 87], m3: [69, 87], m4: [50, 77] }, // 菱形，M1 站 C 位
  CLUSTER:       { m1: [47, 97], m2: [38, 90], m3: [62, 91], m4: [54, 84] }, // 往中間聚集
  LINE_SWAP:     { m1: [40, 92], m2: [20, 89], m3: [80, 89], m4: [60, 92] }, // 一字排開（交叉換位後）
  RIGHT_CLUSTER: { m1: [58, 95], m2: [48, 90], m3: [78, 94], m4: [68, 90] }, // 集中右半邊
  FRONT:         { m1: [43, 99], m2: [28, 96], m3: [72, 96], m4: [57, 99] }, // 全員站到最前排
  LINE_C:        { m1: [40, 93], m2: [20, 90], m3: [80, 90], m4: [60, 93] }, // 一字排開
  WIDE:          { m1: [41, 97], m2: [24, 96], m3: [76, 96], m4: [59, 97] }, // 寬橫排
  RIGHT_LINE:    { m1: [53, 92], m2: [40, 89], m3: [79, 89], m4: [66, 92] }, // 中間偏右橫排
  FINAL:         { m1: [47, 97], m2: [39, 91], m3: [63, 91], m4: [55, 97] }  // 結尾聚中間擺 POSE
};

window.FormationEngine = (function () {
  const easings = {
    linear: (t) => t,
    easeInOutQuad: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
    easeOutCubic: (t) => 1 - Math.pow(1 - t, 3)
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

  // 前後位置換算景深縮放：後排小、前排大
  function scaleForY(y) {
    const depth = Math.max(0, Math.min(1, (y - 72) / 28));
    return Number((0.82 + depth * 0.3).toFixed(3));
  }

  /**
   * 用「隊形計畫」產生整首歌的走位時間軸
   * plan: [[到位秒數, "隊形名稱"], ...]  例如 [[0, "PAIRS"], [9, "LINE"], ...]
   * opts.moveSec: 換隊形花幾秒移動（預設 1.6）。每個隊形會保持不動，到下一個隊形前 moveSec 秒才開始移動
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
    plan.forEach(([at, name], i) => {
      const t = at + offset;
      if (i > 0) {
        const [prevAt, prevName] = plan[i - 1];
        const holdEnd = Math.max(prevAt + offset, t - moveSec);
        // 保持上一個隊形到開始移動的時間點
        if (holdEnd > prevAt + offset + 0.01) {
          keyframes.push({ time: holdEnd, easing: "linear", members: membersOf(prevName) });
        }
      }
      keyframes.push({ time: t, easing: "easeInOutQuad", label: name, members: membersOf(name) });
    });
    return keyframes;
  }

  return { evaluate, fromPlan, scaleForY };
})();

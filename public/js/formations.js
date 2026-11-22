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
   */
  function evaluate(timeSec, enabled, loopDuration) {
    const timeline = window.FORMATION_TIMELINE;
    if (!enabled || !timeline || timeline.length === 0) {
      return {
        m1: { x: 19, y: 88, scale: 0.95, zIndex: 880, brightness: 0.96 },
        m2: { x: 39, y: 94, scale: 1.02, zIndex: 940, brightness: 1.03 },
        m3: { x: 61, y: 94, scale: 1.02, zIndex: 940, brightness: 1.03 },
        m4: { x: 81, y: 88, scale: 0.95, zIndex: 880, brightness: 0.96 }
      };
    }

    const lastTime = timeline[timeline.length - 1].time;
    const cycle = loopDuration > 0 ? Math.min(loopDuration, lastTime) : lastTime;
    const tNow = cycle > 0 ? ((timeSec % cycle) + cycle) % cycle : timeSec;

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

  return { evaluate };
})();

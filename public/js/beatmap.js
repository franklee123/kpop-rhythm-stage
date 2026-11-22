/**
 * beatmap.js
 * 音符譜面資料與工具
 *
 * 每一顆音符格式：{ time: 秒數(float), lane: 軌道編號(0~3) }
 * - 4 軌模式：lane 0 = D, 1 = F, 2 = J, 3 = K
 * - 單軌模式：所有音符自動彙整到花道正中央
 */

window.BeatmapStore = (function () {
  // 預設 128 BPM (每拍 0.46875s) 對應 7.375 秒循環的示範譜面
  function createDemoChart() {
    const bpm = 128;
    const beat = 60 / bpm; // 0.46875s
    const pattern = [
      { b: 1.0, lane: 0 },
      { b: 1.5, lane: 1 },
      { b: 2.0, lane: 2 },
      { b: 2.5, lane: 3 },
      { b: 3.0, lane: 1 },
      { b: 3.0, lane: 2 }, // 雙押
      { b: 4.0, lane: 0 },
      { b: 4.5, lane: 2 },
      { b: 5.0, lane: 1 },
      { b: 5.5, lane: 3 },
      { b: 6.0, lane: 0 },
      { b: 6.0, lane: 3 }, // 雙押
      { b: 7.0, lane: 2 },
      { b: 7.5, lane: 1 },
      { b: 8.0, lane: 0 },
      { b: 8.5, lane: 1 },
      { b: 9.0, lane: 2 },
      { b: 9.5, lane: 3 },
      { b: 10.0, lane: 1 },
      { b: 10.5, lane: 2 },
      { b: 11.0, lane: 0 },
      { b: 11.5, lane: 3 },
      { b: 12.0, lane: 1 },
      { b: 12.0, lane: 2 },
      { b: 13.0, lane: 3 },
      { b: 13.5, lane: 2 },
      { b: 14.0, lane: 1 },
      { b: 14.5, lane: 0 },
      { b: 15.0, lane: 0 },
      { b: 15.0, lane: 3 }
    ];

    return pattern.map((p, idx) => ({
      id: idx + 1,
      time: Number((p.b * beat).toFixed(3)),
      lane: p.lane
    }));
  }

  function normalizeChart(rawArray) {
    if (!Array.isArray(rawArray)) {
      throw new Error("譜面必須是 JSON 陣列");
    }
    return rawArray
      .filter((n) => n && typeof n.time === "number" && !Number.isNaN(n.time))
      .map((n, idx) => ({
        id: idx + 1,
        time: Number(n.time.toFixed(3)),
        lane: Math.max(0, Math.min(3, parseInt(n.lane ?? 0, 10) || 0))
      }))
      .sort((a, b) => a.time - b.time || a.lane - b.lane);
  }

  function serializeChart(notes) {
    const clean = notes.map((n) => ({ time: n.time, lane: n.lane }));
    return JSON.stringify(clean, null, 2);
  }

  return {
    createDemoChart,
    normalizeChart,
    serializeChart
  };
})();

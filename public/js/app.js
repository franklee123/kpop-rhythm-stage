/**
 * app.js
 * K-POP 延伸花道舞台節奏遊戲核心引擎
 * - 平滑主時鐘 (rAF + performance.now + YouTube IFrame 漂移校正)
 * - 4 位角色影片同步引擎 (playbackRate 柔性追幀，不跳針卡頓)
 * - 3D 透視直線花道 Canvas 繪製 (支援 4 軌 / 單軌切換 + 多點觸控)
 * - 即時錄譜模式 (敲 D/F/J/K 或觸控自動記錄毫秒時間)
 */

(function () {
  "use strict";

  // 如需固定載入專案資料夾內的影片，可填入相對路徑，例如：
  // m1: "assets/videos/m1.webm",
  const DEFAULT_MEMBER_VIDEOS = {
    m1: "",
    m2: "",
    m3: "",
    m4: ""
  };

  const LANE_COLORS = ["#ff4fa3", "#2de2e6", "#b388ff", "#ffd166"];
  const KEY_TO_LANE = { d: 0, f: 1, j: 2, k: 3 };

  // 判定視窗（秒）
  const JUDGE_WINDOWS = {
    perfect: 0.060,
    great:   0.115,
    good:    0.170,
    miss:    0.220
  };

  // 核心狀態
  const state = {
    playing: false,
    clockMode: "demo",          // "demo" | "youtube"
    masterTime: 0,              // 目前邏輯時間（秒）
    lastRafTs: 0,
    clipStart: 0,               // 舞段對應 MV 起始秒數
    clipDuration: 7.375,        // 舞段長度（秒）
    loopClip: true,             // 是否循環 7 秒舞段
    offsetMs: 0,                // 延遲微調（毫秒）
    dancerScaleMult: 1.0,       // 舞者大小倍率
    noteTravelSec: 1.35,        // 音符從花道頂端滑到判定線的時間（秒）
    laneCount: 4,               // 4 | 1
    blendMode: "screen",        // "screen" | "normal"
    formationEnabled: true,
    sfxEnabled: true,
    recordMode: false,

    // 遊戲計分與音符
    notes: window.BeatmapStore.createDemoChart(),
    hitMap: new Set(),          // 已判定音符 ID（Demo 循環時重置）
    lastLoopCycle: 0,
    score: 0,
    combo: 0,
    lanePressed: [false, false, false, false],
    hitBursts: [],              // Canvas 打擊光環粒子

    // 效能與同步統計
    fpsFrames: 0,
    fpsLastTs: performance.now(),
    fps: 60,
    lastSyncCheckTs: 0,
    avgDriftMs: 0,
    lastPlaybackRate: 1.0,

    // YouTube
    ytPlayer: null,
    ytReady: false,
    ytVideoId: "",

    // Web Audio
    audioCtx: null,
    lastBeatIndex: -1,

    // 成員 DOM 與影片
    members: {},
    pendingSingleMemberId: "m1",

    // 音樂選單
    songs: Array.isArray(window.SONG_LIST) ? window.SONG_LIST : [],
    selectedSong: -1,           // 選單中目前選取的歌曲 index
    currentSong: null,          // 正在演出的歌曲
    songEnding: false,          // 是否正在收尾（音量淡出中）
    endCovered: false,          // 是否已進入片尾時段、大螢幕已蓋住
    ytBaseVolume: null,         // 收尾前的 YT 音量，用來復原
    loopChart: false            // YouTube 模式下譜面是否依舞段長度循環（歌曲沒附專屬譜面時）
  };

  // DOM 參照
  const el = {
    body: document.body,
    btnModeMobile: document.getElementById("btn-mode-mobile"),
    btnModeTheater: document.getElementById("btn-mode-theater"),
    btnPlayToggle: document.getElementById("btn-play-toggle"),
    startOverlay: document.getElementById("start-overlay"),
    screenTitle: document.getElementById("screen-title"),
    screenSelect: document.getElementById("screen-select"),
    btnTitleStart: document.getElementById("btn-title-start"),
    btnQuickDemo: document.getElementById("btn-quick-demo"),
    btnSelectBack: document.getElementById("btn-select-back"),
    btnSongStart: document.getElementById("btn-song-start"),
    btnSongMenu: document.getElementById("btn-song-menu"),
    songList: document.getElementById("song-list"),
    selectCount: document.getElementById("select-count"),
    selectNowTitle: document.getElementById("select-now-title"),
    btnLoadX4: document.getElementById("btn-load-x4"),
    btnDrawerLoadX4: document.getElementById("btn-drawer-load-x4"),
    fileVideoX4: document.getElementById("file-video-x4"),
    fileVideoSingle: document.getElementById("file-video-single"),
    btnDrawerToggle: document.getElementById("btn-drawer-toggle"),
    btnDrawerClose: document.getElementById("btn-drawer-close"),
    drawer: document.getElementById("control-drawer"),

    hudTime: document.getElementById("hud-time"),
    hudFps: document.getElementById("hud-fps"),
    hudDrift: document.getElementById("hud-drift"),
    hudRate: document.getElementById("hud-rate"),
    hudScore: document.getElementById("hud-score"),
    hudCombo: document.getElementById("hud-combo"),
    hudComboWrap: document.getElementById("hud-combo-wrap"),

    ledFallback: document.getElementById("led-fallback"),
    ledStatusText: document.getElementById("led-status-text"),
    ledVisCanvas: document.getElementById("led-visualizer"),
    dancersLayer: document.getElementById("dancers-layer"),
    runwaySection: document.getElementById("runway-section"),
    runwayCanvas: document.getElementById("runway-canvas"),
    judgePopup: document.getElementById("judge-popup"),
    touchPads: document.getElementById("touch-pads"),

    inputYtUrl: document.getElementById("input-yt-url"),
    btnLoadYt: document.getElementById("btn-load-yt"),
    inputClipStart: document.getElementById("input-clip-start"),
    inputClipDuration: document.getElementById("input-clip-duration"),
    rangeOffset: document.getElementById("range-offset"),
    valOffset: document.getElementById("val-offset"),
    chkLoopClip: document.getElementById("chk-loop-clip"),
    chkSfx: document.getElementById("chk-sfx"),

    selectBlend: document.getElementById("select-blend"),
    selectLanes: document.getElementById("select-lanes"),
    rangeDancerScale: document.getElementById("range-dancer-scale"),
    valDancerScale: document.getElementById("val-dancer-scale"),
    rangeNoteSpeed: document.getElementById("range-note-speed"),
    valNoteSpeed: document.getElementById("val-note-speed"),
    chkFormation: document.getElementById("chk-formation"),

    chkRecordMode: document.getElementById("chk-record-mode"),
    btnChartClear: document.getElementById("btn-chart-clear"),
    btnChartReset: document.getElementById("btn-chart-reset"),
    btnChartCopy: document.getElementById("btn-chart-copy"),
    btnChartApply: document.getElementById("btn-chart-apply"),
    txtChartJson: document.getElementById("txt-chart-json"),
    valNoteCount: document.getElementById("val-note-count")
  };

  let judgeTimer = null;

  /* =========================================================
     1. 初始化舞台、4 位 Q 版舞者與桌機劇院應援燈海
     ========================================================= */
  function createChibiSvg(member) {
    return `
      <svg class="dancer-svg" viewBox="0 0 120 180" xmlns="http://www.w3.org/2000/svg">
        <!-- 長捲髮後層 -->
        <ellipse cx="60" cy="64" rx="34" ry="38" fill="${member.hair}" />
        <!-- 身體：深灰細條紋西裝外套 -->
        <path d="M36 92 Q60 85 84 92 L89 132 L31 132 Z" fill="#2c2f3a" stroke="#181a22" stroke-width="2"/>
        <!-- 白襯衫與領帶 -->
        <polygon points="52,90 68,90 60,112" fill="#f7f9ff"/>
        <polygon points="58,94 62,94 63,115 60,120 57,115" fill="${member.color}"/>
        <!-- 雙袖 -->
        <path d="M36 95 L22 122 L32 127 L42 104 Z" fill="#2c2f3a" stroke="#181a22" stroke-width="1.5"/>
        <path d="M84 95 L98 122 L88 127 L78 104 Z" fill="#2c2f3a" stroke="#181a22" stroke-width="1.5"/>
        <circle cx="26" cy="126" r="5" fill="#ffe1cd"/>
        <circle cx="94" cy="126" r="5" fill="#ffe1cd"/>
        <!-- 短裙 -->
        <path d="M35 128 L85 128 L91 144 L29 144 Z" fill="#1e202b"/>
        <!-- 雙腿與不對稱黑絲襪 -->
        <rect x="44" y="144" width="11" height="27" rx="4" fill="#ffe1cd"/>
        <rect x="65" y="144" width="11" height="27" rx="4" fill="#ffe1cd"/>
        <rect x="44" y="153" width="11" height="18" rx="3" fill="#22232c"/>
        <rect x="65" y="159" width="11" height="12" rx="3" fill="#22232c"/>
        <!-- 高跟鞋 -->
        <ellipse cx="49.5" cy="173" rx="7" ry="4" fill="#14151c"/>
        <ellipse cx="70.5" cy="173" rx="7" ry="4" fill="#14151c"/>
        <!-- 頭與五官 -->
        <circle cx="60" cy="58" r="28" fill="#ffe5d4" stroke="#d9b29a" stroke-width="1.5"/>
        <!-- 瀏海 -->
        <path d="M31 54 Q40 24 60 25 Q80 24 89 54 Q76 42 60 44 Q44 42 31 54 Z" fill="${member.hair}"/>
        <!-- 大眼睛 -->
        <ellipse cx="48" cy="60" rx="5.2" ry="6.2" fill="#1e1b24"/>
        <ellipse cx="72" cy="60" rx="5.2" ry="6.2" fill="#1e1b24"/>
        <circle cx="49.8" cy="57.8" r="2" fill="#ffffff"/>
        <circle cx="73.8" cy="57.8" r="2" fill="#ffffff"/>
        <!-- 腮紅與微笑 -->
        <ellipse cx="41" cy="67" rx="4.5" ry="2.2" fill="#ff8fab" opacity="0.65"/>
        <ellipse cx="79" cy="67" rx="4.5" ry="2.2" fill="#ff8fab" opacity="0.65"/>
        <path d="M54 71 Q60 77 66 71" fill="none" stroke="#c85a6a" stroke-width="2.2" stroke-linecap="round"/>
      </svg>
    `;
  }

  function initDancers() {
    el.dancersLayer.innerHTML = "";
    for (const m of window.KPOP_MEMBERS) {
      const slot = document.createElement("div");
      slot.className = "dancer-slot";
      slot.dataset.memberId = m.id;
      slot.innerHTML = `
        <div class="dancer-shadow"></div>
        <div class="dancer-media-box">
          <video class="dancer-video blend-screen" muted playsinline preload="auto"></video>
          ${createChibiSvg(m)}
        </div>
        <div class="dancer-label" style="border-color:${m.color}">${m.name}</div>
      `;
      el.dancersLayer.appendChild(slot);

      const video = slot.querySelector(".dancer-video");
      const svg = slot.querySelector(".dancer-svg");
      state.members[m.id] = {
        id: m.id,
        slot,
        video,
        svg,
        hasVideo: false,
        objectUrl: null
      };

      // 若開發者有在 DEFAULT_MEMBER_VIDEOS 填預設檔案，自動載入
      if (DEFAULT_MEMBER_VIDEOS[m.id]) {
        attachVideoSource(m.id, DEFAULT_MEMBER_VIDEOS[m.id], false);
      }
    }
  }

  function initCrowdLightsticks() {
    const colors = ["#ff4fa3", "#2de2e6", "#ffd166", "#b388ff", "#ffffff"];
    ["crowd-left-sticks", "crowd-right-sticks"].forEach((id) => {
      const box = document.getElementById(id);
      if (!box) return;
      box.innerHTML = "";
      for (let i = 0; i < 42; i++) {
        const dot = document.createElement("span");
        dot.className = "lightstick";
        const c = colors[i % colors.length];
        dot.style.left = `${8 + Math.random() * 84}%`;
        dot.style.top = `${30 + Math.random() * 66}%`;
        dot.style.background = c;
        dot.style.boxShadow = `0 0 12px ${c}`;
        dot.style.animationDelay = `${(Math.random() * 1.4).toFixed(2)}s`;
        dot.style.animationDuration = `${(0.75 + Math.random() * 0.7).toFixed(2)}s`;
        box.appendChild(dot);
      }
    });
  }

  function attachVideoSource(memberId, url, isBlob) {
    const m = state.members[memberId];
    if (!m) return;
    if (m.objectUrl && m.objectUrl !== url) {
      URL.revokeObjectURL(m.objectUrl);
      m.objectUrl = null;
    }
    if (isBlob) m.objectUrl = url;

    m.video.src = url;
    m.video.muted = true;
    m.video.playsInline = true;
    m.video.loop = state.loopClip;
    m.video.classList.add("active");
    m.video.classList.toggle("blend-screen", state.blendMode === "screen");
    m.svg.classList.add("hidden");
    m.hasVideo = true;

    m.video.onloadedmetadata = () => {
      if (m.video.duration && Number.isFinite(m.video.duration) && m.video.duration > 0.5) {
        // 自動同步舞段長度到剛載入的影片實際秒數
        state.clipDuration = Number(m.video.duration.toFixed(3));
        el.inputClipDuration.value = state.clipDuration;
        if (state.clockMode === "demo") {
          el.ledStatusText.textContent = `VIDEO SYNC · ${state.clipDuration}s LOOP`;
        }
      }
      if (state.playing) {
        syncVideosToMaster(true);
        m.video.play().catch(() => {});
      }
    };
    m.video.load();
  }

  /* =========================================================
     2. Web Audio 輕量音效（免外部音檔，點擊後即解鎖）
     ========================================================= */
  function ensureAudioCtx() {
    if (!state.sfxEnabled) return; // 音效關閉時完全不開啟音訊引擎
    if (!state.audioCtx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) state.audioCtx = new AC();
    }
    if (state.audioCtx && state.audioCtx.state === "suspended") {
      state.audioCtx.resume().catch(() => {});
    }
  }

  function playTone(freq, duration, volume, type) {
    if (!state.sfxEnabled || !state.audioCtx) return;
    const now = state.audioCtx.currentTime;
    const osc = state.audioCtx.createOscillator();
    const gain = state.audioCtx.createGain();
    osc.type = type || "triangle";
    osc.frequency.setValueAtTime(freq, now);
    // 先用 4ms 淡入再淡出，避免音量瞬間跳起造成「啪」的爆音
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain);
    gain.connect(state.audioCtx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  function playHitSfx(grade) {
    if (grade === "perfect") playTone(880, 0.065, 0.12, "triangle");
    else if (grade === "great") playTone(660, 0.06, 0.10, "triangle");
    else if (grade === "good") playTone(520, 0.055, 0.08, "sine");
    else playTone(180, 0.08, 0.05, "sine"); // MISS：柔和低音（原本是刺耳的鋸齒波）
  }

  function playMetronomeTick(isAccent) {
    if (state.clockMode !== "demo") return;
    playTone(isAccent ? 1046 : 740, 0.035, isAccent ? 0.08 : 0.045, "sine");
  }

  /* =========================================================
     3. YouTube IFrame Player API 載入與整合
     ========================================================= */
  function parseYoutubeId(input) {
    const trimmed = (input || "").trim();
    if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
    const patterns = [
      /[?&]v=([a-zA-Z0-9_-]{11})/,
      /youtu\.be\/([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/
    ];
    for (const re of patterns) {
      const m = trimmed.match(re);
      if (m) return m[1];
    }
    return "";
  }

  let ytApiLoading = false;
  function loadYoutubeApi(callback) {
    if (window.YT && window.YT.Player) {
      callback();
      return;
    }
    const prevReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (typeof prevReady === "function") prevReady();
      callback();
    };
    if (!ytApiLoading) {
      ytApiLoading = true;
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(tag);
    }
  }

  // 建立（或沿用）YouTube 播放器；播放器 ready 後依序執行 callback。
  // 進入選歌畫面時就先建立，按下開始時才能在同一次點擊內立即播放（手機自動播放限制）。
  let ytReadyQueue = [];
  function ensureYtPlayer(callback) {
    if (state.ytPlayer && state.ytReady) {
      if (callback) callback(state.ytPlayer);
      return;
    }
    if (callback) ytReadyQueue.push(callback);

    loadYoutubeApi(() => {
      if (state.ytPlayer) return; // 已在建立中，等 onReady
      state.ytPlayer = new window.YT.Player("yt-player-mount", {
        playerVars: {
          playsinline: 1,
          rel: 0,
          modestbranding: 1,
          controls: 0,
          disablekb: 1,
          fs: 0,
          iv_load_policy: 3,   // 不顯示影片註解 / 資訊卡
          cc_load_policy: 0,   // 不預設開啟字幕
          origin: window.location.origin
        },
        events: {
          onReady: () => {
            state.ytReady = true;
            const queue = ytReadyQueue;
            ytReadyQueue = [];
            queue.forEach((fn) => fn(state.ytPlayer));
          },
          onStateChange: handleYtStateChange,
          onApiChange: disableYtCaptions, // 字幕模組載入時立刻關掉
          onError: (err) => {
            el.ledFallback.classList.remove("hidden");
            el.ledStatusText.textContent = `YT 錯誤碼 ${err.data}（請確認以 http://localhost 開啟）`;
          }
        }
      });
    });
  }

  // 關閉 YouTube 字幕（含自動翻譯字幕）。字幕模組會在播放後才載入，所以多處重複呼叫
  function disableYtCaptions() {
    const p = state.ytPlayer;
    if (!p) return;
    try {
      if (typeof p.unloadModule === "function") {
        p.unloadModule("captions");
        p.unloadModule("cc");
      }
      if (typeof p.setOption === "function") {
        p.setOption("captions", "track", {});
      }
    } catch (_) { /* 播放器尚未就緒時忽略 */ }
  }

  // LED 待機畫面蓋住 YouTube 播放器：MV 開始播放後，要等 YouTube 自己的播放 / 暫停圖示動畫
  // 跑完（實際連續播放 YT_REVEAL_DELAY_MS）才淡出；暫停 / 播完時再蓋回去，遮住「更多影片」推薦
  const YT_REVEAL_DELAY_MS = 1300;
  let ytRevealAt = 0; // 預定淡出的時間點（performance.now），0 = 不淡出

  function revealYtScreen() {
    ytRevealAt = performance.now() + YT_REVEAL_DELAY_MS;
  }

  function coverYtScreen(text) {
    ytRevealAt = 0;
    el.ledFallback.classList.remove("hidden");
    if (text) el.ledStatusText.textContent = text;
  }

  /* ---------- 選單歌曲結尾：音樂完整播完，只把片尾推薦卡片的畫面蓋掉 ---------- */
  // YouTube 片尾畫面（推薦影片卡片）最長出現在影片最後 20 秒
  const END_SCREEN_COVER_SEC = 20;
  const OUTRO_FADE_MS = 2500;
  let outroTimer = null;

  // 從第幾秒開始蓋住大螢幕（音樂照常播放）：預設「影片長度 − 20 秒」，
  // songs.js 可用 endCover 指定要蓋最後幾秒（例如片尾卡片只出現 10 秒就填 10，填 0 = 不蓋）
  function getEndCoverTime(player) {
    const song = state.currentSong;
    if (!song) return Infinity;
    const coverSec = song.endCover != null ? Math.max(0, Number(song.endCover) || 0) : END_SCREEN_COVER_SEC;
    if (coverSec <= 0) return Infinity;
    const dur = typeof player.getDuration === "function" ? player.getDuration() : 0;
    return dur > coverSec * 2 ? dur - coverSec : Infinity;
  }

  // 提早結束秒數：只有 songs.js 填了 end 才會在那一秒淡出收尾；沒填就播到影片最後
  function getSongEndTime() {
    const song = state.currentSong;
    return song && Number(song.end) > 0 ? Number(song.end) : Infinity;
  }

  // 收尾：蓋上 THE END 待機畫面 → 音量淡出 → 暫停 → 回選歌畫面
  function beginSongOutro() {
    if (state.songEnding) return;
    state.songEnding = true;
    coverYtScreen("THE END");

    const p = state.ytPlayer;
    const startVol = typeof p.getVolume === "function" ? p.getVolume() : 100;
    state.ytBaseVolume = startVol;
    const t0 = performance.now();

    clearInterval(outroTimer);
    outroTimer = setInterval(() => {
      const k = Math.min(1, (performance.now() - t0) / OUTRO_FADE_MS);
      try { p.setVolume(Math.round(startVol * (1 - k))); } catch (_) { /* 忽略 */ }
      if (k < 1) return;

      clearInterval(outroTimer);
      outroTimer = null;
      try { p.pauseVideo(); } catch (_) { /* 忽略 */ }
      state.playing = false;
      pauseAllMemberVideos();
      updatePlayButton();
      setTimeout(() => {
        try { p.setVolume(startVol); } catch (_) { /* 忽略 */ } // 暫停後再把音量調回來
        showMenu("select");
      }, 300);
    }, 50);
  }

  function cancelSongOutro() {
    if (outroTimer) {
      clearInterval(outroTimer);
      outroTimer = null;
    }
    if (state.songEnding && state.ytBaseVolume != null && state.ytPlayer &&
        typeof state.ytPlayer.setVolume === "function") {
      state.ytPlayer.setVolume(state.ytBaseVolume);
    }
    state.songEnding = false;
    state.endCovered = false;
  }

  // 由主迴圈每幀呼叫：時間到、而且 MV 仍在播放，才真正淡出待機畫面
  function updateYtReveal(now) {
    if (!ytRevealAt || now < ytRevealAt) return;
    ytRevealAt = 0;
    if (state.clockMode === "youtube" && state.playing && !state.endCovered) {
      el.ledFallback.classList.add("hidden");
    }
  }

  function handleYtStateChange(evt) {
    const S = window.YT.PlayerState;
    if (evt.data === S.PLAYING) {
      state.playing = true;
      state.lastRafTs = performance.now();
      updatePlayButton();
      syncVideosToMaster(true);
      disableYtCaptions();
      setTimeout(disableYtCaptions, 1000);
      // 只有待機畫面還蓋著時才重新計時（播放中途緩衝完恢復播放時不必再蓋一次）
      if (!el.ledFallback.classList.contains("hidden")) revealYtScreen();
    } else if (evt.data === S.BUFFERING) {
      // 還沒露出 MV 前遇到緩衝：取消計時，等再次 PLAYING 重新計算，避免露出讀取圈
      if (!el.ledFallback.classList.contains("hidden")) ytRevealAt = 0;
    } else if (evt.data === S.CUED) {
      coverYtScreen("MV READY · 按 START 開始");
    } else if (evt.data === S.PAUSED || evt.data === S.ENDED) {
      state.playing = false;
      pauseAllMemberVideos();
      updatePlayButton();
      if (state.clockMode === "youtube") {
        coverYtScreen(evt.data === S.ENDED || state.songEnding ? "THE END" : "PAUSED");
      }
      // 選單歌曲播完 → 自動回到選歌畫面
      if (evt.data === S.ENDED && state.currentSong) {
        setTimeout(() => showMenu("select"), 900);
      }
    }
  }

  /**
   * 把影片掛上 LED 螢幕的 YT 播放器
   * opts.autoplay:     true = 立即播放；false = 只載入（cue），等按 START 再播
   * opts.startSeconds: 從 MV 第幾秒開始
   */
  function loadYoutubeVideo(videoId, opts) {
    const o = opts || {};
    if (!videoId) {
      alert("無法解析 YouTube 影片 ID，請確認連結格式。");
      return;
    }
    state.ytVideoId = videoId;
    setClockMode("youtube");
    el.ledStatusText.textContent = "載入 YouTube MV 中...";

    ensureYtPlayer((player) => {
      const req = { videoId: videoId, startSeconds: o.startSeconds || 0 };
      // 先蓋著待機畫面，等 PLAYING 事件才顯示 MV
      coverYtScreen(o.autoplay ? "MV 載入中..." : "MV READY · 按 START 開始");
      if (o.autoplay) player.loadVideoById(req);
      else player.cueVideoById(req);
    });
  }

  function setClockMode(mode) {
    state.clockMode = mode;
    document.querySelectorAll('input[name="clock-mode"]').forEach((r) => {
      r.checked = r.value === mode;
    });
    if (mode === "demo") {
      el.ledFallback.classList.remove("hidden");
      el.ledStatusText.textContent = `DEMO LOOP · 128 BPM (${state.clipDuration}s)`;
      if (state.ytPlayer && state.ytReady && typeof state.ytPlayer.pauseVideo === "function") {
        state.ytPlayer.pauseVideo();
      }
    } else if (
      state.ytReady &&
      typeof state.ytPlayer.getPlayerState === "function" &&
      state.ytPlayer.getPlayerState() === window.YT.PlayerState.PLAYING
    ) {
      revealYtScreen(); // 只有 MV 正在播放時才露出播放器
    }
  }

  /* =========================================================
     4. 播放控制與 4 路角色影片智慧同步
     ========================================================= */
  function startLive() {
    ensureAudioCtx();
    el.startOverlay.classList.add("hidden");
    state.playing = true;
    state.lastRafTs = performance.now();
    updatePlayButton();

    if (state.clockMode === "youtube" && state.ytPlayer && state.ytReady) {
      state.ytPlayer.playVideo();
    }

    for (const id of Object.keys(state.members)) {
      const m = state.members[id];
      if (m.hasVideo) {
        m.video.play().catch(() => {});
      }
    }
    syncVideosToMaster(true);
  }

  function pauseLive() {
    state.playing = false;
    updatePlayButton();
    if (state.clockMode === "youtube" && state.ytPlayer && state.ytReady) {
      state.ytPlayer.pauseVideo();
    }
    pauseAllMemberVideos();
  }

  function pauseAllMemberVideos() {
    for (const id of Object.keys(state.members)) {
      const m = state.members[id];
      if (m.hasVideo) m.video.pause();
    }
  }

  function updatePlayButton() {
    el.btnPlayToggle.textContent = state.playing ? "⏸ 暫停" : "▶ START LIVE";
  }

  function syncVideosToMaster(forceSeek) {
    const activeVideos = Object.values(state.members).filter((m) => m.hasVideo);
    if (activeVideos.length === 0) {
      state.avgDriftMs = 0;
      state.lastPlaybackRate = 1.0;
      return;
    }

    const relTime = state.masterTime - state.clipStart;
    let driftSum = 0;
    let rateSample = 1.0;

    for (const m of activeVideos) {
      const v = m.video;
      if (v.readyState < 2) continue;

      const dur = v.duration && Number.isFinite(v.duration) ? v.duration : state.clipDuration;
      let targetTime = relTime;
      if (state.loopClip && dur > 0) {
        targetTime = ((relTime % dur) + dur) % dur;
      } else {
        targetTime = Math.max(0, Math.min(dur - 0.02, relTime));
      }

      if (relTime < 0 && !state.loopClip) {
        if (!v.paused) v.pause();
        v.currentTime = 0;
        continue;
      }

      if (state.playing && v.paused) {
        v.play().catch(() => {});
      }

      let drift = targetTime - v.currentTime;
      // 處理循環交界點 (例如 7.35s 與 0.02s)
      if (state.loopClip && dur > 1) {
        if (drift > dur * 0.5) drift -= dur;
        else if (drift < -dur * 0.5) drift += dur;
      }

      driftSum += Math.abs(drift) * 1000;

      if (forceSeek || Math.abs(drift) > 0.25) {
        v.currentTime = targetTime;
        v.playbackRate = 1.0;
      } else if (Math.abs(drift) >= 0.04) {
        // 柔性調整播放速度追平誤差，不硬跳畫面
        const adjust = Math.max(-0.07, Math.min(0.07, drift * 0.45));
        v.playbackRate = Number((1.0 + adjust).toFixed(3));
      } else {
        v.playbackRate = 1.0;
      }
      rateSample = v.playbackRate;
    }

    state.avgDriftMs = Math.round(driftSum / activeVideos.length);
    state.lastPlaybackRate = rateSample;
  }

  /* =========================================================
     5. 3D 透視直線花道 Canvas 繪製 & LED 待機視覺
     ========================================================= */
  const runwayCtx = el.runwayCanvas.getContext("2d");
  const ledCtx = el.ledVisCanvas.getContext("2d");

  function resizeCanvases() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const rRect = el.runwaySection.getBoundingClientRect();
    el.runwayCanvas.width = Math.max(1, Math.floor(rRect.width * dpr));
    el.runwayCanvas.height = Math.max(1, Math.floor(rRect.height * dpr));
    runwayCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const lRect = el.ledFallback.getBoundingClientRect();
    el.ledVisCanvas.width = Math.max(1, Math.floor(lRect.width * dpr));
    el.ledVisCanvas.height = Math.max(1, Math.floor(lRect.height * dpr));
    ledCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  /**
   * 3D 花道投影函式
   * progress: 0.0 (花道遠端/主舞台前緣) -> 1.0 (底部發光判定線) -> >1.0 (滑過判定線)
   */
  function projectRunway(progress, W, H) {
    const topY = 0;
    const hitY = H * 0.79;
    const topHalfW = W * 0.19;
    const hitHalfW = W * 0.46;

    // 透視加速曲線：遠慢近快、遠小近大
    const p = progress >= 0
      ? Math.pow(progress, 2.05)
      : -Math.pow(-progress, 2.05);

    const y = topY + (hitY - topY) * p;
    const halfW = topHalfW + (hitHalfW - topHalfW) * p;
    const scale = 0.36 + 0.64 * Math.max(0, p);
    return { y, halfW, scale };
  }

  function renderRunway(chartTime) {
    const W = el.runwaySection.clientWidth;
    const H = el.runwaySection.clientHeight;
    if (W <= 0 || H <= 0) return;

    runwayCtx.clearRect(0, 0, W, H);
    const cx = W * 0.5;
    const top = projectRunway(0, W, H);
    const bot = projectRunway(1.16, W, H);
    const hit = projectRunway(1.0, W, H);

    // 1. 花道底板梯形（暗透玻璃感）
    const floorGrad = runwayCtx.createLinearGradient(0, top.y, 0, bot.y);
    floorGrad.addColorStop(0, "rgba(25, 22, 58, 0.88)");
    floorGrad.addColorStop(0.65, "rgba(14, 15, 36, 0.92)");
    floorGrad.addColorStop(1, "rgba(8, 9, 20, 0.98)");

    runwayCtx.beginPath();
    runwayCtx.moveTo(cx - top.halfW, top.y);
    runwayCtx.lineTo(cx + top.halfW, top.y);
    runwayCtx.lineTo(cx + bot.halfW, bot.y);
    runwayCtx.lineTo(cx - bot.halfW, bot.y);
    runwayCtx.closePath();
    runwayCtx.fillStyle = floorGrad;
    runwayCtx.fill();

    // 2. 動態滾動節拍橫格線（強化往前滑行的速度感）
    const beatSec = 60 / 128;
    const phase = (chartTime % beatSec) / beatSec;
    runwayCtx.lineWidth = 1;
    for (let i = 0; i < 6; i++) {
      const prog = (i + phase) / 5.2;
      if (prog < 0 || prog > 1.15) continue;
      const g = projectRunway(prog, W, H);
      runwayCtx.strokeStyle = `rgba(45, 226, 230, ${(0.05 + prog * 0.14).toFixed(3)})`;
      runwayCtx.beginPath();
      runwayCtx.moveTo(cx - g.halfW, g.y);
      runwayCtx.lineTo(cx + g.halfW, g.y);
      runwayCtx.stroke();
    }

    // 3. 軌道分隔線與按壓光柱
    const lanes = state.laneCount;
    for (let l = 0; l < lanes; l++) {
      const pressed = lanes === 1
        ? state.lanePressed.some(Boolean)
        : state.lanePressed[l];
      if (pressed) {
        const u0 = l / lanes;
        const u1 = (l + 1) / lanes;
        const tx0 = cx - top.halfW + top.halfW * 2 * u0;
        const tx1 = cx - top.halfW + top.halfW * 2 * u1;
        const hx0 = cx - hit.halfW + hit.halfW * 2 * u0;
        const hx1 = cx - hit.halfW + hit.halfW * 2 * u1;

        const beamGrad = runwayCtx.createLinearGradient(0, top.y, 0, hit.y);
        beamGrad.addColorStop(0, "rgba(255, 79, 163, 0)");
        beamGrad.addColorStop(1, lanes === 1 ? "rgba(255, 79, 163, 0.38)" : `${LANE_COLORS[l]}55`);
        runwayCtx.beginPath();
        runwayCtx.moveTo(tx0, top.y);
        runwayCtx.lineTo(tx1, top.y);
        runwayCtx.lineTo(hx1, hit.y);
        runwayCtx.lineTo(hx0, hit.y);
        runwayCtx.closePath();
        runwayCtx.fillStyle = beamGrad;
        runwayCtx.fill();
      }
    }

    if (lanes === 4) {
      runwayCtx.strokeStyle = "rgba(255, 255, 255, 0.16)";
      runwayCtx.lineWidth = 1.2;
      for (let i = 1; i < 4; i++) {
        const u = i / 4;
        runwayCtx.beginPath();
        runwayCtx.moveTo(cx - top.halfW + top.halfW * 2 * u, top.y);
        runwayCtx.lineTo(cx - bot.halfW + bot.halfW * 2 * u, bot.y);
        runwayCtx.stroke();
      }
    }

    // 4. 花道左右發光霓虹護欄
    runwayCtx.save();
    runwayCtx.lineWidth = 3;
    runwayCtx.strokeStyle = "#ff4fa3";
    runwayCtx.shadowColor = "#ff4fa3";
    runwayCtx.shadowBlur = 14;
    runwayCtx.beginPath();
    runwayCtx.moveTo(cx - top.halfW, top.y);
    runwayCtx.lineTo(cx - bot.halfW, bot.y);
    runwayCtx.moveTo(cx + top.halfW, top.y);
    runwayCtx.lineTo(cx + bot.halfW, bot.y);
    runwayCtx.stroke();
    runwayCtx.restore();

    // 5. 底部發光判定線
    runwayCtx.save();
    runwayCtx.lineWidth = 4;
    runwayCtx.strokeStyle = "#2de2e6";
    runwayCtx.shadowColor = "#2de2e6";
    runwayCtx.shadowBlur = 16;
    runwayCtx.beginPath();
    runwayCtx.moveTo(cx - hit.halfW, hit.y);
    runwayCtx.lineTo(cx + hit.halfW, hit.y);
    runwayCtx.stroke();
    runwayCtx.restore();

    // 判定點標記圓環
    for (let l = 0; l < lanes; l++) {
      const centerU = (l + 0.5) / lanes;
      const hx = cx - hit.halfW + hit.halfW * 2 * centerU;
      const r = lanes === 1 ? 16 : 11;
      runwayCtx.beginPath();
      runwayCtx.arc(hx, hit.y, r, 0, Math.PI * 2);
      runwayCtx.strokeStyle = lanes === 1 ? "#ff4fa3" : LANE_COLORS[l];
      runwayCtx.lineWidth = 2.2;
      runwayCtx.stroke();
    }

    // 6. 繪製滑動中的音符 & 自動判定漏拍 (MISS)
    const travel = state.noteTravelSec;
    for (const note of state.notes) {
      if (state.hitMap.has(note.id)) continue;

      const dt = note.time - chartTime; // >0 還沒到, 0 剛好到判定線, <0 過線
      if (dt < -JUDGE_WINDOWS.miss) {
        if (state.playing && !state.recordMode) {
          state.hitMap.add(note.id);
          registerJudgment("miss", { silent: true }); // 漏拍不發聲，只顯示 MISS
        }
        continue;
      }
      if (dt > travel) continue;

      const progress = 1 - dt / travel;
      const proj = projectRunway(progress, W, H);
      const laneIdx = lanes === 1 ? 0 : note.lane;
      const laneW = (proj.halfW * 2) / lanes;
      const nx = cx - proj.halfW + laneW * (laneIdx + 0.5);
      const noteW = Math.max(12, laneW * (lanes === 1 ? 0.55 : 0.78));
      const noteH = Math.max(6, 16 * proj.scale);
      const color = lanes === 1 ? "#ff4fa3" : LANE_COLORS[note.lane];

      runwayCtx.save();
      runwayCtx.shadowColor = color;
      runwayCtx.shadowBlur = 12 * proj.scale;
      runwayCtx.fillStyle = color;
      roundRect(runwayCtx, nx - noteW / 2, proj.y - noteH / 2, noteW, noteH, noteH / 2);
      runwayCtx.fill();

      // 音符中央高光條
      runwayCtx.fillStyle = "#ffffff";
      runwayCtx.globalAlpha = 0.85;
      roundRect(runwayCtx, nx - noteW * 0.34, proj.y - noteH * 0.22, noteW * 0.68, noteH * 0.44, noteH * 0.22);
      runwayCtx.fill();
      runwayCtx.restore();
    }

    // 7. 打擊光環擴散特效
    const now = performance.now();
    state.hitBursts = state.hitBursts.filter((b) => now - b.start < 260);
    for (const b of state.hitBursts) {
      const k = (now - b.start) / 260;
      const centerU = (b.lane + 0.5) / lanes;
      const hx = cx - hit.halfW + hit.halfW * 2 * centerU;
      runwayCtx.save();
      runwayCtx.strokeStyle = b.color;
      runwayCtx.globalAlpha = 1 - k;
      runwayCtx.lineWidth = 3.5 * (1 - k);
      runwayCtx.beginPath();
      runwayCtx.arc(hx, hit.y, 12 + k * 34, 0, Math.PI * 2);
      runwayCtx.stroke();
      runwayCtx.restore();
    }
  }

  function roundRect(ctx, x, y, w, h, r) {
    const rad = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rad, y);
    ctx.arcTo(x + w, y, x + w, y + h, rad);
    ctx.arcTo(x + w, y + h, x, y + h, rad);
    ctx.arcTo(x, y + h, x, y, rad);
    ctx.arcTo(x, y, x + w, y, rad);
    ctx.closePath();
  }

  function renderLedVisualizer(timeSec) {
    if (el.ledFallback.classList.contains("hidden")) return;
    const W = el.ledFallback.clientWidth;
    const H = el.ledFallback.clientHeight;
    if (W <= 0 || H <= 0) return;

    ledCtx.clearRect(0, 0, W, H);
    const bars = 28;
    const barW = W / bars;
    for (let i = 0; i < bars; i++) {
      const wave =
        Math.sin(timeSec * 6.5 + i * 0.45) * 0.5 +
        Math.cos(timeSec * 13.4 - i * 0.25) * 0.3 +
        0.5;
      const h = (0.14 + Math.max(0, wave) * 0.55) * H;
      const grad = ledCtx.createLinearGradient(0, H, 0, H - h);
      grad.addColorStop(0, "rgba(255, 79, 163, 0.55)");
      grad.addColorStop(1, "rgba(45, 226, 230, 0.25)");
      ledCtx.fillStyle = grad;
      ledCtx.fillRect(i * barW + 2, H - h, barW - 4, h);
    }
  }

  /* =========================================================
     6. 舞者走位更新（Y-Sorting + C 位打光）
     ========================================================= */
  function updateDancersTransform(timeSec) {
    const stageW = el.dancersLayer.clientWidth;
    const stageH = el.dancersLayer.clientHeight;
    if (stageW <= 0 || stageH <= 0) return;

    const poses = window.FormationEngine.evaluate(
      timeSec,
      state.formationEnabled,
      state.clipDuration
    );

    // 內建 SVG 示範舞者的輕微踩拍律動（載入真實影片後關閉，避免干擾原腳步）
    const beatPulse = Math.abs(Math.sin(timeSec * Math.PI * (128 / 60)));

    for (const id of Object.keys(state.members)) {
      const m = state.members[id];
      const p = poses[id];
      if (!p) continue;

      const xPx = (p.x / 100) * stageW;
      const yPx = (p.y / 100) * stageH;
      const finalScale = p.scale * state.dancerScaleMult;
      const bobY = !m.hasVideo && state.playing ? -beatPulse * 5 : 0;

      m.slot.style.zIndex = String(p.zIndex);
      m.slot.style.transform = `translate3d(${xPx.toFixed(1)}px, ${(yPx + bobY).toFixed(1)}px, 0) translate(-50%, -100%) scale(${finalScale.toFixed(3)})`;
      m.slot.style.filter = `brightness(${p.brightness.toFixed(2)})`;
    }
  }

  /* =========================================================
     7. 輸入判定與即時錄譜
     ========================================================= */
  // 循環譜面的基準時間（Demo 模式從 0 起算；YouTube 循環模式從舞段起點 clipStart 起算）
  function chartBase() {
    const raw = state.masterTime + state.offsetMs / 1000;
    return state.clockMode === "demo" ? raw : raw - state.clipStart;
  }

  function getEffectiveChartTime() {
    const dur = state.clipDuration;
    if ((state.clockMode === "demo" || state.loopChart) && dur > 0) {
      const base = chartBase();
      return ((base % dur) + dur) % dur;
    }
    return state.masterTime + state.offsetMs / 1000;
  }

  // 重置判定紀錄：目前時間點以前的音符視為已過，避免跳轉時瞬間噴出一堆 MISS
  function clearHitsAt() {
    state.hitMap.clear();
    const t = getEffectiveChartTime();
    for (const n of state.notes) {
      if (n.time < t) state.hitMap.add(n.id);
    }
    state.lastLoopCycle = Math.floor(chartBase() / state.clipDuration);
  }

  function triggerLanePress(rawLane) {
    ensureAudioCtx();
    const lane = state.laneCount === 1 ? 0 : rawLane;
    state.lanePressed[lane] = true;
    updateTouchPadVisual(lane, true);

    const chartTime = getEffectiveChartTime();

    // 若開啟即時錄譜模式：記錄拍點時間
    if (state.recordMode && state.playing) {
      const newNote = {
        id: Date.now() + Math.random(),
        time: Number(chartTime.toFixed(3)),
        lane: lane
      };
      state.notes.push(newNote);
      state.notes = window.BeatmapStore.normalizeChart(state.notes);
      refreshChartTextarea();
      playHitSfx("perfect");
      state.hitBursts.push({
        lane,
        color: "#ff4fa3",
        start: performance.now()
      });
      showJudgePopup("REC +1", "judge-perfect");
      return;
    }

    // 正常遊玩判定：尋找該軌道最接近判定線的未擊中音符
    let bestNote = null;
    let bestAbs = Infinity;
    for (const note of state.notes) {
      if (state.hitMap.has(note.id)) continue;
      if (state.laneCount === 4 && note.lane !== lane) continue;
      const absDiff = Math.abs(note.time - chartTime);
      if (absDiff <= JUDGE_WINDOWS.miss && absDiff < bestAbs) {
        bestAbs = absDiff;
        bestNote = note;
      }
    }

    if (!bestNote) {
      playTone(300, 0.03, 0.04, "sine");
      return;
    }

    state.hitMap.add(bestNote.id);
    let grade = "miss";
    if (bestAbs <= JUDGE_WINDOWS.perfect) grade = "perfect";
    else if (bestAbs <= JUDGE_WINDOWS.great) grade = "great";
    else if (bestAbs <= JUDGE_WINDOWS.good) grade = "good";

    registerJudgment(grade);
    if (grade !== "miss") {
      state.hitBursts.push({
        lane,
        color: state.laneCount === 1 ? "#ff4fa3" : LANE_COLORS[lane],
        start: performance.now()
      });
    }
  }

  function triggerLaneRelease(rawLane) {
    const lane = state.laneCount === 1 ? 0 : rawLane;
    state.lanePressed[lane] = false;
    updateTouchPadVisual(lane, false);
  }

  function registerJudgment(grade, opts) {
    if (!(opts && opts.silent)) playHitSfx(grade);
    if (grade === "perfect") {
      state.score += 1000;
      state.combo += 1;
      showJudgePopup("PERFECT", "judge-perfect");
    } else if (grade === "great") {
      state.score += 700;
      state.combo += 1;
      showJudgePopup("GREAT", "judge-great");
    } else if (grade === "good") {
      state.score += 400;
      state.combo += 1;
      showJudgePopup("GOOD", "judge-good");
    } else {
      state.combo = 0;
      showJudgePopup("MISS", "judge-miss");
    }

    el.hudScore.textContent = String(state.score).padStart(6, "0");
    el.hudCombo.textContent = String(state.combo);
    el.hudComboWrap.classList.toggle("show", state.combo >= 2);
  }

  function showJudgePopup(text, cls) {
    el.judgePopup.textContent = text;
    el.judgePopup.className = `judge-popup show ${cls}`;
    clearTimeout(judgeTimer);
    judgeTimer = setTimeout(() => {
      el.judgePopup.classList.remove("show");
    }, 280);
  }

  function updateTouchPadVisual(lane, active) {
    const btn = el.touchPads.querySelector(`.touch-pad[data-lane="${lane}"]`);
    if (btn) btn.classList.toggle("pressed", active);
  }

  /* =========================================================
     8. 主動畫迴圈 (60fps+ 平滑時鐘)
     ========================================================= */
  function mainLoop(now) {
    requestAnimationFrame(mainLoop);

    // 計算 FPS
    state.fpsFrames += 1;
    if (now - state.fpsLastTs >= 500) {
      state.fps = Math.round((state.fpsFrames * 1000) / (now - state.fpsLastTs));
      state.fpsFrames = 0;
      state.fpsLastTs = now;
      el.hudFps.textContent = String(state.fps);
    }

    // 推進主時鐘
    if (state.playing) {
      const dt = Math.min(0.1, Math.max(0, (now - state.lastRafTs) / 1000));
      state.masterTime += dt;

      if (state.clockMode === "demo") {
        // Demo 模式節拍器
        const dur = Math.max(1, state.clipDuration);
        const beatIdx = Math.floor((state.masterTime % dur) / (60 / 128));
        if (beatIdx !== state.lastBeatIndex) {
          state.lastBeatIndex = beatIdx;
          playMetronomeTick(beatIdx % 4 === 0);
        }
      } else if (state.ytPlayer && state.ytReady && typeof state.ytPlayer.getCurrentTime === "function") {
        // 每 200ms 與 YouTube 播放器比對一次平滑校正，不跳針
        if (now - state.lastSyncCheckTs >= 200) {
          const ytTime = state.ytPlayer.getCurrentTime();
          const diff = ytTime - state.masterTime;
          if (state.currentSong && !state.songEnding) {
            // 進入片尾推薦卡片時段：蓋住大螢幕、顯示歌名，音樂繼續播
            if (!state.endCovered && ytTime >= getEndCoverTime(state.ytPlayer)) {
              state.endCovered = true;
              coverYtScreen(`♪ ${state.currentSong.title || ""}`);
            }
            // songs.js 有指定 end 才提早淡出收尾
            if (ytTime >= getSongEndTime()) beginSongOutro();
          }
          if (Math.abs(diff) > 0.22) {
            state.masterTime = ytTime;
            clearHitsAt();
          } else {
            state.masterTime += diff * 0.25;
          }
        }
      }

      // 循環譜面（Demo 模式，或選單歌曲沒附專屬譜面時）：每跑完一輪重置判定
      if ((state.clockMode === "demo" || state.loopChart) && state.clipDuration > 0) {
        const cycle = Math.floor(chartBase() / state.clipDuration);
        if (cycle !== state.lastLoopCycle) {
          state.lastLoopCycle = cycle;
          state.hitMap.clear();
        }
      }

      // 每 200ms 校正 4 支影片同步誤差
      if (now - state.lastSyncCheckTs >= 200) {
        state.lastSyncCheckTs = now;
        syncVideosToMaster(false);
      }
    }
    state.lastRafTs = now;
    updateYtReveal(now);

    const chartTime = getEffectiveChartTime();
    updateDancersTransform(state.masterTime - state.clipStart);
    renderRunway(chartTime);
    renderLedVisualizer(state.masterTime);

    el.hudTime.textContent = `${chartTime.toFixed(3)}s`;
    el.hudDrift.textContent = `${state.avgDriftMs} ms`;
    el.hudRate.textContent = `${state.lastPlaybackRate.toFixed(2)}x`;
  }

  /* =========================================================
     9. 事件綁定（排版切換、檔案載入、觸控、鍵盤、控制台）
     ========================================================= */
  function refreshChartTextarea() {
    el.txtChartJson.value = window.BeatmapStore.serializeChart(state.notes);
    el.valNoteCount.textContent = String(state.notes.length);
  }

  function rebuildTouchPads() {
    if (state.laneCount === 1) {
      el.touchPads.classList.add("single-lane");
      el.touchPads.innerHTML = `<button class="touch-pad" data-lane="0" type="button"><span>TAP / SPACE</span></button>`;
    } else {
      el.touchPads.classList.remove("single-lane");
      el.touchPads.innerHTML = `
        <button class="touch-pad" data-lane="0" type="button"><span>D</span></button>
        <button class="touch-pad" data-lane="1" type="button"><span>F</span></button>
        <button class="touch-pad" data-lane="2" type="button"><span>J</span></button>
        <button class="touch-pad" data-lane="3" type="button"><span>K</span></button>
      `;
    }

    el.touchPads.querySelectorAll(".touch-pad").forEach((btn) => {
      const lane = parseInt(btn.dataset.lane, 10);
      btn.addEventListener("touchstart", (e) => {
        e.preventDefault();
        triggerLanePress(lane);
      }, { passive: false });
      btn.addEventListener("touchend", (e) => {
        e.preventDefault();
        triggerLaneRelease(lane);
      }, { passive: false });
      btn.addEventListener("mousedown", (e) => {
        e.preventDefault();
        triggerLanePress(lane);
      });
      btn.addEventListener("mouseup", () => triggerLaneRelease(lane));
      btn.addEventListener("mouseleave", () => triggerLaneRelease(lane));
    });
  }

  /* =========================================================
     9-1. 開始畫面 & 音樂選單
     ========================================================= */
  const SONG_COLORS = ["#ff4fa3", "#2de2e6", "#b388ff", "#ffd166"];

  function escapeHtml(s) {
    return String(s ?? "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
  }

  function songVideoId(song) {
    return song ? parseYoutubeId(song.url || "") : "";
  }

  function isMenuOpen() {
    return !el.startOverlay.classList.contains("hidden");
  }

  function isScreen(name) {
    const screen = name === "title" ? el.screenTitle : el.screenSelect;
    return isMenuOpen() && screen.classList.contains("active");
  }

  function showMenu(which) {
    el.startOverlay.classList.remove("hidden");
    el.screenTitle.classList.toggle("active", which === "title");
    el.screenSelect.classList.toggle("active", which === "select");

    if (which === "select") {
      ensureYtPlayer(); // 先在背景準備好 YT 播放器
      if (state.selectedSong < 0) {
        const first = state.songs.findIndex((s) => songVideoId(s));
        if (first >= 0) selectSong(first);
      }
      const card = el.songList.querySelector(".song-card.selected");
      if (card) card.focus();
    } else {
      el.btnTitleStart.focus();
    }
  }

  function hideMenu() {
    el.startOverlay.classList.add("hidden");
  }

  function renderSongList() {
    el.songList.innerHTML = "";
    let playable = 0;

    state.songs.forEach((song, i) => {
      const vid = songVideoId(song);
      if (vid) playable += 1;
      const level = Math.max(0, Math.min(5, parseInt(song.level, 10) || 0));
      const color = song.color || SONG_COLORS[i % SONG_COLORS.length];

      const card = document.createElement("button");
      card.type = "button";
      card.className = "song-card" + (i === state.selectedSong ? " selected" : "");
      card.dataset.index = String(i);
      card.disabled = !vid;
      card.setAttribute("role", "option");
      card.setAttribute("aria-selected", String(i === state.selectedSong));
      card.innerHTML = `
        <div class="song-thumb" style="--c:${escapeHtml(color)}">
          ${vid ? `<img src="https://i.ytimg.com/vi/${vid}/mqdefault.jpg" alt="" loading="lazy" />` : ""}
          <span class="song-no">${String(i + 1).padStart(2, "0")}</span>
        </div>
        <div class="song-info">
          <div class="song-title">${escapeHtml(song.title || "未命名歌曲")}</div>
          <div class="song-artist">${escapeHtml(song.artist || "")}</div>
          <div class="song-meta">
            ${vid
              ? (song.bpm ? `<span class="song-tag">${escapeHtml(song.bpm)} BPM</span>` : "")
              : `<span class="song-tag tag-warn">尚未設定網址</span>`}
            ${level ? `<span class="song-stars">${"★".repeat(level)}${"☆".repeat(5 - level)}</span>` : ""}
          </div>
        </div>
      `;

      const img = card.querySelector("img");
      if (img) img.addEventListener("error", () => img.remove()); // 縮圖抓不到就顯示色塊

      card.addEventListener("click", () => selectSong(i));
      card.addEventListener("dblclick", () => startSong(i));
      el.songList.appendChild(card);
    });

    el.selectCount.textContent = `${playable} 首`;
    updateSelectFooter();
  }

  // 選取歌曲：帶入該首的網址並把 MV 預先載入 LED 螢幕（不播放）
  function selectSong(index) {
    const song = state.songs[index];
    const vid = songVideoId(song);
    if (!vid) return;

    state.selectedSong = index;
    el.songList.querySelectorAll(".song-card").forEach((c) => {
      const on = Number(c.dataset.index) === index;
      c.classList.toggle("selected", on);
      c.setAttribute("aria-selected", String(on));
      if (on) c.scrollIntoView({ block: "nearest" });
    });

    el.inputYtUrl.value = song.url;
    loadYoutubeVideo(vid, { autoplay: false, startSeconds: Math.max(0, Number(song.start) || 0) });
    updateSelectFooter();
  }

  function moveSelection(dir) {
    const n = state.songs.length;
    if (!n) return;
    let i = state.selectedSong < 0 ? (dir > 0 ? -1 : 0) : state.selectedSong;
    for (let step = 0; step < n; step++) {
      i = (i + dir + n) % n;
      if (songVideoId(state.songs[i])) {
        selectSong(i);
        const card = el.songList.querySelector(`.song-card[data-index="${i}"]`);
        if (card) card.focus();
        return;
      }
    }
  }

  function updateSelectFooter() {
    const song = state.songs[state.selectedSong];
    if (song && songVideoId(song)) {
      el.selectNowTitle.textContent = song.artist ? `${song.title} · ${song.artist}` : song.title;
      el.btnSongStart.disabled = false;
    } else {
      el.selectNowTitle.textContent = "請選擇歌曲";
      el.btnSongStart.disabled = true;
    }
  }

  // 開始演出選定的歌曲：YT 播放器從指定秒數播放該首 MV，分數與判定歸零
  function startSong(index) {
    const song = state.songs[index];
    const videoId = songVideoId(song);
    if (!videoId) return;

    ensureAudioCtx();
    cancelSongOutro();
    state.playing = false;
    pauseAllMemberVideos();
    updatePlayButton();

    state.selectedSong = index;
    state.currentSong = song;
    state.clipStart = Math.max(0, Number(song.start) || 0);
    el.inputClipStart.value = state.clipStart;
    el.inputYtUrl.value = song.url;

    // 有專屬譜面就用；沒有就用 Demo 譜面依舞段長度循環
    if (Array.isArray(song.chart) && song.chart.length > 0) {
      state.notes = window.BeatmapStore.normalizeChart(song.chart);
      state.loopChart = false;
    } else {
      state.notes = window.BeatmapStore.createDemoChart();
      state.loopChart = true;
    }
    refreshChartTextarea();

    state.masterTime = state.clipStart;
    state.score = 0;
    state.combo = 0;
    clearHitsAt();
    el.hudScore.textContent = "000000";
    el.hudCombo.textContent = "0";
    el.hudComboWrap.classList.remove("show");

    hideMenu();
    loadYoutubeVideo(videoId, { autoplay: true, startSeconds: state.clipStart });
  }

  function handleMenuKey(e) {
    const k = e.key;
    if (isScreen("title")) {
      if (k === "Enter" || k === " ") {
        e.preventDefault();
        ensureAudioCtx();
        showMenu("select");
      }
    } else if (isScreen("select")) {
      if (k === "ArrowDown" || k === "ArrowRight") {
        e.preventDefault();
        moveSelection(1);
      } else if (k === "ArrowUp" || k === "ArrowLeft") {
        e.preventDefault();
        moveSelection(-1);
      } else if (k === "Enter") {
        e.preventDefault();
        startSong(state.selectedSong);
      } else if (k === "Escape" || k === "Backspace") {
        e.preventDefault();
        showMenu("title");
      }
    }
  }

  function bindEvents() {
    // 開始畫面 / 音樂選單
    el.btnTitleStart.addEventListener("click", () => {
      ensureAudioCtx();
      showMenu("select");
    });
    el.btnQuickDemo.addEventListener("click", () => {
      state.currentSong = null;
      state.loopChart = false;
      setClockMode("demo");
      startLive();
    });
    el.btnSelectBack.addEventListener("click", () => showMenu("title"));
    el.btnSongStart.addEventListener("click", () => startSong(state.selectedSong));
    el.btnSongMenu.addEventListener("click", () => {
      pauseLive();
      el.drawer.classList.remove("open");
      showMenu("select");
    });

    // 雙排版切換
    el.btnModeMobile.addEventListener("click", () => {
      el.body.classList.remove("mode-theater");
      el.body.classList.add("mode-mobile");
      el.btnModeMobile.classList.add("active");
      el.btnModeTheater.classList.remove("active");
      setTimeout(resizeCanvases, 60);
    });
    el.btnModeTheater.addEventListener("click", () => {
      el.body.classList.remove("mode-mobile");
      el.body.classList.add("mode-theater");
      el.btnModeTheater.classList.add("active");
      el.btnModeMobile.classList.remove("active");
      setTimeout(resizeCanvases, 60);
    });

    // 播放 / 暫停
    el.btnPlayToggle.addEventListener("click", () => {
      if (state.playing) pauseLive();
      else if (isScreen("select") && state.selectedSong >= 0) startSong(state.selectedSong);
      else startLive();
    });

    // 控制台抽屜開關與分頁
    el.btnDrawerToggle.addEventListener("click", () => el.drawer.classList.toggle("open"));
    el.btnDrawerClose.addEventListener("click", () => el.drawer.classList.remove("open"));
    document.querySelectorAll(".tab-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
        document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
        btn.classList.add("active");
        document.getElementById(btn.dataset.tab).classList.add("active");
      });
    });

    // 載入影片 (x4 與個別上傳)
    const triggerX4 = () => el.fileVideoX4.click();
    el.btnLoadX4.addEventListener("click", triggerX4);
    el.btnDrawerLoadX4.addEventListener("click", triggerX4);
    el.fileVideoX4.addEventListener("change", (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      for (const m of window.KPOP_MEMBERS) {
        const blobUrl = URL.createObjectURL(file);
        attachVideoSource(m.id, blobUrl, true);
      }
      e.target.value = "";
    });

    document.querySelectorAll(".btn-load-one").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.pendingSingleMemberId = btn.dataset.member;
        el.fileVideoSingle.click();
      });
    });
    el.fileVideoSingle.addEventListener("change", (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const blobUrl = URL.createObjectURL(file);
      attachVideoSource(state.pendingSingleMemberId, blobUrl, true);
      e.target.value = "";
    });

    // 同步 / YouTube 控制
    document.querySelectorAll('input[name="clock-mode"]').forEach((r) => {
      r.addEventListener("change", () => setClockMode(r.value));
    });
    el.btnLoadYt.addEventListener("click", () => {
      const id = parseYoutubeId(el.inputYtUrl.value);
      state.currentSong = null;
      state.loopChart = false;
      loadYoutubeVideo(id, { autoplay: false });
    });
    el.inputClipStart.addEventListener("input", () => {
      state.clipStart = parseFloat(el.inputClipStart.value) || 0;
      syncVideosToMaster(true);
    });
    el.inputClipDuration.addEventListener("input", () => {
      state.clipDuration = Math.max(0.5, parseFloat(el.inputClipDuration.value) || 7.375);
    });
    el.rangeOffset.addEventListener("input", () => {
      state.offsetMs = parseInt(el.rangeOffset.value, 10) || 0;
      el.valOffset.textContent = `${state.offsetMs > 0 ? "+" : ""}${state.offsetMs} ms`;
    });
    el.chkLoopClip.addEventListener("change", () => {
      state.loopClip = el.chkLoopClip.checked;
      for (const m of Object.values(state.members)) {
        m.video.loop = state.loopClip;
      }
    });
    el.chkSfx.addEventListener("change", () => {
      state.sfxEnabled = el.chkSfx.checked;
      // 關閉音效時暫停整個音訊引擎，開啟時再恢復
      if (state.audioCtx) {
        if (state.sfxEnabled) state.audioCtx.resume().catch(() => {});
        else state.audioCtx.suspend().catch(() => {});
      }
    });

    // 舞者 / 舞台設定
    el.selectBlend.addEventListener("change", () => {
      state.blendMode = el.selectBlend.value;
      for (const m of Object.values(state.members)) {
        m.video.classList.toggle("blend-screen", state.blendMode === "screen");
      }
    });
    el.selectLanes.addEventListener("change", () => {
      state.laneCount = parseInt(el.selectLanes.value, 10) === 1 ? 1 : 4;
      rebuildTouchPads();
    });
    el.rangeDancerScale.addEventListener("input", () => {
      const pct = parseInt(el.rangeDancerScale.value, 10) || 100;
      state.dancerScaleMult = pct / 100;
      el.valDancerScale.textContent = `${pct}%`;
    });
    el.rangeNoteSpeed.addEventListener("input", () => {
      state.noteTravelSec = parseFloat(el.rangeNoteSpeed.value) || 1.35;
      el.valNoteSpeed.textContent = `${state.noteTravelSec.toFixed(2)}s`;
    });
    el.chkFormation.addEventListener("change", () => {
      state.formationEnabled = el.chkFormation.checked;
    });

    // 譜面 / 錄譜控制
    el.chkRecordMode.addEventListener("change", () => {
      state.recordMode = el.chkRecordMode.checked;
    });
    el.btnChartClear.addEventListener("click", () => {
      state.notes = [];
      state.hitMap.clear();
      refreshChartTextarea();
    });
    el.btnChartReset.addEventListener("click", () => {
      state.notes = window.BeatmapStore.createDemoChart();
      state.hitMap.clear();
      refreshChartTextarea();
    });
    el.btnChartCopy.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(el.txtChartJson.value);
        el.btnChartCopy.textContent = "已複製！";
        setTimeout(() => (el.btnChartCopy.textContent = "複製 JSON"), 1200);
      } catch {
        el.txtChartJson.select();
        document.execCommand("copy");
      }
    });
    el.btnChartApply.addEventListener("click", () => {
      try {
        const parsed = JSON.parse(el.txtChartJson.value);
        state.notes = window.BeatmapStore.normalizeChart(parsed);
        state.hitMap.clear();
        refreshChartTextarea();
        showJudgePopup("CHART OK", "judge-great");
      } catch (err) {
        alert("JSON 格式有誤：" + err.message);
      }
    });

    // 鍵盤操作（輸入框焦點時不觸發）
    window.addEventListener("keydown", (e) => {
      const tag = (e.target && e.target.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;

      // 選單開啟時，鍵盤改用來操作選單
      if (isMenuOpen()) {
        handleMenuKey(e);
        return;
      }
      if (e.repeat) return;

      const key = e.key.toLowerCase();
      if (state.laneCount === 1 && (key === " " || key in KEY_TO_LANE)) {
        e.preventDefault();
        triggerLanePress(0);
      } else if (key in KEY_TO_LANE) {
        e.preventDefault();
        triggerLanePress(KEY_TO_LANE[key]);
      }
    });

    window.addEventListener("keyup", (e) => {
      const key = e.key.toLowerCase();
      if (state.laneCount === 1 && (key === " " || key in KEY_TO_LANE)) {
        triggerLaneRelease(0);
      } else if (key in KEY_TO_LANE) {
        triggerLaneRelease(KEY_TO_LANE[key]);
      }
    });

    window.addEventListener("resize", resizeCanvases);
  }

  /* =========================================================
     10. 啟動引擎
     ========================================================= */
  initDancers();
  initCrowdLightsticks();
  rebuildTouchPads();
  refreshChartTextarea();
  renderSongList();
  bindEvents();
  resizeCanvases();
  requestAnimationFrame(mainLoop);
})();

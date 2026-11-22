/**
 * js/love-options/song.js
 * Love Options（BESTie）的基本設定
 *
 * 這首歌的檔案依類型分開放：
 *   js/love-options/song.js          ← 基本設定（這支）
 *   js/love-options/formation.js     ← 走位
 *   css/love-options/style.css       ← 這首歌專屬的樣式
 *   assets/images/love-options/      ← 圖片（開頭 / 片尾蓋板標誌圖）
 *   assets/videos/love-options/      ← 4 人舞蹈影片 m1~m4.mp4
 *
 * 欄位說明請看 js/songs.js 開頭。
 */
window.SONG_DATA = window.SONG_DATA || {};

window.SONG_DATA["love-options"] = {
  id: "love-options",
  title: "Love Options",
  artist: "BESTie",
  url: "https://www.youtube.com/watch?v=NPqtL1dtrlA&list=RDNPqtL1dtrlA&start_radio=1",
  start: 0,
  bpm: 128,
  level: 2,

  // 開頭 / 片尾蓋板
  introRevealAt: 2,  // 第 2 秒的大聲響之後，開頭標誌圖慢慢淡出進入 MV
  endCoverAt: 187.8, // 白底片尾圖花 2 秒淡入，在 3:10 推薦卡片跳出前完全蓋上
  coverImage: "assets/images/love-options/cover.png" // 開頭載入 + 片尾共用

  // 走位在 js/love-options/formation.js

  // 舞者影片準備好後，放進 assets/videos/love-options/，再把下面這段取消註解：
  // , members: {
  //     m1: "assets/videos/love-options/m1.mp4",
  //     m2: "assets/videos/love-options/m2.mp4",
  //     m3: "assets/videos/love-options/m3.mp4",
  //     m4: "assets/videos/love-options/m4.mp4"
  //   },
  //   memberKey: "green",
  //   memberOffset: 0
};

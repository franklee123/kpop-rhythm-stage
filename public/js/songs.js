/**
 * songs.js
 * 音樂選單歌曲清單 —— 新增 / 修改歌曲只要改這支檔案
 *
 * 每首歌的欄位：
 * - title:  歌名（必填）
 * - artist: 歌手 / 團體（選填）
 * - url:    YouTube 網址或 11 碼影片 ID（必填；留空字串的歌會顯示「尚未設定網址」且無法選取）
 *           支援 watch?v=、youtu.be/、shorts/、embed/ 等格式
 * - start:  從 MV 第幾秒開始播（選填，預設 0；同時當作舞段起始秒數 clipStart）
 * - end:    播到第幾秒就淡出收尾（選填）。沒填就完整播到影片最後
 * - endCover: 影片最後幾秒要把大螢幕蓋住（選填，預設 20）。用來遮住 YouTube 片尾的
 *           推薦影片卡片，音樂照常播放。卡片出現得比較晚就填小一點，填 0 = 不蓋
 * - endCoverAt: 直接指定從 MV 第幾秒開始蓋住大螢幕（選填，有填就優先於 endCover）
 * - coverImage: 白底蓋板圖（選填）。開頭載入時先用它擋著、MV 開始後慢慢淡出；
 *           片尾蓋住推薦卡片時也顯示它。沒填就顯示 LED 待機動畫
 *           圖檔放在 public/assets/images/ 裡，這裡填相對路徑
 * - introImage / endImage: 想讓開頭和片尾用不同圖時再分別指定（選填，優先於 coverImage）
 * - introRevealAt: 開頭標誌圖播到 MV 第幾秒才開始淡出（選填，例如音樂第一個重拍的秒數）。
 *           沒填就在播放圖示消失後淡出。選歌時 MV 會先在選單後面靜音預熱，讓 YouTube
 *           中央的播放圖示提早消失，所以開演後可以在很前面的秒數就淡出
 * - bpm:    選單上顯示用的 BPM（選填）
 * - level:  選單上顯示的難度星數 1~5（選填）
 * - color:  沒有縮圖時的卡片底色（選填）
 * - chart:  這首歌專用譜面（選填）。格式同 beatmap.js：[{ time: 秒數, lane: 0~3 }, ...]
 *           time 以「MV 實際秒數」計算。沒填的話會用 Demo 譜面依舞段長度循環。
 *           錄法：開始這首歌 → 控制台「譜面 / 錄譜」勾選錄譜模式 → 邊聽邊敲 D/F/J/K
 *           → 按「複製 JSON」貼到這裡
 *
 * ── 4 人舞蹈影片（選填）──
 * - members:      每個人的整首舞蹈影片，例如 { m1: "assets/videos/love-options/m1.mp4", ... }
 *                 影片放在 public/assets/videos/ 裡。選歌時就先載入，跟 MV 同步播放、不循環
 * - memberKey:    影片背景去除方式（選填，預設 "green"）
 *                 "green" = 綠幕背景 MP4（推薦）、"screen" = 黑底 MP4、"normal" = 透明 WebM
 * - memberOffset: 舞者影片的第 0 秒對應 MV 的第幾秒（選填，預設 0 = 跟 MV 同時開始）
 *                 例如舞者影片是從 MV 第 3.5 秒的地方開始剪的，就填 3.5
 * - formation:    整首歌的走位時間軸（選填）。格式同 formations.js 的 FORMATION_TIMELINE，
 *                 time 以 MV 實際秒數計算、整首不循環：
 *                 [{ time: 0, easing: "easeInOutQuad",
 *                    members: { m1: { x, y, scale }, m2: {...}, m3: {...}, m4: {...} } }, ...]
 *                 沒填就用 formations.js 的示範走位循環
 */
window.SONG_LIST = [
  {
    title: "Love Options",
    artist: "BESTie",
    url: "https://www.youtube.com/watch?v=NPqtL1dtrlA&list=RDNPqtL1dtrlA&start_radio=1",
    start: 0,
    bpm: 128,
    level: 2,
    introRevealAt: 2,  // 第 2 秒的大聲響之後，開頭標誌圖慢慢淡出進入 MV
    endCoverAt: 187.8, // 白底片尾圖花 2 秒淡入，在 3:10 推薦卡片跳出前完全蓋上
    coverImage: "assets/images/bestie-love-options-end.png", // 開頭載入 + 片尾共用

    // 走位：參考 SBS 舞台版影片的隊形變化（[到位秒數, 隊形名稱]，隊形定義在 formations.js）
    // 舞台版結尾 POSE 跟 MV 一樣在 3:10，先假設兩邊時間軸對齊；整體對不上就調 offset
    formation: window.FormationEngine.fromPlan([
      [0,     "PAIRS"],         // 0:00 兩兩一組
      [9,     "LINE"],          // 0:09 一字排開
      [23.5,  "V_CENTER"],      // 0:23 V 字
      [33.5,  "STAGGER"],       // 0:33 前後交錯
      [53.5,  "CHORUS"],        // 0:53 副歌拉開站前排
      [73.5,  "RIGHT"],         // 1:13 整體偏右
      [83.5,  "LEFT"],          // 1:23 集中左半邊
      [98.5,  "DIAMOND"],       // 1:38 菱形，M1 站 C 位
      [108.5, "CLUSTER"],       // 1:48 往中間聚集
      [113.5, "LINE_SWAP"],     // 1:53 一字排開（交叉換位）
      [123.5, "RIGHT_CLUSTER"], // 2:03 集中右半邊
      [133.5, "FRONT"],         // 2:13 全員站到最前排
      [143.5, "LINE_C"],        // 2:23 一字排開
      [148.5, "WIDE"],          // 2:28 寬橫排
      [168.5, "RIGHT_LINE"],    // 2:48 中間偏右橫排
      [188.5, "FINAL"]          // 3:08 結尾聚中間擺 POSE
    ], { moveSec: 1.6, offset: 0 })

    // 舞者影片準備好後，放進 public/assets/videos/love-options/，再把下面這段取消註解：
    // , members: {
    //     m1: "assets/videos/love-options/m1.mp4",
    //     m2: "assets/videos/love-options/m2.mp4",
    //     m3: "assets/videos/love-options/m3.mp4",
    //     m4: "assets/videos/love-options/m4.mp4"
    //   },
    //   memberKey: "green",
    //   memberOffset: 0
  },
  {
    title: "歌曲 2",
    artist: "請在 js/songs.js 填入網址",
    url: ""
  },
  {
    title: "歌曲 3",
    artist: "請在 js/songs.js 填入網址",
    url: ""
  }
];

/**
 * songs.js
 * 音樂選單的歌單（決定選單裡有哪些歌、排什麼順序）
 *
 * 每首歌的設定依檔案類型分開放，以 Love Options 為例：
 *   js/love-options/song.js          基本設定（歌名、網址、蓋板時間、舞者影片…）
 *   js/love-options/formation.js     走位
 *   css/love-options/style.css       這首歌專屬的樣式
 *   assets/images/love-options/      圖片
 *   assets/videos/love-options/      4 人舞蹈影片
 * 新增一首歌：照同樣方式建立各類型的資料夾，在 index.html 加上它的 <script> / <link>，
 * 再把它加進最下面的 SONG_LIST。
 *
 * 每首歌的欄位：
 * - id:     資料夾名稱（例如 "love-options"）。選到這首歌時 <body> 會加上 class="song-<id>"
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
 *           圖檔放在 assets/images/<id>/ 裡，這裡填相對路徑
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
 *           → 按「複製 JSON」貼到這首歌的設定裡
 *
 * ── 4 人舞蹈影片（選填）──
 * - members:      每個人的整首舞蹈影片，例如 { m1: "assets/videos/love-options/m1.mp4", ... }
 *                 影片放在 assets/videos/<id>/ 裡。選歌時就先載入，跟 MV 同步播放、不循環
 * - memberKey:    影片背景去除方式（選填，預設 "green"）
 *                 "green" = 綠幕背景 MP4（推薦）、"screen" = 黑底 MP4、"normal" = 透明 WebM
 * - memberOffset: 舞者影片的第 0 秒對應 MV 的第幾秒（選填，預設 0 = 跟 MV 同時開始）
 *                 例如舞者影片是從 MV 第 3.5 秒的地方開始剪的，就填 3.5
 * - formation:    整首歌的走位時間軸（選填，放在 js/<id>/formation.js）。
 *                 用 FormationEngine.fromPlan() 產生，time 以 MV 實際秒數計算、整首不循環。
 *                 沒填就用 formations.js 的示範走位循環
 */
window.SONG_DATA = window.SONG_DATA || {};

// 選單順序：已建立資料夾的歌用 SONG_DATA["<id>"]；還沒設定的空位直接寫在這裡
window.SONG_LIST = [
  window.SONG_DATA["love-options"],
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
].filter(Boolean); // 某首歌的設定檔沒載入時自動略過，不會讓選單壞掉

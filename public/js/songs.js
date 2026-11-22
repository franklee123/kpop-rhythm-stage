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
 * - bpm:    選單上顯示用的 BPM（選填）
 * - level:  選單上顯示的難度星數 1~5（選填）
 * - color:  沒有縮圖時的卡片底色（選填）
 * - chart:  這首歌專用譜面（選填）。格式同 beatmap.js：[{ time: 秒數, lane: 0~3 }, ...]
 *           time 以「MV 實際秒數」計算。沒填的話會用 Demo 譜面依舞段長度循環。
 */
window.SONG_LIST = [
  {
    title: "Love Options",
    artist: "BESTie",
    url: "https://www.youtube.com/watch?v=NPqtL1dtrlA&list=RDNPqtL1dtrlA&start_radio=1",
    start: 0,
    bpm: 128,
    level: 2
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

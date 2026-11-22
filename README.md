# K-POP Runway Rhythm Stage (Eclipse Web Project)

9:16 手機直向延伸花道節奏遊戲與舞台走位同步原型（可切換桌機寬景劇院模式）。

## 匯入 Eclipse 步驟
1. 將 `kpop-rhythm-stage-eclipse.zip` 解壓縮到你的工作區外或任意資料夾（或直接在匯入時選 Archive file）。
2. 打開 Eclipse，點選 **`File` -> `Import...` -> `General` -> `Existing Projects into Workspace`**。
3. 選擇解壓後的 **`kpop-rhythm-stage`** 資料夾（或勾選 Select archive file 選取 zip），按下 **Finish**。
4. 本專案已內建 `.settings/org.eclipse.core.resources.prefs` 鎖定 **UTF-8**，不會有中文亂碼。

## 在 Eclipse 裡執行（務必用 http://localhost，避免直接開 file://）
> 因為 YouTube IFrame Player API 在 `file://` 下容易觸發錯誤 150/153，建議透過本機伺服器開啟：

- **方式 A（Eclipse 內建伺服器 / Tomcat）**：
  對專案右鍵 -> **`Run As` -> `Run on Server`** -> 選擇已安裝的 **Tomcat** 或 **Basic -> HTTP Preview** -> 開啟 `http://localhost:8080/kpop-rhythm-stage/`。
- **方式 B（免設定伺服器一鍵啟動）**：
  直接雙擊專案根目錄的 **`start-local-server.bat`**，會自動開啟瀏覽器並連到 `http://localhost:8080/`。

## 專案檔案結構
- `public/index.html`：舞台三層結構（背後 16:9 YouTube LED 螢幕 + 中景 4 人主舞台 + 前景 3D 延伸花道）與控制抽屜。
- `public/css/style.css`：9:16 鎖比例排版、桌機寬景劇院模式、燈光與角色 `object-fit: contain` 防拉長樣式。
- `public/js/formations.js`：**陣型與走位時間軸**（修改座標 `x / y / scale` 與加減速曲線都改這支）。
- `public/js/beatmap.js`：**測試譜面資料**（錄譜後複製出來的 JSON 直接貼回這裡即可）。
- `public/js/songs.js`：**音樂選單歌單**（每首歌填歌名、YouTube 網址、起始秒數，可選填專屬譜面）。開始畫面 → 選歌畫面選好歌按 START，LED 大螢幕就會播放該首 MV。
- `public/js/app.js`：**核心主程式**（平滑主時鐘、YouTube 同步、4 支影片誤差追蹤、3D 花道 Canvas 繪製、多點觸控與錄譜）。
- `public/assets/videos/`：放置 ComfyUI 產出的角色 MP4 / 透明 WebM 素材。

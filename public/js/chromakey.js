/**
 * chromakey.js
 * 綠幕即時去背（WebGL）
 *
 * 把綠幕背景的舞者 MP4 畫到 <canvas> 上，綠色部分變透明，人物顏色完整保留。
 * 用顯示卡運算，手機也跑得動；所有支援 WebGL 的瀏覽器（含 iPhone Safari）都能用。
 *
 * 用法：
 *   const keyer = ChromaKeyer.create(canvasElement);
 *   keyer.draw(videoElement);            // 每次影片有新畫面時呼叫
 *   keyer.setParams({ threshold, softness });
 */
window.ChromaKeyer = (function () {
  const VERTEX_SHADER = `
    attribute vec2 a_pos;
    varying vec2 v_uv;
    void main() {
      v_uv = vec2((a_pos.x + 1.0) * 0.5, 1.0 - (a_pos.y + 1.0) * 0.5);
      gl_Position = vec4(a_pos, 0.0, 1.0);
    }
  `;

  // greenness = 綠色比紅、藍多出多少；越綠越透明，邊緣用 softness 做柔和過渡，
  // 並壓掉邊緣反射到人物身上的綠光（spill）
  const FRAGMENT_SHADER = `
    precision mediump float;
    varying vec2 v_uv;
    uniform sampler2D u_tex;
    uniform float u_threshold;
    uniform float u_softness;
    void main() {
      vec4 c = texture2D(u_tex, v_uv);
      float rb = max(c.r, c.b);
      float greenness = c.g - rb;
      float alpha = 1.0 - smoothstep(u_threshold, u_threshold + u_softness, greenness);
      vec3 col = c.rgb;
      float spill = smoothstep(0.0, u_threshold + u_softness, greenness);
      col.g = mix(col.g, min(col.g, rb), spill);
      gl_FragColor = vec4(col * alpha, alpha);
    }
  `;

  const DEFAULTS = { threshold: 0.08, softness: 0.12 };

  function compile(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.warn("[ChromaKeyer] shader 編譯失敗：", gl.getShaderInfoLog(shader));
      return null;
    }
    return shader;
  }

  /** 建立去背器；瀏覽器不支援 WebGL 時回傳 null（呼叫端改用其他去背方式） */
  function create(canvas, options) {
    const gl = canvas.getContext("webgl", { alpha: true, premultipliedAlpha: true, antialias: false })
      || canvas.getContext("experimental-webgl");
    if (!gl) return null;

    const vs = compile(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
    if (!vs || !fs) return null;

    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.warn("[ChromaKeyer] program 連結失敗：", gl.getProgramInfoLog(program));
      return null;
    }
    gl.useProgram(program);

    // 全畫面四邊形
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(program, "a_pos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    // 影片貼圖（影片尺寸不一定是 2 的次方，所以不用 mipmap、邊緣用 CLAMP）
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    const uThreshold = gl.getUniformLocation(program, "u_threshold");
    const uSoftness = gl.getUniformLocation(program, "u_softness");

    function setParams(p) {
      const o = Object.assign({}, DEFAULTS, p || {});
      gl.uniform1f(uThreshold, o.threshold);
      gl.uniform1f(uSoftness, Math.max(0.001, o.softness));
    }
    setParams(options);

    // source 可以是 <video>，也可以是 <canvas> / <img>（測試用）
    function draw(video) {
      const w = video.videoWidth || video.width;
      const h = video.videoHeight || video.height;
      if (!w || !h) return false;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
      try {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
      } catch (err) {
        // 影片來自別的網域且沒有開放跨域時會失敗；專案內的影片不會有這個問題
        console.warn("[ChromaKeyer] 無法讀取影片畫面：", err);
        return false;
      }
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      return true;
    }

    return { draw, setParams };
  }

  return { create, DEFAULTS };
})();

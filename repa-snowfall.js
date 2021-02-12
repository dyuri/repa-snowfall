class RepaSnowfall extends HTMLElement {
  
  constructor() {
    super();
    this.canvas = null;
    this.ctx = null;
    this.loop = this._loop.bind(this);
    this.resize = this._resize.bind(this);
  }
  
  connectedCallback() {
    if (!this.ctx) {
      this.init();      
    }
  }
  
  disconnectedCallback() {
    this.disconnect();
  }

  init() {
    const shadow = this.attachShadow({mode: "open"});
    this.setStyle();

    this.canvas = document.createElement("canvas");
    shadow.appendChild(this.canvas);
    this.ctx = this.canvas.getContext("webgl");

    this.createPrograms();
    this.ctx.useProgram(this.program);

    this.createBuffer();

    this.ctx.clearColor(0, 0, 0, 0);
    this.ctx.clear(this.ctx.COLOR_BUFFER_BIT);

    this.resize();
    window.addEventListener("resize", this.resize, false);

    this.frame = requestAnimationFrame(this.loop);
  }

  disconnect() {
    cancelAnimationFrame(this.loop);
    this.frame = null;

    window.removeEventListener("resize", this.resize, false);

    this.ctx.deleteProgram(this.program);

    const loseCtx = this.ctx.getExtension("WEBGL_lose_context");
    if (loseCtx && typeof loseCtx.loseContext === "function") {
      loseCtx.loseContext();
    }

    this.shadowRoot.removeChild(this.canvas);
    this.shadowRoot.innerHTML = "";
    this.ctx = null;
    this.canvas = null;
  }

  get devicePixelRatio() {
    return parseFloat(this.getAttribute("dpr")) || window.devicePixelRatio;
  }
  
  _resize() {
    const width = this.clientWidth;
    const height = this.clientHeight;
    const dpr = this.devicePixelRatio;
    this.canvas.width = width * dpr;
    this.canvas.height = height * dpr;
    this.ctx.viewport(0, 0, this.ctx.drawingBufferWidth, this.ctx.drawingBufferHeight);

    const uResolution = this.ctx.getUniformLocation(this.program, "resolution");
    this.ctx.uniform2fv(uResolution, [this.ctx.drawingBufferWidth, this.ctx.drawingBufferHeight]);
  }

  createShader(type, code) {
    const sh = this.ctx.createShader(type, code);
    this.ctx.shaderSource(sh, code);
    this.ctx.compileShader(sh);
    if (!this.ctx.getShaderParameter(sh, this.ctx.COMPILE_STATUS)) {
      throw this.ctx.getShaderInfoLog(sh);
    }
    return sh;
  }

  createBuffer() {
    const data = new Float32Array([
      -1, -1, -1, 1, 1, -1,
      1, -1, 1, 1, -1, 1
    ]);
    const recordSize = 2;

    const buffer = this.ctx.createBuffer();
    this.ctx.bindBuffer(this.ctx.ARRAY_BUFFER, buffer);
    this.ctx.bufferData(this.ctx.ARRAY_BUFFER, data, this.ctx.STATIC_DRAW);
    const attribLoc = this.ctx.getAttribLocation(this.program, "position");
    this.ctx.enableVertexAttribArray(attribLoc);
    this.ctx.bindBuffer(this.ctx.ARRAY_BUFFER, buffer);
    this.ctx.vertexAttribPointer(attribLoc, recordSize, this.ctx.FLOAT, false, 0, 0);
  }

  _loop(time = 0) {
    const uTime = this.ctx.getUniformLocation(this.program, "time");
    this.ctx.uniform1f(uTime, time);
    this.ctx.drawArrays(this.ctx.TRIANGLES, 0, 6);
    this.frame = requestAnimationFrame(this.loop);
  }
  
  createPrograms() {
    const fragScript = this.querySelector("[type=frag]");
    const vertScript = this.querySelector("[type=vert]");
    const HEADER = "precision highp float;";
    const DEFAULT_VERT = HEADER + RepaSnowfall.VERTEX_SHADER;
    const DEFAULT_FRAG = HEADER + RepaSnowfall.SNOW_SHADER;
    
    this.vertCode = DEFAULT_VERT;
    this.fragCode = fragScript?.textContent || DEFAULT_FRAG;
    
    this.program = this.ctx.createProgram();
    
    this.fragShader = this.createShader(this.ctx.FRAGMENT_SHADER, this.fragCode);
    this.vertShader = this.createShader(this.ctx.VERTEX_SHADER, this.vertCode);
    
    this.ctx.attachShader(this.program, this.fragShader);
    this.ctx.attachShader(this.program, this.vertShader);
    this.ctx.linkProgram(this.program);
    if (!this.ctx.getProgramParameter(this.program, this.ctx.LINK_STATUS)) {
      throw this.ctx.getProgramInfoLog(this.program);
    }
  }

  setStyle() {
    const style = document.createElement("style");
    style.innerHTML = `
      :host {
        display: block;
        position: fixed;
        top: 0;
        bottom: 0;
        left: 0;
        right: 0;
        z-index: 999;
        pointer-events: none;
      }
    `;
    this.shadowRoot.appendChild(style);
  }
}
RepaSnowfall.VERTEX_SHADER = `
uniform float time;
uniform vec2 resolution;
varying vec4 vPos;
attribute vec4 position;

void main(){
  vPos = position;
  gl_Position=position;
}
`;
RepaSnowfall.SNOW_SHADER = `
uniform float time;
uniform vec2 resolution;
varying vec4 vPos;

float rand(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * .1021);
  p3 += dot(p3, p3.yzx + 33.23);
  return fract((p3.x + p3.y) * p3.z);
}

void main() {
  vec2 uv = vPos.xy *.5;
  float aspect = resolution.x / resolution.y;
  uv.x *= aspect;

  float t = time * .0000001;
  float col = 0.;

  col = fract(rand(vec2(uv.x * 134.232, t + uv.y * 212.32)));

  gl_FragColor = vec4(.7, .8, .95, 1.) * col;
}
`;

customElements.define("repa-snowfall", RepaSnowfall);

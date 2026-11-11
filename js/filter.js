// One-Euro 필터 (Casiez et al.) — 느린 움직임은 떨림 없이, 빠른 움직임은 지연 없이
const alpha = (cutoff, dt) => { const r = 2 * Math.PI * cutoff * dt; return r / (r + 1); };
export class OneEuro {
  constructor(minCutoff = 1, beta = 0.02, dCutoff = 1) { this.minCutoff = minCutoff; this.beta = beta; this.dCutoff = dCutoff; this.x = null; this.dx = 0; this.t = 0; }
  reset() { this.x = null; this.dx = 0; }
  filter(v, t) { // t: 초
    if (this.x === null) { this.x = v; this.t = t; this.dx = 0; return v; }
    const dt = Math.max(1e-3, Math.min(0.5, t - this.t)); this.t = t;
    const d = (v - this.x) / dt;
    this.dx += alpha(this.dCutoff, dt) * (d - this.dx);
    const c = this.minCutoff + this.beta * Math.abs(this.dx);
    this.x += alpha(c, dt) * (v - this.x);
    return this.x;
  }
}
// 채널 묶음: name -> OneEuro. scale: 채널별 컷오프 배율 (깜빡임처럼 빨라야 하는 채널은 크게)
export class FilterBank {
  constructor() { this.f = {}; this.minCutoff = 1.5; this.beta = 0.3; }
  set(minCutoff, beta) { this.minCutoff = minCutoff; this.beta = beta; }
  reset() { for (const k in this.f) this.f[k].reset(); }
  run(name, v, t, scale = 1, betaScale = 1) {
    const f = this.f[name] || (this.f[name] = new OneEuro());
    f.minCutoff = this.minCutoff * scale; f.beta = this.beta * betaScale;
    return f.filter(v, t);
  }
}

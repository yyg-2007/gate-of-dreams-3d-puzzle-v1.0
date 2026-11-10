/**
 * 音频引擎 —— 纯 Web Audio 程序化生成，零音频资源文件。
 *  - 环境音乐：和弦铺底（三角波 + 低通）+ 五声音阶随机拨音 + 回声。
 *  - 音效：机关旋转、按钮、压力板、脚步、通关琶音、拒绝提示等。
 * 浏览器自动播放策略：首次用户手势时 resume()。
 */

type SfxName =
  | 'ui' | 'uiBack' | 'mech' | 'mechEnd' | 'plate' | 'step' | 'denied'
  | 'win' | 'doorLocked' | 'move' | 'levelStart'

class AudioEngine {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private musicGain: GainNode | null = null
  private sfxGain: GainNode | null = null
  private delay: DelayNode | null = null

  private musicTimer: number | null = null
  private chordIdx = 0
  private nextChordTime = 0
  private nextPluckTime = 0

  private musicOn = true
  private sfxOn = true
  private musicVol = 0.8
  private sfxVol = 0.9
  /** 当前关卡主题（移调与和弦进行） */
  private theme = 0

  /** 和弦进行（半音相对 A 小调五声），每主题不同 */
  private static PROGRESSIONS: number[][][] = [
    [[0, 3, 7, 12], [-4, 0, 5, 8], [-2, 2, 5, 10], [-4, 0, 3, 7]],           // 柔和
    [[0, 4, 7, 11], [2, 5, 9, 12], [-3, 0, 4, 7], [-1, 2, 6, 9]],            // 明亮
    [[0, 3, 7, 10], [-2, 3, 5, 8], [-4, 0, 3, 8], [-5, -1, 2, 7]],           // 神秘
    [[0, 5, 7, 12], [-3, 2, 4, 9], [-5, 0, 3, 10], [-1, 4, 6, 11]],          // 史诗
  ]

  configure(settings: { music: boolean; sfx: boolean; musicVol: number; sfxVol: number }): void {
    this.musicOn = settings.music
    this.sfxOn = settings.sfx
    this.musicVol = settings.musicVol
    this.sfxVol = settings.sfxVol
    if (this.musicGain) this.musicGain.gain.value = this.musicOn ? this.musicVol * 0.5 : 0
    if (this.sfxGain) this.sfxGain.gain.value = this.sfxOn ? this.sfxVol : 0
  }

  setTheme(theme: number): void {
    this.theme = theme % AudioEngine.PROGRESSIONS.length
  }

  /** 需在用户手势中调用 */
  unlock(): void {
    if (!this.ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      this.ctx = new AC()
      this.master = this.ctx.createGain()
      this.master.gain.value = 0.9
      this.master.connect(this.ctx.destination)

      this.musicGain = this.ctx.createGain()
      this.musicGain.gain.value = this.musicOn ? this.musicVol * 0.5 : 0
      this.musicGain.connect(this.master)

      this.sfxGain = this.ctx.createGain()
      this.sfxGain.gain.value = this.sfxOn ? this.sfxVol : 0
      this.sfxGain.connect(this.master)

      // 回声总线（给拨音与音效一点梦境空间感）
      this.delay = this.ctx.createDelay(1.0)
      this.delay.delayTime.value = 0.34
      const fb = this.ctx.createGain()
      fb.gain.value = 0.32
      const wet = this.ctx.createGain()
      wet.gain.value = 0.35
      this.delay.connect(fb)
      fb.connect(this.delay)
      this.delay.connect(wet)
      wet.connect(this.master)

      this.startMusic()
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume()
  }

  /* ---------------- 音乐 ---------------- */

  private startMusic(): void {
    if (!this.ctx || this.musicTimer !== null) return
    this.nextChordTime = this.ctx.currentTime + 0.1
    this.nextPluckTime = this.ctx.currentTime + 2.5
    this.musicTimer = window.setInterval(() => this.schedule(), 250)
  }

  private schedule(): void {
    const ctx = this.ctx
    if (!ctx || !this.musicGain) return
    const now = ctx.currentTime
    const prog = AudioEngine.PROGRESSIONS[this.theme]
    const barLen = 5.2

    while (this.nextChordTime < now + 1.0) {
      this.playChord(prog[this.chordIdx % prog.length], this.nextChordTime, barLen)
      this.chordIdx++
      this.nextChordTime += barLen
    }
    while (this.nextPluckTime < now + 0.9) {
      if (Math.random() < 0.72) this.playPluck(this.nextPluckTime)
      this.nextPluckTime += 0.9 + Math.random() * 1.6
    }
  }

  private midi(n: number): number {
    return 220 * Math.pow(2, n / 12) * 2 // A3 基准 ×2
  }

  private playChord(notes: number[], at: number, len: number): void {
    const ctx = this.ctx
    if (!ctx || !this.musicGain) return
    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.setValueAtTime(420, at)
    filter.frequency.linearRampToValueAtTime(760, at + len * 0.5)
    filter.frequency.linearRampToValueAtTime(380, at + len)
    filter.connect(this.musicGain)

    notes.forEach((n, i) => {
      const osc = ctx.createOscillator()
      osc.type = i === 0 ? 'sine' : 'triangle'
      osc.frequency.value = this.midi(n - 12) * (i === 0 ? 0.5 : 1)
      osc.detune.value = (Math.random() - 0.5) * 7
      const g = ctx.createGain()
      g.gain.setValueAtTime(0, at)
      g.gain.linearRampToValueAtTime(i === 0 ? 0.05 : 0.028, at + len * 0.35)
      g.gain.linearRampToValueAtTime(0, at + len)
      osc.connect(g)
      g.connect(filter)
      osc.start(at)
      osc.stop(at + len + 0.1)
    })
  }

  private playPluck(at: number): void {
    const ctx = this.ctx
    if (!ctx || !this.musicGain || !this.delay) return
    const scale = [0, 3, 5, 7, 10, 12, 15, 17]
    const n = scale[Math.floor(Math.random() * scale.length)] + (Math.random() < 0.3 ? 12 : 0)
    const osc = ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.value = this.midi(n)
    const g = ctx.createGain()
    g.gain.setValueAtTime(0, at)
    g.gain.linearRampToValueAtTime(0.06, at + 0.015)
    g.gain.exponentialRampToValueAtTime(0.0001, at + 1.6)
    osc.connect(g)
    g.connect(this.musicGain)
    g.connect(this.delay)
    osc.start(at)
    osc.stop(at + 1.7)
  }

  /* ---------------- 音效 ---------------- */

  play(name: SfxName): void {
    const ctx = this.ctx
    if (!ctx || !this.sfxGain || !this.sfxOn) return
    const t = ctx.currentTime
    switch (name) {
      case 'ui':
        this.blip(660, 440, t, 0.09, 0.14, 'sine')
        break
      case 'uiBack':
        this.blip(440, 330, t, 0.09, 0.12, 'sine')
        break
      case 'move':
        this.blip(520, 660, t, 0.07, 0.08, 'sine')
        break
      case 'mech':
        this.whoosh(t)
        break
      case 'mechEnd':
        this.blip(392, 523, t, 0.16, 0.1, 'triangle')
        this.blip(523, 659, t + 0.08, 0.2, 0.08, 'sine')
        break
      case 'plate':
        this.blip(160, 110, t, 0.22, 0.2, 'sine')
        this.blip(320, 220, t + 0.05, 0.15, 0.08, 'triangle')
        break
      case 'step':
        this.noiseTick(t, 0.03, 0.035)
        break
      case 'denied':
        this.blip(220, 180, t, 0.1, 0.1, 'square')
        break
      case 'doorLocked':
        this.blip(300, 240, t, 0.14, 0.12, 'triangle')
        this.blip(240, 200, t + 0.12, 0.16, 0.1, 'triangle')
        break
      case 'win':
        [523, 659, 784, 1047, 1319].forEach((f, i) => {
          this.blip(f, f, t + i * 0.13, 0.5, 0.13, 'sine')
          if (i % 2 === 0) this.blip(f / 2, f / 2, t + i * 0.13, 0.6, 0.06, 'triangle')
        })
        break
      case 'levelStart':
        this.blip(392, 523, t, 0.3, 0.09, 'sine')
        this.blip(523, 784, t + 0.16, 0.4, 0.09, 'sine')
        break
    }
  }

  private blip(f0: number, f1: number, at: number, dur: number, vol: number, type: OscillatorType): void {
    const ctx = this.ctx
    if (!ctx || !this.sfxGain) return
    const osc = ctx.createOscillator()
    osc.type = type
    osc.frequency.setValueAtTime(f0, at)
    osc.frequency.exponentialRampToValueAtTime(Math.max(30, f1), at + dur)
    const g = ctx.createGain()
    g.gain.setValueAtTime(0, at)
    g.gain.linearRampToValueAtTime(vol, at + 0.012)
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur)
    osc.connect(g)
    g.connect(this.sfxGain)
    if (this.delay && vol > 0.09) g.connect(this.delay)
    osc.start(at)
    osc.stop(at + dur + 0.05)
  }

  private whoosh(at: number): void {
    const ctx = this.ctx
    if (!ctx || !this.sfxGain) return
    const dur = 0.7
    const buf = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.5
    const src = ctx.createBufferSource()
    src.buffer = buf
    const filter = ctx.createBiquadFilter()
    filter.type = 'bandpass'
    filter.Q.value = 1.4
    filter.frequency.setValueAtTime(240, at)
    filter.frequency.exponentialRampToValueAtTime(1400, at + dur * 0.55)
    filter.frequency.exponentialRampToValueAtTime(300, at + dur)
    const g = ctx.createGain()
    g.gain.setValueAtTime(0, at)
    g.gain.linearRampToValueAtTime(0.16, at + 0.1)
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur)
    src.connect(filter)
    filter.connect(g)
    g.connect(this.sfxGain)
    src.start(at)
    // 低频转动感
    this.blip(90, 70, at, dur, 0.12, 'sine')
  }

  private noiseTick(at: number, dur: number, vol: number): void {
    const ctx = this.ctx
    if (!ctx || !this.sfxGain) return
    const buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * dur), ctx.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length)
    const src = ctx.createBufferSource()
    src.buffer = buf
    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = 900
    const g = ctx.createGain()
    g.gain.value = vol
    src.connect(filter)
    filter.connect(g)
    g.connect(this.sfxGain)
    src.start(at)
  }

  dispose(): void {
    if (this.musicTimer !== null) {
      window.clearInterval(this.musicTimer)
      this.musicTimer = null
    }
    void this.ctx?.close()
    this.ctx = null
  }
}

export const audio = new AudioEngine()

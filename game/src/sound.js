// Gobble Dash sounds: everything is synthesised with the Web Audio API,
// no sound files. One small synth per effect, so the game stays silent
// until the player first interacts (browsers require a gesture first).
export class SoundBank {
  constructor() {
    this.context = null;
    this.muted = false;
  }

  // Lazily create the audio context on the first user gesture.
  ensure() {
    if (!this.context) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      this.context = new AudioContext();
    }
    if (this.context.state === 'suspended') void this.context.resume();
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }

  // A short oscillator blip: frequency slides from `from` to `to`.
  blip(from, to, seconds, type = 'sine', volume = 0.18, when = 0) {
    if (this.muted || !this.context) return;
    const ctx = this.context;
    const start = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, start);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), start + seconds);
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + seconds);
    osc.connect(gain).connect(ctx.destination);
    osc.start(start);
    osc.stop(start + seconds + 0.02);
  }

  // Gobble: three quick descending clucks.
  gobble() {
    this.blip(420, 180, 0.09, 'square', 0.12, 0);
    this.blip(380, 160, 0.09, 'square', 0.12, 0.11);
    this.blip(340, 140, 0.12, 'square', 0.12, 0.22);
  }

  // Jump chirp: a quick rising peep.
  jumpChirp() {
    this.blip(500, 980, 0.14, 'sine', 0.14);
  }

  // Corn pluck: a bright coin-like two-note pluck.
  cornPluck() {
    this.blip(880, 880, 0.07, 'triangle', 0.16);
    this.blip(1320, 1320, 0.12, 'triangle', 0.14, 0.07);
  }

  // Pie pluck: a richer, sweeter chime than corn.
  piePluck() {
    this.blip(660, 660, 0.09, 'triangle', 0.16);
    this.blip(990, 990, 0.09, 'triangle', 0.16, 0.08);
    this.blip(1320, 1320, 0.16, 'triangle', 0.14, 0.16);
  }

  // Hit thud: a low thump plus a noise-ish buzz.
  hitThud() {
    this.blip(160, 55, 0.22, 'sawtooth', 0.22);
    this.blip(90, 45, 0.28, 'sine', 0.25, 0.02);
  }

  // Escape jingle: a cheerful rising tune.
  escapeJingle() {
    const notes = [523, 659, 784, 1047, 784, 1047];
    notes.forEach((note, i) => this.blip(note, note, 0.16, 'triangle', 0.16, i * 0.12));
  }

  // Caught slide: a sad trombone-style descending slide.
  caughtSlide() {
    this.blip(392, 370, 0.25, 'sawtooth', 0.14, 0);
    this.blip(370, 349, 0.25, 'sawtooth', 0.14, 0.28);
    this.blip(349, 311, 0.25, 'sawtooth', 0.14, 0.56);
    this.blip(311, 220, 0.6, 'sawtooth', 0.16, 0.84);
  }

  // Warning sting when the farmer surges: two sharp notes.
  spottedSting() {
    this.blip(220, 220, 0.1, 'square', 0.12);
    this.blip(330, 330, 0.14, 'square', 0.12, 0.11);
  }
}

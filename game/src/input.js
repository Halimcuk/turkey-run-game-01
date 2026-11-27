// Gobble Dash input: keyboard and mouse, both able to play the game alone.
//
// Keyboard: Space / Up jump, Down slide, Left / Right (or A / D) nudge
// speed, P pause, R restart on an end screen, Enter / Space start.
// Mouse: click the on-screen Start / Restart / Pause / Mute buttons, or
// click the game area to jump.
//
// The game polls `pressed` edges once per frame (via consumePressed) and
// reads `held` levels directly, so a held key never double-fires a jump.
export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.held = new Set();
    this.pressed = new Set();
    // Clickable rectangles the game registers each frame: {x, y, w, h, id}.
    this.buttons = [];
    this.clickedButton = null;
    this.clickedPoint = null;

    window.addEventListener('keydown', (event) => {
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) {
        event.preventDefault();
      }
      if (!event.repeat) this.pressed.add(event.code);
      this.held.add(event.code);
    });
    window.addEventListener('keyup', (event) => {
      this.held.delete(event.code);
    });
    canvas.addEventListener('pointerdown', (event) => {
      const rect = canvas.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * canvas.width;
      const y = ((event.clientY - rect.top) / rect.height) * canvas.height;
      this.clickedPoint = { x, y };
      for (const button of this.buttons) {
        if (x >= button.x && x <= button.x + button.w && y >= button.y && y <= button.y + button.h) {
          this.clickedButton = button.id;
          return;
        }
      }
    });
    // Losing focus must not leave a key stuck down.
    window.addEventListener('blur', () => {
      this.held.clear();
    });
  }

  // Call once per frame after the game has read the edges.
  endFrame() {
    this.pressed.clear();
    this.clickedButton = null;
    this.clickedPoint = null;
    this.buttons = [];
  }

  registerButton(id, x, y, w, h) {
    this.buttons.push({ id, x, y, w, h });
  }

  jumpPressed() {
    return (
      this.pressed.has('Space') ||
      this.pressed.has('ArrowUp') ||
      this.pressed.has('KeyW') ||
      this.clickedPoint !== null
    );
  }

  startPressed() {
    return this.pressed.has('Space') || this.pressed.has('Enter') || this.pressed.has('ArrowUp');
  }

  restartPressed() {
    return this.pressed.has('KeyR') || this.pressed.has('Space') || this.pressed.has('Enter');
  }

  pausePressed() {
    return this.pressed.has('KeyP') || this.pressed.has('Escape');
  }

  mutePressed() {
    return this.pressed.has('KeyM');
  }

  sliding() {
    return this.held.has('ArrowDown') || this.held.has('KeyS');
  }

  speedNudge() {
    let nudge = 0;
    if (this.held.has('ArrowLeft') || this.held.has('KeyA')) nudge -= 1;
    if (this.held.has('ArrowRight') || this.held.has('KeyD')) nudge += 1;
    return nudge;
  }
}

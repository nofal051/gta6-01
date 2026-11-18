// Keyboard and mouse input.
//
// Keys are tracked by `code`, so WASD and the arrow keys both drive.
// The mouse position is kept in canvas pixels for aiming the pistol.
// Actions (E, Q, F, P, M, Space, Enter, Esc) are edge-triggered:
// takeActions() returns the actions pressed since the last call and
// clears them, so one press never fires twice.
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_ENTER_CAR = 4;
export const ACTION_MELEE = 8;
export const ACTION_MUTE = 16;
export const ACTION_MISSION = 32;

// Which key codes raise which action, on a fresh (non-repeat) press.
const KEY_ACTIONS = {
  Space: ACTION_CONFIRM,
  Enter: ACTION_CONFIRM,
  KeyP: ACTION_PAUSE,
  Escape: ACTION_PAUSE,
  KeyE: ACTION_ENTER_CAR,
  KeyM: ACTION_MUTE,
  KeyF: ACTION_MELEE,
  KeyQ: ACTION_MISSION,
};

// Keys whose default browser behaviour would fight the game.
const SCROLL_KEYS = ['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];

export function createInput(canvas) {
  const keys = new Set();
  let actions = 0;
  let clicked = false;
  const mouse = { x: 0, y: 0, down: false, clicked: false };

  function onKeyDown(event) {
    if (SCROLL_KEYS.includes(event.code)) event.preventDefault();
    if (!event.repeat && KEY_ACTIONS[event.code]) actions |= KEY_ACTIONS[event.code];
    keys.add(event.code);
  }
  function onKeyUp(event) {
    keys.delete(event.code);
  }
  function onMouseMove(event) {
    const rect = canvas.getBoundingClientRect();
    mouse.x = event.clientX - rect.left;
    mouse.y = event.clientY - rect.top;
  }
  function onMouseDown(event) {
    mouse.down = true;
    clicked = true;
    onMouseMove(event);
  }
  function onMouseUp() {
    mouse.down = false;
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mouseup', onMouseUp);

  return {
    mouse,
    isDown(code) {
      return keys.has(code);
    },
    // Drive/strafe axes as -1, 0 or 1, from whichever keys are held.
    axes() {
      const up = keys.has('KeyW') || keys.has('ArrowUp');
      const down = keys.has('KeyS') || keys.has('ArrowDown');
      const left = keys.has('KeyA') || keys.has('ArrowLeft');
      const right = keys.has('KeyD') || keys.has('ArrowRight');
      return {
        forward: (up ? 1 : 0) - (down ? 1 : 0),
        strafe: (right ? 1 : 0) - (left ? 1 : 0),
      };
    },
    takeActions() {
      // A mouse click counts as a confirm on menus; shooting reads
      // mouse.down directly, so it is not part of the action bits.
      const out = actions | (clicked ? ACTION_CONFIRM : 0);
      actions = 0;
      clicked = false;
      return out;
    },
    takeClick() {
      const c = clicked;
      clicked = false;
      return c;
    },
  };
}

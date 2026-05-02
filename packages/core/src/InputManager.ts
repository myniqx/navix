import type { NavEvent, InputConfig, ActionConfig } from './types';

export const DEFAULT_INPUT_CONFIG: InputConfig = {
  actions: {
    left: { keys: ['ArrowLeft'] },
    right: { keys: ['ArrowRight'] },
    up: { keys: ['ArrowUp'] },
    down: { keys: ['ArrowDown'] },
    enter: { keys: ['Enter'], longPress: true, longPressMs: 500 },
    back: { keys: ['Escape'] },
    play: { keys: ['MediaPlay'] },
    pause: { keys: ['MediaPause'] },
    play_pause: { keys: ['MediaPlayPause', 'Space'] },
    program_up: { keys: ['PageUp'] },
    program_down: { keys: ['PageDown'] },
  },
};

interface KeyState {
  action: string;
  config: ActionConfig;
  longPressTimer: ReturnType<typeof setTimeout> | null;
  longPressFired: boolean;
  repeatFired: boolean;
  lastPressTime: number;
  doublePressTimer: ReturnType<typeof setTimeout> | null;
}

export class InputManager {
  onNavEvent: ((event: NavEvent) => void) | null = null;

  private config: InputConfig;
  // Map from KeyboardEvent.code → action name
  private keyToAction: Map<string, string> = new Map();
  // Per-action runtime state
  private keyStates: Map<string, KeyState> = new Map();

  constructor(config?: InputConfig) {
    this.config = config ?? DEFAULT_INPUT_CONFIG;
    this._buildKeyMap();
  }

  private _buildKeyMap(): void {
    for (const [action, cfg] of Object.entries(this.config.actions)) {
      for (const key of cfg.keys) {
        this.keyToAction.set(key, action);
      }
    }
  }

  handleKeyDown(code: string): void {
    const action = this.keyToAction.get(code);
    if (!action) return;

    const cfg = this.config.actions[action]!;

    if (this.keyStates.has(action)) {
      const state = this.keyStates.get(action)!;
      if (!cfg.longPress) {
        state.repeatFired = true;
        this._emit({ action, type: 'press' });
      }
      return;
    }

    const state: KeyState = {
      action,
      config: cfg,
      longPressTimer: null,
      longPressFired: false,
      repeatFired: false,
      lastPressTime: 0,
      doublePressTimer: null,
    };

    this.keyStates.set(action, state);

    if (cfg.longPress) {
      state.longPressTimer = setTimeout(() => {
        state.longPressFired = true;
        this._emit({ action, type: 'longPress' });
      }, cfg.longPressMs ?? 500);
    }
  }

  handleKeyUp(code: string): void {
    const action = this.keyToAction.get(code);
    if (!action) return;

    const state = this.keyStates.get(action);
    if (!state) return;

    this.keyStates.delete(action);

    // Clear longPress timer
    if (state.longPressTimer !== null) {
      clearTimeout(state.longPressTimer);
      state.longPressTimer = null;
    }

    if (state.longPressFired || state.repeatFired) return;

    const cfg = state.config;

    if (cfg.doublePress) {
      const now = Date.now();
      const window = cfg.doublePressMs ?? 300;

      if (state.doublePressTimer !== null) {
        // Second press within window — emit doublePress
        clearTimeout(state.doublePressTimer);
        state.doublePressTimer = null;
        this._emit({ action, type: 'doublePress' });
        return;
      }

      // First press — hold it, wait for possible second press
      const capturedState = state;
      capturedState.lastPressTime = now;
      capturedState.doublePressTimer = setTimeout(() => {
        capturedState.doublePressTimer = null;
        this._emit({ action, type: 'press' });
      }, window);

      // Keep state alive for the double-press window
      this.keyStates.set(action, capturedState);
      return;
    }

    this._emit({ action, type: 'press' });
  }

  private _emit(event: NavEvent): void {
    this.onNavEvent?.(event);
  }

  destroy(): void {
    for (const state of this.keyStates.values()) {
      if (state.longPressTimer !== null) clearTimeout(state.longPressTimer);
      if (state.doublePressTimer !== null) clearTimeout(state.doublePressTimer);
    }
    this.keyStates.clear();
    this.onNavEvent = null;
  }
}

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
  onNavEvent: ((event: NavEvent) => boolean) | null = null;

  private config: InputConfig;
  private keyToAction: Map<string, string> = new Map();
  private keyStates: Map<string, KeyState> = new Map();

  private _backPendingExit = false;
  private _backExitTimer: ReturnType<typeof setTimeout> | null = null;

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

  handleKeyDown(code: string): boolean {
    const action = this.keyToAction.get(code);
    if (!action) return false;

    const cfg = this.config.actions[action]!;

    if (this.keyStates.has(action)) {
      const state = this.keyStates.get(action)!;
      if (!cfg.longPress) {
        state.repeatFired = true;
        this._emit({ action, type: 'press' });
      }
      return true;
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

    return true;
  }

  handleKeyUp(code: string): boolean {
    const action = this.keyToAction.get(code);
    if (!action) return false;

    const state = this.keyStates.get(action);
    if (!state) return false;

    this.keyStates.delete(action);

    if (state.longPressTimer !== null) {
      clearTimeout(state.longPressTimer);
      state.longPressTimer = null;
    }

    if (state.longPressFired || state.repeatFired) return true;

    const cfg = state.config;

    if (cfg.doublePress) {
      const now = Date.now();
      const window = cfg.doublePressMs ?? 300;

      if (state.doublePressTimer !== null) {
        clearTimeout(state.doublePressTimer);
        state.doublePressTimer = null;
        this._emit({ action, type: 'doublePress' });
        return true;
      }

      const capturedState = state;
      capturedState.lastPressTime = now;
      capturedState.doublePressTimer = setTimeout(() => {
        capturedState.doublePressTimer = null;
        this._emit({ action, type: 'press' });
      }, window);

      this.keyStates.set(action, capturedState);
      return true;
    }

    const consumed = this._emit({ action, type: 'press' });

    if (!consumed && action === 'back') {
      return this._handleBackExit();
    }

    return consumed;
  }

  private _handleBackExit(): boolean {
    if (this._backPendingExit) {
      if (this._backExitTimer !== null) {
        clearTimeout(this._backExitTimer);
        this._backExitTimer = null;
      }
      this._backPendingExit = false;
      return false;
    }
    this._backPendingExit = true;
    this._backExitTimer = setTimeout(() => {
      this._backPendingExit = false;
      this._backExitTimer = null;
    }, 2000);
    return true;
  }

  private _emit(event: NavEvent): boolean {
    return this.onNavEvent?.(event) ?? false;
  }

  destroy(): void {
    if (this._backExitTimer !== null) {
      clearTimeout(this._backExitTimer);
      this._backExitTimer = null;
    }
    this._backPendingExit = false;
    for (const state of this.keyStates.values()) {
      if (state.longPressTimer !== null) clearTimeout(state.longPressTimer);
      if (state.doublePressTimer !== null) clearTimeout(state.doublePressTimer);
    }
    this.keyStates.clear();
    this.onNavEvent = null;
  }
}

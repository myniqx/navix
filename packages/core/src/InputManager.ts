import type { NavEvent, InputConfig, ActionConfig } from './types';

export const DEFAULT_INPUT_CONFIG: InputConfig = {
  actions: {
    left: { keys: ['ArrowLeft'] },
    right: { keys: ['ArrowRight'] },
    up: { keys: ['ArrowUp'] },
    down: { keys: ['ArrowDown'] },
    enter: { keys: ['Enter'], longpress: true, longpressMs: 500 },
    back: { keys: ['Escape'] },
  },
};

interface KeyState {
  action: string;
  config: ActionConfig;
  longpressTimer: ReturnType<typeof setTimeout> | null;
  longpressFired: boolean;
  // For doublepress: timestamp of last press emission
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

    // Ignore key-repeat events (key already tracked)
    if (this.keyStates.has(action)) return;

    const state: KeyState = {
      action,
      config: cfg,
      longpressTimer: null,
      longpressFired: false,
      lastPressTime: 0,
      doublePressTimer: null,
    };

    this.keyStates.set(action, state);

    if (cfg.longpress) {
      state.longpressTimer = setTimeout(() => {
        state.longpressFired = true;
        this._emit({ action, type: 'longpress' });
      }, cfg.longpressMs ?? 500);
    }
  }

  handleKeyUp(code: string): void {
    const action = this.keyToAction.get(code);
    if (!action) return;

    const state = this.keyStates.get(action);
    if (!state) return;

    this.keyStates.delete(action);

    // Clear longpress timer
    if (state.longpressTimer !== null) {
      clearTimeout(state.longpressTimer);
      state.longpressTimer = null;
    }

    // Longpress already fired — don't emit press
    if (state.longpressFired) return;

    const cfg = state.config;

    if (cfg.doublepress) {
      const now = Date.now();
      const window = cfg.doublepressMs ?? 300;

      if (state.doublePressTimer !== null) {
        // Second press within window — emit doublepress
        clearTimeout(state.doublePressTimer);
        state.doublePressTimer = null;
        this._emit({ action, type: 'doublepress' });
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
      if (state.longpressTimer !== null) clearTimeout(state.longpressTimer);
      if (state.doublePressTimer !== null) clearTimeout(state.doublePressTimer);
    }
    this.keyStates.clear();
    this.onNavEvent = null;
  }
}

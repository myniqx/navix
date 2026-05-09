import { FocusNode } from '../core/FocusNode';
import type { NavEvent, IFocusNodeBehavior } from '../core/types';

export type NavixMultiLayerPanelId = 'left' | 'right' | 'up' | 'down';

export interface NavixMultiLayerHandlers {
  onChannelNext: () => void;
  onChannelPrev: () => void;
  onTogglePlay: () => void;
  onPanelOpen: (panel: NavixMultiLayerPanelId) => void;
  onPanelClose: () => void;
  onExitRequest: () => void;
  onPanelReset?: () => void;
}

export class MultiLayerBehavior implements IFocusNodeBehavior {
  activePanel: NavixMultiLayerPanelId | null = null;
  panels: Record<NavixMultiLayerPanelId, boolean> = {
    left: false,
    right: false,
    up: false,
    down: false,
  };

  readonly isTrapped = true;

  private _handlers: NavixMultiLayerHandlers;

  constructor(_node: FocusNode, handlers: NavixMultiLayerHandlers) {
    this._handlers = handlers;
  }

  onEvent = (e: NavEvent): boolean => {
    if (e.type !== 'press') return true;

    if (this.activePanel !== null) {
      if (e.action === 'back') {
        this.activePanel = null;
        this._handlers.onPanelClose();
        return true;
      }
      if (e.action === 'program_up') {
        this._handlers.onChannelNext();
      } else if (e.action === 'program_down') {
        this._handlers.onChannelPrev();
      } else if (
        e.action === 'play_pause' ||
        e.action === 'play' ||
        e.action === 'pause'
      ) {
        this._handlers.onTogglePlay();
      }
      return true;
    }

    if (
      e.action === 'left' ||
      e.action === 'right' ||
      e.action === 'up' ||
      e.action === 'down'
    ) {
      const panelId = e.action as NavixMultiLayerPanelId;
      if (this.panels[panelId]) {
        this.activePanel = panelId;
        this._handlers.onPanelOpen(panelId);
      }
    } else if (e.action === 'program_up') {
      this._handlers.onChannelNext();
    } else if (e.action === 'program_down') {
      this._handlers.onChannelPrev();
    } else if (
      e.action === 'enter' ||
      e.action === 'play_pause' ||
      e.action === 'play' ||
      e.action === 'pause'
    ) {
      this._handlers.onTogglePlay();
    } else if (e.action === 'back') {
      this._handlers.onExitRequest();
    }

    return true;
  };

  onConsumedByChild = (_e: NavEvent): void => {
    if (this.activePanel !== null) this._handlers.onPanelReset?.();
  };

  onUnregister(): void {
    this.activePanel = null;
  }
}

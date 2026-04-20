import { FocusNode } from '../FocusNode';
import type { NavEvent, IFocusNodeBehavior } from '../types';

export type MultiLayerPanelId = 'left' | 'right' | 'up' | 'down';

export interface MultiLayerHandlers {
  onChannelNext: () => void;
  onChannelPrev: () => void;
  onTogglePlay: () => void;
  onPanelOpen: (panel: MultiLayerPanelId) => void;
  onPanelClose: () => void;
  onExitRequest: () => void;
}

/**
 * MultiLayerBehavior
 *
 * Manages panel routing and channel navigation for a video player node.
 *
 * No panel open:
 *   left  → open left panel
 *   right → open right panel
 *   up    → next channel
 *   down  → prev channel
 *   enter → toggle play/pause
 *   back  → exit request (caller decides confirm logic)
 *
 * Panel open:
 *   All events routed to active child first (standard tree routing).
 *   If child does not consume back → close panel.
 *   All other unconsumed events → swallowed (focus stays in player).
 */
export class MultiLayerBehavior implements IFocusNodeBehavior {
  activePanel: MultiLayerPanelId | null = null;
  panels: Record<MultiLayerPanelId, boolean> = {
    left: false,
    right: false,
    up: false,
    down: false,
  };

  readonly isTrapped = true;

  private _handlers: MultiLayerHandlers;

  constructor(_node: FocusNode, handlers: MultiLayerHandlers) {
    this._handlers = handlers;
  }

  onEvent = (e: NavEvent): boolean => {
    if (e.type !== 'press') return true;

    if (this.activePanel !== null) {
      if (e.action === 'back') {
        this.activePanel = null;
        this._handlers.onPanelClose();
      }
      return true;
    }

    // No panel open
    if (
      e.action === 'left' ||
      e.action === 'right' ||
      e.action === 'up' ||
      e.action === 'down'
    ) {
      const panelId = e.action as MultiLayerPanelId;
      if (this.panels[panelId]) {
        this.activePanel = panelId;
        this._handlers.onPanelOpen(panelId);
      }
    } else if (e.action === 'programup') {
      this._handlers.onChannelNext();
    } else if (e.action === 'programdown') {
      this._handlers.onChannelPrev();
    } else if (
      e.action === 'enter' ||
      e.action === 'playpause' ||
      e.action === 'play' ||
      e.action === 'pause'
    ) {
      this._handlers.onTogglePlay();
    } else if (e.action === 'back') {
      this._handlers.onExitRequest();
    }

    return true;
  };

  onUnregister(): void {
    this.activePanel = null;
  }
}

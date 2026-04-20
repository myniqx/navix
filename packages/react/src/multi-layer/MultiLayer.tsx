import { useState, useEffect, useRef, type ReactNode } from 'react';
import { MultiLayerBehavior } from '@navix/core';
import type { MultiLayerPanelId } from '@navix/core';
import type { FocusNode } from '@navix/core';
import { useFocusable } from '../useFocusable';
import type { BaseComponentProps } from '../types';

export type { MultiLayerPanelId };

export interface MultiLayerPanelProps extends BaseComponentProps {
  close: () => void;
}

interface MultiLayerProps extends BaseComponentProps {
  onExitRequest?: () => void;
  baseLayer: () => ReactNode;
  left?: (props: MultiLayerPanelProps) => ReactNode;
  right?: (props: MultiLayerPanelProps) => ReactNode;
  up?: (props: MultiLayerPanelProps) => ReactNode;
  down?: (props: MultiLayerPanelProps) => ReactNode;
  onPrev?: () => boolean;
  onNext?: () => boolean;
  zapBanner?: () => ReactNode;
  notification?: () => ReactNode;
  panelTimeout?: number;
}

export function MultiLayer({
  fKey,
  onFocus,
  onBlurred,
  onRegister,
  onUnregister,
  onEvent,
  onExitRequest,
  baseLayer,
  left,
  right,
  up,
  down,
  zapBanner,
  notification,
  onNext,
  onPrev,
  panelTimeout = 4000,
}: MultiLayerProps) {
  const [activePanel, setActivePanel] = useState<MultiLayerPanelId | null>(
    null,
  );
  const activePanelRef = useRef<MultiLayerPanelId | null>(null);
  const [paused, setPaused] = useState(false);
  const [zapChannel, setZapChannel] = useState<boolean>(false);
  const panelTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const zapTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setPanel = (panel: MultiLayerPanelId | null) => {
    activePanelRef.current = panel;
    setActivePanel(panel);
  };

  const closePanel = () => setPanel(null);

  const resetPanelTimeout = () => {
    if (panelTimeoutRef.current !== null) clearTimeout(panelTimeoutRef.current);
    if (activePanelRef.current === null) return;
    panelTimeoutRef.current = setTimeout(() => {
      setPanel(null);
    }, panelTimeout);
  };

  // Reset timeout on any event while panel is open
  useEffect(() => {
    if (activePanel === null) {
      if (panelTimeoutRef.current !== null) {
        clearTimeout(panelTimeoutRef.current);
        panelTimeoutRef.current = null;
      }
      return;
    }
    panelTimeoutRef.current = setTimeout(() => setPanel(null), panelTimeout);
    return () => {
      if (panelTimeoutRef.current !== null)
        clearTimeout(panelTimeoutRef.current);
    };
  }, [activePanel, panelTimeout]);

  const showZap = () => {
    setZapChannel(true);
    if (zapTimeoutRef.current !== null) clearTimeout(zapTimeoutRef.current);
    zapTimeoutRef.current = setTimeout(() => setZapChannel(false), 2000);
  };

  const { FocusProvider, node } = useFocusable(
    fKey,
    { onFocus, onBlurred, onRegister, onUnregister, onEvent },
    (n: FocusNode) =>
      new MultiLayerBehavior(n, {
        onChannelNext: () => {
          if (onNext?.()) showZap(); // if onNext return true that means entry changed, setting zap is not this components responsibility
        },
        onChannelPrev: () => {
          if (onPrev?.()) showZap(); // same here
        },
        onTogglePlay: () => setPaused((p) => !p),
        onPanelOpen: (panel: MultiLayerPanelId) => setPanel(panel),
        onPanelClose: () => setPanel(null),
        onExitRequest: () => onExitRequest?.(),
      }),
  );

  const behavior = node.behavior as MultiLayerBehavior;

  // Keep behavior in sync with React state
  behavior.activePanel = activePanel;
  behavior.panels = {
    left: !!left,
    right: !!right,
    up: !!up,
    down: !!down,
  };

  // Focus the active panel's node when it opens
  useEffect(() => {
    if (activePanel === null) {
      node.requestFocus();
      return;
    }
    const panelKey = `${fKey}-panel-${activePanel}`;
    const child = node.children.find((c) => c.key === panelKey);
    child?.requestFocus();
  }, [activePanel]);

  const makePanelProps = (side: MultiLayerPanelId): MultiLayerPanelProps => ({
    fKey: `${fKey}-panel-${side}`,
    close: closePanel,
    onEvent: () => {
      // Any event from panel resets the timeout
      resetPanelTimeout();
      return false;
    },
  });

  return (
    <FocusProvider>
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          overflow: 'hidden',
        }}
      >
        {baseLayer()}

        {notification && (
          <div
            style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
          >
            {notification()}
          </div>
        )}

        {zapChannel && zapBanner && (
          <div
            style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
          >
            {zapBanner()}
          </div>
        )}

        {left && activePanel === 'left' && (
          <div
            style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
          >
            {left(makePanelProps('left'))}
          </div>
        )}

        {right && activePanel === 'right' && (
          <div
            style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
          >
            {right(makePanelProps('right'))}
          </div>
        )}

        {up && activePanel === 'up' && (
          <div
            style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
          >
            {up(makePanelProps('up'))}
          </div>
        )}

        {down && activePanel === 'down' && (
          <div
            style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
          >
            {down(makePanelProps('down'))}
          </div>
        )}
      </div>
    </FocusProvider>
  );
}

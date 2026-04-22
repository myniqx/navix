import { MultiLayerBehavior } from '@navix/core';
import type { MultiLayerPanelId } from '@navix/core';
import type { FocusNode } from '@navix/core';
import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import type { CSSProperties } from 'react';

import type { BaseComponentProps } from '../types';

const notificationOverlayStyle: CSSProperties = {
  position: 'absolute',
  inset: 0,
  pointerEvents: 'none',
};
import { useFocusable } from '../useFocusable';

export type { MultiLayerPanelId };

export type MultiLayerPanelState = 'opening' | 'open' | 'closing';

export interface MultiLayerPanelProps extends BaseComponentProps {
  close: () => void;
  panelState: MultiLayerPanelState;
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
  triggerSize?: number;
  hoverDelay?: number;
  transitionDuration?: number;
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
  triggerSize = 200,
  hoverDelay = 300,
  transitionDuration = 250,
}: MultiLayerProps) {
  const [activePanel, setActivePanel] = useState<MultiLayerPanelId | null>(
    null,
  );
  const [openingPanel, setOpeningPanel] = useState<MultiLayerPanelId | null>(
    null,
  );
  const [closingPanel, setClosingPanel] = useState<MultiLayerPanelId | null>(
    null,
  );
  const activePanelRef = useRef<MultiLayerPanelId | null>(null);
  const [paused, setPaused] = useState(false);
  const [zapChannel, setZapChannel] = useState<boolean>(false);
  const panelTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const zapTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onNextRef = useRef(onNext);
  const onPrevRef = useRef(onPrev);
  const onExitRequestRef = useRef(onExitRequest);
  onNextRef.current = onNext;
  onPrevRef.current = onPrev;
  onExitRequestRef.current = onExitRequest;

  const setPanel = useCallback(
    (panel: MultiLayerPanelId | null) => {
      if (panel === null) {
        // Start closing animation then unmount
        const current = activePanelRef.current;
        if (current === null) return;
        activePanelRef.current = null;
        setActivePanel(null);
        setClosingPanel(current);
        setOpeningPanel(null);
        if (closingTimerRef.current !== null)
          clearTimeout(closingTimerRef.current);
        closingTimerRef.current = setTimeout(
          () => setClosingPanel(null),
          transitionDuration,
        );
      } else {
        activePanelRef.current = panel;
        setActivePanel(panel);
        setClosingPanel(null);
        setOpeningPanel(panel);
        // Next frame: switch to open so CSS transition triggers
        requestAnimationFrame(() => setOpeningPanel(null));
      }
    },
    [transitionDuration],
  );

  const closePanel = useCallback(() => setPanel(null), [setPanel]);

  const resetPanelTimeout = useCallback(() => {
    if (panelTimeoutRef.current !== null) clearTimeout(panelTimeoutRef.current);
    if (activePanelRef.current === null) return;
    panelTimeoutRef.current = setTimeout(() => setPanel(null), panelTimeout);
  }, [setPanel, panelTimeout]);

  const showZap = useCallback(() => {
    setZapChannel(true);
    if (zapTimeoutRef.current !== null) clearTimeout(zapTimeoutRef.current);
    zapTimeoutRef.current = setTimeout(() => setZapChannel(false), 2000);
  }, []);

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
  }, [activePanel, panelTimeout, setPanel]);

  const { FocusProvider, node } = useFocusable(
    fKey,
    { onFocus, onBlurred, onRegister, onUnregister, onEvent },
    (n: FocusNode) =>
      new MultiLayerBehavior(n, {
        onChannelNext: () => {
          if (onNextRef.current?.()) showZap();
        },
        onChannelPrev: () => {
          if (onPrevRef.current?.()) showZap();
        },
        onTogglePlay: () => setPaused((p) => !p),
        onPanelOpen: (panel: MultiLayerPanelId) => setPanel(panel),
        onPanelClose: () => setPanel(null),
        onExitRequest: () => onExitRequestRef.current?.(),
      }),
  );

  const behavior = node.behavior as MultiLayerBehavior;

  useEffect(() => {
    behavior.activePanel = activePanel;
  }, [behavior, activePanel]);

  useEffect(() => {
    behavior.panels = { left: !!left, right: !!right, up: !!up, down: !!down };
  }, [behavior, left, right, up, down]);

  // Focus the active panel's node when it opens
  useEffect(() => {
    if (activePanel === null) {
      node.requestFocus();
      return;
    }
    const panelKey = `${fKey}-panel-${activePanel}`;
    const child = node.children.find((c) => c.key === panelKey);
    child?.requestFocus();
  }, [activePanel, node, fKey]);

  const handleTriggerEnter = useCallback(
    (panel: MultiLayerPanelId) => {
      if (hoverTimerRef.current !== null) clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = setTimeout(() => setPanel(panel), hoverDelay);
    },
    [setPanel, hoverDelay],
  );

  const handleTriggerLeave = useCallback(() => {
    if (hoverTimerRef.current !== null) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
  }, []);

  const triggerStyles = useMemo(
    () => ({
      left: {
        position: 'absolute' as const,
        left: 0,
        top: 0,
        width: triggerSize,
        bottom: triggerSize,
        zIndex: 10,
      },
      right: {
        position: 'absolute' as const,
        right: 0,
        top: 0,
        width: triggerSize,
        bottom: triggerSize,
        zIndex: 10,
      },
      up: {
        position: 'absolute' as const,
        top: 0,
        left: triggerSize,
        right: triggerSize,
        height: triggerSize,
        zIndex: 10,
      },
      down: {
        position: 'absolute' as const,
        bottom: 0,
        left: 0,
        right: 0,
        height: triggerSize,
        zIndex: 10,
      },
    }),
    [triggerSize],
  );

  const makePanelProps = useCallback(
    (
      side: MultiLayerPanelId,
      panelState: MultiLayerPanelState,
    ): MultiLayerPanelProps => ({
      fKey: `${fKey}-panel-${side}`,
      close: closePanel,
      panelState,
      onEvent: () => {
        resetPanelTimeout();
        return false;
      },
    }),
    [fKey, closePanel, resetPanelTimeout],
  );

  const wrapperStyle = useMemo<CSSProperties>(
    () => ({
      position: 'relative',
      width: '100%',
      height: '100%',
      overflow: 'hidden',
    }),
    [],
  );

  return (
    <FocusProvider>
      <div style={wrapperStyle}>
        {baseLayer()}

        {notification && (
          <div style={notificationOverlayStyle}>{notification()}</div>
        )}

        {zapChannel && zapBanner && (
          <div style={notificationOverlayStyle}>{zapBanner()}</div>
        )}

        {(activePanel !== null || closingPanel !== null) && (
          <div
            style={{ position: 'absolute', inset: 0, zIndex: 9 }}
            onClick={closePanel}
          />
        )}

        {left &&
          (activePanel === 'left' || closingPanel === 'left') &&
          left(
            makePanelProps(
              'left',
              closingPanel === 'left'
                ? 'closing'
                : openingPanel === 'left'
                  ? 'opening'
                  : 'open',
            ),
          )}
        {right &&
          (activePanel === 'right' || closingPanel === 'right') &&
          right(
            makePanelProps(
              'right',
              closingPanel === 'right'
                ? 'closing'
                : openingPanel === 'right'
                  ? 'opening'
                  : 'open',
            ),
          )}
        {up &&
          (activePanel === 'up' || closingPanel === 'up') &&
          up(
            makePanelProps(
              'up',
              closingPanel === 'up'
                ? 'closing'
                : openingPanel === 'up'
                  ? 'opening'
                  : 'open',
            ),
          )}
        {down &&
          (activePanel === 'down' || closingPanel === 'down') &&
          down(
            makePanelProps(
              'down',
              closingPanel === 'down'
                ? 'closing'
                : openingPanel === 'down'
                  ? 'opening'
                  : 'open',
            ),
          )}

        {activePanel === null && closingPanel === null && (
          <>
            {left && (
              <div
                style={triggerStyles.left}
                onMouseEnter={() => handleTriggerEnter('left')}
                onMouseLeave={handleTriggerLeave}
              />
            )}
            {right && (
              <div
                style={triggerStyles.right}
                onMouseEnter={() => handleTriggerEnter('right')}
                onMouseLeave={handleTriggerLeave}
              />
            )}
            {up && (
              <div
                style={triggerStyles.up}
                onMouseEnter={() => handleTriggerEnter('up')}
                onMouseLeave={handleTriggerLeave}
              />
            )}
            {down && (
              <div
                style={triggerStyles.down}
                onMouseEnter={() => handleTriggerEnter('down')}
                onMouseLeave={handleTriggerLeave}
              />
            )}
          </>
        )}
      </div>
    </FocusProvider>
  );
}

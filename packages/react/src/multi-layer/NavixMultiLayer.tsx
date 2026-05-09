import { MultiLayerBehavior } from './MultiLayerBehavior';
import type { NavixMultiLayerPanelId } from './MultiLayerBehavior';
import type { FocusNode } from '../core/FocusNode';
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

export type { NavixMultiLayerPanelId };

export type NavixMultiLayerPanelState = 'opening' | 'open' | 'closing';

export interface NavixMultiLayerPanelProps extends BaseComponentProps {
  close: () => void;
  panelState: NavixMultiLayerPanelState;
}

interface MultiLayerProps extends BaseComponentProps {
  onExitRequest?: () => void;
  baseLayer: () => ReactNode;
  left?: (props: NavixMultiLayerPanelProps) => ReactNode;
  right?: (props: NavixMultiLayerPanelProps) => ReactNode;
  up?: (props: NavixMultiLayerPanelProps) => ReactNode;
  down?: (props: NavixMultiLayerPanelProps) => ReactNode;
  onPrev?: () => boolean;
  onNext?: () => boolean;
  onTogglePlay?: () => void;
  zapBanner?: () => ReactNode;
  notification?: () => ReactNode;
  panelTimeout?: number;
  triggerSize?: number;
  hoverDelay?: number;
  transitionDuration?: number;
}

export function NavixMultiLayer({
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
  onTogglePlay,
  panelTimeout = 4000,
  triggerSize = 200,
  hoverDelay = 100,
  transitionDuration = 250,
}: MultiLayerProps) {
  const [activePanel, setActivePanel] = useState<NavixMultiLayerPanelId | null>(
    null,
  );
  const [openingPanel, setOpeningPanel] = useState<NavixMultiLayerPanelId | null>(
    null,
  );
  const [closingPanel, setClosingPanel] = useState<NavixMultiLayerPanelId | null>(
    null,
  );
  const activePanelRef = useRef<NavixMultiLayerPanelId | null>(null);
  const [zapChannel, setZapChannel] = useState<boolean>(true);
  const panelTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const zapTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onNextRef = useRef(onNext);
  const onPrevRef = useRef(onPrev);
  const onExitRequestRef = useRef(onExitRequest);
  const onTogglePlayRef = useRef(onTogglePlay);
  const resetPanelTimeoutRef = useRef<() => void>(() => { });
  onNextRef.current = onNext;
  onPrevRef.current = onPrev;
  onExitRequestRef.current = onExitRequest;
  onTogglePlayRef.current = onTogglePlay;

  const setPanel = useCallback(
    (panel: NavixMultiLayerPanelId | null) => {
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
  resetPanelTimeoutRef.current = resetPanelTimeout;

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
        onTogglePlay: () => onTogglePlayRef.current?.(),
        onPanelOpen: (panel: NavixMultiLayerPanelId) => setPanel(panel),
        onPanelClose: () => setPanel(null),
        onExitRequest: () => onExitRequestRef.current?.(),
        onPanelReset: () => resetPanelTimeoutRef.current(),
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
    (panel: NavixMultiLayerPanelId) => {
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
      },
      right: {
        position: 'absolute' as const,
        right: 0,
        top: 0,
        width: triggerSize,
        bottom: triggerSize,
      },
      up: {
        position: 'absolute' as const,
        top: 0,
        left: triggerSize,
        right: triggerSize,
        height: triggerSize,
      },
      down: {
        position: 'absolute' as const,
        bottom: 0,
        left: 0,
        right: 0,
        height: triggerSize,
      },
    }),
    [triggerSize],
  );

  const makePanelProps = useCallback(
    (
      side: NavixMultiLayerPanelId,
      panelState: NavixMultiLayerPanelState,
    ): NavixMultiLayerPanelProps => ({
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
      <div data-navix-node-id={node.id} style={wrapperStyle}>
        <div
          style={{ position: 'absolute', inset: 0 }}
          onClick={
            activePanel === null && closingPanel === null
              ? () => onTogglePlayRef.current?.()
              : undefined
          }
        >
          {baseLayer()}
        </div>

        {notification && (
          <div style={notificationOverlayStyle}>{notification()}</div>
        )}

        {zapChannel && zapBanner && (
          <div style={notificationOverlayStyle}>{zapBanner()}</div>
        )}

        {(activePanel !== null || closingPanel !== null) && (
          <div
            style={{ position: 'absolute', inset: 0, zIndex: 10 }}
            onClick={closePanel}
          >
            {left && (activePanel === 'left' || closingPanel === 'left') && (
              <div onClick={(e) => e.stopPropagation()}>
                {left(
                  makePanelProps(
                    'left',
                    closingPanel === 'left'
                      ? 'closing'
                      : openingPanel === 'left'
                        ? 'opening'
                        : 'open',
                  ),
                )}
              </div>
            )}
            {right && (activePanel === 'right' || closingPanel === 'right') && (
              <div onClick={(e) => e.stopPropagation()}>
                {right(
                  makePanelProps(
                    'right',
                    closingPanel === 'right'
                      ? 'closing'
                      : openingPanel === 'right'
                        ? 'opening'
                        : 'open',
                  ),
                )}
              </div>
            )}
            {up && (activePanel === 'up' || closingPanel === 'up') && (
              <div onClick={(e) => e.stopPropagation()}>
                {up(
                  makePanelProps(
                    'up',
                    closingPanel === 'up'
                      ? 'closing'
                      : openingPanel === 'up'
                        ? 'opening'
                        : 'open',
                  ),
                )}
              </div>
            )}
            {down && (activePanel === 'down' || closingPanel === 'down') && (
              <div onClick={(e) => e.stopPropagation()}>
                {down(
                  makePanelProps(
                    'down',
                    closingPanel === 'down'
                      ? 'closing'
                      : openingPanel === 'down'
                        ? 'opening'
                        : 'open',
                  ),
                )}
              </div>
            )}
          </div>
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

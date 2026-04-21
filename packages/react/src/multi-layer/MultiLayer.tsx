import { MultiLayerBehavior } from '@navix/core';
import type { MultiLayerPanelId } from '@navix/core';
import type { FocusNode } from '@navix/core';
import { useState, useEffect, useRef, useCallback, useMemo, type ReactNode } from 'react';
import type { CSSProperties } from 'react';

const overlayStyle: CSSProperties = { position: 'absolute', inset: 0 };

import type { BaseComponentProps } from '../types';
import { useFocusable } from '../useFocusable';

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

  const onNextRef = useRef(onNext);
  const onPrevRef = useRef(onPrev);
  const onExitRequestRef = useRef(onExitRequest);
  onNextRef.current = onNext;
  onPrevRef.current = onPrev;
  onExitRequestRef.current = onExitRequest;

  const setPanel = useCallback((panel: MultiLayerPanelId | null) => {
    activePanelRef.current = panel;
    setActivePanel(panel);
  }, []);

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

  const makePanelProps = useCallback(
    (side: MultiLayerPanelId): MultiLayerPanelProps => ({
      fKey: `${fKey}-panel-${side}`,
      close: closePanel,
      onEvent: () => {
        resetPanelTimeout();
        return false;
      },
    }),
    [fKey, closePanel, resetPanelTimeout],
  );

  const wrapperStyle = useMemo<CSSProperties>(
    () => ({ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }),
    [],
  );

  return (
    <FocusProvider>
      <div style={wrapperStyle}>
        {baseLayer()}

        {notification && (
          <div style={overlayStyle}>{notification()}</div>
        )}

        {zapChannel && zapBanner && (
          <div style={overlayStyle}>{zapBanner()}</div>
        )}

        {left && activePanel === 'left' && (
          <div style={overlayStyle}>{left(makePanelProps('left'))}</div>
        )}

        {right && activePanel === 'right' && (
          <div style={overlayStyle}>{right(makePanelProps('right'))}</div>
        )}

        {up && activePanel === 'up' && (
          <div style={overlayStyle}>{up(makePanelProps('up'))}</div>
        )}

        {down && activePanel === 'down' && (
          <div style={overlayStyle}>{down(makePanelProps('down'))}</div>
        )}
      </div>
    </FocusProvider>
  );
}

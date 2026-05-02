import 'dart:async';

import 'package:flutter/widgets.dart';

import '../core/nav_event.dart';
import '../core/focus_node.dart';
import 'navix_focusable.dart';

enum NavixPanelId { left, right, up, down }

enum NavixPanelState { opening, open, closing }

class NavixMultiLayerPanelProps {
  final String fKey;
  final VoidCallback close;
  final NavixPanelState panelState;
  final void Function(String key)? onFocus;
  final void Function(String key)? onBlurred;
  final void Function(String key)? onRegister;
  final void Function(String key)? onUnregister;
  final bool Function(NavEvent event)? onEvent;

  const NavixMultiLayerPanelProps({
    required this.fKey,
    required this.close,
    required this.panelState,
    this.onFocus,
    this.onBlurred,
    this.onRegister,
    this.onUnregister,
    this.onEvent,
  });
}

class _MultiLayerBehavior extends IFocusNodeBehavior {
  NavixPanelId? activePanel;
  Map<NavixPanelId, bool> panels = {
    NavixPanelId.left: false,
    NavixPanelId.right: false,
    NavixPanelId.up: false,
    NavixPanelId.down: false,
  };

  final VoidCallback onChannelNext;
  final VoidCallback onChannelPrev;
  final VoidCallback onTogglePlay;
  final void Function(NavixPanelId panel) onPanelOpen;
  final VoidCallback onPanelClose;
  final VoidCallback onExitRequest;

  @override
  final bool isTrapped = true;

  _MultiLayerBehavior({
    required this.onChannelNext,
    required this.onChannelPrev,
    required this.onTogglePlay,
    required this.onPanelOpen,
    required this.onPanelClose,
    required this.onExitRequest,
  }) {
    onEvent = _handleEvent;
    onUnregister = _onUnregister;
  }

  bool _handleEvent(NavEvent event) {
    if (event.type != NavEventType.press) return true;

    if (activePanel != null) {
      if (event.action == 'back') {
        activePanel = null;
        onPanelClose();
        return true;
      }
      // Panel bubble up etmiş (false döndürdü) — sadece medya tuşlarını handle et
      switch (event.action) {
        case 'program_up':
          onChannelNext();
        case 'program_down':
          onChannelPrev();
        case 'play_pause':
        case 'play':
        case 'pause':
          onTogglePlay();
      }
      return true;
    }

    switch (event.action) {
      case 'left':
        _tryOpenPanel(NavixPanelId.left);
      case 'right':
        _tryOpenPanel(NavixPanelId.right);
      case 'up':
        _tryOpenPanel(NavixPanelId.up);
      case 'down':
        _tryOpenPanel(NavixPanelId.down);
      case 'program_up':
        onChannelNext();
      case 'program_down':
        onChannelPrev();
      case 'enter':
      case 'play_pause':
      case 'play':
      case 'pause':
        onTogglePlay();
      case 'back':
        onExitRequest();
    }

    return true;
  }

  void _tryOpenPanel(NavixPanelId id) {
    if (panels[id] == true) {
      activePanel = id;
      onPanelOpen(id);
    }
  }

  void _onUnregister() {
    activePanel = null;
  }
}

class NavixMultiLayer extends StatefulWidget {
  final String fKey;
  final Widget Function() baseLayer;
  final Widget Function(NavixMultiLayerPanelProps props)? left;
  final Widget Function(NavixMultiLayerPanelProps props)? right;
  final Widget Function(NavixMultiLayerPanelProps props)? up;
  final Widget Function(NavixMultiLayerPanelProps props)? down;
  final bool Function()? onNext;
  final bool Function()? onPrev;
  final VoidCallback? onTogglePlay;
  final Widget Function()? zapBanner;
  final Widget Function()? notification;
  final VoidCallback? onExitRequest;
  final int panelTimeout;
  final double triggerSize;
  final int hoverDelay;
  final int transitionDuration;
  final void Function(String key)? onFocus;
  final void Function(String key)? onBlurred;
  final void Function(String key)? onRegister;
  final void Function(String key)? onUnregister;
  final bool Function(NavEvent event)? onEvent;

  const NavixMultiLayer({
    super.key,
    required this.fKey,
    required this.baseLayer,
    this.left,
    this.right,
    this.up,
    this.down,
    this.onNext,
    this.onPrev,
    this.onTogglePlay,
    this.zapBanner,
    this.notification,
    this.onExitRequest,
    this.panelTimeout = 4000,
    this.triggerSize = 200,
    this.hoverDelay = 300,
    this.transitionDuration = 250,
    this.onFocus,
    this.onBlurred,
    this.onRegister,
    this.onUnregister,
    this.onEvent,
  });

  @override
  State<NavixMultiLayer> createState() => _NavixMultiLayerState();
}

class _NavixMultiLayerState extends State<NavixMultiLayer> {
  NavixPanelId? _activePanel;
  NavixPanelId? _openingPanel;
  NavixPanelId? _closingPanel;
  bool _zapVisible = false;

  _MultiLayerBehavior? _behavior;
  NavixFocusNode? _node;

  Timer? _panelTimer;
  Timer? _zapTimer;
  Timer? _closingTimer;
  Timer? _hoverTimer;

  void _setPanel(NavixPanelId? panel) {
    if (panel == null) {
      final current = _activePanel;
      if (current == null) return;
      setState(() {
        _activePanel = null;
        _closingPanel = current;
        _openingPanel = null;
      });
      _closingTimer?.cancel();
      _closingTimer = Timer(
        Duration(milliseconds: widget.transitionDuration),
        () => setState(() => _closingPanel = null),
      );
    } else {
      setState(() {
        _activePanel = panel;
        _closingPanel = null;
        _openingPanel = panel;
      });
      // Next frame: switch opening → open so transition triggers
      WidgetsBinding.instance.addPostFrameCallback(
        (_) => setState(() => _openingPanel = null),
      );
    }
  }

  void _closePanel() {
    _setPanel(null);
    _behavior?.activePanel = null;
    _panelTimer?.cancel();
    _node?.requestFocus();
  }

  void _resetPanelTimeout() {
    _panelTimer?.cancel();
    if (_activePanel == null) return;
    _panelTimer = Timer(
      Duration(milliseconds: widget.panelTimeout),
      () => _setPanel(null),
    );
  }

  void _showZap() {
    setState(() => _zapVisible = true);
    _zapTimer?.cancel();
    _zapTimer = Timer(const Duration(seconds: 2), () {
      setState(() => _zapVisible = false);
    });
  }

  void _onPanelOpen(NavixPanelId panel) {
    _setPanel(panel);
    _behavior?.activePanel = panel;

    // Focus the panel's node after it mounts
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_node == null) return;
      final panelKey = '${widget.fKey}-panel-${panel.name}';
      final child = _node!.children.cast<NavixFocusNode?>().firstWhere(
            (c) => c!.key == panelKey,
            orElse: () => null,
          );
      child?.requestFocus();
    });
  }

  void _onPanelClose() {
    _closePanel();
  }

  @override
  void didUpdateWidget(NavixMultiLayer oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (_behavior != null) {
      _behavior!.panels = {
        NavixPanelId.left: widget.left != null,
        NavixPanelId.right: widget.right != null,
        NavixPanelId.up: widget.up != null,
        NavixPanelId.down: widget.down != null,
      };
    }
    if (_activePanel != null) _resetPanelTimeout();
  }

  @override
  void dispose() {
    _panelTimer?.cancel();
    _zapTimer?.cancel();
    _closingTimer?.cancel();
    _hoverTimer?.cancel();
    super.dispose();
  }

  NavixMultiLayerPanelProps _makePanelProps(NavixPanelId side) {
    final panelState = _closingPanel == side
        ? NavixPanelState.closing
        : _openingPanel == side
            ? NavixPanelState.opening
            : NavixPanelState.open;

    return NavixMultiLayerPanelProps(
      fKey: '${widget.fKey}-panel-${side.name}',
      close: _closePanel,
      panelState: panelState,
      onEvent: (event) {
        _resetPanelTimeout();
        return false;
      },
    );
  }

  void _handleTriggerEnter(NavixPanelId panel) {
    _hoverTimer?.cancel();
    _hoverTimer = Timer(
      Duration(milliseconds: widget.hoverDelay),
      () => _onPanelOpen(panel),
    );
  }

  void _handleTriggerLeave() {
    _hoverTimer?.cancel();
    _hoverTimer = null;
  }

  bool get _panelVisible => _activePanel != null || _closingPanel != null;

  @override
  Widget build(BuildContext context) {
    return NavixFocusable(
      fKey: widget.fKey,
      callbacks: NavixFocusableCallbacks(
        onFocus: widget.onFocus,
        onBlurred: widget.onBlurred,
        onRegister: widget.onRegister,
        onUnregister: widget.onUnregister,
        onEvent: widget.onEvent,
      ),
      createBehavior: (node) {
        _node = node;
        _behavior = _MultiLayerBehavior(
          onChannelNext: () {
            if (widget.onNext?.call() == true) _showZap();
          },
          onChannelPrev: () {
            if (widget.onPrev?.call() == true) _showZap();
          },
          onTogglePlay: () => widget.onTogglePlay?.call(),
          onPanelOpen: _onPanelOpen,
          onPanelClose: _onPanelClose,
          onExitRequest: () => widget.onExitRequest?.call(),
        );
        _behavior!.panels = {
          NavixPanelId.left: widget.left != null,
          NavixPanelId.right: widget.right != null,
          NavixPanelId.up: widget.up != null,
          NavixPanelId.down: widget.down != null,
        };
        return _behavior!;
      },
      builder: (context, node, focused, directlyFocused) {
        return Stack(
          children: [
            // Base layer
            Positioned.fill(
              child: GestureDetector(
                onTap: _panelVisible ? null : () => widget.onTogglePlay?.call(),
                child: widget.baseLayer(),
              ),
            ),

            // Notification overlay
            if (widget.notification != null)
              Positioned.fill(
                child: IgnorePointer(child: widget.notification!()),
              ),

            // Zap banner
            if (_zapVisible && widget.zapBanner != null)
              Positioned.fill(
                child: IgnorePointer(child: widget.zapBanner!()),
              ),

            // Backdrop — tapping outside panel closes it
            if (_panelVisible)
              Positioned.fill(
                child: GestureDetector(
                  onTap: _closePanel,
                  child: const ColoredBox(color: Color(0x00000000)),
                ),
              ),

            // Panels
            if (_panelVisible)
              Positioned.fill(
                child: Stack(
                  children: [
                    if (widget.left != null &&
                        (_activePanel == NavixPanelId.left ||
                            _closingPanel == NavixPanelId.left))
                      widget.left!(_makePanelProps(NavixPanelId.left)),
                    if (widget.right != null &&
                        (_activePanel == NavixPanelId.right ||
                            _closingPanel == NavixPanelId.right))
                      widget.right!(_makePanelProps(NavixPanelId.right)),
                    if (widget.up != null &&
                        (_activePanel == NavixPanelId.up ||
                            _closingPanel == NavixPanelId.up))
                      widget.up!(_makePanelProps(NavixPanelId.up)),
                    if (widget.down != null &&
                        (_activePanel == NavixPanelId.down ||
                            _closingPanel == NavixPanelId.down))
                      widget.down!(_makePanelProps(NavixPanelId.down)),
                  ],
                ),
              ),

            // Hover trigger zones (only when no panel open)
            if (!_panelVisible) ...[
              if (widget.left != null)
                Positioned(
                  left: 0,
                  top: 0,
                  bottom: widget.triggerSize,
                  width: widget.triggerSize,
                  child: MouseRegion(
                    onEnter: (_) => _handleTriggerEnter(NavixPanelId.left),
                    onExit: (_) => _handleTriggerLeave(),
                  ),
                ),
              if (widget.right != null)
                Positioned(
                  right: 0,
                  top: 0,
                  bottom: widget.triggerSize,
                  width: widget.triggerSize,
                  child: MouseRegion(
                    onEnter: (_) => _handleTriggerEnter(NavixPanelId.right),
                    onExit: (_) => _handleTriggerLeave(),
                  ),
                ),
              if (widget.up != null)
                Positioned(
                  top: 0,
                  left: widget.triggerSize,
                  right: widget.triggerSize,
                  height: widget.triggerSize,
                  child: MouseRegion(
                    onEnter: (_) => _handleTriggerEnter(NavixPanelId.up),
                    onExit: (_) => _handleTriggerLeave(),
                  ),
                ),
              if (widget.down != null)
                Positioned(
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: widget.triggerSize,
                  child: MouseRegion(
                    onEnter: (_) => _handleTriggerEnter(NavixPanelId.down),
                    onExit: (_) => _handleTriggerLeave(),
                  ),
                ),
            ],
          ],
        );
      },
    );
  }
}

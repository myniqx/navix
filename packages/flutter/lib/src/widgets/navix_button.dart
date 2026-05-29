import 'package:flutter/widgets.dart';

import '../core/nav_event.dart';
import '../core/focus_node.dart';
import 'navix_focusable.dart';

typedef NavixButtonBuilder = Widget Function(
  BuildContext context,
  bool focused,
);

class NavixButton extends StatefulWidget {
  final String fKey;
  final VoidCallback? onClick;
  final VoidCallback? onLongPress;
  final VoidCallback? onDoublePress;
  final bool disabled;
  final bool focusOnRegister;
  final void Function(String key)? onFocus;
  final void Function(String key)? onBlurred;
  final void Function(String key)? onRegister;
  final void Function(String key)? onUnregister;
  final bool Function(NavEvent event)? onEvent;
  final NavixButtonBuilder? builder;
  final Widget? child;

  const NavixButton({
    super.key,
    required this.fKey,
    this.onClick,
    this.onLongPress,
    this.onDoublePress,
    this.disabled = false,
    this.focusOnRegister = false,
    this.onFocus,
    this.onBlurred,
    this.onRegister,
    this.onUnregister,
    this.onEvent,
    this.builder,
    this.child,
  }) : assert(
          builder != null || child != null,
          'NavixButton requires either builder or child',
        );

  @override
  State<NavixButton> createState() => _NavixButtonState();
}

class _NavixButtonState extends State<NavixButton> {
  late final _ButtonBehavior _behavior;

  @override
  void initState() {
    super.initState();
    _behavior = _ButtonBehavior(
      onPress: widget.onClick,
      onLongPress: widget.onLongPress,
      onDoublePress: widget.onDoublePress,
    );
  }

  @override
  void didUpdateWidget(NavixButton oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.onClick != widget.onClick ||
        oldWidget.onLongPress != widget.onLongPress ||
        oldWidget.onDoublePress != widget.onDoublePress) {
      _behavior.update(
        onPress: widget.onClick,
        onLongPress: widget.onLongPress,
        onDoublePress: widget.onDoublePress,
      );
    }
  }

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
        disabled: widget.disabled,
        focusOnRegister: widget.focusOnRegister,
      ),
      createBehavior: (_) => _behavior,
      builder: (context, node, focused, directlyFocused) {
        final content = widget.builder != null
            ? widget.builder!(context, directlyFocused)
            : widget.child!;

        return MouseRegion(
          onEnter: (_) => node.requestFocus(),
          child: GestureDetector(
            onTap: widget.onClick,
            child: content,
          ),
        );
      },
    );
  }
}

class _ButtonBehavior extends IFocusNodeBehavior {
  VoidCallback? _onPress;
  VoidCallback? _onLongPress;
  VoidCallback? _onDoublePress;

  _ButtonBehavior({
    VoidCallback? onPress,
    VoidCallback? onLongPress,
    VoidCallback? onDoublePress,
  })  : _onPress = onPress,
        _onLongPress = onLongPress,
        _onDoublePress = onDoublePress {
    this.onEvent = _handleEvent;
  }

  void update({
    VoidCallback? onPress,
    VoidCallback? onLongPress,
    VoidCallback? onDoublePress,
  }) {
    _onPress = onPress;
    _onLongPress = onLongPress;
    _onDoublePress = onDoublePress;
  }

  bool _handleEvent(NavEvent event) {
    if (event.action != 'enter') return false;

    switch (event.type) {
      case NavEventType.press:
        _onPress?.call();
        return true;
      case NavEventType.longPress:
        _onLongPress?.call();
        return true;
      case NavEventType.doublePress:
        _onDoublePress?.call();
        return true;
    }
  }
}

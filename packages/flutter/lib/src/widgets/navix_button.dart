import 'package:flutter/widgets.dart';

import '../core/nav_event.dart';
import '../core/focus_node.dart';
import 'navix_focusable.dart';

typedef NavixButtonBuilder = Widget Function(
  BuildContext context,
  bool focused,
);

class NavixButton extends StatelessWidget {
  final String fKey;
  final VoidCallback? onClick;
  final VoidCallback? onLongPress;
  final VoidCallback? onDoublePress;
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
  Widget build(BuildContext context) {
    return NavixFocusable(
      fKey: fKey,
      callbacks: NavixFocusableCallbacks(
        onFocus: onFocus,
        onBlurred: onBlurred,
        onRegister: onRegister,
        onUnregister: onUnregister,
        onEvent: onEvent,
      ),
      createBehavior: (node) => _ButtonBehavior(
        onPress: onClick,
        onLongPress: onLongPress,
        onDoublePress: onDoublePress,
      ),
      builder: (context, node, focused, directlyFocused) {
        final content =
            builder != null ? builder!(context, directlyFocused) : child!;

        return MouseRegion(
          onEnter: (_) => node.requestFocus(),
          child: GestureDetector(
            onTap: onClick,
            child: content,
          ),
        );
      },
    );
  }
}

class _ButtonBehavior extends IFocusNodeBehavior {
  final VoidCallback? _onPress;
  final VoidCallback? _onLongPress;
  final VoidCallback? _onDoublePress;

  _ButtonBehavior({
    VoidCallback? onPress,
    VoidCallback? onLongPress,
    VoidCallback? onDoublePress,
  })  : _onPress = onPress,
        _onLongPress = onLongPress,
        _onDoublePress = onDoublePress {
    this.onEvent = _handleEvent;
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

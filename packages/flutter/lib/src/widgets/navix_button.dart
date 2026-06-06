import 'package:flutter/widgets.dart';

import '../core/nav_event.dart';
import '../core/focus_node.dart';
import 'navix_focusable.dart';

/// Signature for the builder of [NavixButton].
///
/// - [focused] — `true` when this button is the deepest active leaf.
typedef NavixButtonBuilder = Widget Function(
  BuildContext context,
  bool focused,
);

/// A leaf focusable button.
///
/// Fires [onClick] on keyboard Enter press and on tap. Supports [onLongPress]
/// and [onDoublePress] for keyboard-only gestures.  Mouse hover calls
/// [NavixFocusNode.requestFocus] automatically.
///
/// Provide either a [builder] (for full control over focused state) or a
/// static [child] widget:
///
/// ```dart
/// NavixButton(
///   fKey: 'play',
///   onClick: play,
///   builder: (context, focused) => Container(
///     color: focused ? Colors.blue : Colors.grey,
///     child: const Text('▶ Play'),
///   ),
/// )
/// ```
class NavixButton extends StatefulWidget {
  /// Unique string identifier for this node.
  final String fKey;

  /// Called on Enter key press and on tap.
  final VoidCallback? onClick;

  /// Called on Enter long-press. Requires [ActionConfig.longPress] to be
  /// enabled for the `'enter'` action (it is enabled in [defaultInputConfig]).
  final VoidCallback? onLongPress;

  /// Called on Enter double-press. Requires [ActionConfig.doublePress] to be
  /// enabled for the `'enter'` action.
  final VoidCallback? onDoublePress;

  /// Prevents this button from receiving focus. Default: `false`.
  final bool disabled;

  /// Auto-focus this button when it registers. Default: `false`.
  final bool focusOnRegister;

  /// Called when this node becomes directly focused.
  final void Function(String key)? onFocus;

  /// Called when this node loses direct focus.
  final void Function(String key)? onBlurred;

  /// Called when this node registers with its parent.
  final void Function(String key)? onRegister;

  /// Called when this node is unregistered (widget disposed).
  final void Function(String key)? onUnregister;

  /// Custom event handler. Return `true` to consume, `false` to bubble.
  final bool Function(NavEvent event)? onEvent;

  /// Builder for full control over the focused state. Provide this **or**
  /// [child], not both.
  final NavixButtonBuilder? builder;

  /// Static child widget. Provide this **or** [builder], not both.
  final Widget? child;

  /// Creates a [NavixButton]. Exactly one of [builder] or [child] must be
  /// provided.
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

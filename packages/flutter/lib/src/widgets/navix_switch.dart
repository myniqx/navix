import 'package:flutter/widgets.dart';

import '../core/nav_event.dart';
import 'navix_button.dart';

/// Signature for the builder of [NavixSwitch].
///
/// - [checked] — the current toggle state.
/// - [focused] — `true` when this switch is the deepest active leaf.
typedef NavixSwitchBuilder = Widget Function(
  BuildContext context,
  bool checked,
  bool focused,
);

/// A controlled boolean toggle built on [NavixButton].
///
/// Enter key press or tap flips [checked] and calls [onChange] with the new
/// value. You are responsible for updating [checked] in response to [onChange]
/// (controlled pattern).
///
/// ```dart
/// NavixSwitch(
///   fKey: 'notifications',
///   checked: enabled,
///   onChange: (v) => setState(() => enabled = v),
///   builder: (context, checked, focused) => Text(checked ? 'On' : 'Off'),
/// )
/// ```
class NavixSwitch extends StatelessWidget {
  /// Unique string identifier for this node.
  final String fKey;

  /// Current toggle state. Reflected in the [builder]'s `checked` argument.
  final bool checked;

  /// Called with the new boolean value when the toggle is flipped.
  final void Function(bool checked) onChange;

  /// Builder for the visual representation.
  final NavixSwitchBuilder builder;

  /// Prevents this switch from receiving focus. Default: `false`.
  final bool disabled;

  /// Auto-focus this switch when it registers. Default: `false`.
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

  /// Creates a [NavixSwitch].
  const NavixSwitch({
    super.key,
    required this.fKey,
    required this.checked,
    required this.onChange,
    required this.builder,
    this.disabled = false,
    this.focusOnRegister = false,
    this.onFocus,
    this.onBlurred,
    this.onRegister,
    this.onUnregister,
    this.onEvent,
  });

  @override
  Widget build(BuildContext context) {
    return NavixButton(
      fKey: fKey,
      onClick: () => onChange(!checked),
      disabled: disabled,
      focusOnRegister: focusOnRegister,
      onFocus: onFocus,
      onBlurred: onBlurred,
      onRegister: onRegister,
      onUnregister: onUnregister,
      onEvent: onEvent,
      builder: (context, focused) => builder(context, checked, focused),
    );
  }
}

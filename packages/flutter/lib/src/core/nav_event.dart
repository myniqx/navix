/// The press style of a [NavEvent].
enum NavEventType {
  /// A single key press (key-down + key-up without a long-press timer firing).
  press,

  /// A long-press: the key was held for at least [ActionConfig.longPressMs]
  /// milliseconds before being released.
  longPress,

  /// A double-press: two presses within [ActionConfig.doublePressMs]
  /// milliseconds.
  doublePress,
}

/// A navigation event dispatched by [NavixFocusManager] and routed through the
/// focus tree.
///
/// Every physical key interaction is translated to a [NavEvent] before
/// entering the tree. Widgets and behaviors inspect [action] to decide what
/// to do (e.g. `'enter'`, `'left'`) and [type] to distinguish press styles.
class NavEvent {
  /// The logical action name, e.g. `'left'`, `'right'`, `'up'`, `'down'`,
  /// `'enter'`, `'back'`, `'play'`, `'pause'`, `'play_pause'`,
  /// `'program_up'`, `'program_down'`, or any custom action defined in
  /// [ActionConfig].
  final String action;

  /// Whether this event is a single press, long-press, or double-press.
  final NavEventType type;

  /// Creates a [NavEvent] with the given [action] and [type].
  const NavEvent({required this.action, required this.type});
}

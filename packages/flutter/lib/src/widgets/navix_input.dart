import 'package:flutter/widgets.dart';

import '../core/nav_event.dart';
import '../core/focus_node.dart';
import 'navix_focusable.dart';

class _InputBehavior extends IFocusNodeBehavior {
  final NavixFocusNode _node;
  final void Function(bool editing) _onChange;
  bool isEditing = false;

  _InputBehavior(this._node, this._onChange) {
    onEvent = _handleEvent;
    onUnregister = _onUnregister;
  }

  @override
  bool get isTrapped => isEditing;

  bool _handleEvent(NavEvent event) {
    if (!isEditing) {
      if (event.action == 'enter' && event.type == NavEventType.press) {
        _startEditing();
        return true;
      }
      return false;
    }

    if ((event.action == 'back' || event.action == 'enter') &&
        event.type == NavEventType.press) {
      _stopEditing();
      return true;
    }

    // Editing: swallow all nav events — focus stays on this input.
    return true;
  }

  void _onUnregister() {
    isEditing = false;
  }

  void _startEditing() {
    if (isEditing) return;
    _node.requestFocus();
    isEditing = true;
    _onChange(true);
  }

  void _stopEditing() {
    if (!isEditing) return;
    isEditing = false;
    _onChange(false);
  }
}

/// Signature for the builder of [NavixInput].
///
/// - [focused] — `true` when this node is on the active focus path.
/// - [editing] — `true` while the text field is in editing mode (keyboard trapped).
/// - `controller` — the [TextEditingController] synced with [NavixInput.value];
///   pass directly to `TextField`.
/// - `textFocusNode` — Flutter's own [FocusNode] for the [TextField]; pass
///   directly to `TextField`.
/// - [stopEditing] — call to exit editing mode programmatically (e.g. from a
///   "Done" button inside the builder).
typedef NavixInputBuilder = Widget Function(
  BuildContext context,
  bool focused,
  bool editing,
  TextEditingController controller,
  FocusNode textFocusNode,
  VoidCallback stopEditing,
);

/// A two-state text input widget.
///
/// **Idle**: behaves like any other focusable — arrow keys and Back bubble
/// normally.  **Editing**: focus is trapped inside this widget, all nav events
/// are swallowed, and the native [TextField] receives keyboard input.
///
/// Enter starts editing; Enter or Back stops editing.
///
/// You own the [TextField] — pass `controller` and `textFocusNode` from the
/// builder arguments directly:
///
/// ```dart
/// NavixInput(
///   fKey: 'search',
///   value: query,
///   onChange: (v) => setState(() => query = v),
///   builder: (context, focused, editing, controller, textFocusNode, stopEditing) {
///     return TextField(
///       controller: controller,
///       focusNode: textFocusNode,
///     );
///   },
/// )
/// ```
class NavixInput extends StatefulWidget {
  /// Unique string identifier for this node.
  final String fKey;

  /// The controlled text value. Synced to the [TextEditingController] whenever
  /// the widget is not in editing mode.
  final String value;

  /// Called on every keystroke while editing.
  final void Function(String value) onChange;

  /// Builder for the visible widget. Receives a [TextEditingController] and a
  /// [FocusNode] to pass to a [TextField].
  final NavixInputBuilder builder;

  /// Prevents this input from receiving focus. Default: `false`.
  final bool disabled;

  /// Auto-focus this input when it registers. Default: `false`.
  final bool focusOnRegister;

  /// Called when this node becomes directly focused (idle mode).
  final void Function(String key)? onFocus;

  /// Called when this node loses direct focus.
  final void Function(String key)? onBlurred;

  /// Called when this node registers with its parent.
  final void Function(String key)? onRegister;

  /// Called when this node is unregistered (widget disposed).
  final void Function(String key)? onUnregister;

  /// Custom event handler (idle mode only). Return `true` to consume, `false`
  /// to bubble. While editing, all events are consumed internally.
  final bool Function(NavEvent event)? onEvent;

  /// Creates a [NavixInput].
  const NavixInput({
    super.key,
    required this.fKey,
    required this.value,
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
  State<NavixInput> createState() => _NavixInputState();
}

class _NavixInputState extends State<NavixInput> {
  bool _isEditing = false;
  _InputBehavior? _behavior;

  // Flutter's own FocusNode to control the TextField's keyboard focus.
  final FocusNode _textFocusNode = FocusNode();
  late TextEditingController _controller;
  bool _syncingController = false;

  @override
  void initState() {
    super.initState();
    _controller = TextEditingController(text: widget.value);
    _textFocusNode.canRequestFocus = false;
    _controller.addListener(_onControllerChanged);
    _textFocusNode.addListener(_onTextFocusChanged);
  }

  @override
  void didUpdateWidget(NavixInput oldWidget) {
    super.didUpdateWidget(oldWidget);
    // Sync controller when value changes from outside while not editing.
    if (!_isEditing && widget.value != _controller.text) {
      _syncingController = true;
      _controller.text = widget.value;
      _syncingController = false;
    }
  }

  @override
  void dispose() {
    _textFocusNode.removeListener(_onTextFocusChanged);
    _controller.removeListener(_onControllerChanged);
    _textFocusNode.dispose();
    _controller.dispose();
    super.dispose();
  }

  void _onControllerChanged() {
    if (_syncingController) return;
    if (_controller.text == widget.value) return;
    widget.onChange(_controller.text);
  }

  void _onTextFocusChanged() {
    if (!_isEditing && _textFocusNode.hasFocus) {
      _textFocusNode.unfocus();
      return;
    }
    if (_isEditing && !_textFocusNode.hasFocus) {
      _behavior?._stopEditing();
    }
  }

  void _onEditingChanged(bool editing) {
    setState(() => _isEditing = editing);
    if (editing) {
      _textFocusNode.canRequestFocus = true;
      _textFocusNode.requestFocus();
    } else {
      _textFocusNode.unfocus();
      _textFocusNode.canRequestFocus = false;
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
      createBehavior: (node) {
        _behavior = _InputBehavior(node, _onEditingChanged);
        return _behavior!;
      },
      builder: (context, node, focused, directlyFocused) {
        return MouseRegion(
          onEnter: (_) => node.requestFocus(),
          child: GestureDetector(
            onTap: () => _behavior?._startEditing(),
            child: widget.builder(
              context,
              directlyFocused,
              _isEditing,
              _controller,
              _textFocusNode,
              () => _behavior?._stopEditing(),
            ),
          ),
        );
      },
    );
  }
}

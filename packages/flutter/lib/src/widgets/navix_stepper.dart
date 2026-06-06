import 'dart:async';

import 'package:flutter/widgets.dart';

import '../core/nav_event.dart';
import '../core/focus_node.dart';
import 'navix_focusable.dart';

/// The step axis for a [NavixStepper].
enum NavixStepperOrientation {
  /// Left/right arrow keys increase/decrease the value.
  horizontal,

  /// Up/down arrow keys increase/decrease the value.
  vertical,
}

/// @nodoc — internal step event type; not part of the public API.
enum StepType { single, long, double_ }

/// The momentary direction of the last step — used by the built-in visual
/// renderers to give directional color feedback.
enum StepperStatus {
  /// No recent step; default resting state.
  natural,

  /// The value just increased.
  increase,

  /// The value just decreased.
  decrease,
}

/// Which built-in renderer to use for [NavixStepper].
enum NavixStepperRender {
  /// A draggable thumb on a track (similar to a scrollbar).
  scrollbar,

  /// A filled progress bar.
  progress,
}

/// Signature for a custom [NavixStepper] builder.
///
/// - [focused] — `true` when this node is the deepest active leaf.
/// - [status] — the momentary step direction ([StepperStatus]).
/// - [value] — the current value.
/// - [min], [max], [step] — the configured range and step size.
typedef NavixStepperBuilder = Widget Function(
  BuildContext context,
  bool focused,
  StepperStatus status,
  double value,
  double min,
  double max,
  double step,
);

/// A focusable single-value stepper.
///
/// Arrow keys along [orientation] increment or decrement the value by [step],
/// clamped to `[min, max]`. Built-in [render] modes draw a scrollbar-style
/// thumb or a progress fill; pass a [builder] for full visual control.
///
/// ```dart
/// NavixStepper(
///   fKey: 'volume',
///   orientation: NavixStepperOrientation.horizontal,
///   value: volume,
///   min: 0,
///   max: 100,
///   step: 2,
///   onChange: (v) => setState(() => volume = v),
/// )
/// ```
class NavixStepper extends StatefulWidget {
  /// Unique string identifier for this node.
  final String fKey;

  /// Which arrow keys control this stepper.
  final NavixStepperOrientation orientation;

  /// Built-in visual mode. Ignored when [builder] is provided.
  /// Default: [NavixStepperRender.scrollbar].
  final NavixStepperRender? render;

  /// Custom visual builder. When provided, [render] is ignored.
  final NavixStepperBuilder? builder;

  /// Controlled value. Omit for uncontrolled mode.
  final double? value;

  /// Initial value in uncontrolled mode. Defaults to [min].
  final double? defaultValue;

  /// Minimum allowed value. Default: `0`.
  final double min;

  /// Maximum allowed value. Default: `100`.
  final double max;

  /// Amount added or subtracted per arrow-key press. Default: `1`.
  final double step;

  /// Called with the new value on each step.
  final void Function(double value)? onChange;

  /// Allow long-press events to fire [onChange] repeatedly while held.
  /// Default: `false`.
  final bool long;

  /// Allow double-press events to fire [onChange]. Default: `false`.
  final bool double_;

  /// Duration in milliseconds before [StepperStatus] resets to
  /// [StepperStatus.natural] after a step. Default: `300`.
  final int feedbackTimeout;

  /// Prevents this stepper from receiving focus. Default: `false`.
  final bool disabled;

  /// Auto-focus this stepper when it registers. Default: `false`.
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

  /// Custom decoration for the track in the built-in renderers.
  final BoxDecoration? trackDecoration;

  /// Custom decoration for the thumb/fill in the built-in renderers.
  final BoxDecoration? thumbDecoration;

  /// Creates a [NavixStepper].
  const NavixStepper({
    super.key,
    required this.fKey,
    required this.orientation,
    this.render = NavixStepperRender.scrollbar,
    this.builder,
    this.value,
    this.defaultValue,
    this.min = 0,
    this.max = 100,
    this.step = 1,
    this.onChange,
    this.long = false,
    this.double_ = false,
    this.feedbackTimeout = 300,
    this.disabled = false,
    this.focusOnRegister = false,
    this.onFocus,
    this.onBlurred,
    this.onRegister,
    this.onUnregister,
    this.onEvent,
    this.trackDecoration,
    this.thumbDecoration,
  });

  @override
  State<NavixStepper> createState() => _NavixStepperState();
}

class _NavixStepperState extends State<NavixStepper> {
  late final _StepperBehavior _behavior;
  StepperStatus _status = StepperStatus.natural;
  Timer? _timer;
  late double _internalValue;

  bool get _isControlled => widget.value != null;

  double get _value => _isControlled
      ? widget.value!.clamp(widget.min, widget.max)
      : _internalValue;

  @override
  void initState() {
    super.initState();
    _internalValue = (widget.defaultValue ?? widget.min).clamp(widget.min, widget.max);
    _behavior = _StepperBehavior(
      orientation: widget.orientation,
      long: widget.long,
      double_: widget.double_,
      onDelta: _handleDelta,
    );
  }

  @override
  void didUpdateWidget(NavixStepper oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.orientation != widget.orientation ||
        oldWidget.long != widget.long ||
        oldWidget.double_ != widget.double_) {
      _behavior.update(
        orientation: widget.orientation,
        long: widget.long,
        double_: widget.double_,
        onDelta: _handleDelta,
      );
    }
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  void _handleDelta(int delta) {
    final newValue = (_value + delta * widget.step)
        .clamp(widget.min, widget.max);
    final rounded = (newValue / widget.step).round() * widget.step;
    final clamped = rounded.clamp(widget.min, widget.max);

    if (!_isControlled) setState(() => _internalValue = clamped);
    widget.onChange?.call(clamped);
    _triggerFeedback(delta > 0 ? StepperStatus.increase : StepperStatus.decrease);
  }

  void _triggerFeedback(StepperStatus s) {
    _timer?.cancel();
    setState(() => _status = s);
    _timer = Timer(Duration(milliseconds: widget.feedbackTimeout), () {
      if (mounted) setState(() => _status = StepperStatus.natural);
    });
  }

  Widget _buildScrollbar(bool focused) {
    final isHorizontal = widget.orientation == NavixStepperOrientation.horizontal;
    final ratio = widget.max > widget.min
        ? (_value - widget.min) / (widget.max - widget.min)
        : 0.0;
    const thumbSize = 16.0;

    final thumbColor = _status == StepperStatus.increase
        ? const Color(0xFF4FC3F7)
        : _status == StepperStatus.decrease
            ? const Color(0xFFEF9A9A)
            : focused
                ? const Color(0xFFFFFFFF)
                : const Color(0xFF888888);

    return LayoutBuilder(builder: (context, constraints) {
      final trackSize = isHorizontal ? constraints.maxWidth : constraints.maxHeight;
      final thumbOffset = ratio * (trackSize - thumbSize);

      return Container(
        width: isHorizontal ? double.infinity : 8,
        height: isHorizontal ? 8 : double.infinity,
        decoration: widget.trackDecoration ??
            BoxDecoration(
              color: focused ? const Color(0xFF555555) : const Color(0xFF333333),
              borderRadius: BorderRadius.circular(4),
            ),
        child: Stack(
          children: [
            AnimatedPositioned(
              duration: const Duration(milliseconds: 100),
              left: isHorizontal ? thumbOffset : 0,
              right: isHorizontal ? null : 0,
              top: isHorizontal ? 0 : thumbOffset,
              bottom: isHorizontal ? 0 : null,
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 150),
                width: isHorizontal ? thumbSize : double.infinity,
                height: isHorizontal ? double.infinity : thumbSize,
                decoration: widget.thumbDecoration ??
                    BoxDecoration(
                      color: thumbColor,
                      borderRadius: BorderRadius.circular(4),
                    ),
              ),
            ),
          ],
        ),
      );
    });
  }

  Widget _buildProgress(bool focused) {
    final isHorizontal = widget.orientation == NavixStepperOrientation.horizontal;
    final ratio = widget.max > widget.min
        ? (_value - widget.min) / (widget.max - widget.min)
        : 0.0;

    final fillColor = _status == StepperStatus.increase
        ? const Color(0xFF4FC3F7)
        : _status == StepperStatus.decrease
            ? const Color(0xFFEF9A9A)
            : focused
                ? const Color(0xFFFFFFFF)
                : const Color(0xFF888888);

    return Container(
      width: isHorizontal ? double.infinity : 8,
      height: isHorizontal ? 8 : double.infinity,
      decoration: widget.trackDecoration ??
          BoxDecoration(
            color: focused ? const Color(0xFF555555) : const Color(0xFF333333),
            borderRadius: BorderRadius.circular(4),
          ),
      clipBehavior: Clip.hardEdge,
      child: Align(
        alignment: isHorizontal ? Alignment.centerLeft : Alignment.bottomCenter,
        child: AnimatedFractionallySizedBox(
          duration: const Duration(milliseconds: 100),
          widthFactor: isHorizontal ? ratio : 1.0,
          heightFactor: isHorizontal ? 1.0 : ratio,
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 150),
            decoration: widget.thumbDecoration ??
                BoxDecoration(
                  color: fillColor,
                  borderRadius: BorderRadius.circular(4),
                ),
          ),
        ),
      ),
    );
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
        Widget child;
        if (widget.builder != null) {
          child = widget.builder!(
            context,
            directlyFocused,
            _status,
            _value,
            widget.min,
            widget.max,
            widget.step,
          );
        } else if (widget.render == NavixStepperRender.progress) {
          child = _buildProgress(directlyFocused);
        } else {
          child = _buildScrollbar(directlyFocused);
        }
        return SizedBox(width: double.infinity, child: child);
      },
    );
  }
}

class _StepperBehavior extends IFocusNodeBehavior {
  NavixStepperOrientation _orientation;
  bool _long;
  bool _double;
  void Function(int delta) _onDelta;

  _StepperBehavior({
    required NavixStepperOrientation orientation,
    required bool long,
    required bool double_,
    required void Function(int delta) onDelta,
  })  : _orientation = orientation,
        _long = long,
        _double = double_,
        _onDelta = onDelta {
    this.onEvent = _handleEvent;
  }

  void update({
    required NavixStepperOrientation orientation,
    required bool long,
    required bool double_,
    required void Function(int delta) onDelta,
  }) {
    _orientation = orientation;
    _long = long;
    _double = double_;
    _onDelta = onDelta;
  }

  bool _handleEvent(NavEvent event) {
    final prev = _orientation == NavixStepperOrientation.horizontal ? 'left' : 'up';
    final next = _orientation == NavixStepperOrientation.horizontal ? 'right' : 'down';

    if (event.action != prev && event.action != next) return false;
    if (event.type == NavEventType.longPress && !_long) return false;
    if (event.type == NavEventType.doublePress && !_double) return false;

    _onDelta(event.action == next ? 1 : -1);
    return true;
  }
}

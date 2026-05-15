import 'dart:async';

import 'package:flutter/widgets.dart';

import '../core/nav_event.dart';
import '../core/focus_node.dart';
import 'navix_focusable.dart';

enum NavixStepperOrientation { horizontal, vertical }

enum StepType { single, long, double_ }

enum StepperStatus { natural, increase, decrease }

enum NavixStepperRender { scrollbar, progress }

typedef NavixStepperBuilder = Widget Function(
  BuildContext context,
  bool focused,
  StepperStatus status,
  double value,
  double min,
  double max,
  double step,
);

class NavixStepper extends StatefulWidget {
  final String fKey;
  final NavixStepperOrientation orientation;
  final NavixStepperRender? render;
  final NavixStepperBuilder? builder;
  final double? value;
  final double? defaultValue;
  final double min;
  final double max;
  final double step;
  final void Function(double value)? onChange;
  final bool long;
  final bool double_;
  final int feedbackTimeout;
  final bool disabled;
  final void Function(String key)? onFocus;
  final void Function(String key)? onBlurred;
  final void Function(String key)? onRegister;
  final void Function(String key)? onUnregister;
  final bool Function(NavEvent event)? onEvent;
  final BoxDecoration? trackDecoration;
  final BoxDecoration? thumbDecoration;

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

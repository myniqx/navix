import 'dart:async';

import 'package:flutter/widgets.dart';

import '../core/nav_event.dart';
import '../core/focus_node.dart';
import 'navix_focusable.dart';

enum NavixStepperOrientation { horizontal, vertical }

enum StepType { single, long, double_ }

enum StepperStatus { natural, increase, decrease }

typedef NavixStepperBuilder = Widget Function(
  BuildContext context,
  bool focused,
  StepperStatus status,
);

class NavixStepper extends StatefulWidget {
  final String fKey;
  final NavixStepperOrientation orientation;
  final void Function(StepType type)? onIncrease;
  final void Function(StepType type)? onDecrease;
  final bool long;
  final bool double_;
  final int feedbackTimeout;
  final bool disabled;
  final void Function(String key)? onFocus;
  final void Function(String key)? onBlurred;
  final void Function(String key)? onRegister;
  final void Function(String key)? onUnregister;
  final bool Function(NavEvent event)? onEvent;

  // Default render styles
  final BoxDecoration? trackDecoration;
  final BoxDecoration? thumbDecoration;

  // Custom builder — if null, default track/thumb is rendered
  final NavixStepperBuilder? builder;

  const NavixStepper({
    super.key,
    required this.fKey,
    required this.orientation,
    this.onIncrease,
    this.onDecrease,
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
    this.builder,
  });

  @override
  State<NavixStepper> createState() => _NavixStepperState();
}

class _NavixStepperState extends State<NavixStepper> {
  late final _StepperBehavior _behavior;
  StepperStatus _status = StepperStatus.natural;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _behavior = _StepperBehavior(
      orientation: widget.orientation,
      long: widget.long,
      double_: widget.double_,
      onIncrease: _handleIncrease,
      onDecrease: _handleDecrease,
    );
  }

  @override
  void didUpdateWidget(NavixStepper oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.orientation != widget.orientation ||
        oldWidget.long != widget.long ||
        oldWidget.double_ != widget.double_ ||
        oldWidget.onIncrease != widget.onIncrease ||
        oldWidget.onDecrease != widget.onDecrease) {
      _behavior.update(
        orientation: widget.orientation,
        long: widget.long,
        double_: widget.double_,
        onIncrease: _handleIncrease,
        onDecrease: _handleDecrease,
      );
    }
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  void _handleIncrease(StepType type) {
    widget.onIncrease?.call(type);
    _triggerFeedback(StepperStatus.increase);
  }

  void _handleDecrease(StepType type) {
    widget.onDecrease?.call(type);
    _triggerFeedback(StepperStatus.decrease);
  }

  void _triggerFeedback(StepperStatus s) {
    _timer?.cancel();
    setState(() => _status = s);
    _timer = Timer(Duration(milliseconds: widget.feedbackTimeout), () {
      if (mounted) setState(() => _status = StepperStatus.natural);
    });
  }

  Widget _buildDefault(bool focused) {
    final isHorizontal =
        widget.orientation == NavixStepperOrientation.horizontal;

    final thumbColor = _status == StepperStatus.increase
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
            color: focused
                ? const Color(0xFF555555)
                : const Color(0xFF333333),
            borderRadius: BorderRadius.circular(4),
          ),
      child: Align(
        alignment: isHorizontal ? Alignment.centerLeft : Alignment.topCenter,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 150),
          width: isHorizontal ? 16 : double.infinity,
          height: isHorizontal ? double.infinity : 16,
          decoration: widget.thumbDecoration ??
              BoxDecoration(
                color: thumbColor,
                borderRadius: BorderRadius.circular(4),
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
        final child = widget.builder != null
            ? widget.builder!(context, directlyFocused, _status)
            : _buildDefault(directlyFocused);
        return SizedBox(width: double.infinity, child: child);
      },
    );
  }
}

class _StepperBehavior extends IFocusNodeBehavior {
  NavixStepperOrientation _orientation;
  bool _long;
  bool _double;
  void Function(StepType) _onIncrease;
  void Function(StepType) _onDecrease;

  _StepperBehavior({
    required NavixStepperOrientation orientation,
    required bool long,
    required bool double_,
    required void Function(StepType) onIncrease,
    required void Function(StepType) onDecrease,
  })  : _orientation = orientation,
        _long = long,
        _double = double_,
        _onIncrease = onIncrease,
        _onDecrease = onDecrease {
    this.onEvent = _handleEvent;
  }

  void update({
    required NavixStepperOrientation orientation,
    required bool long,
    required bool double_,
    required void Function(StepType) onIncrease,
    required void Function(StepType) onDecrease,
  }) {
    _orientation = orientation;
    _long = long;
    _double = double_;
    _onIncrease = onIncrease;
    _onDecrease = onDecrease;
  }

  bool _handleEvent(NavEvent event) {
    final prev =
        _orientation == NavixStepperOrientation.horizontal ? 'left' : 'up';
    final next =
        _orientation == NavixStepperOrientation.horizontal ? 'right' : 'down';

    if (event.action != prev && event.action != next) return false;

    if (event.type == NavEventType.longPress && !_long) return false;
    if (event.type == NavEventType.doublePress && !_double) return false;

    final type = event.type == NavEventType.longPress
        ? StepType.long
        : event.type == NavEventType.doublePress
            ? StepType.double_
            : StepType.single;

    if (event.action == next) {
      _onIncrease(type);
    } else {
      _onDecrease(type);
    }

    return true;
  }
}

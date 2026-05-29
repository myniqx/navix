import 'package:flutter/widgets.dart';

import '../core/nav_event.dart';
import '../core/focus_node.dart';
import 'navix_focusable.dart';

enum NavixScrollOrientation { horizontal, vertical }

class ScrollbarRenderProps {
  final bool scrollMode;
  final int page;
  final int pageCount;
  final NavixScrollOrientation orientation;
  final void Function(int page) onPageChange;

  const ScrollbarRenderProps({
    required this.scrollMode,
    required this.page,
    required this.pageCount,
    required this.orientation,
    required this.onPageChange,
  });
}

typedef NavixScrollbarBuilder = Widget Function(ScrollbarRenderProps props);

class NavixScrollBehavior extends IFocusNodeBehavior {
  NavixScrollOrientation _orientation;
  void Function(int delta) _onDelta;
  void Function(int delta) _onPageDelta;

  NavixScrollBehavior({
    required NavixScrollOrientation orientation,
    required void Function(int delta) onDelta,
    required void Function(int delta) onPageDelta,
  })  : _orientation = orientation,
        _onDelta = onDelta,
        _onPageDelta = onPageDelta {
    onEvent = _handleEvent;
  }

  void update({
    required NavixScrollOrientation orientation,
    required void Function(int delta) onDelta,
    required void Function(int delta) onPageDelta,
  }) {
    _orientation = orientation;
    _onDelta = onDelta;
    _onPageDelta = onPageDelta;
  }

  bool _handleEvent(NavEvent event) {
    if (event.type != NavEventType.press) return false;

    final prev = _orientation == NavixScrollOrientation.horizontal ? 'left' : 'up';
    final next = _orientation == NavixScrollOrientation.horizontal ? 'right' : 'down';

    if (event.action == prev) {
      _onDelta(-1);
      return true;
    }
    if (event.action == next) {
      _onDelta(1);
      return true;
    }
    if (event.action == 'program_up') {
      _onPageDelta(-1);
      return true;
    }
    if (event.action == 'program_down') {
      _onPageDelta(1);
      return true;
    }
    return false;
  }
}

/// NavixScroll — focusable scrollbar.
///
/// When focused, arrow keys (based on orientation) shift the page by
/// [arrowStep] (default 1), and PageUp/PageDown shift by [pageStep]
/// (default 1). The default visual is a draggable track + thumb; override
/// with [renderScrollbar].
class NavixScroll extends StatefulWidget {
  final String fKey;
  final NavixScrollOrientation orientation;
  final int? page;
  final int? defaultPage;
  final int pageCount;
  final int arrowStep;
  final int pageStep;
  final void Function(int page)? onPageChange;
  final NavixScrollbarBuilder? renderScrollbar;
  final bool disabled;
  final bool focusOnRegister;
  final void Function(String key)? onFocus;
  final void Function(String key)? onBlurred;
  final void Function(String key)? onRegister;
  final void Function(String key)? onUnregister;
  final bool Function(NavEvent event)? onEvent;

  const NavixScroll({
    super.key,
    required this.fKey,
    required this.orientation,
    required this.pageCount,
    this.page,
    this.defaultPage,
    this.arrowStep = 1,
    this.pageStep = 1,
    this.onPageChange,
    this.renderScrollbar,
    this.disabled = false,
    this.focusOnRegister = false,
    this.onFocus,
    this.onBlurred,
    this.onRegister,
    this.onUnregister,
    this.onEvent,
  });

  @override
  State<NavixScroll> createState() => _NavixScrollState();
}

class _NavixScrollState extends State<NavixScroll> {
  late int _internalPage;
  NavixScrollBehavior? _behavior;

  bool get _isControlled => widget.page != null;

  int get _maxPage => widget.pageCount - 1 < 0 ? 0 : widget.pageCount - 1;

  int get _currentPage {
    final raw = _isControlled ? widget.page! : _internalPage;
    return raw < 0 ? 0 : (raw > _maxPage ? _maxPage : raw);
  }

  @override
  void initState() {
    super.initState();
    final initial = widget.defaultPage ?? 0;
    _internalPage = initial < 0 ? 0 : (initial > _maxPage ? _maxPage : initial);
  }

  void _commitPage(int next) {
    final max = _maxPage;
    final clamped = next < 0 ? 0 : (next > max ? max : next);
    if (clamped == _currentPage) return;
    if (!_isControlled) setState(() => _internalPage = clamped);
    widget.onPageChange?.call(clamped);
  }

  void _onDelta(int delta) => _commitPage(_currentPage + delta * widget.arrowStep);
  void _onPageDelta(int delta) => _commitPage(_currentPage + delta * widget.pageStep);

  @override
  void didUpdateWidget(NavixScroll oldWidget) {
    super.didUpdateWidget(oldWidget);
    _behavior?.update(
      orientation: widget.orientation,
      onDelta: _onDelta,
      onPageDelta: _onPageDelta,
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
      createBehavior: (node) {
        _behavior = NavixScrollBehavior(
          orientation: widget.orientation,
          onDelta: _onDelta,
          onPageDelta: _onPageDelta,
        );
        return _behavior!;
      },
      builder: (context, node, focused, directlyFocused) {
        final props = ScrollbarRenderProps(
          scrollMode: directlyFocused,
          page: _currentPage,
          pageCount: widget.pageCount,
          orientation: widget.orientation,
          onPageChange: _commitPage,
        );
        return widget.renderScrollbar != null
            ? widget.renderScrollbar!(props)
            : _DefaultScrollbarVisual(props: props);
      },
    );
  }
}

class _DefaultScrollbarVisual extends StatefulWidget {
  final ScrollbarRenderProps props;

  const _DefaultScrollbarVisual({required this.props});

  @override
  State<_DefaultScrollbarVisual> createState() => _DefaultScrollbarVisualState();
}

class _DefaultScrollbarVisualState extends State<_DefaultScrollbarVisual> {
  bool _isDragging = false;
  final _trackKey = GlobalKey();

  int _pageFromOffset(Offset localPos) {
    final box = _trackKey.currentContext?.findRenderObject() as RenderBox?;
    if (box == null) return widget.props.page;
    final isHorizontal = widget.props.orientation == NavixScrollOrientation.horizontal;
    final trackSize = isHorizontal ? box.size.width : box.size.height;
    if (trackSize <= 0) return 0;
    final pos = isHorizontal ? localPos.dx : localPos.dy;
    final r = (pos / trackSize).clamp(0.0, 1.0);
    return (r * (widget.props.pageCount - 1)).round();
  }

  @override
  Widget build(BuildContext context) {
    final p = widget.props;
    final isHorizontal = p.orientation == NavixScrollOrientation.horizontal;
    final thumbRatio = p.pageCount > 1 ? 1.0 / p.pageCount : 1.0;
    final ratio = p.pageCount > 1 ? p.page / (p.pageCount - 1) : 0.0;
    final thumbColor = p.scrollMode ? const Color(0xFF4FC3F7) : const Color(0xFF888888);

    return GestureDetector(
      onTapDown: (d) {
        final pg = _pageFromOffset(d.localPosition);
        p.onPageChange(pg);
      },
      onHorizontalDragStart: isHorizontal ? (d) => setState(() => _isDragging = true) : null,
      onHorizontalDragUpdate: isHorizontal
          ? (d) => p.onPageChange(_pageFromOffset(d.localPosition))
          : null,
      onHorizontalDragEnd: isHorizontal ? (d) => setState(() => _isDragging = false) : null,
      onVerticalDragStart: !isHorizontal ? (d) => setState(() => _isDragging = true) : null,
      onVerticalDragUpdate: !isHorizontal
          ? (d) => p.onPageChange(_pageFromOffset(d.localPosition))
          : null,
      onVerticalDragEnd: !isHorizontal ? (d) => setState(() => _isDragging = false) : null,
      child: LayoutBuilder(
        key: _trackKey,
        builder: (context, constraints) {
          final trackSize = isHorizontal ? constraints.maxWidth : constraints.maxHeight;
          final thumbSize = trackSize * thumbRatio;
          final thumbOffset = ratio * (trackSize - thumbSize);

          return Container(
            width: isHorizontal ? double.infinity : 8,
            height: isHorizontal ? 8 : double.infinity,
            decoration: BoxDecoration(
              color: const Color(0xFF333333),
              borderRadius: BorderRadius.circular(2),
            ),
            child: Stack(
              children: [
                AnimatedPositioned(
                  duration: _isDragging
                      ? Duration.zero
                      : const Duration(milliseconds: 100),
                  left: isHorizontal ? thumbOffset : 0,
                  right: isHorizontal ? null : 0,
                  top: isHorizontal ? 0 : thumbOffset,
                  bottom: isHorizontal ? 0 : null,
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 150),
                    width: isHorizontal ? thumbSize : double.infinity,
                    height: isHorizontal ? double.infinity : thumbSize,
                    decoration: BoxDecoration(
                      color: thumbColor,
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}

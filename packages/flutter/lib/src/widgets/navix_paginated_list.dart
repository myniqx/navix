import 'package:flutter/widgets.dart';

import '../core/nav_event.dart';
import '../core/focus_node.dart';
import 'navix_focusable.dart';

enum NavixListOrientation { horizontal, vertical }

class NavixPaginatedListBehavior extends IFocusNodeBehavior {
  final NavixFocusNode _node;
  final String _prev;
  final String _next;
  final String Function(int index) _keyForIndex;

  int totalCount;
  int activeIndex = 0;
  int viewOffset = 0;

  int _visibleCount;
  int _threshold;

  String? _pendingFocusKey;

  void Function(int newIndex, int newOffset)? onChange;

  int get visibleCount => _visibleCount;
  set visibleCount(int value) => _visibleCount = value < 3 ? 3 : value;

  int get threshold => _threshold;
  set threshold(int value) {
    _threshold = value < 1
        ? 1
        : value > _visibleCount - 2
            ? _visibleCount - 2
            : value;
  }

  NavixPaginatedListBehavior({
    required NavixFocusNode node,
    required NavixListOrientation orientation,
    required this.totalCount,
    required int visibleCount,
    required int threshold,
    required String Function(int index) keyForIndex,
  })  : _node = node,
        _prev = orientation == NavixListOrientation.horizontal ? 'left' : 'up',
        _next =
            orientation == NavixListOrientation.horizontal ? 'right' : 'down',
        _visibleCount = visibleCount < 3 ? 3 : visibleCount,
        _threshold = 1,
        _keyForIndex = keyForIndex {
    this.threshold = threshold;
    onEvent = _handleEvent;
    onChildRegistered = _onChildRegistered;
    onActiveChildChanged = _onActiveChildChanged;
  }

  bool _handleEvent(NavEvent event) {
    if (event.type != NavEventType.press) return false;
    if (event.action == _prev) return _moveTo(activeIndex - 1);
    if (event.action == _next) return _moveTo(activeIndex + 1);
    return false;
  }

  void _onChildRegistered(NavixFocusNode child) {
    if (_pendingFocusKey != null && child.key == _pendingFocusKey) {
      _pendingFocusKey = null;
      _node.focusChild(child.id);
    }
  }

  void _onActiveChildChanged(NavixFocusNode child) {
    // Find child index by iterating keys.
    for (int i = 0; i < totalCount; i++) {
      if (_keyForIndex(i) == child.key) {
        activeIndex = i;
        break;
      }
    }
  }

  void focusByKey(String key) {
    final child = _node.children.cast<NavixFocusNode?>().firstWhere(
          (c) => c!.key == key,
          orElse: () => null,
        );
    if (child != null) {
      _node.focusChild(child.id);
    } else {
      _pendingFocusKey = key;
    }
  }

  bool _moveTo(int newIndex) {
    if (newIndex < 0 || newIndex >= totalCount) return false;
    activeIndex = newIndex;
    _updateOffset();
    onChange?.call(activeIndex, viewOffset);
    return true;
  }

  void _updateOffset() {
    final maxOffset =
        totalCount - visibleCount > 0 ? totalCount - visibleCount : 0;
    int offset = viewOffset;
    final positionInView = activeIndex - offset;

    if (positionInView < _threshold) {
      offset = activeIndex - _threshold;
      if (offset < 0) offset = 0;
    } else if (positionInView > visibleCount - 1 - _threshold) {
      offset = activeIndex - (visibleCount - 1 - _threshold);
      if (offset > maxOffset) offset = maxOffset;
    }

    viewOffset = offset;
  }
}

typedef NavixPaginatedListItemBuilder<T> = Widget Function(
  T item,
  String fKey,
  int index,
);

class NavixPaginatedList<T> extends StatefulWidget {
  final String fKey;
  final NavixListOrientation orientation;
  final List<T> items;
  final int visibleCount;
  final int threshold;
  final NavixPaginatedListItemBuilder<T> renderItem;
  final double gap;
  final int buffer;
  final void Function(String key)? onFocus;
  final void Function(String key)? onBlurred;
  final void Function(String key)? onRegister;
  final void Function(String key)? onUnregister;
  final bool Function(NavEvent event)? onEvent;

  const NavixPaginatedList({
    super.key,
    required this.fKey,
    required this.items,
    required this.visibleCount,
    required this.threshold,
    required this.renderItem,
    this.orientation = NavixListOrientation.horizontal,
    this.gap = 0,
    this.buffer = 2,
    this.onFocus,
    this.onBlurred,
    this.onRegister,
    this.onUnregister,
    this.onEvent,
  });

  @override
  State<NavixPaginatedList<T>> createState() => _NavixPaginatedListState<T>();
}

class _NavixPaginatedListState<T> extends State<NavixPaginatedList<T>> {
  int _viewOffset = 0;
  NavixPaginatedListBehavior? _behavior;

  // Stable keys tied to items list reference — regenerate when items changes.
  late String _keyPrefix;
  late List<String> _itemKeys;

  @override
  void initState() {
    super.initState();
    _regenerateKeys();
  }

  @override
  void didUpdateWidget(NavixPaginatedList<T> oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (!identical(oldWidget.items, widget.items)) {
      _regenerateKeys();
    }
    if (_behavior != null) {
      _behavior!.totalCount = widget.items.length;
      _behavior!.visibleCount = widget.visibleCount;
      _behavior!.threshold = widget.threshold;
      _clampBehaviorState();
      _behavior!.onChange = _onBehaviorChange;
    }
  }

  void _regenerateKeys() {
    _keyPrefix =
        '${widget.fKey}-${Object.hash(widget.items, DateTime.now().microsecondsSinceEpoch)}';
    _itemKeys = List.generate(widget.items.length, (i) => '$_keyPrefix-$i');
  }

  void _onBehaviorChange(int newIndex, int newOffset) {
    if (newIndex < 0 || newIndex >= _itemKeys.length) return;
    setState(() => _viewOffset = newOffset);
    _behavior?.focusByKey(_itemKeys[newIndex]);
  }

  void _clampBehaviorState() {
    final behavior = _behavior;
    if (behavior == null) return;

    final maxOffset = widget.items.length - behavior.visibleCount > 0
        ? widget.items.length - behavior.visibleCount
        : 0;

    if (widget.items.isEmpty) {
      behavior.activeIndex = 0;
    } else if (behavior.activeIndex >= widget.items.length) {
      behavior.activeIndex = widget.items.length - 1;
    }

    if (behavior.viewOffset > maxOffset) behavior.viewOffset = maxOffset;
    if (behavior.viewOffset < 0) behavior.viewOffset = 0;
    _viewOffset = behavior.viewOffset;
  }

  @override
  Widget build(BuildContext context) {
    final isHorizontal = widget.orientation == NavixListOrientation.horizontal;

    return NavixFocusable(
      fKey: widget.fKey,
      callbacks: NavixFocusableCallbacks(
        onFocus: widget.onFocus,
        onBlurred: widget.onBlurred,
        onRegister: widget.onRegister,
        onUnregister: widget.onUnregister,
        onEvent: widget.onEvent,
      ),
      createBehavior: (node) {
        _behavior = NavixPaginatedListBehavior(
          node: node,
          orientation: widget.orientation,
          totalCount: widget.items.length,
          visibleCount: widget.visibleCount,
          threshold: widget.threshold,
          keyForIndex: (i) => _itemKeys[i],
        );
        _behavior!.onChange = _onBehaviorChange;
        return _behavior!;
      },
      builder: (context, node, focused, directlyFocused) {
        if (isHorizontal) {
          return LayoutBuilder(
            builder: (context, constraints) {
              final containerWidth = constraints.maxWidth;
              if (containerWidth == 0 || containerWidth.isInfinite) {
                return const SizedBox.shrink();
              }

              final totalGap = (widget.visibleCount - 1) * widget.gap;
              final slotSize =
                  (containerWidth - totalGap) / widget.visibleCount;
              final step = slotSize + widget.gap;
              final translate = -_viewOffset * step;

              final renderStart =
                  (_viewOffset - widget.buffer).clamp(0, widget.items.length);
              final renderEnd =
                  (_viewOffset + widget.visibleCount + widget.buffer)
                      .clamp(0, widget.items.length);
              final paddingBefore = renderStart * step;

              final slots = <Widget>[
                if (paddingBefore > 0) SizedBox(width: paddingBefore),
                for (int i = renderStart; i < renderEnd; i++)
                  SizedBox(
                    key: ValueKey(_itemKeys[i]),
                    width: slotSize,
                    child: widget.renderItem(widget.items[i], _itemKeys[i], i),
                  ),
              ];

              return SizedBox(
                width: containerWidth,
                child: ClipRect(
                  child: UnconstrainedBox(
                    alignment: Alignment.topLeft,
                    constrainedAxis: Axis.vertical,
                    clipBehavior: Clip.hardEdge,
                    child: Transform.translate(
                      offset: Offset(translate, 0),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: _intersperse(slots, widget.gap, true),
                      ),
                    ),
                  ),
                ),
              );
            },
          );
        } else {
          return LayoutBuilder(
            builder: (context, constraints) {
              final containerHeight = constraints.maxHeight;
              if (containerHeight == 0 || containerHeight.isInfinite) {
                return const SizedBox.shrink();
              }

              final totalGap = (widget.visibleCount - 1) * widget.gap;
              final slotSize =
                  (containerHeight - totalGap) / widget.visibleCount;
              final step = slotSize + widget.gap;
              final translate = -_viewOffset * step;

              final renderStart =
                  (_viewOffset - widget.buffer).clamp(0, widget.items.length);
              final renderEnd =
                  (_viewOffset + widget.visibleCount + widget.buffer)
                      .clamp(0, widget.items.length);
              final paddingBefore = renderStart * step;

              final slots = <Widget>[
                if (paddingBefore > 0) SizedBox(height: paddingBefore),
                for (int i = renderStart; i < renderEnd; i++)
                  SizedBox(
                    key: ValueKey(_itemKeys[i]),
                    height: slotSize,
                    child: widget.renderItem(widget.items[i], _itemKeys[i], i),
                  ),
              ];

              return SizedBox(
                height: containerHeight,
                child: ClipRect(
                  child: UnconstrainedBox(
                    alignment: Alignment.topLeft,
                    constrainedAxis: Axis.horizontal,
                    clipBehavior: Clip.hardEdge,
                    child: Transform.translate(
                      offset: Offset(0, translate),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: _intersperse(slots, widget.gap, false),
                      ),
                    ),
                  ),
                ),
              );
            },
          );
        }
      },
    );
  }

  List<Widget> _intersperse(
      List<Widget> widgets, double gap, bool isHorizontal) {
    if (gap == 0 || widgets.length <= 1) return widgets;
    final result = <Widget>[];
    for (int i = 0; i < widgets.length; i++) {
      result.add(widgets[i]);
      if (i < widgets.length - 1) {
        result.add(SizedBox(
          width: isHorizontal ? gap : null,
          height: isHorizontal ? null : gap,
        ));
      }
    }
    return result;
  }
}

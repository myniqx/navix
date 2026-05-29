import 'package:flutter/widgets.dart';

import '../core/nav_event.dart';
import '../core/focus_node.dart';
import '../core/focus_manager.dart';
import 'navix_focusable.dart';
import 'navix_scroll.dart';

export 'navix_scroll.dart' show ScrollbarRenderProps, NavixScrollOrientation;

const int _kMinGridDimension = 2;

enum NavixGridOrientation { horizontal, vertical, autoHorizontal }

class NavixPaginatedGridBehavior extends IFocusNodeBehavior {
  final NavixFocusNode _node;
  final String? _scrollbarKey;
  final String Function(int index) _keyForIndex;

  NavixGridOrientation orientation;
  int totalCount;
  int activeIndex = 0;
  int viewOffset = 0;

  int _rows;
  int _columns;
  int _threshold;

  String? _pendingFocusKey;
  bool Function(int index)? _isItemDisabled;

  void Function(int newIndex, int newOffset, bool refocusItem)? onChange;

  NavixGridOrientation get effectiveOrientation {
    if (orientation == NavixGridOrientation.autoHorizontal) {
      return totalCount < _rows * _columns
          ? NavixGridOrientation.vertical
          : NavixGridOrientation.horizontal;
    }
    return orientation;
  }

  int get rows => _rows;
  set rows(int value) => _rows = value < _kMinGridDimension ? _kMinGridDimension : value;

  int get columns => _columns;
  set columns(int value) => _columns = value < _kMinGridDimension ? _kMinGridDimension : value;

  int get threshold => _threshold;
  set threshold(int value) {
    final visibleSlices =
        effectiveOrientation == NavixGridOrientation.horizontal
            ? _columns
            : _rows;
    _threshold = value < 1
        ? 1
        : value > visibleSlices - 2
            ? visibleSlices - 2
            : value;
  }

  NavixPaginatedGridBehavior({
    required NavixFocusNode node,
    required this.orientation,
    required this.totalCount,
    required int rows,
    required int columns,
    required int threshold,
    required String Function(int index) keyForIndex,
    bool Function(int index)? isItemDisabled,
    String? scrollbarKey,
  })  : _node = node,
        _scrollbarKey = scrollbarKey,
        _rows = rows < _kMinGridDimension ? _kMinGridDimension : rows,
        _columns = columns < _kMinGridDimension ? _kMinGridDimension : columns,
        _threshold = 1,
        _keyForIndex = keyForIndex,
        _isItemDisabled = isItemDisabled {
    this.threshold = threshold;
    activeIndex = _findFirst();
    onEvent = _handleEvent;
    canReceiveFocus = _canReceiveFocus;
    onChildRegistered = _onChildRegistered;
    onActiveChildChanged = _onActiveChildChanged;
  }

  bool _canReceiveFocus() {
    if (totalCount == 0) return false;
    if (_isItemDisabled == null) return true;
    for (int i = 0; i < totalCount; i++) {
      if (!_isItemDisabled!(i)) return true;
    }
    return false;
  }

  int _findFirst() {
    if (_isItemDisabled == null) return 0;
    for (int i = 0; i < totalCount; i++) {
      if (!_isItemDisabled!(i)) return i;
    }
    return 0;
  }

  int? _findNext(int from, int step, String axis) {
    final sliceSize = effectiveOrientation == NavixGridOrientation.horizontal
        ? _rows
        : _columns;
    final fromSlice = from ~/ sliceSize;
    int i = from + step;
    while (i >= 0 && i < totalCount) {
      if (axis == 'cross' && i ~/ sliceSize != fromSlice) break;
      if (_isItemDisabled?.call(i) != true) return i;
      i += step;
    }
    return null;
  }

  int get maxOffset {
    final sliceSize = effectiveOrientation == NavixGridOrientation.horizontal ? _rows : _columns;
    final visibleSlices = effectiveOrientation == NavixGridOrientation.horizontal ? _columns : _rows;
    final totalSlices = (totalCount / sliceSize).ceil();
    return (totalSlices - visibleSlices).clamp(0, double.maxFinite.toInt());
  }

  void setPage(int page) {
    final newOffset = page.clamp(0, maxOffset);
    if (newOffset == viewOffset) return;

    final sliceSize = effectiveOrientation == NavixGridOrientation.horizontal ? _rows : _columns;
    final currentSlice = activeIndex ~/ sliceSize;
    final sliceInView = currentSlice - viewOffset;
    final totalSlices = (totalCount / sliceSize).ceil();
    final newSlice = (newOffset + sliceInView).clamp(0, totalSlices - 1);
    final newActiveIndex = (newSlice * sliceSize).clamp(0, totalCount - 1);

    viewOffset = newOffset;
    activeIndex = newActiveIndex;
    onChange?.call(newActiveIndex, newOffset, false);
  }

  bool _isScrollbarActive() {
    if (_scrollbarKey == null) return false;
    final active = _node.getActiveChild();
    return active != null && active.key == _scrollbarKey;
  }

  bool _handleEvent(NavEvent event) {
    if (event.type != NavEventType.press) return false;

    final isH = effectiveOrientation == NavixGridOrientation.horizontal;
    final scrollExit = isH ? 'up' : 'left';

    if (_isScrollbarActive()) {
      if (event.action == scrollExit) {
        _focusActiveItem();
        return true;
      }
      return false;
    }

    if (isH) {
      if (event.action == 'up') {
        final next = _findNext(activeIndex, -1, 'cross');
        return next != null ? _moveTo(next, 'cross') : false;
      }
      if (event.action == 'down') {
        final next = _findNext(activeIndex, 1, 'cross');
        if (next != null) return _moveTo(next, 'cross');
        return _focusScrollbar();
      }
      if (event.action == 'left') {
        final next = _findNext(activeIndex, -_rows, 'main');
        return next != null ? _moveTo(next, 'main') : false;
      }
      if (event.action == 'right') {
        final next = _findNext(activeIndex, _rows, 'main');
        return next != null ? _moveTo(next, 'main') : false;
      }
    } else {
      if (event.action == 'left') {
        final next = _findNext(activeIndex, -1, 'cross');
        return next != null ? _moveTo(next, 'cross') : false;
      }
      if (event.action == 'right') {
        final next = _findNext(activeIndex, 1, 'cross');
        if (next != null) return _moveTo(next, 'cross');
        return _focusScrollbar();
      }
      if (event.action == 'up') {
        final next = _findNext(activeIndex, -_columns, 'main');
        return next != null ? _moveTo(next, 'main') : false;
      }
      if (event.action == 'down') {
        final next = _findNext(activeIndex, _columns, 'main');
        return next != null ? _moveTo(next, 'main') : false;
      }
    }

    return false;
  }

  bool _focusScrollbar() {
    final key = _scrollbarKey;
    if (key == null) return false;
    final scrollbar = _node.children.cast<NavixFocusNode?>().firstWhere(
          (c) => c!.key == key,
          orElse: () => null,
        );
    if (scrollbar == null) return false;
    scrollbar.requestFocus();
    return true;
  }

  void _focusActiveItem() {
    for (final child in _node.children) {
      if (child.key == _scrollbarKey) continue;
      for (int i = 0; i < totalCount; i++) {
        if (_keyForIndex(i) == child.key && i == activeIndex) {
          _node.focusChild(child.id);
          return;
        }
      }
    }
  }

  void _onChildRegistered(NavixFocusNode child) {
    if (_scrollbarKey != null && child.key == _scrollbarKey) {
      final others = _node.children.where((c) => !identical(c, child)).toList();
      _node.reorderChildren([child, ...others]);
      return;
    }

    bool keyMatchesAnyItem = false;
    for (int i = 0; i < totalCount; i++) {
      if (_keyForIndex(i) == child.key) {
        keyMatchesAnyItem = true;
        break;
      }
    }
    if (!keyMatchesAnyItem) {
      debugPrint(
          '[NavixPaginatedGrid:${_node.key}] Registered child key "${child.key}" does not match any key produced by keyForItem. '
          'Pass the fKey argument from renderItem to your child widget instead of assigning a custom fKey, '
          'or supply a keyForItem that returns the same key your child uses.');
    }

    if (_pendingFocusKey != null && child.key == _pendingFocusKey) {
      _pendingFocusKey = null;
      _node.focusChild(child.id);
    }
  }

  void jumpToIndex(int index) {
    if (index < 0 || index >= totalCount) return;
    int target = index;
    if (_isItemDisabled?.call(index) == true) {
      final fwd = _findNext(index, 1, 'main');
      final bwd = _findNext(index, -1, 'main');
      if (fwd == null && bwd == null) return;
      target = fwd ?? bwd!;
    }
    activeIndex = target;
    _updateOffset();
  }

  void _onActiveChildChanged(NavixFocusNode child) {
    if (_scrollbarKey != null && child.key == _scrollbarKey) return;
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

  bool _moveTo(int newIndex, String axis) {
    if (newIndex < 0 || newIndex >= totalCount) return false;

    if (axis == 'cross') {
      final sliceSize =
          effectiveOrientation == NavixGridOrientation.horizontal
              ? _rows
              : _columns;
      final oldSlice = activeIndex ~/ sliceSize;
      final newSlice = newIndex ~/ sliceSize;
      if (oldSlice != newSlice) return false;
    }

    activeIndex = newIndex;
    _updateOffset();
    onChange?.call(activeIndex, viewOffset, true);
    return true;
  }

  void _updateOffset() {
    final sliceSize =
        effectiveOrientation == NavixGridOrientation.horizontal
            ? _rows
            : _columns;
    final visibleSlices =
        effectiveOrientation == NavixGridOrientation.horizontal
            ? _columns
            : _rows;
    final totalSlices = (totalCount / sliceSize).ceil();
    final maxOffset =
        totalSlices - visibleSlices > 0 ? totalSlices - visibleSlices : 0;

    final currentSlice = activeIndex ~/ sliceSize;
    int offset = viewOffset;
    final positionInView = currentSlice - offset;

    if (positionInView < _threshold) {
      offset = currentSlice - _threshold;
      if (offset < 0) offset = 0;
    } else if (positionInView > visibleSlices - 1 - _threshold) {
      offset = currentSlice - (visibleSlices - 1 - _threshold);
      if (offset > maxOffset) offset = maxOffset;
    }

    viewOffset = offset;
  }
}

typedef NavixPaginatedGridItemBuilder<T> = Widget Function(
  T item,
  String fKey,
  int index,
  bool disabled,
);

typedef NavixPaginatedGridKeyForItem<T> = String Function(T item, int index);

class NavixPaginatedGrid<T> extends StatefulWidget {
  final String fKey;
  final NavixGridOrientation orientation;
  final List<T> items;
  final int rows;
  final int columns;
  final int threshold;
  final NavixPaginatedGridItemBuilder<T> renderItem;
  final NavixPaginatedGridKeyForItem<T>? keyForItem;
  final bool Function(int index)? isItemDisabled;
  final bool disabled;
  final bool focusOnRegister;

  /// Jump to this item on mount and whenever the value changes. The widget
  /// manages its own navigation state between jumps — user arrow-key navigation
  /// is unaffected. If the target item is disabled the nearest non-disabled
  /// neighbour is focused instead. This is a write-only intent prop; there is
  /// no corresponding onChange callback.
  final String? activeKey;
  final String? groupKey;
  final double gap;
  final int buffer;
  final bool showScrollbar;
  final NavixScrollbarBuilder? scrollbarBuilder;
  final void Function(String key)? onFocus;
  final void Function(String key)? onBlurred;
  final void Function(String key)? onRegister;
  final void Function(String key)? onUnregister;
  final bool Function(NavEvent event)? onEvent;

  const NavixPaginatedGrid({
    super.key,
    required this.fKey,
    required this.items,
    required this.rows,
    required this.columns,
    required this.threshold,
    required this.renderItem,
    this.keyForItem,
    this.isItemDisabled,
    this.activeKey,
    this.disabled = false,
    this.focusOnRegister = false,
    this.groupKey,
    this.orientation = NavixGridOrientation.horizontal,
    this.gap = 0,
    this.buffer = 1,
    this.showScrollbar = false,
    this.scrollbarBuilder,
    this.onFocus,
    this.onBlurred,
    this.onRegister,
    this.onUnregister,
    this.onEvent,
  });

  @override
  State<NavixPaginatedGrid<T>> createState() => _NavixPaginatedGridState<T>();
}

class _NavixPaginatedGridState<T> extends State<NavixPaginatedGrid<T>> {
  int _viewOffset = 0;
  NavixPaginatedGridBehavior? _behavior;

  late List<String> _itemKeys;
  String? _currentGroupKey;

  String get _scrollbarKey => '${widget.fKey}__scrollbar__';

  String _defaultKeyForItem(T item, int index) => '${widget.fKey}-$index';

  String _keyForItem(T item, int index) =>
      (widget.keyForItem ?? _defaultKeyForItem)(item, index);

  NavixGridOrientation get _effectiveOrientation {
    if (widget.orientation == NavixGridOrientation.autoHorizontal) {
      return widget.items.length < widget.rows * widget.columns
          ? NavixGridOrientation.vertical
          : NavixGridOrientation.horizontal;
    }
    return widget.orientation;
  }

  @override
  void initState() {
    super.initState();
    _rebuildKeys();
    _currentGroupKey = widget.groupKey;
  }

  @override
  void didUpdateWidget(NavixPaginatedGrid<T> oldWidget) {
    super.didUpdateWidget(oldWidget);
    final itemsChanged = !identical(oldWidget.items, widget.items);
    final keyFnChanged = oldWidget.keyForItem != widget.keyForItem;
    if (itemsChanged || keyFnChanged) {
      _rebuildKeys();
    }

    final groupChanged = widget.groupKey != _currentGroupKey;

    if (_behavior != null) {
      final store = NavixScope.storeOf(context);

      if (groupChanged) {
        final prevGroup = _currentGroupKey;
        if (prevGroup != null && oldWidget.items.isNotEmpty) {
          store.update(prevGroup, {
            'activeIndex': _behavior!.activeIndex,
            'viewOffset': _behavior!.viewOffset,
          });
        }

        final newGroup = widget.groupKey;
        final restored = newGroup != null ? store.get(newGroup) : null;
        _behavior!.activeIndex = (restored?['activeIndex'] as int?) ?? 0;
        _behavior!.viewOffset = (restored?['viewOffset'] as int?) ?? 0;
        _currentGroupKey = newGroup;
      }

      _behavior!.totalCount = widget.items.length;
      _behavior!.rows = widget.rows;
      _behavior!.columns = widget.columns;
      _behavior!.orientation = widget.orientation;
      _behavior!.threshold = widget.threshold;
      _clampBehaviorState();
      _behavior!.onChange = _onBehaviorChange;

      if (groupChanged && widget.items.isNotEmpty) {
        final idx = _behavior!.activeIndex;
        if (idx >= 0 && idx < _itemKeys.length) {
          _behavior!.focusByKey(_itemKeys[idx]);
        }
      }

      final activeKeyChanged = widget.activeKey != oldWidget.activeKey;
      if (activeKeyChanged && widget.activeKey != null && widget.items.isNotEmpty) {
        final idx = _itemKeys.indexOf(widget.activeKey!);
        if (idx != -1) {
          _behavior!.jumpToIndex(idx);
          setState(() => _viewOffset = _behavior!.viewOffset);
          _behavior!.focusByKey(_itemKeys[_behavior!.activeIndex]);
        }
      }
    }
  }

  void _rebuildKeys() {
    _itemKeys = List.generate(
      widget.items.length,
      (i) => _keyForItem(widget.items[i], i),
    );
  }

  void _onBehaviorChange(int newIndex, int newOffset, bool refocusItem) {
    if (newIndex < 0 || newIndex >= _itemKeys.length) return;
    setState(() => _viewOffset = newOffset);
    final group = _currentGroupKey;
    if (group != null) {
      NavixScope.storeOf(context)
          .update(group, {'activeIndex': newIndex, 'viewOffset': newOffset});
    }
    if (refocusItem) {
      _behavior?.focusByKey(_itemKeys[newIndex]);
    }
  }

  void _clampBehaviorState() {
    final behavior = _behavior;
    if (behavior == null) return;

    final sliceSize = _effectiveOrientation == NavixGridOrientation.horizontal
        ? behavior.rows
        : behavior.columns;
    final visibleSlices =
        _effectiveOrientation == NavixGridOrientation.horizontal
            ? behavior.columns
            : behavior.rows;
    final totalSlices = (widget.items.length / sliceSize).ceil();
    final maxOffset = totalSlices - visibleSlices > 0
        ? totalSlices - visibleSlices
        : 0;

    if (widget.items.isEmpty) {
      behavior.activeIndex = 0;
    } else if (behavior.activeIndex >= widget.items.length) {
      behavior.activeIndex = widget.items.length - 1;
    }

    if (behavior.viewOffset > maxOffset) behavior.viewOffset = maxOffset;
    if (behavior.viewOffset < 0) behavior.viewOffset = 0;
    if (_viewOffset != behavior.viewOffset) {
      setState(() => _viewOffset = behavior.viewOffset);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isHorizontal =
        _effectiveOrientation == NavixGridOrientation.horizontal;
    final sliceSize = isHorizontal ? widget.rows : widget.columns;
    final visibleSlices = isHorizontal ? widget.columns : widget.rows;

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
        _behavior = NavixPaginatedGridBehavior(
          node: node,
          orientation: widget.orientation,
          totalCount: widget.items.length,
          rows: widget.rows,
          columns: widget.columns,
          threshold: widget.threshold,
          keyForIndex: (i) => _itemKeys[i],
          isItemDisabled: (i) => widget.isItemDisabled?.call(i) ?? false,
          scrollbarKey: _scrollbarKey,
        );
        final initialGroup = widget.groupKey;
        final store = NavixScope.storeOf(context);
        final restored = initialGroup != null ? store.get(initialGroup) : null;
        if (restored != null) {
          _behavior!.activeIndex = (restored['activeIndex'] as int?) ?? 0;
          _behavior!.viewOffset = (restored['viewOffset'] as int?) ?? 0;
          _viewOffset = _behavior!.viewOffset;
        }
        if (widget.activeKey != null) {
          final idx = _itemKeys.indexOf(widget.activeKey!);
          if (idx != -1) {
            _behavior!.jumpToIndex(idx);
            _viewOffset = _behavior!.viewOffset;
            _behavior!.focusByKey(widget.activeKey!);
          }
        }
        _behavior!.onChange = _onBehaviorChange;
        return _behavior!;
      },
      builder: (context, node, focused, directlyFocused) {
        return LayoutBuilder(
          builder: (context, constraints) {
            final mainSize =
                isHorizontal ? constraints.maxWidth : constraints.maxHeight;
            final crossSize =
                isHorizontal ? constraints.maxHeight : constraints.maxWidth;

            if (mainSize == 0 ||
                mainSize.isInfinite ||
                crossSize == 0 ||
                crossSize.isInfinite) {
              return const SizedBox.shrink();
            }

            final totalSlices = (widget.items.length / sliceSize).ceil();
            final finalShowScrollbar =
                (widget.showScrollbar || widget.scrollbarBuilder != null) &&
                    totalSlices > visibleSlices;

            final mainGaps = (visibleSlices - 1) * widget.gap;
            final sliceMainSize = mainSize > 0
                ? ((mainSize - mainGaps) / visibleSlices).floorToDouble()
                : 0.0;
            final mainStep = sliceMainSize + widget.gap;
            final translate = -_viewOffset * mainStep;

            Widget buildGrid(double effectiveCrossSize) {
              final crossGaps = (sliceSize - 1) * widget.gap;
              final slotCrossSize = effectiveCrossSize > 0
                  ? ((effectiveCrossSize - crossGaps) / sliceSize).floorToDouble()
                  : 0.0;

              final renderStartSlice =
                  (_viewOffset - widget.buffer).clamp(0, totalSlices);
              final renderEndSlice =
                  (_viewOffset + visibleSlices + widget.buffer)
                      .clamp(0, totalSlices);
              final paddingBefore = renderStartSlice * mainStep;

              final sliceWidgets = <Widget>[];
              for (int s = renderStartSlice; s < renderEndSlice; s++) {
                final startIdx = s * sliceSize;
                final endIdx = (startIdx + sliceSize).clamp(0, widget.items.length);

                final slotWidgets = <Widget>[];
                for (int i = startIdx; i < endIdx; i++) {
                  slotWidgets.add(SizedBox(
                    key: ValueKey(_itemKeys[i]),
                    width: isHorizontal ? null : slotCrossSize,
                    height: isHorizontal ? slotCrossSize : null,
                    child: widget.renderItem(
                      widget.items[i],
                      _itemKeys[i],
                      i,
                      widget.isItemDisabled?.call(i) ?? false,
                    ),
                  ));
                }

                sliceWidgets.add(SizedBox(
                  key: ValueKey('${widget.fKey}-slice-$s'),
                  width: isHorizontal ? sliceMainSize : null,
                  height: isHorizontal ? null : sliceMainSize,
                  child: isHorizontal
                      ? Column(
                          mainAxisSize: MainAxisSize.min,
                          children: _intersperse(slotWidgets, widget.gap, false),
                        )
                      : Row(
                          mainAxisSize: MainAxisSize.min,
                          children: _intersperse(slotWidgets, widget.gap, true),
                        ),
                ));
              }

              final spacedSlices = _intersperse(sliceWidgets, widget.gap, isHorizontal);
              final children = <Widget>[
                if (paddingBefore > 0)
                  SizedBox(
                    width: isHorizontal ? paddingBefore : null,
                    height: isHorizontal ? null : paddingBefore,
                  ),
                ...spacedSlices,
              ];

              final inner = isHorizontal
                  ? Row(crossAxisAlignment: CrossAxisAlignment.start, children: children)
                  : Column(crossAxisAlignment: CrossAxisAlignment.start, children: children);

              return SizedBox(
                width: isHorizontal ? mainSize : effectiveCrossSize,
                height: isHorizontal ? effectiveCrossSize : mainSize,
                child: ClipRect(
                  child: UnconstrainedBox(
                    alignment: Alignment.topLeft,
                    constrainedAxis: isHorizontal ? Axis.vertical : Axis.horizontal,
                    clipBehavior: Clip.hardEdge,
                    child: Transform.translate(
                      offset: isHorizontal ? Offset(translate, 0) : Offset(0, translate),
                      child: inner,
                    ),
                  ),
                ),
              );
            }

            if (!finalShowScrollbar) return buildGrid(crossSize);

            final scrollbarOrientation = isHorizontal
                ? NavixScrollOrientation.horizontal
                : NavixScrollOrientation.vertical;

            final scrollbarWidget = NavixScroll(
              fKey: _scrollbarKey,
              orientation: scrollbarOrientation,
              page: _viewOffset,
              pageCount: (_behavior?.maxOffset ?? 0) + 1,
              arrowStep: visibleSlices,
              pageStep: visibleSlices,
              onPageChange: (p) => _behavior?.setPage(p),
              renderScrollbar: widget.scrollbarBuilder,
            );

            return isHorizontal
                ? Column(
                    mainAxisSize: MainAxisSize.max,
                    children: [
                      Expanded(
                        child: LayoutBuilder(
                          builder: (context, c) => buildGrid(c.maxHeight),
                        ),
                      ),
                      scrollbarWidget,
                    ],
                  )
                : Row(
                    mainAxisSize: MainAxisSize.max,
                    children: [
                      Expanded(
                        child: LayoutBuilder(
                          builder: (context, c) => buildGrid(c.maxWidth),
                        ),
                      ),
                      scrollbarWidget,
                    ],
                  );
          },
        );
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

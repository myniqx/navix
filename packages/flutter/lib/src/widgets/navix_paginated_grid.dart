import 'package:flutter/widgets.dart';

import '../core/nav_event.dart';
import '../core/focus_node.dart';
import 'navix_focusable.dart';
import 'navix_paginated_list.dart' show NavixListOrientation;

class NavixPaginatedGridBehavior extends IFocusNodeBehavior {
  final NavixFocusNode _node;
  final NavixListOrientation orientation;
  final String Function(int index) _keyForIndex;

  int totalCount;
  int activeIndex = 0;
  int viewOffset = 0;

  int _rows;
  int _columns;
  int _threshold;

  String? _pendingFocusKey;

  void Function(int newIndex, int newOffset)? onChange;

  int get rows => _rows;
  set rows(int value) => _rows = value < 3 ? 3 : value;

  int get columns => _columns;
  set columns(int value) => _columns = value < 3 ? 3 : value;

  int get threshold => _threshold;
  set threshold(int value) {
    final visibleSlices =
        orientation == NavixListOrientation.horizontal ? _columns : _rows;
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
  })  : _node = node,
        _rows = rows < 3 ? 3 : rows,
        _columns = columns < 3 ? 3 : columns,
        _threshold = 1,
        _keyForIndex = keyForIndex {
    this.threshold = threshold;
    onEvent = _handleEvent;
    onChildRegistered = _onChildRegistered;
    onActiveChildChanged = _onActiveChildChanged;
  }

  bool _handleEvent(NavEvent event) {
    if (event.type != NavEventType.press) return false;

    if (orientation == NavixListOrientation.horizontal) {
      if (event.action == 'up') return _moveTo(activeIndex - 1, 'cross');
      if (event.action == 'down') return _moveTo(activeIndex + 1, 'cross');
      if (event.action == 'left') return _moveTo(activeIndex - _rows, 'main');
      if (event.action == 'right') return _moveTo(activeIndex + _rows, 'main');
    } else {
      if (event.action == 'left') return _moveTo(activeIndex - 1, 'cross');
      if (event.action == 'right') return _moveTo(activeIndex + 1, 'cross');
      if (event.action == 'up') return _moveTo(activeIndex - _columns, 'main');
      if (event.action == 'down')
        return _moveTo(activeIndex + _columns, 'main');
    }

    return false;
  }

  void _onChildRegistered(NavixFocusNode child) {
    if (_pendingFocusKey != null && child.key == _pendingFocusKey) {
      _pendingFocusKey = null;
      _node.focusChild(child.id);
    }
  }

  void _onActiveChildChanged(NavixFocusNode child) {
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
          orientation == NavixListOrientation.horizontal ? _rows : _columns;
      final oldSlice = activeIndex ~/ sliceSize;
      final newSlice = newIndex ~/ sliceSize;
      if (oldSlice != newSlice) return false;
    }

    activeIndex = newIndex;
    _updateOffset();
    onChange?.call(activeIndex, viewOffset);
    return true;
  }

  void _updateOffset() {
    final sliceSize =
        orientation == NavixListOrientation.horizontal ? _rows : _columns;
    final visibleSlices =
        orientation == NavixListOrientation.horizontal ? _columns : _rows;
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
);

class NavixPaginatedGrid<T> extends StatefulWidget {
  final String fKey;
  final NavixListOrientation orientation;
  final List<T> items;
  final int rows;
  final int columns;
  final int threshold;
  final NavixPaginatedGridItemBuilder<T> renderItem;
  final double gap;
  final int buffer;
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
    this.orientation = NavixListOrientation.horizontal,
    this.gap = 0,
    this.buffer = 1,
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

  late String _keyPrefix;
  late List<String> _itemKeys;

  @override
  void initState() {
    super.initState();
    _regenerateKeys();
  }

  @override
  void didUpdateWidget(NavixPaginatedGrid<T> oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (!identical(oldWidget.items, widget.items)) {
      _regenerateKeys();
    }
    if (_behavior != null) {
      _behavior!.totalCount = widget.items.length;
      _behavior!.rows = widget.rows;
      _behavior!.columns = widget.columns;
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

    final sliceSize = widget.orientation == NavixListOrientation.horizontal
        ? behavior.rows
        : behavior.columns;
    final visibleSlices = widget.orientation == NavixListOrientation.horizontal
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
    _viewOffset = behavior.viewOffset;
  }

  @override
  Widget build(BuildContext context) {
    final isHorizontal = widget.orientation == NavixListOrientation.horizontal;
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
        );
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

            final mainGaps = (visibleSlices - 1) * widget.gap;
            final sliceMainSize = mainSize > 0
                ? (mainSize - mainGaps) / visibleSlices
                : 0.0;
            final mainStep = sliceMainSize + widget.gap;
            final translate = -_viewOffset * mainStep;

            final crossGaps = (sliceSize - 1) * widget.gap;
            final slotCrossSize =
                crossSize > 0 ? (crossSize - crossGaps) / sliceSize : 0.0;

            final totalSlices = (widget.items.length / sliceSize).ceil();
            final renderStartSlice =
                (_viewOffset - widget.buffer).clamp(0, totalSlices);
            final renderEndSlice =
                (_viewOffset + visibleSlices + widget.buffer)
                    .clamp(0, totalSlices);
            final paddingBefore = renderStartSlice * mainStep;

            // Build slices
            final sliceWidgets = <Widget>[];

            if (paddingBefore > 0) {
              sliceWidgets.add(SizedBox(
                width: isHorizontal ? paddingBefore : null,
                height: isHorizontal ? null : paddingBefore,
              ));
            }

            for (int s = renderStartSlice; s < renderEndSlice; s++) {
              final startIdx = s * sliceSize;
              final endIdx = (startIdx + sliceSize).clamp(0, widget.items.length);

              final slotWidgets = <Widget>[];
              for (int i = startIdx; i < endIdx; i++) {
                slotWidgets.add(SizedBox(
                  key: ValueKey(_itemKeys[i]),
                  width: isHorizontal ? null : slotCrossSize,
                  height: isHorizontal ? slotCrossSize : null,
                  child: widget.renderItem(widget.items[i], _itemKeys[i], i),
                ));
              }

              final sliceWidget = SizedBox(
                key: ValueKey('$_keyPrefix-slice-$s'),
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
              );
              sliceWidgets.add(sliceWidget);
            }

            final inner = isHorizontal
                ? Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: _intersperse(sliceWidgets, widget.gap, true),
                  )
                : Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: _intersperse(sliceWidgets, widget.gap, false),
                  );

            return ClipRect(
              child: UnconstrainedBox(
                alignment: Alignment.topLeft,
                constrainedAxis: isHorizontal ? Axis.vertical : Axis.horizontal,
                child: Transform.translate(
                  offset: isHorizontal
                      ? Offset(translate, 0)
                      : Offset(0, translate),
                  child: inner,
                ),
              ),
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

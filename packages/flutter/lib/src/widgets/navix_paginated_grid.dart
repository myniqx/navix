import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';

import '../core/nav_event.dart';
import '../core/focus_node.dart';
import 'navix_focusable.dart';

const int _kMinGridDimension = 2;

enum NavixGridOrientation { horizontal, vertical, autoHorizontal }

class NavixPaginatedGridBehavior extends IFocusNodeBehavior {
  final NavixFocusNode _node;
  final String Function(int index) _keyForIndex;

  NavixGridOrientation orientation;
  int totalCount;
  int activeIndex = 0;
  int viewOffset = 0;

  int _rows;
  int _columns;
  int _threshold;

  String? _pendingFocusKey;

  void Function(int newIndex, int newOffset)? onChange;

  // Resolves 'autoHorizontal' to 'horizontal' or 'vertical' based on whether
  // all items fit into a single page. When items don't fill the grid,
  // vertical (row-major) layout looks better.
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
  })  : _node = node,
        _rows = rows < _kMinGridDimension ? _kMinGridDimension : rows,
        _columns = columns < _kMinGridDimension ? _kMinGridDimension : columns,
        _threshold = 1,
        _keyForIndex = keyForIndex {
    this.threshold = threshold;
    onEvent = _handleEvent;
    onChildRegistered = _onChildRegistered;
    onActiveChildChanged = _onActiveChildChanged;
  }

  bool _handleEvent(NavEvent event) {
    if (event.type != NavEventType.press) return false;

    if (effectiveOrientation == NavixGridOrientation.horizontal) {
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
          effectiveOrientation == NavixGridOrientation.horizontal
              ? _rows
              : _columns;
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
  final String? groupKey;
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
    this.keyForItem,
    this.groupKey,
    this.orientation = NavixGridOrientation.horizontal,
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

  late List<String> _itemKeys;

  final Map<String, _GroupSelection> _selectionByGroup = {};
  String? _currentGroupKey;

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
      // On group switch, commit current selection under the previous groupKey
      // (if any) and restore the new group's saved selection or 0,0.
      if (groupChanged) {
        final prevGroup = _currentGroupKey;
        if (prevGroup != null && oldWidget.items.isNotEmpty) {
          _selectionByGroup[prevGroup] = _GroupSelection(
            activeIndex: _behavior!.activeIndex,
            viewOffset: _behavior!.viewOffset,
          );
        }

        final newGroup = widget.groupKey;
        final restored = newGroup != null ? _selectionByGroup[newGroup] : null;
        _behavior!.activeIndex = restored?.activeIndex ?? 0;
        _behavior!.viewOffset = restored?.viewOffset ?? 0;
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
    }
  }

  void _rebuildKeys() {
    _itemKeys = List.generate(
      widget.items.length,
      (i) => _keyForItem(widget.items[i], i),
    );
  }

  void _onBehaviorChange(int newIndex, int newOffset) {
    if (newIndex < 0 || newIndex >= _itemKeys.length) return;
    setState(() => _viewOffset = newOffset);
    final group = _currentGroupKey;
    if (group != null) {
      _selectionByGroup[group] = _GroupSelection(
        activeIndex: newIndex,
        viewOffset: newOffset,
      );
    }
    _behavior?.focusByKey(_itemKeys[newIndex]);
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
    _viewOffset = behavior.viewOffset;
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
        final initialGroup = widget.groupKey;
        final restored =
            initialGroup != null ? _selectionByGroup[initialGroup] : null;
        if (restored != null) {
          _behavior!.activeIndex = restored.activeIndex;
          _behavior!.viewOffset = restored.viewOffset;
          _viewOffset = restored.viewOffset;
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

            final mainGaps = (visibleSlices - 1) * widget.gap;
            final sliceMainSize = mainSize > 0
                ? ((mainSize - mainGaps) / visibleSlices).floorToDouble()
                : 0.0;
            final mainStep = sliceMainSize + widget.gap;
            final translate = -_viewOffset * mainStep;

            final crossGaps = (sliceSize - 1) * widget.gap;
            final slotCrossSize = crossSize > 0
                ? ((crossSize - crossGaps) / sliceSize).floorToDouble()
                : 0.0;

            final totalSlices = (widget.items.length / sliceSize).ceil();
            final renderStartSlice =
                (_viewOffset - widget.buffer).clamp(0, totalSlices);
            final renderEndSlice =
                (_viewOffset + visibleSlices + widget.buffer)
                    .clamp(0, totalSlices);
            final paddingBefore = renderStartSlice * mainStep;

            // Build slices
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
                  child: widget.renderItem(widget.items[i], _itemKeys[i], i),
                ));
              }

              final sliceWidget = SizedBox(
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
              );
              sliceWidgets.add(sliceWidget);
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
                ? Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: children,
                  )
                : Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: children,
                  );

            return SizedBox(
              width: isHorizontal ? mainSize : crossSize,
              height: isHorizontal ? crossSize : mainSize,
              child: ClipRect(
                child: UnconstrainedBox(
                  alignment: Alignment.topLeft,
                  constrainedAxis:
                      isHorizontal ? Axis.vertical : Axis.horizontal,
                  clipBehavior: Clip.hardEdge,
                  child: Transform.translate(
                    offset: isHorizontal
                        ? Offset(translate, 0)
                        : Offset(0, translate),
                    child: inner,
                  ),
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

class _GroupSelection {
  final int activeIndex;
  final int viewOffset;
  const _GroupSelection({required this.activeIndex, required this.viewOffset});
}

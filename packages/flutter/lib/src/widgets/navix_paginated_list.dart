import 'package:flutter/widgets.dart';

import '../core/nav_event.dart';
import '../core/focus_node.dart';
import '../core/focus_manager.dart';
import '../common/default_scrollbar.dart';
import 'navix_focusable.dart';

export '../common/default_scrollbar.dart' show ScrollbarRenderProps;

const int _kMinVisibleCount = 2;

enum NavixListOrientation { horizontal, vertical }

class NavixPaginatedListBehavior extends IFocusNodeBehavior {
  final NavixFocusNode _node;
  final String _prev;
  final String _next;
  final String _scrollEnter;
  final String _scrollExit;
  final String Function(int index) _keyForIndex;

  int totalCount;
  int activeIndex = 0;
  int viewOffset = 0;
  bool scrollMode = false;

  int _visibleCount;
  int _threshold;

  String? _pendingFocusKey;
  bool Function(int index)? _isItemDisabled;

  void Function(int newIndex, int newOffset)? onChange;
  void Function(bool scrollMode)? onScrollModeChange;

  int get visibleCount => _visibleCount;
  set visibleCount(int value) => _visibleCount = value < _kMinVisibleCount ? _kMinVisibleCount : value;

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
    bool Function(int index)? isItemDisabled,
  })  : _node = node,
        _prev = orientation == NavixListOrientation.horizontal ? 'left' : 'up',
        _next = orientation == NavixListOrientation.horizontal ? 'right' : 'down',
        _scrollEnter = orientation == NavixListOrientation.horizontal ? 'down' : 'right',
        _scrollExit = orientation == NavixListOrientation.horizontal ? 'up' : 'left',
        _visibleCount = visibleCount < _kMinVisibleCount ? _kMinVisibleCount : visibleCount,
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

  int? _findNext(int from, int dir) {
    int i = from + dir;
    while (i >= 0 && i < totalCount) {
      if (_isItemDisabled?.call(i) != true) return i;
      i += dir;
    }
    return null;
  }

  bool _handleEvent(NavEvent event) {
    if (event.type != NavEventType.press) return false;

    if (scrollMode) {
      if (event.action == _prev) return _scrollPage(-1);
      if (event.action == _next) return _scrollPage(1);
      if (event.action == _scrollExit) {
        _setScrollMode(false);
        return true;
      }
      if (event.action == _scrollEnter) {
        _setScrollMode(false);
        return false;
      }
      return false;
    }

    if (event.action == _prev) {
      final next = _findNext(activeIndex, -1);
      return next != null ? _moveTo(next) : false;
    }
    if (event.action == _next) {
      final next = _findNext(activeIndex, 1);
      return next != null ? _moveTo(next) : false;
    }
    if (event.action == _scrollEnter) {
      _setScrollMode(true);
      return true;
    }
    return false;
  }

  void _setScrollMode(bool value) {
    scrollMode = value;
    onScrollModeChange?.call(value);
  }

  int get maxOffset => (totalCount - visibleCount).clamp(0, totalCount);

  void setPage(int page) {
    final newOffset = page.clamp(0, maxOffset);
    if (newOffset == viewOffset) return;

    final newActiveIndex = (newOffset + (activeIndex - viewOffset)).clamp(0, totalCount - 1);

    viewOffset = newOffset;
    activeIndex = newActiveIndex;
    onChange?.call(activeIndex, viewOffset);
  }

  bool _scrollPage(int dir) {
    setPage(viewOffset + dir * visibleCount);
    return true;
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
          '[NavixPaginatedList:${_node.key}] Registered child key "${child.key}" does not match any key produced by keyForItem. '
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
      final fwd = _findNext(index, 1);
      final bwd = _findNext(index, -1);
      if (fwd == null && bwd == null) return;
      target = fwd ?? bwd!;
    }
    activeIndex = target;
    _updateOffset();
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
  bool disabled,
);

typedef NavixPaginatedListKeyForItem<T> = String Function(T item, int index);

typedef NavixScrollbarBuilder = Widget Function(ScrollbarRenderProps props);

class NavixPaginatedList<T> extends StatefulWidget {
  final String fKey;
  final NavixListOrientation orientation;
  final List<T> items;
  final int visibleCount;
  final int threshold;
  final NavixPaginatedListItemBuilder<T> renderItem;
  final NavixPaginatedListKeyForItem<T>? keyForItem;
  final bool Function(int index)? isItemDisabled;
  final bool disabled;
  final String? activeKey;
  final String? groupKey;
  final double gap;
  final int buffer;
  final bool showScrollbar;
  final NavixScrollbarBuilder? renderScrollbar;
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
    this.keyForItem,
    this.isItemDisabled,
    this.activeKey,
    this.disabled = false,
    this.groupKey,
    this.orientation = NavixListOrientation.horizontal,
    this.gap = 0,
    this.buffer = 2,
    this.showScrollbar = false,
    this.renderScrollbar,
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
  bool _scrollMode = false;
  NavixPaginatedListBehavior? _behavior;

  late List<String> _itemKeys;
  String? _currentGroupKey;

  String _defaultKeyForItem(T item, int index) => '${widget.fKey}-$index';

  String _keyForItem(T item, int index) =>
      (widget.keyForItem ?? _defaultKeyForItem)(item, index);

  @override
  void initState() {
    super.initState();
    _rebuildKeys();
    _currentGroupKey = widget.groupKey;
  }

  @override
  void didUpdateWidget(NavixPaginatedList<T> oldWidget) {
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
      _behavior!.visibleCount = widget.visibleCount;
      _behavior!.threshold = widget.threshold;
      _clampBehaviorState();
      _behavior!.onChange = _onBehaviorChange;
      _behavior!.onScrollModeChange = _onScrollModeChange;

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

  void _onBehaviorChange(int newIndex, int newOffset) {
    if (newIndex < 0 || newIndex >= _itemKeys.length) return;
    setState(() => _viewOffset = newOffset);
    final group = _currentGroupKey;
    if (group != null) {
      NavixScope.storeOf(context)
          .update(group, {'activeIndex': newIndex, 'viewOffset': newOffset});
    }
    _behavior?.focusByKey(_itemKeys[newIndex]);
  }

  void _onScrollModeChange(bool value) {
    setState(() => _scrollMode = value);
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
    if (_viewOffset != behavior.viewOffset) {
      setState(() => _viewOffset = behavior.viewOffset);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isHorizontal = widget.orientation == NavixListOrientation.horizontal;
    final scrollbarMax = (widget.items.length - widget.visibleCount).clamp(0, widget.items.length);
    final finalShowScrollbar = (widget.showScrollbar || widget.renderScrollbar != null) && scrollbarMax > 0;

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
      createBehavior: (node) {
        _behavior = NavixPaginatedListBehavior(
          node: node,
          orientation: widget.orientation,
          totalCount: widget.items.length,
          visibleCount: widget.visibleCount,
          threshold: widget.threshold,
          keyForIndex: (i) => _itemKeys[i],
          isItemDisabled: (i) => widget.isItemDisabled?.call(i) ?? false,
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
          }
        }
        _behavior!.onChange = _onBehaviorChange;
        _behavior!.onScrollModeChange = _onScrollModeChange;
        return _behavior!;
      },
      builder: (context, node, focused, directlyFocused) {
        final scrollbarProps = ScrollbarRenderProps(
          scrollMode: _scrollMode,
          page: _viewOffset,
          pageCount: (_behavior?.maxOffset ?? 0) + 1,
          orientation: widget.orientation == NavixListOrientation.horizontal
              ? NavixScrollbarOrientation.horizontal
              : NavixScrollbarOrientation.vertical,
          onPageChange: (p) => _behavior?.setPage(p),
        );

        final scrollbarWidget = finalShowScrollbar
            ? (widget.renderScrollbar != null
                ? widget.renderScrollbar!(scrollbarProps)
                : DefaultScrollbar(props: scrollbarProps))
            : null;

        if (isHorizontal) {
          return LayoutBuilder(
            builder: (context, constraints) {
              final containerWidth = constraints.maxWidth;
              if (containerWidth == 0 || containerWidth.isInfinite) {
                return const SizedBox.shrink();
              }

              final totalGap = (widget.visibleCount - 1) * widget.gap;
              final slotSize =
                  ((containerWidth - totalGap) / widget.visibleCount)
                      .floorToDouble();
              final step = slotSize + widget.gap;
              final translate = -_viewOffset * step;

              final renderStart =
                  (_viewOffset - widget.buffer).clamp(0, widget.items.length);
              final renderEnd =
                  (_viewOffset + widget.visibleCount + widget.buffer)
                      .clamp(0, widget.items.length);
              final paddingBefore = renderStart * step;

              final slots = <Widget>[
                for (int i = renderStart; i < renderEnd; i++)
                  SizedBox(
                    key: ValueKey(_itemKeys[i]),
                    width: slotSize,
                    child: widget.renderItem(
                      widget.items[i],
                      _itemKeys[i],
                      i,
                      widget.isItemDisabled?.call(i) ?? false,
                    ),
                  ),
              ];

              final listWidget = SizedBox(
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
                        children: [
                          if (paddingBefore > 0) SizedBox(width: paddingBefore),
                          ..._intersperse(slots, widget.gap, true),
                        ],
                      ),
                    ),
                  ),
                ),
              );

              if (scrollbarWidget == null) return listWidget;

              return SizedBox(
                width: containerWidth,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    listWidget,
                    scrollbarWidget,
                  ],
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

              final scrollbarThickness = finalShowScrollbar ? 8.0 : 0.0;
              final availableHeight = containerHeight;

              final totalGap = (widget.visibleCount - 1) * widget.gap;
              final slotSize =
                  ((availableHeight - totalGap) / widget.visibleCount)
                      .floorToDouble();
              final step = slotSize + widget.gap;
              final translate = -_viewOffset * step;

              final renderStart =
                  (_viewOffset - widget.buffer).clamp(0, widget.items.length);
              final renderEnd =
                  (_viewOffset + widget.visibleCount + widget.buffer)
                      .clamp(0, widget.items.length);
              final paddingBefore = renderStart * step;

              final slots = <Widget>[
                for (int i = renderStart; i < renderEnd; i++)
                  SizedBox(
                    key: ValueKey(_itemKeys[i]),
                    height: slotSize,
                    child: widget.renderItem(
                      widget.items[i],
                      _itemKeys[i],
                      i,
                      widget.isItemDisabled?.call(i) ?? false,
                    ),
                  ),
              ];

              final listWidget = SizedBox(
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
                        children: [
                          if (paddingBefore > 0) SizedBox(height: paddingBefore),
                          ..._intersperse(slots, widget.gap, false),
                        ],
                      ),
                    ),
                  ),
                ),
              );

              if (scrollbarWidget == null) return listWidget;

              return SizedBox(
                height: containerHeight,
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Expanded(child: listWidget),
                    SizedBox(width: scrollbarThickness, child: scrollbarWidget),
                  ],
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

import 'package:flutter/widgets.dart';

import '../core/nav_event.dart';
import '../core/focus_node.dart';
import '../core/focus_manager.dart';
import 'navix_focusable.dart';
import 'navix_scroll.dart';

export 'navix_scroll.dart' show ScrollbarRenderProps, NavixScrollOrientation;

const int _kMinVisibleCount = 2;

/// The scroll/navigation axis for [NavixPaginatedList].
enum NavixListOrientation {
  /// Items are laid out side-by-side; left/right moves between them.
  horizontal,

  /// Items are stacked vertically; up/down moves between them.
  vertical,
}

class NavixPaginatedListBehavior extends IFocusNodeBehavior {
  final NavixFocusNode _node;
  final String _prev;
  final String _next;
  final String _scrollEnter;
  final String _scrollExit;
  final String? _scrollbarKey;
  final String Function(int index) _keyForIndex;

  int totalCount;
  int activeIndex = 0;
  int viewOffset = 0;

  int _visibleCount;
  int _threshold;

  String? _pendingFocusKey;
  bool Function(int index)? _isItemDisabled;

  void Function(int newIndex, int newOffset, bool refocusItem)? onChange;

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
    String? scrollbarKey,
  })  : _node = node,
        _prev = orientation == NavixListOrientation.horizontal ? 'left' : 'up',
        _next = orientation == NavixListOrientation.horizontal ? 'right' : 'down',
        _scrollEnter = orientation == NavixListOrientation.horizontal ? 'down' : 'right',
        _scrollExit = orientation == NavixListOrientation.horizontal ? 'up' : 'left',
        _scrollbarKey = scrollbarKey,
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

  bool _isScrollbarActive() {
    if (_scrollbarKey == null) return false;
    final active = _node.getActiveChild();
    return active != null && active.key == _scrollbarKey;
  }

  bool _handleEvent(NavEvent event) {
    if (event.type != NavEventType.press) return false;

    if (_isScrollbarActive()) {
      if (event.action == _scrollExit) {
        _focusActiveItem();
        return true;
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
      return _focusScrollbar();
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

  int get maxOffset => (totalCount - visibleCount).clamp(0, totalCount);

  void setPage(int page) {
    final newOffset = page.clamp(0, maxOffset);
    if (newOffset == viewOffset) return;

    final newActiveIndex = (newOffset + (activeIndex - viewOffset)).clamp(0, totalCount - 1);

    viewOffset = newOffset;
    activeIndex = newActiveIndex;
    // Scrollbar-driven: focus stays on the scrollbar, do not refocus item.
    onChange?.call(activeIndex, viewOffset, false);
  }

  void _onChildRegistered(NavixFocusNode child) {
    if (_scrollbarKey != null && child.key == _scrollbarKey) {
      // Pin scrollbar at index 0 of children so item index math is unaffected.
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

  bool _moveTo(int newIndex) {
    if (newIndex < 0 || newIndex >= totalCount) return false;
    activeIndex = newIndex;
    _updateOffset();
    onChange?.call(activeIndex, viewOffset, true);
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

/// Signature for the item builder of [NavixPaginatedList].
///
/// **Important:** the [fKey] argument must be assigned to the `fKey` of the
/// focusable child widget you return. Using a custom key breaks focus
/// tracking and emits a `debugPrint` warning in development.
///
/// - [item] — the data item for this slot.
/// - [fKey] — the key generated by [NavixPaginatedList.keyForItem]; forward
///   it to the focusable child.
/// - [index] — position in [NavixPaginatedList.items].
/// - [disabled] — `true` when [NavixPaginatedList.isItemDisabled] returns
///   `true` for this index.
typedef NavixPaginatedListItemBuilder<T> = Widget Function(
  T item,
  String fKey,
  int index,
  bool disabled,
);

/// Signature for the key generator of [NavixPaginatedList].
///
/// Return a stable, content-based string per item so focus and widget
/// reconciliation survive [NavixPaginatedList.items] reference changes.
typedef NavixPaginatedListKeyForItem<T> = String Function(T item, int index);

/// A virtualized 1-D list with a sliding window.
///
/// Only items within the visible window ± [buffer] are mounted. The window
/// slides automatically when focus reaches the [threshold] position from
/// either edge.
///
/// The widget uses [LayoutBuilder] and must have a **bounded constraint** on
/// the main axis.
///
/// ```dart
/// NavixPaginatedList<Movie>(
///   fKey: 'movies',
///   items: movies,
///   visibleCount: 5,
///   threshold: 1,
///   renderItem: (movie, fKey, index, disabled) =>
///       MovieCard(fKey: fKey, movie: movie),
/// )
/// ```
class NavixPaginatedList<T> extends StatefulWidget {
  /// Unique string identifier for this node.
  final String fKey;

  /// Navigation and layout axis. Default: [NavixListOrientation.horizontal].
  final NavixListOrientation orientation;

  /// The full item array. Changing the reference triggers a key rebuild;
  /// focus is clamped to the new bounds.
  final List<T> items;

  /// Number of items visible at once (minimum 2). The slot size is derived
  /// from the widget's constraints divided by this value.
  final int visibleCount;

  /// Distance from either edge (in item positions) at which the window
  /// starts to slide. Clamped to `[1, visibleCount - 2]`.
  final int threshold;

  /// Required. Builds each visible item slot.
  ///
  /// The [fKey] argument **must** be forwarded to the focusable child widget.
  final NavixPaginatedListItemBuilder<T> renderItem;

  /// Stable key per item used for reconciliation and focus tracking.
  /// Default: `'${fKey}-$index'`.
  ///
  /// Provide a content-based implementation (e.g. using the item's `id`) when
  /// the [items] list can be mutated or replaced and item identity should
  /// survive those changes.
  final NavixPaginatedListKeyForItem<T>? keyForItem;

  /// Returns `true` if the item at the given index should be skipped during
  /// keyboard navigation. Disabled items are still rendered and receive
  /// `disabled: true` in [renderItem].
  final bool Function(int index)? isItemDisabled;

  /// Prevents this list from receiving focus. Default: `false`.
  final bool disabled;

  /// Auto-focus this list when it registers. Default: `false`.
  final bool focusOnRegister;

  /// Jump to the item with this key on mount and whenever the value changes.
  ///
  /// If the target item is disabled, the nearest non-disabled neighbor is
  /// focused. This is a write-only intent prop — user arrow-key navigation
  /// is unaffected between jumps.
  final String? activeKey;

  /// Per-group selection cache key.
  ///
  /// When the value changes, the previous group's `activeIndex`/`viewOffset`
  /// is saved and the new group's saved selection is restored (or `0/0` if
  /// first time). Focus is automatically retargeted to the restored item.
  ///
  /// Omit for no caching.
  final String? groupKey;

  /// Gap between slots in logical pixels. Default: `0`.
  final double gap;

  /// Extra items rendered outside the visible window on each side. Higher
  /// values reduce pop-in during fast scrolling at the cost of more widgets.
  /// Default: `2`.
  final int buffer;

  /// Shows the built-in [NavixScroll] scrollbar below (horizontal) or to the
  /// right (vertical) of the list. Default: `false`.
  ///
  /// Setting [renderScrollbar] also enables the scrollbar implicitly.
  final bool showScrollbar;

  /// Override the default scrollbar visual. Receives [ScrollbarRenderProps].
  /// Setting this also enables the scrollbar implicitly.
  final NavixScrollbarBuilder? renderScrollbar;

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

  /// Creates a [NavixPaginatedList].
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
    this.focusOnRegister = false,
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
  NavixPaginatedListBehavior? _behavior;

  late List<String> _itemKeys;
  String? _currentGroupKey;

  String get _scrollbarKey => '${widget.fKey}__scrollbar__';

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
        focusOnRegister: widget.focusOnRegister,
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
        final scrollbarOrientation = isHorizontal
            ? NavixScrollOrientation.horizontal
            : NavixScrollOrientation.vertical;

        final scrollbarWidget = finalShowScrollbar
            ? NavixScroll(
                fKey: _scrollbarKey,
                orientation: scrollbarOrientation,
                page: _viewOffset,
                pageCount: (_behavior?.maxOffset ?? 0) + 1,
                arrowStep: widget.visibleCount,
                pageStep: widget.visibleCount,
                onPageChange: (p) => _behavior?.setPage(p),
                renderScrollbar: widget.renderScrollbar,
              )
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

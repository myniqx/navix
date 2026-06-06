import 'package:flutter/widgets.dart';

import '../core/nav_event.dart';
import 'navix_button.dart';
import 'navix_expandable.dart';
import 'navix_paginated_list.dart';

/// Where the [NavixDropdown] panel opens relative to the trigger widget.
enum NavixDropdownPosition {
  /// Panel opens above the trigger.
  top,

  /// Panel opens below the trigger (default).
  bottom,
}

/// A single option in a [NavixDropdown].
class NavixDropdownOption {
  /// Human-readable label shown in the trigger and rendered by
  /// [NavixDropdown.renderOption].
  final String label;

  /// The opaque value stored in [NavixDropdown.value] when this option is
  /// selected.
  final String value;

  /// Creates a [NavixDropdownOption].
  const NavixDropdownOption({required this.label, required this.value});
}

/// Signature for the trigger builder of [NavixDropdown].
///
/// - [label] — the display text: selected option label, multi-selection
///   summary (`'N selected'`), or [NavixDropdown.placeholder].
/// - [isExpanded] — whether the dropdown panel is open.
/// - [focused] — `true` when this node is on the active focus path.
typedef NavixDropdownTriggerBuilder = Widget Function(
  BuildContext context,
  String label,
  bool isExpanded,
  bool focused,
);

/// Signature for the option row builder of [NavixDropdown].
///
/// - [option] — the [NavixDropdownOption] for this row.
/// - [selected] — whether this option is in the current [NavixDropdown.value].
/// - [focused] — `true` when this row is the deepest active leaf.
/// - [index] — position in the [NavixDropdown.options] list.
typedef NavixDropdownOptionBuilder = Widget Function(
  BuildContext context,
  NavixDropdownOption option,
  bool selected,
  bool focused,
  int index,
);

/// A single- or multi-select dropdown built on [NavixExpandable] +
/// [NavixPaginatedList].
///
/// Options are navigated with up/down arrow keys. Enter selects; Back closes.
/// The panel is rendered in an [OverlayPortal] so it floats above other
/// widgets.
///
/// ```dart
/// NavixDropdown(
///   fKey: 'resolution',
///   options: const [
///     NavixDropdownOption(value: '4k',    label: '4K'),
///     NavixDropdownOption(value: '1080p', label: '1080p'),
///   ],
///   value: resolution,
///   onChange: (v) => setState(() => resolution = v),
///   renderTrigger: (context, label, isExpanded, focused) => Text(label),
///   renderOption: (context, option, selected, focused, index) =>
///       Text(option.label),
/// )
/// ```
class NavixDropdown extends StatelessWidget {
  /// Unique string identifier for this node.
  final String fKey;

  /// The full list of selectable options.
  final List<NavixDropdownOption> options;

  /// Currently selected values (list of [NavixDropdownOption.value] strings).
  /// Default: `[]`.
  final List<String> value;

  /// Called when the selection changes. Receives the updated value list.
  final void Function(List<String> value)? onChange;

  /// Allow selecting multiple options simultaneously. Default: `false`.
  final bool multiple;

  /// Whether the panel opens above or below the trigger. Default: [NavixDropdownPosition.bottom].
  final NavixDropdownPosition position;

  /// Maximum number of options visible at once before the panel scrolls.
  /// Default: `3`.
  final int maxVisible;

  /// Text shown in the trigger when nothing is selected. Default: `'Select...'`.
  final String placeholder;

  /// Height of each option row in logical pixels. Default: `44`.
  final double slotHeight;

  /// Fixed panel width. When `null` the panel matches the trigger width
  /// (clamped to [minPanelWidth]).
  final double? panelWidth;

  /// Minimum panel width in logical pixels. Default: `160`.
  final double minPanelWidth;

  /// Required. Builds the trigger (closed state) widget.
  final NavixDropdownTriggerBuilder renderTrigger;

  /// Required. Builds each option row inside the panel.
  final NavixDropdownOptionBuilder renderOption;

  /// Prevents this dropdown from receiving focus. Default: `false`.
  final bool disabled;

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

  /// Creates a [NavixDropdown].
  const NavixDropdown({
    super.key,
    required this.fKey,
    required this.options,
    required this.renderTrigger,
    required this.renderOption,
    this.value = const [],
    this.onChange,
    this.multiple = false,
    this.position = NavixDropdownPosition.bottom,
    this.maxVisible = 3,
    this.placeholder = 'Select...',
    this.slotHeight = 44,
    this.panelWidth,
    this.minPanelWidth = 160,
    this.disabled = false,
    this.onFocus,
    this.onBlurred,
    this.onRegister,
    this.onUnregister,
    this.onEvent,
  });

  String get _triggerLabel {
    if (value.isEmpty) return placeholder;
    if (value.length == 1) {
      return options
              .cast<NavixDropdownOption?>()
              .firstWhere((o) => o!.value == value[0], orElse: () => null)
              ?.label ??
          placeholder;
    }
    return '${value.length} selected';
  }

  void _handleSelect(int index, VoidCallback collapse) {
    final selected = options[index].value;
    List<String> next;
    if (multiple) {
      next = value.contains(selected)
          ? value.where((v) => v != selected).toList()
          : [...value, selected];
    } else {
      next = [selected];
      collapse();
    }
    onChange?.call(next);
  }

  @override
  Widget build(BuildContext context) {
    final listFKey = '$fKey-list';
    final visibleHeight =
        options.length < maxVisible ? options.length : maxVisible;

    return NavixExpandable(
      fKey: fKey,
      disabled: disabled,
      onFocus: onFocus,
      onBlurred: onBlurred,
      onRegister: onRegister,
      onUnregister: onUnregister,
      onEvent: onEvent,
      builder: (context, isExpanded, focused, directlyFocused, expand, collapse) {
        return _DropdownOverlayHost(
          isExpanded: isExpanded,
          position: position,
          panelWidth: panelWidth,
          minPanelWidth: minPanelWidth,
          panelHeight: visibleHeight * slotHeight,
          trigger: renderTrigger(
            context,
            _triggerLabel,
            isExpanded,
            focused || directlyFocused,
          ),
          panel: NavixPaginatedList<NavixDropdownOption>(
            fKey: listFKey,
            orientation: NavixListOrientation.vertical,
            items: options,
            visibleCount: maxVisible,
            threshold: 1,
            showScrollbar: true,
            renderItem: (option, itemFKey, index, disabled) {
              final isSelected = value.contains(option.value);
              return _OptionButton(
                fKey: itemFKey,
                height: slotHeight,
                onSelect: () => _handleSelect(index, collapse),
                builder: (context, isFocused) => renderOption(
                  context,
                  option,
                  isSelected,
                  isFocused,
                  index,
                ),
              );
            },
          ),
        );
      },
    );
  }
}

class _DropdownOverlayHost extends StatefulWidget {
  final bool isExpanded;
  final NavixDropdownPosition position;
  final double? panelWidth;
  final double minPanelWidth;
  final double panelHeight;
  final Widget trigger;
  final Widget panel;

  const _DropdownOverlayHost({
    required this.isExpanded,
    required this.position,
    required this.panelWidth,
    required this.minPanelWidth,
    required this.panelHeight,
    required this.trigger,
    required this.panel,
  });

  @override
  State<_DropdownOverlayHost> createState() => _DropdownOverlayHostState();
}

class _DropdownOverlayHostState extends State<_DropdownOverlayHost> {
  final OverlayPortalController _overlayController = OverlayPortalController();
  final LayerLink _layerLink = LayerLink();
  final GlobalKey _triggerKey = GlobalKey();
  double _triggerWidth = 0;
  double _triggerHeight = 0;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _syncOverlay());
  }

  @override
  void didUpdateWidget(_DropdownOverlayHost oldWidget) {
    super.didUpdateWidget(oldWidget);
    WidgetsBinding.instance.addPostFrameCallback((_) => _syncOverlay());
  }

  void _syncOverlay() {
    if (!mounted) return;
    final renderObject = _triggerKey.currentContext?.findRenderObject();
    if (renderObject is RenderBox) {
      final size = renderObject.size;
      if (size.width != _triggerWidth || size.height != _triggerHeight) {
        setState(() {
          _triggerWidth = size.width;
          _triggerHeight = size.height;
        });
      }
    }

    if (widget.isExpanded) {
      _overlayController.show();
    } else {
      _overlayController.hide();
    }
  }

  @override
  Widget build(BuildContext context) {
    return OverlayPortal(
      controller: _overlayController,
      overlayChildBuilder: (context) {
        final offset = widget.position == NavixDropdownPosition.bottom
            ? Offset(0, _triggerHeight)
            : Offset(0, -widget.panelHeight);
        final panelWidth = widget.panelWidth ??
            (_triggerWidth > widget.minPanelWidth
                ? _triggerWidth
                : widget.minPanelWidth);

        return CompositedTransformFollower(
          link: _layerLink,
          showWhenUnlinked: false,
          offset: offset,
          child: UnconstrainedBox(
            alignment: Alignment.topLeft,
            child: SizedBox(
              width: panelWidth,
              height: widget.panelHeight,
              child: DecoratedBox(
                decoration: BoxDecoration(
                  color: const Color(0xFF0d0d1a),
                  border: Border.all(color: const Color(0xFF4fc3f7)),
                  borderRadius: widget.position == NavixDropdownPosition.bottom
                      ? const BorderRadius.vertical(
                          bottom: Radius.circular(4),
                        )
                      : const BorderRadius.vertical(
                          top: Radius.circular(4),
                        ),
                ),
                child: ClipRRect(
                  borderRadius: widget.position == NavixDropdownPosition.bottom
                      ? const BorderRadius.vertical(
                          bottom: Radius.circular(4),
                        )
                      : const BorderRadius.vertical(
                          top: Radius.circular(4),
                        ),
                  child: widget.panel,
                ),
              ),
            ),
          ),
        );
      },
      child: CompositedTransformTarget(
        link: _layerLink,
        child: KeyedSubtree(
          key: _triggerKey,
          child: widget.trigger,
        ),
      ),
    );
  }
}

class _OptionButton extends StatelessWidget {
  final String fKey;
  final double height;
  final VoidCallback onSelect;
  final Widget Function(BuildContext context, bool focused) builder;

  const _OptionButton({
    required this.fKey,
    required this.height,
    required this.onSelect,
    required this.builder,
  });

  @override
  Widget build(BuildContext context) {
    return NavixButton(
      fKey: fKey,
      onClick: onSelect,
      builder: (context, focused) => SizedBox(
        height: height,
        width: double.infinity,
        child: builder(context, focused),
      ),
    );
  }
}

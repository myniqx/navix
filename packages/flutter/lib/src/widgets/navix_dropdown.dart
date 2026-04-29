import 'package:flutter/widgets.dart';

import '../core/nav_event.dart';
import 'navix_button.dart';
import 'navix_expandable.dart';
import 'navix_paginated_list.dart';

enum NavixDropdownPosition { top, bottom }

class NavixDropdownOption {
  final String label;
  final String value;

  const NavixDropdownOption({required this.label, required this.value});
}

typedef NavixDropdownTriggerBuilder = Widget Function(
  BuildContext context,
  String label,
  bool isExpanded,
  bool focused,
);

typedef NavixDropdownOptionBuilder = Widget Function(
  BuildContext context,
  NavixDropdownOption option,
  bool selected,
  bool focused,
  int index,
);

class NavixDropdown extends StatelessWidget {
  final String fKey;
  final List<NavixDropdownOption> options;
  final List<String> value;
  final void Function(List<String> value)? onChange;
  final bool multiple;
  final NavixDropdownPosition position;
  final int maxVisible;
  final String placeholder;
  final double slotHeight;
  final double? panelWidth;
  final double minPanelWidth;
  final NavixDropdownTriggerBuilder renderTrigger;
  final NavixDropdownOptionBuilder renderOption;
  final void Function(String key)? onFocus;
  final void Function(String key)? onBlurred;
  final void Function(String key)? onRegister;
  final void Function(String key)? onUnregister;
  final bool Function(NavEvent event)? onEvent;

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
            renderItem: (option, itemFKey, index) {
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

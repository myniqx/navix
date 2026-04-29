import 'package:flutter/material.dart';
import 'package:navix/navix.dart';
import '../data.dart';
import 'options_modal.dart';

const _blue = Color(0xFF4fc3f7);

class MenuRow extends StatefulWidget {
  final void Function(String item) onSelect;

  const MenuRow({super.key, required this.onSelect});

  @override
  State<MenuRow> createState() => _MenuRowState();
}

class _MenuRowState extends State<MenuRow> {
  Map<String, String> _options = Map.from(defaultOptions);

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 16),
      decoration: const BoxDecoration(
        color: Color(0xFF0d0d1a),
        border: Border(bottom: BorderSide(color: Color(0xFF1a1a2e))),
      ),
      child: NavixHorizontalList(
        fKey: 'menu',
        child: Row(
          children: [
            for (final item in menuItems) ...[
              if (item == 'Options')
                NavixExpandable(
                  fKey: 'menu-Options',
                  builder: (context, isExpanded, focused, directlyFocused, expand, collapse) {
                    final isActive = directlyFocused || (focused && isExpanded);
                    return _OptionsMenuItem(
                      isExpanded: isExpanded,
                      isActive: isActive,
                      options: _options,
                      onExpand: expand,
                      onClose: collapse,
                      onChange: (key, value) =>
                          setState(() => _options = {..._options, key: value}),
                    );
                  },
                )
              else
                _MenuItem(
                  fKey: 'menu-$item',
                  label: item,
                  onClick: () => widget.onSelect(item),
                ),
              const SizedBox(width: 4),
            ],
          ],
        ),
      ),
    );
  }
}

class _OptionsMenuItem extends StatefulWidget {
  final bool isExpanded;
  final bool isActive;
  final Map<String, String> options;
  final VoidCallback onExpand;
  final VoidCallback onClose;
  final void Function(String key, String value) onChange;

  const _OptionsMenuItem({
    required this.isExpanded,
    required this.isActive,
    required this.options,
    required this.onExpand,
    required this.onClose,
    required this.onChange,
  });

  @override
  State<_OptionsMenuItem> createState() => _OptionsMenuItemState();
}

class _OptionsMenuItemState extends State<_OptionsMenuItem> {
  final OverlayPortalController _overlayController = OverlayPortalController();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _syncOverlay());
  }

  @override
  void didUpdateWidget(_OptionsMenuItem oldWidget) {
    super.didUpdateWidget(oldWidget);
    WidgetsBinding.instance.addPostFrameCallback((_) => _syncOverlay());
  }

  void _syncOverlay() {
    if (!mounted) return;
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
      overlayLocation: OverlayChildLocation.rootOverlay,
      overlayChildBuilder: (context) => OptionsModal(
        options: widget.options,
        onChange: widget.onChange,
        onClose: widget.onClose,
      ),
      child: GestureDetector(
        onTap: widget.onExpand,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 150),
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
          decoration: BoxDecoration(
            border: Border(
              bottom: BorderSide(
                color: widget.isActive ? _blue : Colors.transparent,
                width: 2,
              ),
            ),
          ),
          child: Text(
            'Options',
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w600,
              letterSpacing: 0.05 * 14,
              color: widget.isActive ? Colors.white : const Color(0xFF888888),
            ),
          ),
        ),
      ),
    );
  }
}

class _MenuItem extends StatelessWidget {
  final String fKey;
  final String label;
  final VoidCallback onClick;

  const _MenuItem({
    required this.fKey,
    required this.label,
    required this.onClick,
  });

  @override
  Widget build(BuildContext context) {
    return NavixFocusable(
      fKey: fKey,
      callbacks: NavixFocusableCallbacks(onFocus: null),
      createBehavior: (node) {
        final b = DefaultNavixBehavior();
        b.onEvent = (e) {
          if (e.action == 'enter' && e.type == NavEventType.press) {
            onClick();
            return true;
          }
          return false;
        };
        return b;
      },
      builder: (context, node, focused, directlyFocused) {
        return MouseRegion(
          onEnter: (_) => node.requestFocus(),
          child: GestureDetector(
            onTap: onClick,
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 150),
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
              decoration: BoxDecoration(
                border: Border(
                  bottom: BorderSide(
                    color: directlyFocused ? _blue : Colors.transparent,
                    width: 2,
                  ),
                ),
              ),
              child: Text(
                label,
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  letterSpacing: 0.05 * 14,
                  color: directlyFocused ? Colors.white : const Color(0xFF888888),
                ),
              ),
            ),
          ),
        );
      },
    );
  }
}

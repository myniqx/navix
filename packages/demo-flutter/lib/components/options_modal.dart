import 'package:flutter/material.dart';
import 'package:navix/navix.dart';
import '../data.dart';

const _blue = Color(0xFF4fc3f7);
const _green = Color(0xFF4caf7d);

const _languages = [
  NavixDropdownOption(label: 'English', value: 'en'),
  NavixDropdownOption(label: 'Türkçe', value: 'tr'),
  NavixDropdownOption(label: 'Deutsch', value: 'de'),
  NavixDropdownOption(label: 'Français', value: 'fr'),
  NavixDropdownOption(label: 'Español', value: 'es'),
  NavixDropdownOption(label: 'Italiano', value: 'it'),
  NavixDropdownOption(label: 'Português', value: 'pt'),
];

class OptionsModal extends StatefulWidget {
  final Map<String, String> options;
  final void Function(String key, String value) onChange;
  final VoidCallback onClose;

  const OptionsModal({
    super.key,
    required this.options,
    required this.onChange,
    required this.onClose,
  });

  @override
  State<OptionsModal> createState() => _OptionsModalState();
}

class _OptionsModalState extends State<OptionsModal> {
  List<String> _language = const ['en'];
  bool _notifications = false;
  String _nickname = '';

  @override
  Widget build(BuildContext context) {
    return Positioned.fill(
      child: Material(
        color: Colors.black.withValues(alpha: 0.75),
        child: Center(
          child: Container(
            width: 520,
            padding: const EdgeInsets.symmetric(horizontal: 36, vertical: 32),
            decoration: BoxDecoration(
              color: const Color(0xFF12121f),
              border: Border.all(color: const Color(0xFF1e1e3a)),
              borderRadius: BorderRadius.circular(12),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.8),
                  blurRadius: 80,
                  offset: const Offset(0, 24),
                ),
              ],
            ),
            child: NavixVerticalList(
              fKey: 'options-list',
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Options',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w700,
                      color: Color(0xFFeeeeee),
                    ),
                  ),
                  const SizedBox(height: 28),

                  // Language dropdown
                  _OptionRow(
                    label: 'Language',
                    child: NavixDropdown(
                      fKey: 'options-language',
                      options: _languages,
                      value: _language,
                      maxVisible: 5,
                      onChange: (val) => setState(() => _language = val),
                      renderTrigger: (context, label, isExpanded, focused) {
                        return AnimatedContainer(
                          duration: const Duration(milliseconds: 150),
                          padding: const EdgeInsets.symmetric(
                              horizontal: 12, vertical: 7),
                          decoration: BoxDecoration(
                            color: focused
                                ? const Color(0xFF1a2a3a)
                                : const Color(0xFF0e0e1a),
                            border: Border.all(
                              color: focused ? _blue : const Color(0xFF2a2a4a),
                            ),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Text(label,
                                  style: const TextStyle(
                                      fontSize: 13, color: Color(0xFFcccccc))),
                              const SizedBox(width: 8),
                              Text(isExpanded ? '▲' : '▼',
                                  style: const TextStyle(
                                      fontSize: 9, color: Color(0xFF888888))),
                            ],
                          ),
                        );
                      },
                      renderOption: (context, option, selected, focused, idx) {
                        return AnimatedContainer(
                          duration: const Duration(milliseconds: 100),
                          padding: const EdgeInsets.symmetric(
                              horizontal: 12, vertical: 10),
                          color: focused
                              ? _blue.withValues(alpha: 0.15)
                              : selected
                                  ? _blue.withValues(alpha: 0.06)
                                  : const Color(0xFF0e0e1a),
                          child: Text(
                            option.label,
                            style: TextStyle(
                              fontSize: 13,
                              color: focused
                                  ? Colors.white
                                  : selected
                                      ? _blue
                                      : const Color(0xFF888888),
                            ),
                          ),
                        );
                      },
                    ),
                  ),

                  const SizedBox(height: 16),

                  // Notifications switch
                  NavixSwitch(
                    fKey: 'options-notifications',
                    checked: _notifications,
                    onChange: (v) => setState(() => _notifications = v),
                    builder: (context, checked, focused) {
                      return AnimatedContainer(
                        duration: const Duration(milliseconds: 150),
                        margin: const EdgeInsets.only(bottom: 16),
                        padding: const EdgeInsets.symmetric(
                            horizontal: 10, vertical: 6),
                        decoration: BoxDecoration(
                          color: focused
                              ? const Color(0xFF1a2a3a)
                              : Colors.transparent,
                          border: Border.all(
                            color: focused ? _blue : Colors.transparent,
                          ),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Row(
                          children: [
                            const SizedBox(
                              width: 100,
                              child: Text('Notifications',
                                  style: TextStyle(
                                      fontSize: 13,
                                      color: Color(0xFF666666))),
                            ),
                            AnimatedContainer(
                              duration: const Duration(milliseconds: 150),
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 14, vertical: 4),
                              decoration: BoxDecoration(
                                color: checked
                                    ? const Color(0xFF1e3a2e)
                                    : const Color(0xFF1a1a2e),
                                borderRadius: BorderRadius.circular(20),
                                border: Border.all(
                                  color: checked
                                      ? _green
                                      : const Color(0xFF333333),
                                ),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  AnimatedContainer(
                                    duration: const Duration(milliseconds: 150),
                                    width: 7,
                                    height: 7,
                                    decoration: BoxDecoration(
                                      shape: BoxShape.circle,
                                      color: checked
                                          ? _green
                                          : const Color(0xFF444444),
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  Text(
                                    checked ? 'On' : 'Off',
                                    style: TextStyle(
                                      fontSize: 12,
                                      fontWeight: FontWeight.w600,
                                      color: checked
                                          ? _green
                                          : const Color(0xFF555555),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      );
                    },
                  ),

                  // Nickname input
                  _OptionRow(
                    label: 'Nickname',
                    child: NavixInput(
                      fKey: 'options-nickname',
                      value: _nickname,
                      onChange: (v) => setState(() => _nickname = v),
                      builder: (context, focused, editing, controller, textFocusNode, stopEditing) {
                        return AnimatedContainer(
                          duration: const Duration(milliseconds: 150),
                          decoration: BoxDecoration(
                            color: editing
                                ? const Color(0xFF12122a)
                                : const Color(0xFF0e0e1a),
                            border: Border.all(
                              color: focused || editing
                                  ? _blue
                                  : const Color(0xFF2a2a4a),
                            ),
                            borderRadius: BorderRadius.circular(4),
                            boxShadow: editing
                                ? [
                                    BoxShadow(
                                      color: _blue.withValues(alpha: 0.15),
                                      blurRadius: 0,
                                      spreadRadius: 2,
                                    )
                                  ]
                                : null,
                          ),
                          child: TextField(
                            controller: controller,
                            focusNode: textFocusNode,
                            readOnly: !editing,
                            enableInteractiveSelection: editing,
                            textInputAction: TextInputAction.done,
                            onSubmitted: (_) => stopEditing(),
                            style: const TextStyle(
                                fontSize: 13, color: Color(0xFFcccccc)),
                            decoration: const InputDecoration(
                              contentPadding: EdgeInsets.symmetric(
                                  horizontal: 10, vertical: 5),
                              border: InputBorder.none,
                            ),
                          ),
                        );
                      },
                    ),
                  ),

                  const SizedBox(height: 16),

                  // Options config rows
                  for (final row in optionsConfig)
                    _OptionChoiceRow(
                      fKey: 'options-${row.key}',
                      label: row.label,
                      choices: row.choices,
                      selected: widget.options[row.key] ?? row.choices.first,
                      onSelect: (v) => widget.onChange(row.key, v),
                    ),

                  const SizedBox(height: 24),

                  // Close button
                  Row(
                    mainAxisAlignment: MainAxisAlignment.end,
                    children: [
                      NavixHorizontalList(
                        fKey: 'options-actions',
                        child: NavixButton(
                          fKey: 'options-close',
                          onClick: widget.onClose,
                          builder: (context, focused) {
                            return AnimatedContainer(
                              duration: const Duration(milliseconds: 150),
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 24, vertical: 8),
                              decoration: BoxDecoration(
                                color: focused
                                    ? _blue
                                    : const Color(0xFF1e1e3a),
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: Text(
                                'Close',
                                style: TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w600,
                                  color: focused
                                      ? Colors.black
                                      : const Color(0xFF888888),
                                ),
                              ),
                            );
                          },
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _OptionRow extends StatelessWidget {
  final String label;
  final Widget child;

  const _OptionRow({required this.label, required this.child});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Row(
        children: [
          SizedBox(
            width: 100,
            child: Text(label,
                style: const TextStyle(
                    fontSize: 13, color: Color(0xFF666666))),
          ),
          Expanded(child: child),
        ],
      ),
    );
  }
}

class _OptionChoiceRow extends StatelessWidget {
  final String fKey;
  final String label;
  final List<String> choices;
  final String selected;
  final void Function(String) onSelect;

  const _OptionChoiceRow({
    required this.fKey,
    required this.label,
    required this.choices,
    required this.selected,
    required this.onSelect,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Row(
        children: [
          SizedBox(
            width: 100,
            child: Text(label,
                style: const TextStyle(
                    fontSize: 13, color: Color(0xFF666666))),
          ),
          NavixHorizontalList(
            fKey: fKey,
            child: Row(
              children: [
                for (final choice in choices) ...[
                  _ChoiceButton(
                    fKey: '$fKey-$choice',
                    label: choice,
                    selected: choice == selected,
                    onSelect: () => onSelect(choice),
                  ),
                  const SizedBox(width: 8),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _ChoiceButton extends StatelessWidget {
  final String fKey;
  final String label;
  final bool selected;
  final VoidCallback onSelect;

  const _ChoiceButton({
    required this.fKey,
    required this.label,
    required this.selected,
    required this.onSelect,
  });

  @override
  Widget build(BuildContext context) {
    return NavixButton(
      fKey: fKey,
      onClick: onSelect,
      builder: (context, focused) {
        return AnimatedContainer(
          duration: const Duration(milliseconds: 150),
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 5),
          decoration: BoxDecoration(
            color: focused
                ? _blue
                : selected
                    ? const Color(0xFF1e3a2e)
                    : const Color(0xFF1a1a2e),
            borderRadius: BorderRadius.circular(4),
            border: Border.all(
              color: focused
                  ? Colors.transparent
                  : selected
                      ? _green
                      : Colors.transparent,
            ),
          ),
          child: Text(
            label,
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w500,
              color: focused
                  ? Colors.black
                  : selected
                      ? _green
                      : const Color(0xFF666666),
            ),
          ),
        );
      },
    );
  }
}

import 'package:flutter/widgets.dart';

import 'navix_button.dart';

typedef NavixSwitchBuilder = Widget Function(
  BuildContext context,
  bool checked,
  bool focused,
);

class NavixSwitch extends StatelessWidget {
  final String fKey;
  final bool checked;
  final void Function(bool checked) onChange;
  final NavixSwitchBuilder builder;
  final void Function(String key)? onFocus;
  final void Function(String key)? onBlurred;
  final void Function(String key)? onRegister;
  final void Function(String key)? onUnregister;

  const NavixSwitch({
    super.key,
    required this.fKey,
    required this.checked,
    required this.onChange,
    required this.builder,
    this.onFocus,
    this.onBlurred,
    this.onRegister,
    this.onUnregister,
  });

  @override
  Widget build(BuildContext context) {
    return NavixButton(
      fKey: fKey,
      onClick: () => onChange(!checked),
      onFocus: onFocus,
      onBlurred: onBlurred,
      onRegister: onRegister,
      onUnregister: onUnregister,
      builder: (context, focused) => builder(context, checked, focused),
    );
  }
}

enum NavEventType { press, longPress, doublePress }

class NavEvent {
  final String action;
  final NavEventType type;

  const NavEvent({required this.action, required this.type});
}

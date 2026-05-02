import 'dart:async';
import 'package:flutter/material.dart';
import 'package:navix/navix.dart';
import 'components/home_view.dart';
import 'components/live_view.dart';
import 'components/menu_row.dart';
import 'components/movie_view.dart';
import 'components/player_view.dart';
import 'components/series_view.dart';

void main() {
  runApp(const NavixDemoApp());
}

class NavixDemoApp extends StatelessWidget {
  const NavixDemoApp({super.key});

  @override
  Widget build(BuildContext context) {
    return const MaterialApp(
      title: 'Navix Demo',
      debugShowCheckedModeBanner: false,
      home: NavixScope(child: _AppShell()),
    );
  }
}

class _AppShell extends StatefulWidget {
  const _AppShell();

  @override
  State<_AppShell> createState() => _AppShellState();
}

class _AppShellState extends State<_AppShell> {
  String _activeTab = 'Home';
  final List<String> _log = [];
  PlayerState? _selectedEntry;
  bool _showPlayIcon = false;
  Timer? _playIconTimer;

  void _emit(String msg) {
    final now = TimeOfDay.now();
    final time =
        '${now.hour.toString().padLeft(2, '0')}:${now.minute.toString().padLeft(2, '0')}';
    setState(() {
      _log.insert(0, '[$time] $msg');
      if (_log.length > 30) _log.removeLast();
    });
  }

  void _handleSelect(PlayerState state) {
    setState(() => _selectedEntry = state);
    _emit('Play: ${state.current.title} (${state.current.year})');
  }

  void _handleClose() => setState(() => _selectedEntry = null);

  bool _handleNext() {
    if (_selectedEntry == null) return false;
    final idx = _selectedEntry!.channels
        .indexWhere((c) => c.id == _selectedEntry!.current.id);
    if (idx < 0 || idx + 1 >= _selectedEntry!.channels.length) return false;
    setState(() => _selectedEntry =
        _selectedEntry!.copyWith(current: _selectedEntry!.channels[idx + 1]));
    return true;
  }

  bool _handlePrev() {
    if (_selectedEntry == null) return false;
    final idx = _selectedEntry!.channels
        .indexWhere((c) => c.id == _selectedEntry!.current.id);
    if (idx <= 0) return false;
    setState(() => _selectedEntry =
        _selectedEntry!.copyWith(current: _selectedEntry!.channels[idx - 1]));
    return true;
  }

  void _handleTogglePause() {
    if (_selectedEntry == null) return;
    final nextPaused = !_selectedEntry!.paused;
    setState(() => _selectedEntry = _selectedEntry!.copyWith(paused: nextPaused));
    if (!nextPaused) {
      _playIconTimer?.cancel();
      setState(() => _showPlayIcon = true);
      _playIconTimer = Timer(const Duration(seconds: 2), () {
        if (mounted) setState(() => _showPlayIcon = false);
      });
    } else {
      _playIconTimer?.cancel();
      setState(() => _showPlayIcon = false);
    }
  }

  @override
  void dispose() {
    _playIconTimer?.cancel();
    super.dispose();
  }

  Widget _buildView() {
    switch (_activeTab) {
      case 'Movie':
        return MovieView(onSelect: _handleSelect);
      case 'Series':
        return SeriesView(onSelect: _handleSelect);
      case 'Live':
        return LiveView(onSelect: _handleSelect);
      default:
        return HomeView(onSelect: _handleSelect);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0a0a0f),
      body: Stack(
        children: [
          NavixVerticalList(
            fKey: 'app',
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                MenuRow(onSelect: (item) {
                  setState(() => _activeTab = item);
                  _emit('Menu: $item');
                }),
                Expanded(
                  child: SingleChildScrollView(child: _buildView()),
                ),
              ],
            ),
          ),
          Positioned(
            bottom: 0,
            right: 0,
            width: 300,
            height: 200,
            child: _EventLog(entries: _log),
          ),
          if (_selectedEntry != null)
            Positioned.fill(
              child: ColoredBox(
                color: Colors.black,
                child: PlayerView(
                  player: _selectedEntry!,
                  onClose: _handleClose,
                  onNext: _handleNext,
                  onPrev: _handlePrev,
                  onChannelSelect: (ch) => setState(
                      () => _selectedEntry = _selectedEntry!.copyWith(current: ch)),
                  onTogglePause: _handleTogglePause,
                  showPlayIcon: _showPlayIcon,
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _EventLog extends StatelessWidget {
  final List<String> entries;

  const _EventLog({required this.entries});

  @override
  Widget build(BuildContext context) {
    if (entries.isEmpty) return const SizedBox.shrink();
    return Container(
      decoration: BoxDecoration(
        color: Colors.black.withValues(alpha: 0.8),
        border: const Border(
          top: BorderSide(color: Color(0xFF1e1e3a)),
          left: BorderSide(color: Color(0xFF1e1e3a)),
        ),
        borderRadius: const BorderRadius.only(topLeft: Radius.circular(8)),
      ),
      padding: const EdgeInsets.all(10),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'EVENT LOG',
            style: TextStyle(
              fontSize: 9,
              fontWeight: FontWeight.w700,
              color: Color(0xFF4fc3f7),
              letterSpacing: 1.0,
            ),
          ),
          const SizedBox(height: 6),
          Expanded(
            child: ListView.builder(
              itemCount: entries.length,
              itemBuilder: (context, index) => Text(
                entries[index],
                style: const TextStyle(
                  fontSize: 10,
                  color: Color(0xFF555555),
                  fontFamily: 'monospace',
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

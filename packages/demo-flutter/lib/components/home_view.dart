import 'dart:async';
import 'package:flutter/material.dart';
import 'package:navix/navix.dart';
import '../data.dart';
import 'media_card.dart';
import 'player_view.dart';

const _visibleCount = 6;
const _threshold = 1;
const _blue = Color(0xFF4fc3f7);

class HomeView extends StatefulWidget {
  const HomeView({super.key});

  @override
  State<HomeView> createState() => _HomeViewState();
}

class _HomeViewState extends State<HomeView> {
  PlayerState? _player;
  bool _showPlayIcon = false;
  Timer? _playIconTimer;

  void _handleOpen(List<ContentItem> channels, ContentItem item) {
    setState(() => _player = PlayerState(
          channels: channels,
          current: item,
          paused: false,
        ));
  }

  void _handleClose() => setState(() => _player = null);

  bool _handleNext() {
    if (_player == null) return false;
    final idx =
        _player!.channels.indexWhere((c) => c.id == _player!.current.id);
    if (idx < 0 || idx + 1 >= _player!.channels.length) return false;
    setState(() =>
        _player = _player!.copyWith(current: _player!.channels[idx + 1]));
    return true;
  }

  bool _handlePrev() {
    if (_player == null) return false;
    final idx =
        _player!.channels.indexWhere((c) => c.id == _player!.current.id);
    if (idx <= 0) return false;
    setState(() =>
        _player = _player!.copyWith(current: _player!.channels[idx - 1]));
    return true;
  }

  void _handleTogglePause() {
    if (_player == null) return;
    final nextPaused = !_player!.paused;
    setState(() => _player = _player!.copyWith(paused: nextPaused));

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

  @override
  Widget build(BuildContext context) {
    if (_player != null) {
      return Positioned.fill(
        child: ColoredBox(
          color: Colors.black,
          child: PlayerView(
            player: _player!,
            onClose: _handleClose,
            onNext: _handleNext,
            onPrev: _handlePrev,
            onChannelSelect: (ch) =>
                setState(() => _player = _player!.copyWith(current: ch)),
            onTogglePause: _handleTogglePause,
            showPlayIcon: _showPlayIcon,
          ),
        ),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        for (int i = 0; i < homeRows.length; i++) ...[
          Padding(
            padding: const EdgeInsets.fromLTRB(32, 24, 32, 0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  homeRows[i].label.toUpperCase(),
                  style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    letterSpacing: 1.3,
                    color: _blue,
                  ),
                ),
                const SizedBox(height: 14),
                _HomeRow(
                  items: homeRows[i].items,
                  rowIndex: i,
                  cardType: homeRows[i].cardType,
                  onSelect: (item) => _handleOpen(homeRows[i].items, item),
                ),
              ],
            ),
          ),
        ],
      ],
    );
  }
}

class _HomeRow extends StatelessWidget {
  final List<ContentItem> items;
  final int rowIndex;
  final HomeRowCardType cardType;
  final void Function(ContentItem) onSelect;

  const _HomeRow({
    required this.items,
    required this.rowIndex,
    required this.cardType,
    required this.onSelect,
  });

  @override
  Widget build(BuildContext context) {
    return NavixPaginatedList<ContentItem>(
      fKey: 'home-row-$rowIndex',
      items: items,
      visibleCount: _visibleCount,
      threshold: _threshold,
      gap: 12,
      renderItem: (item, fKey, index) => MediaCard(
        fKey: fKey,
        item: item,
        variant: cardType,
        onClick: () => onSelect(item),
      ),
    );
  }
}

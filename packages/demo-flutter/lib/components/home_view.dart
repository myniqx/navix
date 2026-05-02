import 'package:flutter/material.dart';
import 'package:navix/navix.dart';
import '../data.dart';
import 'media_card.dart';
import 'player_view.dart';

const _visibleCount = 6;
const _threshold = 1;
const _blue = Color(0xFF4fc3f7);

class HomeView extends StatelessWidget {
  final void Function(PlayerState) onSelect;

  const HomeView({super.key, required this.onSelect});

  @override
  Widget build(BuildContext context) {
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
                  onSelect: (item) => onSelect(PlayerState(
                    channels: homeRows[i].items,
                    current: item,
                    paused: false,
                  )),
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

import 'package:flutter/material.dart';
import 'package:navix/navix.dart';
import '../data.dart';
import 'media_card.dart';
import 'player_view.dart';

const _visibleCount = 6;
const _threshold = 1;
const _blue = Color(0xFF4fc3f7);

// Disabled predicates per row — in-view, just outside, and far outside window.
final _rowDisabledFns = <bool Function(int)>[
  // Movies (18): index 2 in view, 7-8 outside, 14-15 far outside
  (i) => i == 2 || i == 7 || i == 8 || i == 14 || i == 15,
  // Tv Series (15): index 1 in view, 8-9 outside
  (i) => i == 1 || i == 8 || i == 9,
  // Live Streams (20): index 3 in view, 10-11 outside
  (i) => i == 3 || i == 10 || i == 11,
];

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
                  onSelect: (item) => onSelect(
                    PlayerState(
                      channels: homeRows[i].items,
                      current: item,
                      paused: false,
                    ),
                  ),
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
    final isItemDisabled = rowIndex < _rowDisabledFns.length
        ? _rowDisabledFns[rowIndex]
        : null;

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 4),
      child: NavixPaginatedList<ContentItem>(
      fKey: 'home-row-$rowIndex',
      items: items,
      visibleCount: _visibleCount,
      threshold: _threshold,
      gap: 12,
      showScrollbar: cardType == HomeRowCardType.series,
      isItemDisabled: isItemDisabled != null ? (i) => isItemDisabled(i) : null,
      renderItem: (item, fKey, index, disabled) => MediaCard(
        fKey: fKey,
        item: item,
        variant: cardType,
        disabled: disabled,
        onClick: () => onSelect(item),
      ),
    ),
    );
  }
}

import 'package:flutter/widgets.dart';
import '../data.dart';
import 'content_card.dart';
import 'player_view.dart';

// One disabled predicate per row — single skip, double consecutive, single at start.
final _rowDisabled = <bool Function(int)>[
  (i) => i == 2,             // Drama: single disabled (index 2)
  (i) => i == 3 || i == 4,  // Action: two consecutive disabled (3-4)
  (i) => i == 1,             // Romantic: single disabled at index 1
];

class SeriesView extends StatelessWidget {
  final void Function(PlayerState) onSelect;

  const SeriesView({super.key, required this.onSelect});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        for (int i = 0; i < rows.length; i++)
          ContentRow(
            key: ValueKey(rows[i].label),
            rowKey: 'series-row-$i',
            label: rows[i].label,
            items: rows[i].items,
            isItemDisabled: i < _rowDisabled.length ? _rowDisabled[i] : null,
            onPlay: (item) => onSelect(PlayerState(
              channels: rows[i].items,
              current: item,
              paused: false,
            )),
          ),
      ],
    );
  }
}

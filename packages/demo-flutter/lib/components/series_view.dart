import 'package:flutter/widgets.dart';
import '../data.dart';
import 'content_card.dart';
import 'player_view.dart';

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

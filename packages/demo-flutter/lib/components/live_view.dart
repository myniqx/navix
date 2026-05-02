import 'package:flutter/material.dart';
import 'package:navix/navix.dart';
import '../data.dart';
import 'content_card.dart';
import 'player_view.dart';

const _blue = Color(0xFF4fc3f7);
const _columns = 8;

class LiveView extends StatelessWidget {
  final void Function(PlayerState) onSelect;

  const LiveView({super.key, required this.onSelect});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(32, 24, 32, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'LIVE STREAM',
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w700,
              letterSpacing: 1.3,
              color: _blue,
            ),
          ),
          const SizedBox(height: 14),
          NavixGrid(
            fKey: 'live-grid',
            columns: _columns,
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 4),
              child: LayoutBuilder(
                builder: (context, constraints) {
                  final cardWidth =
                      (constraints.maxWidth - 16 * (_columns - 1)) / _columns;
                  final rows = <List<ContentItem>>[];
                  for (int i = 0; i < liveGrid.length; i += _columns) {
                    rows.add(liveGrid.sublist(
                        i,
                        (i + _columns) > liveGrid.length
                            ? liveGrid.length
                            : i + _columns));
                  }
                  return Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      for (int r = 0; r < rows.length; r++) ...[
                        Row(
                          children: [
                            for (int c = 0; c < rows[r].length; c++) ...[
                              SizedBox(
                                width: cardWidth,
                                child: ContentCard(
                                  key: ValueKey(rows[r][c].id),
                                  fKey: 'live-${rows[r][c].id}',
                                  item: rows[r][c],
                                  onPlay: () => onSelect(PlayerState(
                                    channels: liveGrid,
                                    current: rows[r][c],
                                    paused: false,
                                  )),
                                ),
                              ),
                              if (c < rows[r].length - 1)
                                const SizedBox(width: 16),
                            ],
                          ],
                        ),
                        if (r < rows.length - 1) const SizedBox(height: 16),
                      ],
                    ],
                  );
                },
              ),
            ),
          ),
        ],
      ),
    );
  }
}

import 'package:flutter/material.dart';
import 'package:navix/navix.dart';
import '../data.dart';
import 'media_card.dart';
import 'player_view.dart';

const _red = Color(0xFFe53935);
const _rows = 4;
const _columns = 6;
const _gap = 8.0;

// Reserved pixels above and below the grid within this view:
//   top padding (24) + title row (~17) + spacer (14) + grid vertical
//   padding (12 + 12) + bottom safety (8). Kept conservative so the grid
//   always fits inside the menu+view viewport without triggering scroll.
const _reservedY = 24.0 + 17.0 + 14.0 + 24.0 + 8.0;
// Same vertical block goes through MenuRow above (approx 56px).
const _menuY = 56.0;

class MovieView extends StatelessWidget {
  final void Function(PlayerState) onSelect;

  const MovieView({super.key, required this.onSelect});

  @override
  Widget build(BuildContext context) {
    final viewportHeight = MediaQuery.sizeOf(context).height;
    final gridHeight =
        (viewportHeight - _menuY - _reservedY).clamp(120.0, double.infinity);

    return Padding(
      padding: const EdgeInsets.fromLTRB(32, 24, 32, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Text(
                'MOVIES',
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 1.3,
                  color: _red,
                ),
              ),
              const SizedBox(width: 10),
              Text(
                '${movieChannels.length} movies',
                style: const TextStyle(
                  fontSize: 10,
                  color: Color(0x88e53935),
                  letterSpacing: 0.7,
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          SizedBox(
            height: gridHeight,
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 4),
              child: NavixPaginatedGrid<ContentItem>(
                fKey: 'movie-grid',
                items: movieChannels,
                orientation: NavixGridOrientation.autoHorizontal,
                rows: _rows,
                showScrollbar: true,
                columns: _columns,
                threshold: 1,
                gap: _gap,
                renderItem: (item, fKey, index, disabled) => MediaCard(
                  fKey: fKey,
                  item: item,
                  variant: HomeRowCardType.movie,
                  disabled: disabled,
                  onClick: () => onSelect(
                    PlayerState(
                      channels: movieChannels,
                      current: item,
                      paused: false,
                    ),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

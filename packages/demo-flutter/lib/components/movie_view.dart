import 'package:flutter/material.dart';
import 'package:navix/navix.dart';
import '../data.dart';
import 'media_card.dart';
import 'player_view.dart';

const _red = Color(0xFFe53935);
const _rows = 4;
const _columns = 6;
const _gap = 8.0;
const _cardMinHeight = 196.0;
const _gridPaddingY = 24.0;

class MovieView extends StatelessWidget {
  final void Function(PlayerState) onSelect;

  const MovieView({super.key, required this.onSelect});

  @override
  Widget build(BuildContext context) {
    final viewportHeight = MediaQuery.sizeOf(context).height;
    final minGridHeight =
        _rows * _cardMinHeight + (_rows - 1) * _gap + _gridPaddingY;
    final gridHeight = (viewportHeight * 0.9 - 120) > minGridHeight
        ? (viewportHeight * 0.9 - 120)
        : minGridHeight;

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
                columns: _columns,
                threshold: 1,
                gap: _gap,
                renderItem: (item, fKey, index) => MediaCard(
                  fKey: fKey,
                  item: item,
                  variant: HomeRowCardType.movie,
                  onClick: () => onSelect(PlayerState(
                    channels: movieChannels,
                    current: item,
                    paused: false,
                  )),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

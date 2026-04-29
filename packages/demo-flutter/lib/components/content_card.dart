import 'package:flutter/material.dart';
import 'package:navix/navix.dart';
import '../data.dart';

const _colorPlay = Color(0xFF0d3b2e);
const _colorInfo = Color(0xFF1a1a4a);
const _blue = Color(0xFF4fc3f7);

class ContentCard extends StatefulWidget {
  final String fKey;
  final ContentItem item;
  final VoidCallback onPlay;

  const ContentCard({
    super.key,
    required this.fKey,
    required this.item,
    required this.onPlay,
  });

  @override
  State<ContentCard> createState() => _ContentCardState();
}

class _ContentCardState extends State<ContentCard> {
  Color _posterColor = Colors.transparent;

  @override
  void initState() {
    super.initState();
    _posterColor = widget.item.color;
  }

  @override
  Widget build(BuildContext context) {
    return NavixExpandable(
      fKey: widget.fKey,
      builder: (context, isExpanded, focused, directlyFocused, expand, collapse) {
        final isActive = directlyFocused || (focused && isExpanded);

        return AnimatedContainer(
          duration: const Duration(milliseconds: 150),
          width: 140,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(6),
            boxShadow: isActive
                ? [
                    BoxShadow(
                        color: _blue.withValues(alpha: 0.5),
                        blurRadius: 0,
                        spreadRadius: 2),
                    BoxShadow(
                        color: Colors.black.withValues(alpha: 0.6),
                        blurRadius: 24,
                        offset: const Offset(0, 8)),
                  ]
                : [
                    BoxShadow(
                        color: Colors.black.withValues(alpha: 0.4),
                        blurRadius: 8,
                        offset: const Offset(0, 2)),
                  ],
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(6),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                AnimatedContainer(
                  duration: const Duration(milliseconds: 300),
                  height: 200,
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      colors: [
                        _posterColor,
                        _posterColor.withValues(alpha: 0.6),
                      ],
                    ),
                  ),
                  child: Stack(
                    children: [
                      Positioned(
                        top: 8,
                        right: 8,
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: Colors.black.withValues(alpha: 0.6),
                            borderRadius: BorderRadius.circular(3),
                          ),
                          child: Text(
                            '${widget.item.year}',
                            style: const TextStyle(
                                fontSize: 10, color: Color(0xFFaaaaaa)),
                          ),
                        ),
                      ),
                      Positioned(
                        bottom: 10,
                        left: 10,
                        right: 10,
                        child: Text(
                          widget.item.title,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            fontSize: isActive ? 13 : 12,
                            fontWeight: FontWeight.w700,
                            color:
                                isActive ? Colors.white : const Color(0xFFdddddd),
                            shadows: const [
                              Shadow(color: Colors.black, blurRadius: 4)
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                if (!isExpanded)
                  GestureDetector(
                    onTap: expand,
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 150),
                      color: isActive
                          ? const Color(0xFF1a2a3a)
                          : const Color(0xFF111111),
                      padding: const EdgeInsets.symmetric(
                          horizontal: 10, vertical: 6),
                      child: Row(
                        children: [
                          Text(
                            '▶ Play',
                            style: TextStyle(
                              fontSize: 11,
                              color: isActive ? _blue : const Color(0xFF555555),
                            ),
                          ),
                        ],
                      ),
                    ),
                  )
                else
                  NavixHorizontalList(
                    fKey: '${widget.fKey}-actions',
                    child: Row(
                      children: [
                        Expanded(
                          child: _ActionButton(
                            fKey: '${widget.fKey}-play',
                            label: '▶ Play',
                            onClick: () {
                              setState(() => _posterColor = _colorPlay);
                              widget.onPlay();
                            },
                          ),
                        ),
                        Expanded(
                          child: _ActionButton(
                            fKey: '${widget.fKey}-info',
                            label: 'ℹ Info',
                            onClick: () {
                              setState(() => _posterColor = _colorInfo);
                              collapse();
                            },
                          ),
                        ),
                      ],
                    ),
                  ),
              ],
            ),
          ),
        );
      },
    );
  }
}

class _ActionButton extends StatelessWidget {
  final String fKey;
  final String label;
  final VoidCallback onClick;

  const _ActionButton({
    required this.fKey,
    required this.label,
    required this.onClick,
  });

  @override
  Widget build(BuildContext context) {
    return NavixButton(
      fKey: fKey,
      onClick: onClick,
      builder: (context, focused) {
        return AnimatedContainer(
          duration: const Duration(milliseconds: 150),
          padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 4),
          color: focused ? _blue : const Color(0xFF1a2a3a),
          child: Text(
            label,
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w600,
              color: focused ? Colors.black : const Color(0xFFaaaaaa),
            ),
          ),
        );
      },
    );
  }
}

class ContentRow extends StatelessWidget {
  final String rowKey;
  final String label;
  final List<ContentItem> items;
  final void Function(ContentItem) onPlay;

  const ContentRow({
    super.key,
    required this.rowKey,
    required this.label,
    required this.items,
    required this.onPlay,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(32, 24, 32, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label.toUpperCase(),
            style: const TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w700,
              letterSpacing: 1.0,
              color: _blue,
            ),
          ),
          const SizedBox(height: 14),
          ClipRect(
            child: NavixHorizontalList(
              fKey: rowKey,
              child: Padding(
                padding:
                    const EdgeInsets.symmetric(vertical: 12, horizontal: 4),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.start,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    for (int i = 0; i < items.length; i++) ...[
                      ContentCard(
                        key: ValueKey(items[i].id),
                        fKey: '$rowKey-${items[i].id}',
                        item: items[i],
                        onPlay: () => onPlay(items[i]),
                      ),
                      if (i < items.length - 1) const SizedBox(width: 12),
                    ],
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

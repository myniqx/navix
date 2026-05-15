import 'package:flutter/widgets.dart';

enum NavixScrollbarOrientation { horizontal, vertical }

class ScrollbarRenderProps {
  final bool scrollMode;
  final int page;
  final int pageCount;
  final NavixScrollbarOrientation orientation;
  final void Function(int page) onPageChange;

  const ScrollbarRenderProps({
    required this.scrollMode,
    required this.page,
    required this.pageCount,
    required this.orientation,
    required this.onPageChange,
  });
}

class DefaultScrollbar extends StatefulWidget {
  final ScrollbarRenderProps props;

  const DefaultScrollbar({super.key, required this.props});

  @override
  State<DefaultScrollbar> createState() => _DefaultScrollbarState();
}

class _DefaultScrollbarState extends State<DefaultScrollbar> {
  bool _isDragging = false;
  final _trackKey = GlobalKey();

  int _pageFromOffset(Offset localPos) {
    final box = _trackKey.currentContext?.findRenderObject() as RenderBox?;
    if (box == null) return widget.props.page;
    final isHorizontal = widget.props.orientation == NavixScrollbarOrientation.horizontal;
    final trackSize = isHorizontal ? box.size.width : box.size.height;
    if (trackSize <= 0) return 0;
    final pos = isHorizontal ? localPos.dx : localPos.dy;
    final r = (pos / trackSize).clamp(0.0, 1.0);
    return (r * (widget.props.pageCount - 1)).round();
  }

  @override
  Widget build(BuildContext context) {
    final p = widget.props;
    final isHorizontal = p.orientation == NavixScrollbarOrientation.horizontal;
    final thumbRatio = p.pageCount > 1 ? 1.0 / p.pageCount : 1.0;
    final ratio = p.pageCount > 1 ? p.page / (p.pageCount - 1) : 0.0;
    final thumbColor = p.scrollMode ? const Color(0xFF4FC3F7) : const Color(0xFF888888);

    return GestureDetector(
      onTapDown: (d) {
        final pg = _pageFromOffset(d.localPosition);
        p.onPageChange(pg);
      },
      onHorizontalDragStart: isHorizontal ? (d) => setState(() => _isDragging = true) : null,
      onHorizontalDragUpdate: isHorizontal
          ? (d) => p.onPageChange(_pageFromOffset(d.localPosition))
          : null,
      onHorizontalDragEnd: isHorizontal ? (d) => setState(() => _isDragging = false) : null,
      onVerticalDragStart: !isHorizontal ? (d) => setState(() => _isDragging = true) : null,
      onVerticalDragUpdate: !isHorizontal
          ? (d) => p.onPageChange(_pageFromOffset(d.localPosition))
          : null,
      onVerticalDragEnd: !isHorizontal ? (d) => setState(() => _isDragging = false) : null,
      child: LayoutBuilder(
        key: _trackKey,
        builder: (context, constraints) {
          final trackSize = isHorizontal ? constraints.maxWidth : constraints.maxHeight;
          final thumbSize = trackSize * thumbRatio;
          final thumbOffset = ratio * (trackSize - thumbSize);

          return Container(
            width: isHorizontal ? double.infinity : 8,
            height: isHorizontal ? 8 : double.infinity,
            decoration: BoxDecoration(
              color: const Color(0xFF333333),
              borderRadius: BorderRadius.circular(2),
            ),
            child: Stack(
              children: [
                AnimatedPositioned(
                  duration: _isDragging
                      ? Duration.zero
                      : const Duration(milliseconds: 100),
                  left: isHorizontal ? thumbOffset : 0,
                  right: isHorizontal ? null : 0,
                  top: isHorizontal ? 0 : thumbOffset,
                  bottom: isHorizontal ? 0 : null,
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 150),
                    width: isHorizontal ? thumbSize : double.infinity,
                    height: isHorizontal ? double.infinity : thumbSize,
                    decoration: BoxDecoration(
                      color: thumbColor,
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}

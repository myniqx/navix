import 'dart:async';
import 'package:flutter/material.dart';
import 'package:navix/navix.dart';
import '../data.dart';

enum _CacheState { idle, caching, ready }
enum _PlayState { idle, pending, playing }

const _genres = [
  'Action', 'Drama', 'Comedy', 'Thriller',
  'Sci-Fi', 'Horror', 'Romance', 'Adventure',
];
const _ratings = [
  '6.2', '7.1', '8.4', '5.9', '7.8',
  '6.5', '8.1', '7.3', '9.0', '6.8',
];

String _genre(ContentItem item) =>
    _genres[item.id.codeUnitAt(item.id.length - 1) % _genres.length];
String _rating(ContentItem item) =>
    _ratings[item.id.codeUnitAt(0) % _ratings.length];
int _duration(ContentItem item) =>
    85 + (item.id.codeUnitAt(item.id.length - 1) % 7) * 10;
String _episode(ContentItem item) {
  final s = (item.id.codeUnitAt(0) % 9) + 1;
  final e = (item.id.codeUnitAt(item.id.length - 1) % 20) + 1;
  return 'S${s}E$e';
}
int _channelNum(ContentItem item) =>
    (item.id.codeUnitAt(item.id.length - 1) % 99) + 1;

const _accentMovie = Color(0xFFff9800);
const _accentLive = Color(0xFF4caf7d);
const _accentSeries = Color(0xFF4caf7d);
const _blue = Color(0xFF4fc3f7);

class MediaCard extends StatefulWidget {
  final String fKey;
  final ContentItem item;
  final HomeRowCardType variant;
  final VoidCallback? onClick;

  const MediaCard({
    super.key,
    required this.fKey,
    required this.item,
    required this.variant,
    this.onClick,
  });

  @override
  State<MediaCard> createState() => _MediaCardState();
}

class _MediaCardState extends State<MediaCard> {
  _CacheState _cacheState = _CacheState.idle;
  _PlayState _playState = _PlayState.idle;
  double _cacheProgress = 0;
  double _playProgress = 0;

  Timer? _cacheTimer;
  Timer? _playTimer;

  Color get _accent => widget.variant == HomeRowCardType.movie
      ? _accentMovie
      : widget.variant == HomeRowCardType.live
          ? _accentLive
          : _accentSeries;

  String get _playLabel => widget.variant == HomeRowCardType.movie
      ? 'TRAILER'
      : widget.variant == HomeRowCardType.live
          ? 'LIVE'
          : 'PREVIEW';

  void _startPlaying() {
    setState(() {
      _playState = _PlayState.playing;
      _playProgress = 0;
    });
    double pp = 0;
    _playTimer = Timer.periodic(const Duration(milliseconds: 80), (t) {
      pp += 0.4 + (pp % 1) * 0.3;
      if (pp >= 100) {
        t.cancel();
        if (mounted) setState(() => _playProgress = 100);
      } else {
        if (mounted) setState(() => _playProgress = pp.clamp(0, 100));
      }
    });
  }

  void _stopPlaying() {
    _playTimer?.cancel();
    if (mounted) setState(() { _playState = _PlayState.idle; _playProgress = 0; });
  }

  void _reset() {
    _cacheTimer?.cancel();
    _playTimer?.cancel();
    if (mounted) {
      setState(() {
        _cacheState = _CacheState.idle;
        _playState = _PlayState.idle;
        _cacheProgress = 0;
        _playProgress = 0;
      });
    }
  }

  void _onRegister() {
    if (mounted) setState(() { _cacheState = _CacheState.caching; _cacheProgress = 0; });
    double progress = 0;
    _cacheTimer = Timer.periodic(const Duration(milliseconds: 120), (t) {
      progress += progress * (0.4 * (progress % 1)) + 2;
      if (progress >= 100) {
        t.cancel();
        if (!mounted) return;
        setState(() { _cacheProgress = 100; _cacheState = _CacheState.ready; });
        if (_playState == _PlayState.pending) _startPlaying();
      } else {
        if (mounted) setState(() => _cacheProgress = progress.clamp(0, 100));
      }
    });
  }

  void _onFocus() {
    if (_cacheState == _CacheState.ready) {
      _startPlaying();
    } else if (_cacheState == _CacheState.caching) {
      if (mounted) setState(() => _playState = _PlayState.pending);
    }
  }

  @override
  void dispose() {
    _cacheTimer?.cancel();
    _playTimer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isPlaying = _playState == _PlayState.playing;
    final isPending = _playState == _PlayState.pending;
    final duration = _duration(widget.item);

    final topLeft = widget.variant == HomeRowCardType.movie
        ? '★ ${_rating(widget.item)}'
        : widget.variant == HomeRowCardType.live
            ? 'CH ${_channelNum(widget.item)}'
            : _episode(widget.item);
    final topRight =
        widget.variant == HomeRowCardType.live ? null : '${widget.item.year}';

    return NavixFocusable(
      fKey: widget.fKey,
      callbacks: NavixFocusableCallbacks(
        onRegister: (_) => _onRegister(),
        onFocus: (_) => _onFocus(),
        onBlurred: (_) => _stopPlaying(),
        onUnregister: (_) => _reset(),
      ),
      createBehavior: (node) {
        final b = DefaultNavixBehavior();
        b.onEvent = (e) {
          if (e.action == 'enter' && e.type == NavEventType.press) {
            widget.onClick?.call();
            return true;
          }
          return false;
        };
        return b;
      },
      builder: (context, node, focused, directlyFocused) {
        final borderColor = isPlaying
            ? _accent
            : directlyFocused
                ? _blue
                : _cacheState == _CacheState.ready
                    ? const Color(0xFF1e2a1e)
                    : const Color(0xFF111118);
        final bg = isPlaying
            ? const Color(0xFF0d1a0d)
            : directlyFocused
                ? const Color(0xFF0d1a2a)
                : const Color(0xFF0a0a12);

        String subtitleText;
        if (isPlaying) {
          if (widget.variant == HomeRowCardType.movie) {
            final elapsed = _playProgress * duration / 100;
            subtitleText =
                '▶ ${elapsed ~/ 60}:${(elapsed % 60).floor().toString().padLeft(2, '0')} / ${duration ~/ 60}:${(duration % 60).toString().padLeft(2, '0')}';
          } else {
            subtitleText = '● $_playLabel';
          }
        } else if (isPending) {
          subtitleText = 'Waiting for cache...';
        } else if (directlyFocused && _cacheState == _CacheState.ready) {
          subtitleText = '$_playLabel ready';
        } else if (_cacheState == _CacheState.ready &&
            widget.variant == HomeRowCardType.movie) {
          subtitleText =
              '${duration ~/ 60}h ${duration % 60}m';
        } else if (_cacheState == _CacheState.ready) {
          subtitleText = 'Ready';
        } else {
          subtitleText = '';
        }

        return MouseRegion(
          onEnter: (_) => node.requestFocus(),
          child: GestureDetector(
            onTap: widget.onClick,
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              width: double.infinity,
              decoration: BoxDecoration(
                color: bg,
                border: Border.all(color: borderColor),
                borderRadius: BorderRadius.circular(6),
                boxShadow: isPlaying
                    ? [BoxShadow(color: _accent.withValues(alpha: 0.3), blurRadius: 20)]
                    : directlyFocused
                        ? [BoxShadow(color: _blue.withValues(alpha: 0.3), blurRadius: 16)]
                        : null,
              ),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(6),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    SizedBox(
                      height: 160,
                      child: Stack(
                        fit: StackFit.expand,
                        children: [
                          AnimatedContainer(
                            duration: const Duration(milliseconds: 400),
                            decoration: BoxDecoration(
                              gradient: LinearGradient(
                                begin: Alignment.topLeft,
                                end: Alignment.bottomRight,
                                colors: isPlaying
                                    ? [
                                        const Color(0xFF0d1a0d),
                                        widget.item.color.withValues(alpha: 0.4),
                                        Colors.black,
                                      ]
                                    : [
                                        widget.item.color.withValues(alpha: 0.73),
                                        widget.item.color.withValues(alpha: 0.27),
                                      ],
                              ),
                            ),
                          ),
                          Positioned(
                            top: 5, left: 5,
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
                              decoration: BoxDecoration(
                                color: Colors.black.withValues(alpha: 0.65),
                                borderRadius: BorderRadius.circular(3),
                              ),
                              child: Text(topLeft,
                                  style: TextStyle(
                                    fontSize: 9,
                                    fontWeight: FontWeight.w700,
                                    color: widget.variant == HomeRowCardType.movie
                                        ? _accentMovie
                                        : Colors.white,
                                  )),
                            ),
                          ),
                          if (topRight != null)
                            Positioned(
                              top: 5, right: 5,
                              child: Container(
                                padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
                                decoration: BoxDecoration(
                                  color: Colors.black.withValues(alpha: 0.55),
                                  borderRadius: BorderRadius.circular(3),
                                ),
                                child: Text(topRight,
                                    style: const TextStyle(fontSize: 9, color: Color(0xFF888888))),
                              ),
                            ),
                          if (isPlaying)
                            Center(
                              child: Column(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Text('▶',
                                      style: TextStyle(fontSize: 18, color: _accent,
                                          shadows: [Shadow(color: _accent.withValues(alpha: 0.6), blurRadius: 12)])),
                                  const SizedBox(height: 4),
                                  Text(_playLabel,
                                      style: TextStyle(fontSize: 8, color: _accent,
                                          fontWeight: FontWeight.w700, letterSpacing: 0.1)),
                                ],
                              ),
                            ),
                          if (isPending)
                            const Center(
                              child: Text('⟳ Loading...',
                                  style: TextStyle(fontSize: 9, color: _blue, fontWeight: FontWeight.w600)),
                            ),
                          if (widget.variant == HomeRowCardType.movie)
                            Positioned(
                              bottom: 5, left: 5,
                              child: Container(
                                padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                                decoration: BoxDecoration(
                                  color: Colors.black.withValues(alpha: 0.5),
                                  borderRadius: BorderRadius.circular(3),
                                ),
                                child: Text(_genre(widget.item),
                                    style: TextStyle(fontSize: 8,
                                        color: directlyFocused ? _blue : const Color(0xFF555555))),
                              ),
                            ),
                          if (_cacheState == _CacheState.ready && !directlyFocused)
                            Positioned(
                              bottom: 5, right: 5,
                              child: Container(
                                width: 5, height: 5,
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  color: _accent,
                                  boxShadow: [BoxShadow(color: _accent, blurRadius: 4)],
                                ),
                              ),
                            ),
                        ],
                      ),
                    ),
                    SizedBox(
                      height: 2,
                      child: LinearProgressIndicator(
                        value: isPlaying ? _playProgress / 100 : _cacheProgress / 100,
                        backgroundColor: const Color(0xFF0a0a12),
                        valueColor: AlwaysStoppedAnimation(isPlaying ? _accent : _blue),
                      ),
                    ),
                    Padding(
                      padding: const EdgeInsets.fromLTRB(6, 4, 6, 5),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(widget.item.title,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.w700,
                                color: directlyFocused ? Colors.white : const Color(0xFF999999),
                              )),
                          if (subtitleText.isNotEmpty)
                            Text(subtitleText,
                                style: TextStyle(
                                  fontSize: 8,
                                  color: isPlaying ? _accent : directlyFocused ? _blue : const Color(0xFF444444),
                                )),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        );
      },
    );
  }
}

import 'package:flutter/material.dart';
import 'package:navix/navix.dart';
import '../data.dart';

const _blue = Color(0xFF4fc3f7);
const _green = Color(0xFF4caf7d);

class PlayerState {
  final List<ContentItem> channels;
  final ContentItem current;
  final bool paused;

  const PlayerState({
    required this.channels,
    required this.current,
    required this.paused,
  });

  PlayerState copyWith({
    List<ContentItem>? channels,
    ContentItem? current,
    bool? paused,
  }) =>
      PlayerState(
        channels: channels ?? this.channels,
        current: current ?? this.current,
        paused: paused ?? this.paused,
      );
}

class PlayerView extends StatelessWidget {
  final PlayerState player;
  final VoidCallback onClose;
  final bool Function() onNext;
  final bool Function() onPrev;
  final void Function(ContentItem) onChannelSelect;
  final VoidCallback onTogglePause;
  final bool showPlayIcon;

  const PlayerView({
    super.key,
    required this.player,
    required this.onClose,
    required this.onNext,
    required this.onPrev,
    required this.onChannelSelect,
    required this.onTogglePause,
    required this.showPlayIcon,
  });

  @override
  Widget build(BuildContext context) {
    return NavixMultiLayer(
      fKey: 'home-player',
      onExitRequest: onClose,
      onNext: onNext,
      onPrev: onPrev,
      panelTimeout: 4000,
      baseLayer: () => _GradientVideo(item: player.current, paused: player.paused),
      zapBanner: () => _ZapBanner(item: player.current),
      notification: () {
        if (player.paused) return const _PlayPauseNotification(paused: true);
        if (showPlayIcon) return const _PlayPauseNotification(paused: false);
        return const SizedBox.shrink();
      },
      left: (props) => _SidePanel(props: props),
      right: (props) => _ChannelListPanel(
        props: props,
        channels: player.channels,
        current: player.current,
        onSelect: onChannelSelect,
      ),
      up: (props) => _NotificationsPanel(props: props, current: player.current),
      down: (props) => _ControlsPanel(
        props: props,
        paused: player.paused,
        onTogglePause: onTogglePause,
        onNext: onNext,
        onPrev: onPrev,
      ),
    );
  }
}

class _GradientVideo extends StatefulWidget {
  final ContentItem item;
  final bool paused;

  const _GradientVideo({required this.item, required this.paused});

  @override
  State<_GradientVideo> createState() => _GradientVideoState();
}

class _GradientVideoState extends State<_GradientVideo>
    with SingleTickerProviderStateMixin {
  late AnimationController _anim;

  @override
  void initState() {
    super.initState();
    _anim = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 6),
    )..repeat();
  }

  @override
  void dispose() {
    _anim.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (widget.paused) {
      return Container(
        color: widget.item.color,
        child: Center(
          child: _VideoCenter(item: widget.item),
        ),
      );
    }
    return AnimatedBuilder(
      animation: _anim,
      builder: (context, child) {
        return Container(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment(
                  -1.0 + 2.0 * _anim.value, -1.0 + 2.0 * _anim.value),
              end: Alignment(1.0 - 2.0 * _anim.value, 1.0 - 2.0 * _anim.value),
              colors: [
                widget.item.color,
                Colors.black,
                widget.item.color.withValues(alpha: 0.53),
              ],
            ),
          ),
          child: child,
        );
      },
      child: Center(child: _VideoCenter(item: widget.item)),
    );
  }
}

class _VideoCenter extends StatelessWidget {
  final ContentItem item;

  const _VideoCenter({required this.item});

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Text('▶',
            style: TextStyle(
                fontSize: 64,
                color: Colors.white.withValues(alpha: 0.15))),
        const SizedBox(height: 12),
        Text(item.title,
            style: TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.w700,
                color: Colors.white.withValues(alpha: 0.15))),
        const SizedBox(height: 6),
        Text('${item.year}',
            style: TextStyle(
                fontSize: 13,
                color: Colors.white.withValues(alpha: 0.09))),
      ],
    );
  }
}

class _ZapBanner extends StatelessWidget {
  final ContentItem item;

  const _ZapBanner({required this.item});

  @override
  Widget build(BuildContext context) {
    return Positioned(
      bottom: 48,
      left: 48,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
        decoration: BoxDecoration(
          color: Colors.black.withValues(alpha: 0.75),
          border: Border.all(color: item.color),
          borderRadius: BorderRadius.circular(10),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: item.color,
                borderRadius: BorderRadius.circular(8),
              ),
            ),
            const SizedBox(width: 16),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(item.title,
                    style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                        color: Colors.white)),
                const SizedBox(height: 2),
                Text('${item.year}',
                    style: const TextStyle(
                        fontSize: 12, color: Color(0xFFaaaaaa))),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _PlayPauseNotification extends StatelessWidget {
  final bool paused;

  const _PlayPauseNotification({required this.paused});

  @override
  Widget build(BuildContext context) {
    return Container(
      color: paused ? Colors.black.withValues(alpha: 0.45) : Colors.transparent,
      child: Center(
        child: Container(
          width: 120,
          height: 120,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: Colors.black.withValues(alpha: 0.55),
            border: Border.all(
                color: Colors.white.withValues(alpha: 0.25), width: 3),
          ),
          child: Center(
            child: Text(
              paused ? '⏸' : '▶',
              style: const TextStyle(fontSize: 52, color: Colors.white),
            ),
          ),
        ),
      ),
    );
  }
}

const _trackOptions = [
  (id: 'audio-tr', label: 'Türkçe', group: 'Audio'),
  (id: 'audio-en', label: 'English', group: 'Audio'),
  (id: 'audio-de', label: 'Deutsch', group: 'Audio'),
  (id: 'sub-off', label: 'Off', group: 'Subtitles'),
  (id: 'sub-tr', label: 'Türkçe', group: 'Subtitles'),
  (id: 'sub-en', label: 'English', group: 'Subtitles'),
];

class _SidePanel extends StatefulWidget {
  final NavixMultiLayerPanelProps props;

  const _SidePanel({required this.props});

  @override
  State<_SidePanel> createState() => _SidePanelState();
}

class _SidePanelState extends State<_SidePanel> {
  String _selected = 'audio-tr';

  @override
  Widget build(BuildContext context) {
    final isOpen = widget.props.panelState == NavixPanelState.open;
    return AnimatedContainer(
      duration: const Duration(milliseconds: 250),
      transform: Matrix4.translationValues(isOpen ? 0 : -260, 0, 0),
      child: Align(
        alignment: Alignment.centerLeft,
        child: Container(
          width: 260,
          decoration: const BoxDecoration(
            color: Color(0xF20a0a14),
            border: Border(right: BorderSide(color: Color(0xFF1e1e3a))),
          ),
          padding: const EdgeInsets.symmetric(vertical: 24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Padding(
                padding: EdgeInsets.only(left: 24, bottom: 16),
                child: Text('AUDIO & SUBTITLES',
                    style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                        color: _blue,
                        letterSpacing: 1.0)),
              ),
              Expanded(
                child: NavixVerticalList(
                  fKey: widget.props.fKey,
                  child: SingleChildScrollView(
                    physics: const NeverScrollableScrollPhysics(),
                    child: Column(
                      children: [
                        for (int i = 0; i < _trackOptions.length; i++) ...[
                          if (i == 0 ||
                              _trackOptions[i - 1].group !=
                                  _trackOptions[i].group)
                            Padding(
                              padding: const EdgeInsets.only(
                                  left: 24, top: 8, bottom: 4),
                              child: Text(
                                _trackOptions[i].group.toUpperCase(),
                                style: const TextStyle(
                                    fontSize: 9,
                                    color: Color(0xFF444444),
                                    letterSpacing: 1.0),
                              ),
                            ),
                          NavixButton(
                            fKey:
                                '${widget.props.fKey}-${_trackOptions[i].id}',
                            onClick: () => setState(
                                () => _selected = _trackOptions[i].id),
                            builder: (context, focused) {
                              return AnimatedContainer(
                                duration: const Duration(milliseconds: 150),
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 24, vertical: 10),
                                color: focused
                                    ? _blue.withValues(alpha: 0.1)
                                    : Colors.transparent,
                                child: Row(
                                  children: [
                                    Container(
                                      width: 6,
                                      height: 6,
                                      decoration: BoxDecoration(
                                        shape: BoxShape.circle,
                                        color: _selected == _trackOptions[i].id
                                            ? _green
                                            : const Color(0xFF333333),
                                      ),
                                    ),
                                    const SizedBox(width: 10),
                                    Text(
                                      _trackOptions[i].label,
                                      style: TextStyle(
                                        fontSize: 13,
                                        color: focused
                                            ? Colors.white
                                            : _selected == _trackOptions[i].id
                                                ? _green
                                                : const Color(0xFF888888),
                                      ),
                                    ),
                                  ],
                                ),
                              );
                            },
                          ),
                        ],
                        NavixButton(
                          fKey: '${widget.props.fKey}-close',
                          onClick: widget.props.close,
                          builder: (context, focused) {
                            return AnimatedContainer(
                              duration: const Duration(milliseconds: 150),
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 24, vertical: 10),
                              margin: const EdgeInsets.only(top: 8),
                              decoration: BoxDecoration(
                                border: Border(
                                  left: BorderSide(
                                      color: focused
                                          ? _blue
                                          : Colors.transparent,
                                      width: 2),
                                ),
                              ),
                              child: Text('← Back',
                                  style: TextStyle(
                                      fontSize: 12,
                                      color: focused
                                          ? Colors.white
                                          : const Color(0xFF444444))),
                            );
                          },
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ChannelListPanel extends StatelessWidget {
  final NavixMultiLayerPanelProps props;
  final List<ContentItem> channels;
  final ContentItem current;
  final void Function(ContentItem) onSelect;

  const _ChannelListPanel({
    required this.props,
    required this.channels,
    required this.current,
    required this.onSelect,
  });

  @override
  Widget build(BuildContext context) {
    final isOpen = props.panelState == NavixPanelState.open;
    return AnimatedContainer(
      duration: const Duration(milliseconds: 250),
      transform: Matrix4.translationValues(isOpen ? 0 : 280, 0, 0),
      child: Align(
        alignment: Alignment.centerRight,
        child: Container(
          width: 280,
          decoration: const BoxDecoration(
            color: Color(0xF20a0a14),
            border: Border(left: BorderSide(color: Color(0xFF1e1e3a))),
          ),
          padding: const EdgeInsets.symmetric(vertical: 24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Padding(
                padding: EdgeInsets.only(left: 16, bottom: 16),
                child: Text('CHANNELS',
                    style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                        color: _blue,
                        letterSpacing: 1.0)),
              ),
              Expanded(
                child: NavixVerticalList(
                  fKey: props.fKey,
                  child: SingleChildScrollView(
                    physics: const NeverScrollableScrollPhysics(),
                    child: Column(
                      children: [
                        for (final ch in channels)
                          NavixButton(
                            fKey: '${props.fKey}-${ch.id}',
                            onClick: () {
                              onSelect(ch);
                              props.close();
                            },
                            builder: (context, focused) {
                              final isActive = ch.id == current.id;
                              return AnimatedContainer(
                                duration: const Duration(milliseconds: 150),
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 16, vertical: 8),
                                color: focused
                                    ? _blue.withValues(alpha: 0.1)
                                    : isActive
                                        ? _blue.withValues(alpha: 0.06)
                                        : Colors.transparent,
                                child: Row(
                                  children: [
                                    Container(
                                      width: 28,
                                      height: 28,
                                      decoration: BoxDecoration(
                                        color: ch.color,
                                        borderRadius: BorderRadius.circular(6),
                                      ),
                                    ),
                                    const SizedBox(width: 12),
                                    Text(
                                      ch.title,
                                      style: TextStyle(
                                        fontSize: 13,
                                        fontWeight: isActive
                                            ? FontWeight.w700
                                            : FontWeight.w400,
                                        color: focused
                                            ? Colors.white
                                            : isActive
                                                ? _blue
                                                : const Color(0xFF888888),
                                      ),
                                    ),
                                  ],
                                ),
                              );
                            },
                          ),
                        NavixButton(
                          fKey: '${props.fKey}-close',
                          onClick: props.close,
                          builder: (context, focused) {
                            return AnimatedContainer(
                              duration: const Duration(milliseconds: 150),
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 16, vertical: 10),
                              margin: const EdgeInsets.only(top: 8),
                              child: Text('← Back',
                                  style: TextStyle(
                                      fontSize: 12,
                                      color: focused
                                          ? Colors.white
                                          : const Color(0xFF444444))),
                            );
                          },
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

const _notifications = [
  (id: 'nowplaying', title: 'Now Playing', body: ''),
  (
    id: 'n2',
    title: 'New Episode Available',
    body: 'A new episode of your favourite series has been added.'
  ),
  (
    id: 'n3',
    title: 'Recommendation',
    body: 'Based on your watch history, you might enjoy similar titles.'
  ),
  (id: 'n4', title: 'Reminder', body: 'Your watchlist has 3 unwatched items.'),
];

class _NotificationsPanel extends StatelessWidget {
  final NavixMultiLayerPanelProps props;
  final ContentItem current;

  const _NotificationsPanel({required this.props, required this.current});

  @override
  Widget build(BuildContext context) {
    final isOpen = props.panelState == NavixPanelState.open;
    return AnimatedContainer(
      duration: const Duration(milliseconds: 250),
      transform: Matrix4.translationValues(0, isOpen ? 0 : -280, 0),
      child: Align(
        alignment: Alignment.topCenter,
        child: Container(
          height: 280,
          width: double.infinity,
          decoration: const BoxDecoration(
            color: Color(0xF20a0a14),
            border: Border(bottom: BorderSide(color: Color(0xFF1e1e3a))),
          ),
          padding: const EdgeInsets.symmetric(vertical: 20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Padding(
                padding: EdgeInsets.only(left: 24, bottom: 12),
                child: Text('NOTIFICATIONS',
                    style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                        color: _blue,
                        letterSpacing: 1.0)),
              ),
              Expanded(
                child: NavixVerticalList(
                  fKey: props.fKey,
                  child: Column(
                    children: [
                      NavixButton(
                        fKey: '${props.fKey}-nowplaying',
                        onClick: () {},
                        builder: (context, focused) {
                          return AnimatedContainer(
                            duration: const Duration(milliseconds: 150),
                            margin: const EdgeInsets.only(bottom: 4),
                            padding: const EdgeInsets.symmetric(
                                horizontal: 24, vertical: 10),
                            color: focused
                                ? _blue.withValues(alpha: 0.1)
                                : _blue.withValues(alpha: 0.04),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text('NOW PLAYING',
                                    style: TextStyle(
                                        fontSize: 11,
                                        fontWeight: FontWeight.w700,
                                        color: _blue,
                                        letterSpacing: 0.8)),
                                const SizedBox(height: 3),
                                Text(current.title,
                                    style: const TextStyle(
                                        fontSize: 14,
                                        fontWeight: FontWeight.w600,
                                        color: Colors.white)),
                                const SizedBox(height: 2),
                                Text('${current.year}',
                                    style: const TextStyle(
                                        fontSize: 12,
                                        color: Color(0xFF888888))),
                              ],
                            ),
                          );
                        },
                      ),
                      for (final n in _notifications.skip(1))
                        NavixButton(
                          fKey: '${props.fKey}-${n.id}',
                          onClick: () {},
                          builder: (context, focused) {
                            return AnimatedContainer(
                              duration: const Duration(milliseconds: 150),
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 24, vertical: 10),
                              color: focused
                                  ? _blue.withValues(alpha: 0.1)
                                  : Colors.transparent,
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(n.title,
                                      style: TextStyle(
                                          fontSize: 13,
                                          fontWeight: FontWeight.w600,
                                          color: focused
                                              ? Colors.white
                                              : const Color(0xFFcccccc))),
                                  if (n.body.isNotEmpty) ...[
                                    const SizedBox(height: 2),
                                    Text(n.body,
                                        style: const TextStyle(
                                            fontSize: 12,
                                            color: Color(0xFF666666))),
                                  ],
                                ],
                              ),
                            );
                          },
                        ),
                      NavixButton(
                        fKey: '${props.fKey}-close',
                        onClick: props.close,
                        builder: (context, focused) {
                          return AnimatedContainer(
                            duration: const Duration(milliseconds: 150),
                            padding: const EdgeInsets.symmetric(
                                horizontal: 24, vertical: 10),
                            margin: const EdgeInsets.only(top: 4),
                            child: Text('← Back',
                                style: TextStyle(
                                    fontSize: 12,
                                    color: focused
                                        ? Colors.white
                                        : const Color(0xFF444444))),
                          );
                        },
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

const _controlButtons = [
  (id: 'prev', label: '⏮', title: 'Previous'),
  (id: 'playpause', label: '', title: 'Play/Pause'),
  (id: 'next', label: '⏭', title: 'Next'),
  (id: 'stop', label: '⏹', title: 'Stop'),
];

class _ControlsPanel extends StatefulWidget {
  final NavixMultiLayerPanelProps props;
  final bool paused;
  final VoidCallback onTogglePause;
  final bool Function() onNext;
  final bool Function() onPrev;

  const _ControlsPanel({
    required this.props,
    required this.paused,
    required this.onTogglePause,
    required this.onNext,
    required this.onPrev,
  });

  @override
  State<_ControlsPanel> createState() => _ControlsPanelState();
}

class _ControlsPanelState extends State<_ControlsPanel> {
  double _progress = 32;
  double _volume = 80;

  void _handleControl(String id) {
    if (id == 'playpause') {
      widget.onTogglePause();
    } else if (id == 'next') {
      widget.onNext();
    } else if (id == 'prev') {
      widget.onPrev();
    } else if (id == 'stop') {
      widget.props.close();
    }
  }

  @override
  Widget build(BuildContext context) {
    final isOpen = widget.props.panelState == NavixPanelState.open;
    return AnimatedContainer(
      duration: const Duration(milliseconds: 250),
      transform: Matrix4.translationValues(0, isOpen ? 0 : 200, 0),
      child: Align(
        alignment: Alignment.bottomCenter,
        child: Container(
          width: double.infinity,
          decoration: const BoxDecoration(
            color: Color(0xF20a0a14),
            border: Border(top: BorderSide(color: Color(0xFF1e1e3a))),
          ),
          padding: const EdgeInsets.fromLTRB(32, 20, 32, 24),
          child: NavixVerticalList(
            fKey: widget.props.fKey,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                NavixHorizontalList(
                  fKey: '${widget.props.fKey}-buttons',
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      for (final btn in _controlButtons) ...[
                        NavixButton(
                          fKey: '${widget.props.fKey}-${btn.id}',
                          onClick: () => _handleControl(btn.id),
                          builder: (context, focused) {
                            return AnimatedContainer(
                              duration: const Duration(milliseconds: 150),
                              width: 64,
                              height: 64,
                              decoration: BoxDecoration(
                                color: focused
                                    ? _blue.withValues(alpha: 0.18)
                                    : Colors.white.withValues(alpha: 0.06),
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(
                                  color: focused
                                      ? _blue
                                      : Colors.white.withValues(alpha: 0.1),
                                  width: 2,
                                ),
                              ),
                              child: Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Text(
                                    btn.id == 'playpause'
                                        ? (widget.paused ? '▶' : '⏸')
                                        : btn.label,
                                    style: const TextStyle(
                                        fontSize: 24, color: Colors.white),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    btn.id == 'playpause'
                                        ? (widget.paused ? 'PLAY' : 'PAUSE')
                                        : btn.title.toUpperCase(),
                                    style: TextStyle(
                                      fontSize: 9,
                                      color: focused
                                          ? _blue
                                          : const Color(0xFF555555),
                                      letterSpacing: 0.6,
                                    ),
                                  ),
                                ],
                              ),
                            );
                          },
                        ),
                        const SizedBox(width: 12),
                      ],
                    ],
                  ),
                ),
                const SizedBox(height: 12),

                // Progress bar
                NavixButton(
                  fKey: '${widget.props.fKey}-progress',
                  onClick: () {},
                  builder: (context, focused) {
                    return Padding(
                      padding: const EdgeInsets.symmetric(vertical: 4),
                      child: Column(
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              const Text('Progress',
                                  style: TextStyle(
                                      fontSize: 11, color: Color(0xFF666666))),
                              Text('${_progress.round()}%',
                                  style: TextStyle(
                                      fontSize: 11,
                                      color: focused
                                          ? _blue
                                          : const Color(0xFF666666))),
                            ],
                          ),
                          const SizedBox(height: 6),
                          GestureDetector(
                            onTapDown: (details) {
                              final box = context.findRenderObject()
                                  as RenderBox?;
                              if (box == null) return;
                              setState(() {
                                _progress = (details.localPosition.dx /
                                            box.size.width *
                                            100)
                                        .clamp(0, 100);
                              });
                            },
                            child: Container(
                              height: 4,
                              decoration: BoxDecoration(
                                color: Colors.white.withValues(alpha: 0.1),
                                borderRadius: BorderRadius.circular(2),
                                border: Border.all(
                                  color: focused
                                      ? _blue.withValues(alpha: 0.27)
                                      : Colors.transparent,
                                ),
                              ),
                              child: FractionallySizedBox(
                                widthFactor: _progress / 100,
                                alignment: Alignment.centerLeft,
                                child: Container(
                                  decoration: BoxDecoration(
                                    color: _blue,
                                    borderRadius: BorderRadius.circular(2),
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    );
                  },
                ),

                const SizedBox(height: 8),

                // Volume bar
                NavixButton(
                  fKey: '${widget.props.fKey}-volume',
                  onClick: () {},
                  builder: (context, focused) {
                    return Padding(
                      padding: const EdgeInsets.symmetric(vertical: 4),
                      child: Column(
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              const Text('🔊 Volume',
                                  style: TextStyle(
                                      fontSize: 11, color: Color(0xFF666666))),
                              Text('${_volume.round()}%',
                                  style: TextStyle(
                                      fontSize: 11,
                                      color: focused
                                          ? _blue
                                          : const Color(0xFF666666))),
                            ],
                          ),
                          const SizedBox(height: 6),
                          GestureDetector(
                            onTapDown: (details) {
                              final box = context.findRenderObject()
                                  as RenderBox?;
                              if (box == null) return;
                              setState(() {
                                _volume = (details.localPosition.dx /
                                            box.size.width *
                                            100)
                                        .clamp(0, 100);
                              });
                            },
                            child: Container(
                              height: 4,
                              decoration: BoxDecoration(
                                color: Colors.white.withValues(alpha: 0.1),
                                borderRadius: BorderRadius.circular(2),
                                border: Border.all(
                                  color: focused
                                      ? _blue.withValues(alpha: 0.27)
                                      : Colors.transparent,
                                ),
                              ),
                              child: FractionallySizedBox(
                                widthFactor: _volume / 100,
                                alignment: Alignment.centerLeft,
                                child: Container(
                                  decoration: BoxDecoration(
                                    color: _green,
                                    borderRadius: BorderRadius.circular(2),
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    );
                  },
                ),

                const SizedBox(height: 8),

                NavixButton(
                  fKey: '${widget.props.fKey}-close',
                  onClick: widget.props.close,
                  builder: (context, focused) {
                    return Container(
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      decoration: const BoxDecoration(
                        border: Border(
                            top: BorderSide(color: Color(0xFF1e1e3a))),
                      ),
                      child: Center(
                        child: Text('← Back',
                            style: TextStyle(
                                fontSize: 12,
                                color: focused
                                    ? Colors.white
                                    : const Color(0xFF444444))),
                      ),
                    );
                  },
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

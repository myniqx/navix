import 'package:flutter/material.dart';

class ContentItem {
  final String id;
  final String title;
  final int year;
  final Color color;

  const ContentItem({
    required this.id,
    required this.title,
    required this.year,
    required this.color,
  });
}

const _cardColors = [
  Color(0xFF1a3a5c),
  Color(0xFF2d1b4e),
  Color(0xFF1a4a2e),
  Color(0xFF4a2a1a),
  Color(0xFF1a3a4a),
  Color(0xFF3a1a4a),
  Color(0xFF4a3a1a),
  Color(0xFF1a4a3a),
  Color(0xFF3a1a2a),
  Color(0xFF1a2a4a),
  Color(0xFF4a1a1a),
  Color(0xFF2a4a1a),
];

List<ContentItem> _makeItems(String prefix, int count) {
  return List.generate(count, (i) {
    final colorIdx = (i + prefix.codeUnitAt(0)) % _cardColors.length;
    return ContentItem(
      id: '$prefix-$i',
      title: '$prefix ${i + 1}',
      year: 2020 + (i % 5),
      color: _cardColors[colorIdx],
    );
  });
}

const menuItems = ['Home', 'Movie', 'Series', 'Live', 'Options'];

class OptionConfig {
  final String key;
  final String label;
  final List<String> choices;
  const OptionConfig({
    required this.key,
    required this.label,
    required this.choices,
  });
}

const optionsConfig = [
  OptionConfig(
    key: 'language',
    label: 'Language',
    choices: ['English', 'Turkish', 'German', 'French'],
  ),
  OptionConfig(
    key: 'subtitles',
    label: 'Subtitles',
    choices: ['Off', 'English', 'Turkish'],
  ),
  OptionConfig(
    key: 'audio',
    label: 'Audio',
    choices: ['Stereo', 'Surround 5.1', 'Dolby Atmos'],
  ),
  OptionConfig(
    key: 'theme',
    label: 'Theme',
    choices: ['Dark', 'Light', 'Auto'],
  ),
];

const defaultOptions = {
  'language': 'English',
  'subtitles': 'Off',
  'audio': 'Stereo',
  'theme': 'Dark',
};

final rows = [
  (label: 'Drama', items: _makeItems('Action', 8)),
  (label: 'Action', items: _makeItems('Series', 7)),
  (label: 'Romantic', items: _makeItems('Channel', 6)),
];

final liveGrid = _makeItems('Live', 24);
final movieChannels = _makeItems('Movie', 120);

enum HomeRowCardType { movie, series, live }

final homeRows = [
  (
    label: 'Movies',
    cardType: HomeRowCardType.movie,
    items: _makeItems('Movie', 18),
  ),
  (
    label: 'Tv Series',
    cardType: HomeRowCardType.series,
    items: _makeItems('Serie', 15),
  ),
  (
    label: 'Live Streams',
    cardType: HomeRowCardType.live,
    items: _makeItems('Channel', 20),
  ),
];

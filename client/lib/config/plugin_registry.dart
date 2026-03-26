import 'package:flutter/material.dart';

class PluginMeta {
  final String id;
  final String displayName;
  final String description;
  final String category;
  final IconData icon;
  final Color color;
  final List<PluginField> fields;
  final bool isOAuth;
  final bool isDeviceBased;

  const PluginMeta({
    required this.id,
    required this.displayName,
    required this.description,
    required this.category,
    required this.icon,
    required this.color,
    this.fields = const [],
    this.isOAuth = false,
    this.isDeviceBased = false,
  });
}

class PluginField {
  final String key;
  final String label;
  final String hint;
  final bool obscure;

  const PluginField({
    required this.key,
    required this.label,
    required this.hint,
    this.obscure = false,
  });
}

class PluginRegistry {
  static const Map<String, String> categoryLabels = {
    'coding': 'Coding',
    'fitness': 'Fitness',
    'languages': 'Languages',
    'productivity': 'Productivity',
    'games': 'Games',
  };

  static final List<PluginMeta> plugins = [
    // ── Coding ──
    PluginMeta(
      id: 'leetcode',
      displayName: 'LeetCode',
      description: 'Track daily coding problems solved',
      category: 'coding',
      icon: Icons.code,
      color: Colors.orange,
      fields: [
        const PluginField(
          key: 'username',
          label: 'LeetCode Username',
          hint: 'your-username',
        ),
      ],
    ),
    PluginMeta(
      id: 'github',
      displayName: 'GitHub',
      description: 'Track commits, PRs, and contributions',
      category: 'coding',
      icon: Icons.commit,
      color: const Color(0xFF333333),
      fields: [
        const PluginField(
          key: 'token',
          label: 'Personal Access Token',
          hint: 'ghp_...',
          obscure: true,
        ),
        const PluginField(
          key: 'username',
          label: 'GitHub Username',
          hint: 'your-username',
        ),
      ],
    ),
    PluginMeta(
      id: 'wakapi',
      displayName: 'Wakapi',
      description: 'Track coding time from your editor',
      category: 'coding',
      icon: Icons.timer,
      color: Colors.blue,
      fields: [
        const PluginField(
          key: 'api_key',
          label: 'API Key',
          hint: 'Your Wakapi API key',
          obscure: true,
        ),
        const PluginField(
          key: 'api_url',
          label: 'Server URL',
          hint: 'https://wakapi.dev',
        ),
      ],
    ),

    // ── Fitness ──
    PluginMeta(
      id: 'google_fit',
      displayName: 'Google Fit',
      description: 'Track steps, workouts, and activity',
      category: 'fitness',
      icon: Icons.fitness_center,
      color: Colors.green,
      isOAuth: true,
    ),
    PluginMeta(
      id: 'strava',
      displayName: 'Strava',
      description: 'Track runs, rides, and workouts',
      category: 'fitness',
      icon: Icons.directions_run,
      color: const Color(0xFFFC4C02),
      isOAuth: true,
    ),

    // ── Languages ──
    PluginMeta(
      id: 'duolingo',
      displayName: 'Duolingo',
      description: 'Track language learning streaks and XP',
      category: 'languages',
      icon: Icons.translate,
      color: const Color(0xFF58CC02),
      fields: [
        const PluginField(
          key: 'username',
          label: 'Duolingo Username',
          hint: 'your-username',
        ),
      ],
    ),

    // ── Productivity ──
    PluginMeta(
      id: 'screen_time',
      displayName: 'Screen Time',
      description: 'Track phone usage — succeed by using your phone less',
      category: 'productivity',
      icon: Icons.phone_android,
      color: Colors.purple,
      isDeviceBased: true,
    ),
    PluginMeta(
      id: 'todoist',
      displayName: 'Todoist',
      description: 'Track task completion from Todoist',
      category: 'productivity',
      icon: Icons.checklist,
      color: const Color(0xFFE44332),
      fields: [
        const PluginField(
          key: 'api_token',
          label: 'API Token',
          hint: 'Your Todoist API token',
          obscure: true,
        ),
      ],
    ),

    // ── Games ──
    PluginMeta(
      id: 'chess_com',
      displayName: 'Chess.com',
      description: 'Track daily chess games and puzzles',
      category: 'games',
      icon: Icons.grid_view,
      color: const Color(0xFF769656),
      fields: [
        const PluginField(
          key: 'username',
          label: 'Chess.com Username',
          hint: 'your-username',
        ),
      ],
    ),
  ];

  static PluginMeta? getMeta(String pluginId) {
    try {
      return plugins.firstWhere((p) => p.id == pluginId);
    } catch (_) {
      return null;
    }
  }

  static List<PluginMeta> byCategory(String category) {
    return plugins.where((p) => p.category == category).toList();
  }

  static List<String> get categories =>
      plugins.map((p) => p.category).toSet().toList();
}

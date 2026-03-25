import 'package:flutter/material.dart';

class GroupTiers {
  static ({String name, Color color}) getTier(String tierName) {
    switch (tierName) {
      case 'blaze':
        return (name: 'Blaze', color: const Color(0xFFFF6B00));
      case 'flame':
        return (name: 'Flame', color: const Color(0xFFFF4444));
      case 'ember':
        return (name: 'Ember', color: const Color(0xFFFF8C00));
      default:
        return (name: 'Spark', color: const Color(0xFFFFD700));
    }
  }

  static double getProgress(int currentStreak) {
    if (currentStreak >= 66) return 1.0;
    if (currentStreak >= 21) return (currentStreak - 21) / (66 - 21);
    if (currentStreak >= 7) return (currentStreak - 7) / (21 - 7);
    return currentStreak / 7;
  }

  static int getNextTierStreak(int currentStreak) {
    if (currentStreak >= 66) return 66;
    if (currentStreak >= 21) return 66;
    if (currentStreak >= 7) return 21;
    return 7;
  }

  static Color chainLinkColor(String linkType) {
    switch (linkType) {
      case 'gold':
        return const Color(0xFFFFD700);
      case 'silver':
        return const Color(0xFFC0C0C0);
      default:
        return const Color(0xFFFF4444);
    }
  }

  static IconData chainLinkIcon(String linkType) {
    return linkType == 'broken' ? Icons.link_off : Icons.link;
  }
}

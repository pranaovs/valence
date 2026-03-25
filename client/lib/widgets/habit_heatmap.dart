import 'package:flutter/material.dart';
import 'package:simple_heatmap_calendar/simple_heatmap_calendar.dart';
import '../models/habit_log.dart';

class HabitHeatmapWidget extends StatelessWidget {
  final List<HabitLog> logs;

  const HabitHeatmapWidget({super.key, required this.logs});

  @override
  Widget build(BuildContext context) {
    if (logs.isEmpty) {
      return const SizedBox(
        height: 120,
        child: Center(child: Text('No data yet')),
      );
    }

    final cs = Theme.of(context).colorScheme;

    final selectedMap = <DateTime, num>{};
    for (final log in logs) {
      final date = DateTime.parse(log.date);
      final normalized = DateTime(date.year, date.month, date.day);
      selectedMap[normalized] = log.completed ? 1 : 0;
    }

    final sorted = logs.map((l) => DateTime.parse(l.date)).toList()..sort();
    final startDate = DateTime(
        sorted.first.year, sorted.first.month, sorted.first.day);
    final endDate = DateTime(
        sorted.last.year, sorted.last.month, sorted.last.day);

    return SizedBox(
      height: 140,
      child: HeatmapCalendar<num>(
        startDate: startDate,
        endedDate: endDate,
        selectedMap: selectedMap,
        colorMap: {
          0: cs.surfaceContainerHighest,
          1: cs.primary,
        },
        cellSize: const Size.square(14),
        cellSpaceBetween: 2,
      ),
    );
  }
}

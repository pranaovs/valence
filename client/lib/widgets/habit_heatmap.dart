import 'package:flutter/material.dart';
import 'package:simple_heatmap_calendar/simple_heatmap_calendar.dart';
import '../models/habit.dart';
import '../models/habit_log.dart';

class HabitHeatmapWidget extends StatelessWidget {
  final List<HabitLog> logs;
  final Habit? habit;

  const HabitHeatmapWidget({super.key, required this.logs, this.habit});

  double _logRatio(HabitLog log) {
    final goal = habit?.pluginGoal;
    if (goal != null && log.pluginMetrics != null) {
      final current = log.pluginMetrics![goal.metric];
      if (current is num && goal.value != 0) {
        return current / goal.value;
      }
    }
    return log.completed ? 1.0 : 0.0;
  }

  int _ratioToLevel(double ratio) {
    if (ratio <= 0) return 0;
    if (ratio < 0.5) return 1;
    if (ratio < 1.0) return 2;
    if (ratio >= 1.0) return 3;
    return 0;
  }

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
      final date = DateTime.tryParse(log.date);
      if (date == null) continue;
      final normalized = DateTime(date.year, date.month, date.day);
      selectedMap[normalized] = _ratioToLevel(_logRatio(log));
    }

    if (selectedMap.isEmpty) {
      return const SizedBox(
        height: 120,
        child: Center(child: Text('No data yet')),
      );
    }

    final sorted = logs
        .map((l) => DateTime.tryParse(l.date))
        .whereType<DateTime>()
        .toList()
      ..sort();
    final startDate = DateTime(
        sorted.first.year, sorted.first.month, sorted.first.day);
    final today = DateTime.now();
    final endDate = DateTime(today.year, today.month, today.day);

    // Fill all dates in range so blank squares appear for days with no data
    for (var d = startDate;
        !d.isAfter(endDate);
        d = d.add(const Duration(days: 1))) {
      final normalized = DateTime(d.year, d.month, d.day);
      selectedMap.putIfAbsent(normalized, () => 0);
    }

    final cellTotal = 14.0 + 2.0; // cellSize + spacing
    final rows = 7; // days in a week
    final computedHeight = (rows * cellTotal) + 2; // +2 for rounding

    return ClipRect(
      child: SizedBox(
        height: computedHeight,
        child: HeatmapCalendar<num>(
          startDate: startDate,
          endedDate: endDate,
          selectedMap: selectedMap,
          style: HeatmapCalendarStyle.defaults(
            cellBackgroundColor: cs.onSurface.withValues(alpha: 0.08),
            cellRadius: BorderRadius.circular(3),
          ),
          colorMap: {
            0: cs.onSurface.withValues(alpha: 0.08),
            1: cs.primary.withValues(alpha: 0.25),
            2: cs.primary.withValues(alpha: 0.5),
            3: cs.primary.withValues(alpha: 0.8),
          },
          cellSize: const Size.square(14),
          cellSpaceBetween: 2,
        ),
      ),
    );
  }
}

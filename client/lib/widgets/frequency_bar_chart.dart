import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../models/habit_log.dart';

class FrequencyBarChart extends StatelessWidget {
  final List<HabitLog> logs;

  const FrequencyBarChart({super.key, required this.logs});

  @override
  Widget build(BuildContext context) {
    if (logs.isEmpty) {
      return const SizedBox(
        height: 200,
        child: Center(child: Text('No data yet')),
      );
    }

    final cs = Theme.of(context).colorScheme;
    final weekBuckets = _groupByWeek();

    if (weekBuckets.isEmpty) {
      return const SizedBox(
        height: 200,
        child: Center(child: Text('No data yet')),
      );
    }

    final maxY = weekBuckets
        .map((b) => b.total)
        .reduce((a, b) => a > b ? a : b)
        .toDouble();

    return SizedBox(
      height: 200,
      child: Padding(
        padding: const EdgeInsets.only(right: 16, top: 16),
        child: BarChart(
          BarChartData(
            maxY: maxY + 1,
            gridData: FlGridData(
              show: true,
              drawVerticalLine: false,
              horizontalInterval: (maxY / 4).clamp(1, double.infinity),
              getDrawingHorizontalLine: (value) => FlLine(
                color: cs.outlineVariant.withValues(alpha: 0.3),
                strokeWidth: 1,
              ),
            ),
            titlesData: FlTitlesData(
              leftTitles: const AxisTitles(
                sideTitles: SideTitles(showTitles: false),
              ),
              rightTitles: const AxisTitles(
                sideTitles: SideTitles(showTitles: false),
              ),
              topTitles: const AxisTitles(
                sideTitles: SideTitles(showTitles: false),
              ),
              bottomTitles: AxisTitles(
                sideTitles: SideTitles(
                  showTitles: true,
                  reservedSize: 28,
                  getTitlesWidget: (value, meta) {
                    final idx = value.toInt();
                    if (idx < 0 || idx >= weekBuckets.length) {
                      return const SizedBox.shrink();
                    }
                    return Padding(
                      padding: const EdgeInsets.only(top: 4),
                      child: Text(
                        DateFormat('d/M')
                            .format(weekBuckets[idx].weekStart),
                        style: TextStyle(
                            fontSize: 10, color: cs.onSurfaceVariant),
                      ),
                    );
                  },
                ),
              ),
            ),
            borderData: FlBorderData(show: false),
            barGroups: weekBuckets.asMap().entries.map((entry) {
              return BarChartGroupData(
                x: entry.key,
                barRods: [
                  BarChartRodData(
                    toY: entry.value.completed.toDouble(),
                    color: cs.primary,
                    width: 16,
                    borderRadius:
                        const BorderRadius.vertical(top: Radius.circular(4)),
                  ),
                  BarChartRodData(
                    toY: entry.value.missed.toDouble(),
                    color: cs.onSurface.withValues(alpha: 0.15),
                    width: 16,
                    borderRadius:
                        const BorderRadius.vertical(top: Radius.circular(4)),
                  ),
                ],
              );
            }).toList(),
            barTouchData: BarTouchData(
              touchTooltipData: BarTouchTooltipData(
                getTooltipItem: (group, groupIndex, rod, rodIndex) {
                  final label = rodIndex == 0 ? 'Done' : 'Missed';
                  return BarTooltipItem(
                    '$label: ${rod.toY.toInt()}',
                    TextStyle(color: rod.color, fontWeight: FontWeight.bold),
                  );
                },
              ),
            ),
          ),
        ),
      ),
    );
  }

  List<_WeekBucket> _groupByWeek() {
    final sorted = List<HabitLog>.from(logs)
      ..sort((a, b) => a.date.compareTo(b.date));

    if (sorted.isEmpty) return [];

    final buckets = <_WeekBucket>[];
    DateTime? currentWeekStart;
    int completed = 0;
    int missed = 0;

    for (final log in sorted) {
      final date = DateTime.parse(log.date);
      final weekStart =
          date.subtract(Duration(days: date.weekday - 1));
      final normalizedStart =
          DateTime(weekStart.year, weekStart.month, weekStart.day);

      if (currentWeekStart == null ||
          normalizedStart != currentWeekStart) {
        if (currentWeekStart != null) {
          buckets.add(_WeekBucket(currentWeekStart, completed, missed));
        }
        currentWeekStart = normalizedStart;
        completed = 0;
        missed = 0;
      }

      if (log.completed) {
        completed++;
      } else {
        missed++;
      }
    }

    if (currentWeekStart != null) {
      buckets.add(_WeekBucket(currentWeekStart, completed, missed));
    }

    return buckets;
  }
}

class _WeekBucket {
  final DateTime weekStart;
  final int completed;
  final int missed;

  _WeekBucket(this.weekStart, this.completed, this.missed);

  int get total => completed + missed;
}

import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../models/habit_log.dart';

class StreakScoreChart extends StatelessWidget {
  final List<HabitLog> logs;

  const StreakScoreChart({super.key, required this.logs});

  @override
  Widget build(BuildContext context) {
    if (logs.isEmpty) {
      return const SizedBox(
        height: 200,
        child: Center(child: Text('No data yet')),
      );
    }

    final cs = Theme.of(context).colorScheme;
    final sorted = List<HabitLog>.from(logs)
      ..sort((a, b) => a.date.compareTo(b.date));

    final spots = <FlSpot>[];
    for (var i = 0; i < sorted.length; i++) {
      spots.add(FlSpot(i.toDouble(), sorted[i].completed ? 1.0 : 0.0));
    }

    return SizedBox(
      height: 200,
      child: Padding(
        padding: const EdgeInsets.only(right: 16, top: 16),
        child: LineChart(
          LineChartData(
            minY: -0.1,
            maxY: 1.3,
            gridData: FlGridData(
              show: true,
              horizontalInterval: 0.5,
              getDrawingHorizontalLine: (value) => FlLine(
                color: cs.outlineVariant.withValues(alpha: 0.3),
                strokeWidth: 1,
              ),
              drawVerticalLine: false,
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
                  interval: _xInterval(sorted.length),
                  getTitlesWidget: (value, meta) {
                    final idx = value.toInt();
                    if (idx < 0 || idx >= sorted.length) {
                      return const SizedBox.shrink();
                    }
                    return Padding(
                      padding: const EdgeInsets.only(top: 4),
                      child: Text(
                        DateFormat(
                          'd/M',
                        ).format(DateTime.parse(sorted[idx].date)),
                        style: TextStyle(
                          fontSize: 10,
                          color: cs.onSurfaceVariant,
                        ),
                      ),
                    );
                  },
                ),
              ),
            ),
            borderData: FlBorderData(show: false),
            lineBarsData: [
              LineChartBarData(
                spots: spots,
                isCurved: false,
                color: cs.primary,
                barWidth: 2,
                dotData: FlDotData(
                  show: true,
                  getDotPainter: (spot, percent, bar, index) =>
                      FlDotCirclePainter(
                        radius: 3,
                        color: spot.y == 1.0
                            ? cs.primary
                            : cs.onSurface.withValues(alpha: 0.25),
                        strokeWidth: 0,
                      ),
                ),
                belowBarData: BarAreaData(
                  show: true,
                  color: cs.primary.withValues(alpha: 0.1),
                ),
              ),
            ],
            lineTouchData: LineTouchData(
              touchTooltipData: LineTouchTooltipData(
                getTooltipItems: (spots) => spots
                    .map(
                      (s) => LineTooltipItem(
                        s.y == 1.0 ? 'Done' : 'Missed',
                        TextStyle(
                          color: s.y == 1.0 ? cs.primary : cs.onSurfaceVariant,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    )
                    .toList(),
              ),
            ),
          ),
        ),
      ),
    );
  }

  double _xInterval(int count) {
    if (count <= 7) return 1;
    if (count <= 14) return 2;
    return (count / 7).ceilToDouble();
  }
}

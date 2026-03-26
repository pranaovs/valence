import 'package:flutter/material.dart';
import '../models/habit.dart';

class HabitSummaryTile extends StatelessWidget {
  final Habit habit;

  const HabitSummaryTile({super.key, required this.habit});

  double get _progress {
    final target = _stageTarget(habit.goalStage);
    if (target == 0) return 0;
    return (habit.currentStreak / target).clamp(0.0, 1.0);
  }

  int _stageTarget(String stage) {
    switch (stage) {
      case 'ignition':
        return 3;
      case 'foundation':
        return 10;
      case 'momentum':
        return 21;
      case 'formed':
        return 66;
      default:
        return 66;
    }
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;

    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            SizedBox(
              width: 56,
              height: 56,
              child: Stack(
                alignment: Alignment.center,
                children: [
                  CircularProgressIndicator(
                    value: _progress,
                    strokeWidth: 4,
                    backgroundColor: cs.onSurface.withValues(alpha: 0.08),
                    color: cs.primary,
                  ),
                  if (habit.todayCompleted)
                    Icon(Icons.check, color: cs.primary, size: 24),
                ],
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(habit.name,
                      style: Theme.of(context).textTheme.titleMedium),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      _StatItem(
                          icon: Icons.local_fire_department,
                          label: '${habit.currentStreak}',
                          tooltip: 'Current streak'),
                      const SizedBox(width: 16),
                      _StatItem(
                          icon: Icons.emoji_events,
                          label: '${habit.longestStreak}',
                          tooltip: 'Longest streak'),
                      const SizedBox(width: 16),
                      _StatItem(
                          icon: Icons.check_circle_outline,
                          label: '${habit.totalCompleted}',
                          tooltip: 'Total completed'),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Stage: ${habit.goalStage[0].toUpperCase()}${habit.goalStage.substring(1)} '
                    '(${habit.currentStreak}/${_stageTarget(habit.goalStage)})',
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: cs.onSurfaceVariant),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _StatItem extends StatelessWidget {
  final IconData icon;
  final String label;
  final String tooltip;

  const _StatItem({
    required this.icon,
    required this.label,
    required this.tooltip,
  });

  @override
  Widget build(BuildContext context) {
    return Tooltip(
      message: tooltip,
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 16, color: Theme.of(context).colorScheme.onSurfaceVariant),
          const SizedBox(width: 4),
          Text(label, style: Theme.of(context).textTheme.bodyMedium),
        ],
      ),
    );
  }
}

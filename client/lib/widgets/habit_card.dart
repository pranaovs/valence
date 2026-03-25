import 'package:flutter/material.dart';
import '../models/habit.dart';

class HabitCard extends StatelessWidget {
  final Habit habit;
  final VoidCallback? onTap;
  final VoidCallback? onComplete;

  const HabitCard({
    super.key,
    required this.habit,
    this.onTap,
    this.onComplete,
  });

  Color _intensityColor(ColorScheme cs) {
    switch (habit.intensity) {
      case 'light':
        return Colors.green;
      case 'moderate':
        return Colors.orange;
      case 'intense':
        return Colors.redAccent;
      default:
        return cs.primary;
    }
  }

  String _goalStageLabel() {
    switch (habit.goalStage) {
      case 'ignition':
        return 'Ignition';
      case 'foundation':
        return 'Foundation';
      case 'momentum':
        return 'Momentum';
      case 'formed':
        return 'Formed';
      default:
        return habit.goalStage;
    }
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final intensityCol = _intensityColor(cs);

    return Card(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          child: Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      habit.name,
                      style: Theme.of(context).textTheme.titleMedium,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        Icon(Icons.local_fire_department,
                            size: 16, color: intensityCol),
                        const SizedBox(width: 4),
                        Text(
                          '${habit.currentStreak} day streak',
                          style: Theme.of(context).textTheme.bodySmall,
                        ),
                        const SizedBox(width: 12),
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 8, vertical: 2),
                          decoration: BoxDecoration(
                            color: cs.secondaryContainer,
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(
                            _goalStageLabel(),
                            style: Theme.of(context)
                                .textTheme
                                .labelSmall
                                ?.copyWith(color: cs.onSecondaryContainer),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              IconButton.filled(
                onPressed: habit.todayCompleted ? null : onComplete,
                style: IconButton.styleFrom(
                  backgroundColor: habit.todayCompleted
                      ? Colors.green
                      : cs.surfaceContainerHighest,
                  foregroundColor:
                      habit.todayCompleted ? Colors.white : cs.onSurface,
                ),
                icon: Icon(
                  habit.todayCompleted
                      ? Icons.check_circle
                      : Icons.check_circle_outline,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

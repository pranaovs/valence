import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
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
                    Wrap(
                      spacing: 6,
                      runSpacing: 4,
                      children: [
                        // Streak badge
                        if (habit.currentStreak > 0)
                          _badge(
                            context,
                            icon: Icons.local_fire_department,
                            label: '${habit.currentStreak}d',
                            color: Colors.deepOrange,
                          ),
                        // Goal stage badge
                        _badge(
                          context,
                          label: _goalStageLabel(),
                          bgColor: cs.secondaryContainer,
                          textColor: cs.onSecondaryContainer,
                        ),
                        // Intensity badge
                        _badge(
                          context,
                          label: habit.intensity[0].toUpperCase() +
                              habit.intensity.substring(1),
                          color: intensityCol,
                        ),
                        // Plugin verification badge
                        if (habit.trackingMethod == 'plugin' &&
                            habit.pluginId != null)
                          _badge(
                            context,
                            icon: Icons.verified,
                            label: _pluginLabel(habit.pluginId!),
                            color: cs.tertiary,
                          ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 4),
              // Deep-link redirect button
              if (habit.redirectUrl != null &&
                  habit.redirectUrl!.isNotEmpty &&
                  !habit.todayCompleted)
                IconButton(
                  onPressed: () => _launchRedirect(habit.redirectUrl!),
                  icon: const Icon(Icons.open_in_new, size: 20),
                  tooltip: 'Open in app',
                  padding: EdgeInsets.zero,
                  constraints:
                      const BoxConstraints(minWidth: 36, minHeight: 36),
                ),
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

  Widget _badge(
    BuildContext context, {
    IconData? icon,
    required String label,
    Color? color,
    Color? bgColor,
    Color? textColor,
  }) {
    final effectiveColor = textColor ?? color;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: bgColor ?? color?.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[
            Icon(icon, size: 12, color: effectiveColor),
            const SizedBox(width: 3),
          ],
          Text(
            label,
            style: Theme.of(context)
                .textTheme
                .labelSmall
                ?.copyWith(color: effectiveColor),
          ),
        ],
      ),
    );
  }

  String _pluginLabel(String pluginId) {
    return switch (pluginId) {
      'leetcode' => 'LeetCode',
      'github' => 'GitHub',
      'wakapi' => 'Wakapi',
      'google_fit' => 'Google Fit',
      'duolingo' => 'Duolingo',
      'screen_time' => 'Screen Time',
      'strava' => 'Strava',
      'chess_com' => 'Chess.com',
      'todoist' => 'Todoist',
      _ => pluginId,
    };
  }

  Future<void> _launchRedirect(String url) async {
    final uri = Uri.tryParse(url);
    if (uri != null) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }
}

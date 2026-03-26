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

    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
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
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w500,
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 6),
                    Wrap(
                      spacing: 6,
                      runSpacing: 4,
                      children: [
                        if (habit.currentStreak > 0)
                          _badge(
                            context,
                            icon: Icons.local_fire_department,
                            label: '${habit.currentStreak}d',
                          ),
                        _badge(context, label: _goalStageLabel()),
                        _badge(
                          context,
                          label: habit.intensity.isNotEmpty
                              ? habit.intensity[0].toUpperCase() +
                                    habit.intensity.substring(1)
                              : '',
                        ),
                        if (habit.trackingMethod == 'plugin' &&
                            habit.pluginId != null)
                          _badge(
                            context,
                            icon: Icons.verified_outlined,
                            label: _pluginLabel(habit.pluginId!),
                          ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 4),
              if (habit.redirectUrl != null &&
                  habit.redirectUrl!.isNotEmpty &&
                  !habit.todayCompleted)
                IconButton(
                  onPressed: () => _launchRedirect(habit.redirectUrl!),
                  icon: Icon(
                    Icons.open_in_new,
                    size: 20,
                    color: cs.onSurfaceVariant,
                  ),
                  tooltip: 'Open in app',
                  padding: EdgeInsets.zero,
                  constraints: const BoxConstraints(
                    minWidth: 36,
                    minHeight: 36,
                  ),
                ),
              _CompletionButton(
                completed: habit.todayCompleted,
                onPressed: habit.todayCompleted ? null : onComplete,
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _badge(BuildContext context, {IconData? icon, required String label}) {
    final cs = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: cs.onSurface.withValues(alpha: 0.06),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[
            Icon(icon, size: 12, color: cs.onSurfaceVariant),
            const SizedBox(width: 3),
          ],
          Text(
            label,
            style: Theme.of(context).textTheme.labelSmall?.copyWith(
              color: cs.onSurfaceVariant,
              fontWeight: FontWeight.w500,
            ),
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

class _CompletionButton extends StatelessWidget {
  final bool completed;
  final VoidCallback? onPressed;

  const _CompletionButton({required this.completed, this.onPressed});

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return IconButton(
      onPressed: onPressed,
      style: IconButton.styleFrom(
        backgroundColor: completed
            ? cs.primary.withValues(alpha: 0.12)
            : cs.onSurface.withValues(alpha: 0.06),
      ),
      icon: Icon(
        completed ? Icons.check_rounded : Icons.circle_outlined,
        color: completed ? cs.primary : cs.onSurfaceVariant,
        size: 22,
      ),
    );
  }
}

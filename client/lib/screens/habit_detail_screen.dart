import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/habit.dart';
import '../models/habit_log.dart';
import '../providers/habit_provider.dart';
import '../widgets/frequency_bar_chart.dart';
import '../widgets/habit_heatmap.dart';
import '../widgets/habit_summary_tile.dart';
import '../widgets/miss_reason_dialog.dart';
import '../widgets/nudge_prompt_sheet.dart';
import '../widgets/streak_score_chart.dart';
import 'habit_edit_screen.dart';

class HabitDetailScreen extends StatefulWidget {
  final Habit habit;

  const HabitDetailScreen({super.key, required this.habit});

  @override
  State<HabitDetailScreen> createState() => _HabitDetailScreenState();
}

class _HabitDetailScreenState extends State<HabitDetailScreen> {
  List<HabitLog> _logs = [];
  bool _logsLoading = true;
  late Habit _habit;

  @override
  void initState() {
    super.initState();
    _habit = widget.habit;
    _loadLogs();
  }

  Future<void> _loadLogs() async {
    setState(() => _logsLoading = true);
    final provider = context.read<HabitProvider>();
    final logs = await provider.getHabitLogs(_habit.id);
    if (mounted) {
      setState(() {
        _logs = logs;
        _logsLoading = false;
      });
    }
  }

  Future<void> _refreshHabit() async {
    final provider = context.read<HabitProvider>();
    await provider.loadHabits();
    final updated = provider.habits.where((h) => h.id == _habit.id).firstOrNull;
    if (updated != null && mounted) {
      setState(() => _habit = updated);
    }
    await _loadLogs();
  }

  Future<void> _complete() async {
    final provider = context.read<HabitProvider>();
    final result = await provider.completeHabit(_habit.id);
    if (result != null && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            '+${result.xpEarned} XP, +${result.sparksEarned} Sparks',
          ),
        ),
      );
      if (result.perfectDay) {
        Future.delayed(const Duration(milliseconds: 500), () {
          if (mounted) showNudgePrompt(context);
        });
      }
    }
    await _refreshHabit();
  }

  Future<void> _miss() async {
    final result = await showDialog<Map<String, String?>>(
      context: context,
      builder: (_) => const MissReasonDialog(),
    );
    if (result == null || !mounted) return;

    final provider = context.read<HabitProvider>();
    final missResult = await provider.missHabit(
      _habit.id,
      result['category']!,
      reasonText: result['text'],
    );
    if (missResult != null && mounted) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(missResult.supportiveMessage)));
    }
    await _refreshHabit();
  }

  Future<void> _edit() async {
    final edited = await Navigator.of(context).push<bool>(
      MaterialPageRoute(
        builder: (_) => HabitEditScreen(habit: _habit),
        fullscreenDialog: true,
      ),
    );
    if (edited == true) {
      await _refreshHabit();
    }
  }

  Future<void> _archive() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Archive habit?'),
        content: const Text(
          'This will remove the habit from your active list. '
          'Your history and streaks are preserved.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            child: const Text('Archive'),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;

    final provider = context.read<HabitProvider>();
    final success = await provider.archiveHabit(_habit.id);
    if (success && mounted) {
      Navigator.of(context).pop();
    }
  }

  Future<void> _delete() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        icon: Icon(
          Icons.delete_forever,
          color: Theme.of(ctx).colorScheme.error,
        ),
        title: const Text('Delete habit?'),
        content: const Text(
          'This will permanently delete this habit and all its history, '
          'streaks, and logs. This action cannot be undone.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            style: FilledButton.styleFrom(
              backgroundColor: Theme.of(ctx).colorScheme.error,
            ),
            onPressed: () => Navigator.of(ctx).pop(true),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;

    final provider = context.read<HabitProvider>();
    final success = await provider.deleteHabit(_habit.id);
    if (success && mounted) {
      Navigator.of(context).pop();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: RefreshIndicator(
        onRefresh: _refreshHabit,
        child: CustomScrollView(
          slivers: [
            SliverAppBar.large(
              title: Text(_habit.name),
              actions: [
                PopupMenuButton<String>(
                  onSelected: (value) {
                    switch (value) {
                      case 'edit':
                        _edit();
                      case 'archive':
                        _archive();
                      case 'delete':
                        _delete();
                    }
                  },
                  itemBuilder: (ctx) => [
                    const PopupMenuItem(value: 'edit', child: Text('Edit')),
                    const PopupMenuItem(
                      value: 'archive',
                      child: Text('Archive'),
                    ),
                    PopupMenuItem(
                      value: 'delete',
                      child: Text(
                        'Delete',
                        style: TextStyle(
                          color: Theme.of(ctx).colorScheme.error,
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
            SliverToBoxAdapter(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  HabitSummaryTile(habit: _habit),
                  const SizedBox(height: 8),
                  // Action buttons
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    child: Row(
                      children: [
                        Expanded(
                          child: FilledButton.icon(
                            onPressed: _habit.todayCompleted ? null : _complete,
                            icon: const Icon(Icons.check),
                            label: Text(
                              _habit.todayCompleted ? 'Completed' : 'Complete',
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: OutlinedButton.icon(
                            onPressed: _miss,
                            icon: const Icon(Icons.close),
                            label: const Text('Log Miss'),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),
                  // Charts
                  _sectionTitle(context, 'Completion History'),
                  _logsLoading
                      ? const SizedBox(
                          height: 200,
                          child: Center(child: CircularProgressIndicator()),
                        )
                      : Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 16),
                          child: StreakScoreChart(logs: _logs),
                        ),
                  const SizedBox(height: 24),
                  _sectionTitle(context, 'Weekly Frequency'),
                  _logsLoading
                      ? const SizedBox(
                          height: 200,
                          child: Center(child: CircularProgressIndicator()),
                        )
                      : Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 16),
                          child: FrequencyBarChart(logs: _logs),
                        ),
                  const SizedBox(height: 24),
                  _sectionTitle(context, 'Heatmap'),
                  _logsLoading
                      ? const SizedBox(
                          height: 114,
                          child: Center(child: CircularProgressIndicator()),
                        )
                      : Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 16),
                          child: HabitHeatmapWidget(logs: _logs, habit: _habit),
                        ),
                  const SizedBox(height: 32),
                  // Info section
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    child: Card(
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            _infoRow(
                              'Intensity',
                              _habit.intensity.isNotEmpty
                                  ? _habit.intensity[0].toUpperCase() +
                                        _habit.intensity.substring(1)
                                  : 'Unknown',
                            ),
                            _infoRow('Tracking', _habit.trackingMethod),
                            if (_habit.pluginId != null)
                              _infoRow('Plugin', _habit.pluginId!),
                            _infoRow('Visibility', _habit.visibility),
                            _infoRow(
                              'Created',
                              _habit.createdAt
                                  .toLocal()
                                  .toString()
                                  .split('.')
                                  .first,
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 80),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _sectionTitle(BuildContext context, String title) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      child: Text(title, style: Theme.of(context).textTheme.titleSmall),
    );
  }

  Widget _infoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(fontWeight: FontWeight.w500)),
          Text(value),
        ],
      ),
    );
  }
}

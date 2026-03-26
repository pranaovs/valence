import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../main.dart';
import '../models/habit.dart';
import '../providers/habit_provider.dart';
import '../providers/insights_provider.dart';

class InsightsScreen extends StatefulWidget {
  const InsightsScreen({super.key});

  @override
  State<InsightsScreen> createState() => _InsightsScreenState();
}

class _InsightsScreenState extends State<InsightsScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<InsightsProvider>().loadInsights();
    });
  }

  void _showRawResponse(InsightsProvider provider) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('API Response (${provider.rawErrorStatusCode ?? '?'})'),
        content: SizedBox(
          width: double.maxFinite,
          height: 400,
          child: SingleChildScrollView(
            child: SelectableText(
              provider.rawErrorBody ?? 'No response body',
              style: const TextStyle(fontFamily: 'monospace', fontSize: 12),
            ),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('Close'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<InsightsProvider>();

    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.menu),
          onPressed: () => MainShell.scaffoldKey.currentState?.openDrawer(),
        ),
        title: const Text('Insights'),
        actions: [
          IconButton(
            icon: const Icon(Icons.edit_note),
            tooltip: 'Daily Reflection',
            onPressed: () => _showReflectionSheet(context),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () => provider.loadInsights(),
        child: _buildBody(provider),
      ),
    );
  }

  Widget _buildBody(InsightsProvider provider) {
    if (provider.isLoading && provider.insights == null) {
      return const Center(child: CircularProgressIndicator());
    }

    if (provider.errorMessage != null && provider.insights == null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                Icons.error_outline,
                size: 48,
                color: Theme.of(context).colorScheme.error,
              ),
              const SizedBox(height: 16),
              Text(provider.errorMessage!, textAlign: TextAlign.center),
              const SizedBox(height: 16),
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  FilledButton(
                    onPressed: () => provider.loadInsights(),
                    child: const Text('Retry'),
                  ),
                  if (provider.rawErrorBody != null) ...[
                    const SizedBox(width: 12),
                    OutlinedButton(
                      onPressed: () => _showRawResponse(provider),
                      child: const Text('Show Response'),
                    ),
                  ],
                ],
              ),
            ],
          ),
        ),
      );
    }

    final insights = provider.insights;
    if (insights == null) {
      return ListView(
        children: [
          SizedBox(height: MediaQuery.of(context).size.height * 0.25),
          const Icon(Icons.insights, size: 64, color: Colors.grey),
          const SizedBox(height: 16),
          const Text(
            'No insights yet.\nKeep tracking your habits to get personalized analysis.',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 16, color: Colors.grey),
          ),
        ],
      );
    }

    return ListView(
      padding: const EdgeInsets.only(bottom: 24),
      children: [
        _buildAnalysisCard(insights.insights),
        if (insights.byReason.isNotEmpty)
          _buildPatternCard(
            title: 'Misses by Reason',
            data: insights.byReason,
            labelFn: _reasonLabel,
          ),
        if (insights.byDay.isNotEmpty)
          _buildPatternCard(
            title: 'Misses by Day',
            data: insights.byDay,
            labelFn: (k) => k,
          ),
      ],
    );
  }

  Widget _buildAnalysisCard(String analysis) {
    final cs = Theme.of(context).colorScheme;
    return Card(
      margin: const EdgeInsets.all(16),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Analysis',
              style: Theme.of(context).textTheme.titleSmall?.copyWith(
                fontWeight: FontWeight.w600,
                color: cs.onSurface,
              ),
            ),
            const SizedBox(height: 10),
            Text(
              analysis,
              style: Theme.of(
                context,
              ).textTheme.bodyMedium?.copyWith(color: cs.onSurfaceVariant),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPatternCard({
    required String title,
    required Map<String, int> data,
    required String Function(String) labelFn,
  }) {
    final cs = Theme.of(context).colorScheme;
    final sorted = data.entries.toList()
      ..sort((a, b) => b.value.compareTo(a.value));
    final maxVal = sorted.isNotEmpty ? sorted.first.value : 1;

    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              title,
              style: Theme.of(context).textTheme.titleSmall?.copyWith(
                fontWeight: FontWeight.w600,
                color: cs.onSurface,
              ),
            ),
            const SizedBox(height: 12),
            ...sorted.map(
              (entry) => Padding(
                padding: const EdgeInsets.symmetric(vertical: 4),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          labelFn(entry.key),
                          style: Theme.of(context).textTheme.bodySmall
                              ?.copyWith(color: cs.onSurfaceVariant),
                        ),
                        Text(
                          '${entry.value}',
                          style: Theme.of(context).textTheme.bodySmall
                              ?.copyWith(
                                fontWeight: FontWeight.w600,
                                color: cs.onSurface,
                              ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    ClipRRect(
                      borderRadius: BorderRadius.circular(3),
                      child: LinearProgressIndicator(
                        value: entry.value / maxVal,
                        backgroundColor: cs.onSurface.withValues(alpha: 0.08),
                        color: cs.primary,
                        minHeight: 6,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _reasonLabel(String reason) {
    switch (reason) {
      case 'no_energy':
        return 'No Energy';
      case 'busy':
        return 'Busy';
      case 'forgot':
        return 'Forgot';
      case 'sick':
        return 'Sick';
      case 'other':
        return 'Other';
      default:
        return reason.isNotEmpty
            ? reason[0].toUpperCase() + reason.substring(1)
            : reason;
    }
  }

  void _showReflectionSheet(BuildContext context) {
    final habits = context.read<HabitProvider>().habits;
    if (habits.isEmpty) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('No habits to reflect on.')));
      return;
    }

    final completedToday = habits.where((h) => h.todayCompleted).toList();
    if (completedToday.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Complete some habits first to reflect on them.'),
        ),
      );
      return;
    }

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (ctx) => _ReflectionSheet(habits: completedToday),
    );
  }
}

class _ReflectionSheet extends StatefulWidget {
  final List<Habit> habits;

  const _ReflectionSheet({required this.habits});

  @override
  State<_ReflectionSheet> createState() => _ReflectionSheetState();
}

class _ReflectionSheetState extends State<_ReflectionSheet> {
  final Map<String, int> _ratings = {};
  final Map<String, TextEditingController> _textControllers = {};
  bool _isSubmitting = false;

  @override
  void initState() {
    super.initState();
    for (final habit in widget.habits) {
      _ratings[habit.id] = 3;
      _textControllers[habit.id] = TextEditingController();
    }
  }

  @override
  void dispose() {
    for (final c in _textControllers.values) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() => _isSubmitting = true);

    final reflections = widget.habits.map((habit) {
      final text = _textControllers[habit.id]?.text.trim() ?? '';
      return <String, dynamic>{
        'habit_id': habit.id,
        'difficulty': _ratings[habit.id] ?? 3,
        if (text.isNotEmpty) 'text': text,
      };
    }).toList();

    final success = await context.read<InsightsProvider>().submitReflections(
      reflections,
    );

    if (!mounted) return;
    setState(() => _isSubmitting = false);

    if (success) {
      Navigator.of(context).pop();
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Reflections saved!')));
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            context.read<InsightsProvider>().errorMessage ??
                'Failed to save reflections.',
          ),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return DraggableScrollableSheet(
      initialChildSize: 0.7,
      minChildSize: 0.4,
      maxChildSize: 0.9,
      expand: false,
      builder: (ctx, scrollController) => Column(
        children: [
          // Handle + header
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
            child: Column(
              children: [
                Center(
                  child: Container(
                    width: 40,
                    height: 4,
                    decoration: BoxDecoration(
                      color: Colors.grey[300],
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Text(
                      'Daily Reflection',
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const Spacer(),
                    FilledButton(
                      onPressed: _isSubmitting ? null : _submit,
                      child: _isSubmitting
                          ? const SizedBox(
                              width: 16,
                              height: 16,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : const Text('Save'),
                    ),
                  ],
                ),
                const Divider(),
              ],
            ),
          ),
          // Habit list
          Expanded(
            child: ListView.builder(
              controller: scrollController,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              itemCount: widget.habits.length,
              itemBuilder: (context, index) {
                final habit = widget.habits[index];
                final rating = _ratings[habit.id] ?? 3;
                return Card(
                  margin: const EdgeInsets.symmetric(vertical: 4),
                  child: Padding(
                    padding: const EdgeInsets.all(12),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          habit.name,
                          style: Theme.of(context).textTheme.titleSmall
                              ?.copyWith(fontWeight: FontWeight.bold),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'How difficult was it today?',
                          style: Theme.of(context).textTheme.bodySmall,
                        ),
                        const SizedBox(height: 4),
                        Row(
                          children: List.generate(5, (i) {
                            final level = i + 1;
                            return Expanded(
                              child: GestureDetector(
                                onTap: () =>
                                    setState(() => _ratings[habit.id] = level),
                                child: Container(
                                  margin: const EdgeInsets.symmetric(
                                    horizontal: 2,
                                  ),
                                  padding: const EdgeInsets.symmetric(
                                    vertical: 8,
                                  ),
                                  decoration: BoxDecoration(
                                    color: level <= rating
                                        ? _difficultyColor(
                                            rating,
                                          ).withValues(alpha: 0.2)
                                        : Theme.of(
                                            context,
                                          ).colorScheme.surfaceContainerHighest,
                                    borderRadius: BorderRadius.circular(8),
                                    border: level == rating
                                        ? Border.all(
                                            color: _difficultyColor(rating),
                                            width: 2,
                                          )
                                        : null,
                                  ),
                                  child: Center(
                                    child: Text(
                                      '$level',
                                      style: TextStyle(
                                        fontWeight: level == rating
                                            ? FontWeight.bold
                                            : FontWeight.normal,
                                        color: level <= rating
                                            ? _difficultyColor(rating)
                                            : null,
                                      ),
                                    ),
                                  ),
                                ),
                              ),
                            );
                          }),
                        ),
                        const SizedBox(height: 4),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              'Easy',
                              style: Theme.of(context).textTheme.labelSmall
                                  ?.copyWith(
                                    color: Theme.of(
                                      context,
                                    ).colorScheme.onSurfaceVariant,
                                  ),
                            ),
                            Text(
                              'Hard',
                              style: Theme.of(context).textTheme.labelSmall
                                  ?.copyWith(
                                    color: Theme.of(
                                      context,
                                    ).colorScheme.onSurfaceVariant,
                                  ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        TextField(
                          controller: _textControllers[habit.id],
                          decoration: const InputDecoration(
                            hintText: 'How did it feel? (optional)',
                            border: OutlineInputBorder(),
                            isDense: true,
                          ),
                          maxLines: 2,
                          textCapitalization: TextCapitalization.sentences,
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Color _difficultyColor(int rating) {
    final cs = Theme.of(context).colorScheme;
    // Use primary color with increasing opacity for difficulty levels
    final opacity = 0.3 + (rating - 1) * 0.175;
    return cs.primary.withValues(alpha: opacity.clamp(0.0, 1.0));
  }
}

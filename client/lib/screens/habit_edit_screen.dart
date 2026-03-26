import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../config/plugin_registry.dart';
import '../models/habit.dart';
import '../models/plugin_goal.dart';
import '../models/plugin_metric.dart';
import '../providers/habit_provider.dart';
import '../providers/plugin_provider.dart';

class HabitEditScreen extends StatefulWidget {
  final Habit? habit;

  const HabitEditScreen({super.key, this.habit});

  @override
  State<HabitEditScreen> createState() => _HabitEditScreenState();
}

class _HabitEditScreenState extends State<HabitEditScreen> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _nameController;
  late final TextEditingController _redirectUrlController;
  late final TextEditingController _goalValueController;
  late String _intensity;
  late String _trackingMethod;
  late String _visibility;
  bool _isSaving = false;

  // Plugin goal state
  String? _selectedPluginId;
  List<PluginMetric> _availableMetrics = [];
  bool _loadingMetrics = false;
  String? _selectedMetric;
  String _selectedOperator = 'gte';

  bool get _isEditing => widget.habit != null;

  @override
  void initState() {
    super.initState();
    _nameController = TextEditingController(text: widget.habit?.name ?? '');
    _redirectUrlController =
        TextEditingController(text: widget.habit?.redirectUrl ?? '');
    _goalValueController = TextEditingController(
      text: widget.habit?.pluginGoal?.value.toString() ?? '',
    );
    _intensity = widget.habit?.intensity ?? 'moderate';
    _trackingMethod = widget.habit?.trackingMethod ?? 'manual';
    _visibility = widget.habit?.visibility ?? 'full';
    _selectedPluginId = widget.habit?.pluginId;
    _selectedMetric = widget.habit?.pluginGoal?.metric;
    _selectedOperator = widget.habit?.pluginGoal?.operator ?? 'gte';

    if (_selectedPluginId != null && _trackingMethod == 'plugin') {
      _fetchMetrics(_selectedPluginId!);
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    _redirectUrlController.dispose();
    _goalValueController.dispose();
    super.dispose();
  }

  Future<void> _fetchMetrics(String pluginId) async {
    setState(() => _loadingMetrics = true);
    final metrics =
        await context.read<PluginProvider>().getPluginMetrics(pluginId);
    if (mounted) {
      setState(() {
        _availableMetrics = metrics;
        _loadingMetrics = false;
        // Keep existing metric selection if still valid
        if (_selectedMetric != null &&
            !metrics.any((m) => m.metric == _selectedMetric)) {
          _selectedMetric = metrics.isNotEmpty ? metrics.first.metric : null;
        } else if (_selectedMetric == null && metrics.isNotEmpty) {
          _selectedMetric = metrics.first.metric;
        }
      });
    }
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _isSaving = true);

    final provider = context.read<HabitProvider>();
    final isPlugin = _trackingMethod == 'plugin';

    PluginGoal? pluginGoal;
    if (isPlugin &&
        _selectedMetric != null &&
        _goalValueController.text.trim().isNotEmpty) {
      pluginGoal = PluginGoal(
        metric: _selectedMetric!,
        operator: _selectedOperator,
        value: num.parse(_goalValueController.text.trim()),
      );
    }

    bool success;
    if (_isEditing) {
      success = await provider.updateHabit(
        habitId: widget.habit!.id,
        name: _nameController.text.trim(),
        intensity: _intensity,
        trackingMethod: _trackingMethod,
        pluginId: isPlugin ? _selectedPluginId : null,
        pluginGoal: pluginGoal,
        redirectUrl:
            isPlugin ? _redirectUrlController.text.trim() : null,
        visibility: _visibility,
      );
    } else {
      success = await provider.createHabit(
        name: _nameController.text.trim(),
        intensity: _intensity,
        trackingMethod: _trackingMethod,
        pluginId: isPlugin ? _selectedPluginId : null,
        pluginGoal: pluginGoal,
        redirectUrl:
            isPlugin ? _redirectUrlController.text.trim() : null,
        visibility: _visibility,
      );
    }

    if (!mounted) return;
    setState(() => _isSaving = false);

    if (success) {
      Navigator.of(context).pop(true);
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
            content: Text(provider.errorMessage ?? 'Something went wrong.')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(_isEditing ? 'Edit Habit' : 'New Habit'),
        actions: [
          TextButton(
            onPressed: _isSaving ? null : _save,
            child: _isSaving
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2))
                : const Text('Save'),
          ),
        ],
      ),
      body: Form(
        key: _formKey,
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              TextFormField(
                controller: _nameController,
                decoration: const InputDecoration(
                  labelText: 'Habit Name',
                  hintText: 'e.g., Solve 1 LeetCode problem',
                  border: OutlineInputBorder(),
                ),
                maxLength: 200,
                validator: (v) => (v == null || v.trim().isEmpty)
                    ? 'Name is required'
                    : null,
              ),
              const SizedBox(height: 24),
              Text('Intensity',
                  style: Theme.of(context).textTheme.titleSmall),
              const SizedBox(height: 8),
              SegmentedButton<String>(
                segments: const [
                  ButtonSegment(value: 'light', label: Text('Light')),
                  ButtonSegment(value: 'moderate', label: Text('Moderate')),
                  ButtonSegment(value: 'intense', label: Text('Intense')),
                ],
                selected: {_intensity},
                onSelectionChanged: (v) =>
                    setState(() => _intensity = v.first),
              ),
              const SizedBox(height: 24),
              Text('Tracking Method',
                  style: Theme.of(context).textTheme.titleSmall),
              const SizedBox(height: 8),
              SegmentedButton<String>(
                segments: const [
                  ButtonSegment(value: 'manual', label: Text('Manual')),
                  ButtonSegment(value: 'plugin', label: Text('Plugin')),
                ],
                selected: {_trackingMethod},
                onSelectionChanged: (v) {
                  setState(() {
                    _trackingMethod = v.first;
                    if (v.first != 'plugin') {
                      _selectedPluginId = null;
                      _availableMetrics = [];
                      _selectedMetric = null;
                    }
                  });
                },
              ),
              if (_trackingMethod == 'plugin') ...[
                const SizedBox(height: 16),
                _buildPluginSelector(),
                if (_selectedPluginId != null) ...[
                  const SizedBox(height: 16),
                  _buildGoalSection(),
                  const SizedBox(height: 16),
                  TextFormField(
                    controller: _redirectUrlController,
                    decoration: const InputDecoration(
                      labelText: 'Redirect URL (optional)',
                      hintText: 'https://leetcode.com/problemset/',
                      border: OutlineInputBorder(),
                    ),
                    keyboardType: TextInputType.url,
                  ),
                ],
              ],
              const SizedBox(height: 24),
              Text('Visibility',
                  style: Theme.of(context).textTheme.titleSmall),
              const SizedBox(height: 8),
              SegmentedButton<String>(
                segments: const [
                  ButtonSegment(value: 'full', label: Text('Full')),
                  ButtonSegment(value: 'minimal', label: Text('Minimal')),
                ],
                selected: {_visibility},
                onSelectionChanged: (v) =>
                    setState(() => _visibility = v.first),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildPluginSelector() {
    // Get connected plugins + all available plugin IDs
    final connectedPlugins = context.watch<PluginProvider>().connectedPlugins;
    final allPlugins = PluginRegistry.plugins;

    // Build dropdown items from connected plugins + registry
    final items = <DropdownMenuItem<String>>[];
    final addedIds = <String>{};

    for (final p in connectedPlugins) {
      final meta = PluginRegistry.getMeta(p.id);
      items.add(DropdownMenuItem(
        value: p.id,
        child: Row(
          children: [
            if (meta != null) ...[
              Icon(meta.icon, size: 18, color: Theme.of(context).colorScheme.onSurfaceVariant),
              const SizedBox(width: 8),
            ],
            Text(meta?.displayName ?? p.id),
            const SizedBox(width: 8),
            Icon(Icons.check_rounded, size: 14, color: Theme.of(context).colorScheme.primary),
          ],
        ),
      ));
      addedIds.add(p.id);
    }

    for (final meta in allPlugins) {
      if (!addedIds.contains(meta.id)) {
        items.add(DropdownMenuItem(
          value: meta.id,
          child: Row(
            children: [
              Icon(meta.icon, size: 18, color: Theme.of(context).colorScheme.onSurfaceVariant),
              const SizedBox(width: 8),
              Text(meta.displayName),
            ],
          ),
        ));
      }
    }

    return DropdownButtonFormField<String>(
      initialValue: _selectedPluginId,
      decoration: const InputDecoration(
        labelText: 'Plugin',
        border: OutlineInputBorder(),
      ),
      items: items,
      onChanged: (value) {
        setState(() {
          _selectedPluginId = value;
          _availableMetrics = [];
          _selectedMetric = null;
          _goalValueController.clear();
        });
        if (value != null) _fetchMetrics(value);
      },
      validator: (v) =>
          _trackingMethod == 'plugin' && (v == null || v.isEmpty)
              ? 'Select a plugin'
              : null,
    );
  }

  Widget _buildGoalSection() {
    final cs = Theme.of(context).colorScheme;

    if (_loadingMetrics) {
      return const Padding(
        padding: EdgeInsets.symmetric(vertical: 16),
        child: Center(child: CircularProgressIndicator()),
      );
    }

    if (_availableMetrics.isEmpty) {
      return Card(
        color: cs.surfaceContainerHighest.withValues(alpha: 0.5),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              Icon(Icons.info_outline, color: cs.onSurfaceVariant, size: 20),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  'No metrics available for this plugin. '
                  'The habit will be tracked by the backend poller.',
                  style: Theme.of(context).textTheme.bodySmall,
                ),
              ),
            ],
          ),
        ),
      );
    }

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Auto-complete Goal',
                style: Theme.of(context)
                    .textTheme
                    .titleSmall
                    ?.copyWith(fontWeight: FontWeight.bold)),
            const SizedBox(height: 4),
            Text(
              'The habit will auto-complete when this goal is met.',
              style: Theme.of(context).textTheme.bodySmall,
            ),
            const SizedBox(height: 12),
            // Metric picker
            DropdownButtonFormField<String>(
              initialValue: _selectedMetric,
              decoration: const InputDecoration(
                labelText: 'Metric',
                border: OutlineInputBorder(),
                isDense: true,
              ),
              items: _availableMetrics
                  .map((m) => DropdownMenuItem(
                        value: m.metric,
                        child: Text('${m.label} (${m.unit})'),
                      ))
                  .toList(),
              onChanged: (v) => setState(() => _selectedMetric = v),
            ),
            const SizedBox(height: 12),
            // Operator + value row
            Row(
              children: [
                SizedBox(
                  width: 140,
                  child: DropdownButtonFormField<String>(
                    initialValue: _selectedOperator,
                    decoration: const InputDecoration(
                      labelText: 'Condition',
                      border: OutlineInputBorder(),
                      isDense: true,
                    ),
                    items: const [
                      DropdownMenuItem(
                          value: 'gte', child: Text('At least (≥)')),
                      DropdownMenuItem(
                          value: 'lte', child: Text('At most (≤)')),
                      DropdownMenuItem(
                          value: 'eq', child: Text('Exactly (=)')),
                    ],
                    onChanged: (v) {
                      if (v != null) setState(() => _selectedOperator = v);
                    },
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: TextFormField(
                    controller: _goalValueController,
                    decoration: InputDecoration(
                      labelText: 'Value',
                      border: const OutlineInputBorder(),
                      isDense: true,
                      hintText: _selectedMetric != null
                          ? _availableMetrics
                              .where((m) => m.metric == _selectedMetric)
                              .firstOrNull
                              ?.example
                              ?.toString()
                          : null,
                    ),
                    keyboardType: TextInputType.number,
                    validator: (v) {
                      if (_trackingMethod == 'plugin' &&
                          _selectedMetric != null &&
                          (v == null || v.trim().isEmpty)) {
                        return 'Required';
                      }
                      if (v != null &&
                          v.trim().isNotEmpty &&
                          num.tryParse(v.trim()) == null) {
                        return 'Enter a number';
                      }
                      return null;
                    },
                  ),
                ),
              ],
            ),
            // Show example text
            if (_selectedMetric != null && _goalValueController.text.isNotEmpty)
              Padding(
                padding: const EdgeInsets.only(top: 8),
                child: Text(
                  _goalSummary(),
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: cs.primary,
                        fontStyle: FontStyle.italic,
                      ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  String _goalSummary() {
    final metric = _availableMetrics
        .where((m) => m.metric == _selectedMetric)
        .firstOrNull;
    if (metric == null) return '';
    final opLabel = switch (_selectedOperator) {
      'gte' => '≥',
      'lte' => '≤',
      'eq' => '=',
      _ => _selectedOperator,
    };
    return 'Auto-complete when ${metric.label} $opLabel ${_goalValueController.text} ${metric.unit}';
  }
}

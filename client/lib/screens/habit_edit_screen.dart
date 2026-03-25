import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/habit.dart';
import '../providers/habit_provider.dart';

class HabitEditScreen extends StatefulWidget {
  final Habit? habit;

  const HabitEditScreen({super.key, this.habit});

  @override
  State<HabitEditScreen> createState() => _HabitEditScreenState();
}

class _HabitEditScreenState extends State<HabitEditScreen> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _nameController;
  late final TextEditingController _pluginIdController;
  late final TextEditingController _redirectUrlController;
  late String _intensity;
  late String _trackingMethod;
  late String _visibility;
  bool _isSaving = false;

  bool get _isEditing => widget.habit != null;

  @override
  void initState() {
    super.initState();
    _nameController = TextEditingController(text: widget.habit?.name ?? '');
    _pluginIdController =
        TextEditingController(text: widget.habit?.pluginId ?? '');
    _redirectUrlController =
        TextEditingController(text: widget.habit?.redirectUrl ?? '');
    _intensity = widget.habit?.intensity ?? 'moderate';
    _trackingMethod = widget.habit?.trackingMethod ?? 'manual';
    _visibility = widget.habit?.visibility ?? 'full';
  }

  @override
  void dispose() {
    _nameController.dispose();
    _pluginIdController.dispose();
    _redirectUrlController.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _isSaving = true);

    final provider = context.read<HabitProvider>();
    bool success;

    if (_isEditing) {
      success = await provider.updateHabit(
        habitId: widget.habit!.id,
        name: _nameController.text.trim(),
        intensity: _intensity,
        trackingMethod: _trackingMethod,
        pluginId: _trackingMethod == 'plugin' ? _pluginIdController.text.trim() : null,
        redirectUrl: _trackingMethod == 'plugin' ? _redirectUrlController.text.trim() : null,
        visibility: _visibility,
      );
    } else {
      success = await provider.createHabit(
        name: _nameController.text.trim(),
        intensity: _intensity,
        trackingMethod: _trackingMethod,
        pluginId: _trackingMethod == 'plugin' ? _pluginIdController.text.trim() : null,
        redirectUrl: _trackingMethod == 'plugin' ? _redirectUrlController.text.trim() : null,
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
                    width: 20, height: 20,
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
                  ButtonSegment(value: 'photo', label: Text('Photo')),
                ],
                selected: {_trackingMethod},
                onSelectionChanged: (v) =>
                    setState(() => _trackingMethod = v.first),
              ),
              if (_trackingMethod == 'plugin') ...[
                const SizedBox(height: 16),
                TextFormField(
                  controller: _pluginIdController,
                  decoration: const InputDecoration(
                    labelText: 'Plugin ID',
                    hintText: 'e.g., leetcode, github, duolingo',
                    border: OutlineInputBorder(),
                  ),
                ),
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
              const SizedBox(height: 24),
              Text('Visibility',
                  style: Theme.of(context).textTheme.titleSmall),
              const SizedBox(height: 8),
              SegmentedButton<String>(
                segments: const [
                  ButtonSegment(value: 'full', label: Text('Full')),
                  ButtonSegment(value: 'minimal', label: Text('Minimal')),
                  ButtonSegment(value: 'private', label: Text('Private')),
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
}

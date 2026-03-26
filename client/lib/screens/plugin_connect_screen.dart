import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../config/plugin_registry.dart';
import '../models/plugin.dart';
import '../providers/plugin_provider.dart';

class PluginConnectScreen extends StatefulWidget {
  final PluginMeta meta;
  final Plugin? currentPlugin;

  const PluginConnectScreen({
    super.key,
    required this.meta,
    this.currentPlugin,
  });

  @override
  State<PluginConnectScreen> createState() => _PluginConnectScreenState();
}

class _PluginConnectScreenState extends State<PluginConnectScreen> {
  final _formKey = GlobalKey<FormState>();
  late final Map<String, TextEditingController> _controllers;
  bool _isSaving = false;

  @override
  void initState() {
    super.initState();
    _controllers = {
      for (final field in widget.meta.fields)
        field.key: TextEditingController(),
    };
  }

  @override
  void dispose() {
    for (final c in _controllers.values) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _connect() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isSaving = true);

    final credentials = <String, String>{
      for (final entry in _controllers.entries)
        entry.key: entry.value.text.trim(),
    };

    final provider = context.read<PluginProvider>();
    final success = await provider.connectPlugin(
      pluginId: widget.meta.id,
      credentials: credentials,
    );

    if (!mounted) return;
    setState(() => _isSaving = false);

    if (success) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('${widget.meta.displayName} connected successfully!'),
        ),
      );
      Navigator.of(context).pop(true);
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
              provider.errorMessage ?? 'Failed to connect plugin.'),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final isConnected = widget.currentPlugin?.connected ?? false;
    final cs = Theme.of(context).colorScheme;

    return Scaffold(
      appBar: AppBar(
        title: Text(widget.meta.displayName),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Plugin info card
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  CircleAvatar(
                    radius: 24,
                    backgroundColor:
                        widget.meta.color.withValues(alpha: 0.15),
                    child: Icon(widget.meta.icon,
                        color: widget.meta.color, size: 28),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(widget.meta.displayName,
                            style: Theme.of(context).textTheme.titleMedium),
                        const SizedBox(height: 4),
                        Text(widget.meta.description,
                            style: Theme.of(context).textTheme.bodySmall),
                      ],
                    ),
                  ),
                  if (isConnected)
                    Chip(
                      avatar: const Icon(Icons.check_circle,
                          size: 16, color: Colors.green),
                      label: const Text('Connected'),
                      visualDensity: VisualDensity.compact,
                    ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),

          // Status info for connected plugins
          if (isConnected && widget.currentPlugin != null) ...[
            Card(
              color: cs.primaryContainer.withValues(alpha: 0.3),
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Status',
                        style: Theme.of(context)
                            .textTheme
                            .titleSmall
                            ?.copyWith(fontWeight: FontWeight.bold)),
                    const SizedBox(height: 8),
                    _statusRow('Status', widget.currentPlugin!.status),
                    if (widget.currentPlugin!.lastSyncedAt != null)
                      _statusRow('Last Synced',
                          _formatTime(widget.currentPlugin!.lastSyncedAt!)),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),
          ],

          // OAuth info
          if (widget.meta.isOAuth) ...[
            Card(
              color: cs.tertiaryContainer.withValues(alpha: 0.3),
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Row(
                  children: [
                    Icon(Icons.info_outline, color: cs.tertiary),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        'This plugin uses OAuth authentication. '
                        'You\'ll be redirected to ${widget.meta.displayName} to authorize access.',
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: FilledButton.icon(
                onPressed: _isSaving ? null : _connect,
                icon: _isSaving
                    ? const SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Icon(Icons.open_in_new),
                label: Text(isConnected
                    ? 'Reconnect with ${widget.meta.displayName}'
                    : 'Connect with ${widget.meta.displayName}'),
              ),
            ),
          ],

          // Credential fields for non-OAuth plugins
          if (!widget.meta.isOAuth && widget.meta.fields.isNotEmpty) ...[
            Text(
              isConnected
                  ? 'Update credentials'
                  : 'Enter your credentials to connect',
              style: Theme.of(context).textTheme.titleSmall,
            ),
            const SizedBox(height: 12),
            Form(
              key: _formKey,
              child: Column(
                children: [
                  for (final field in widget.meta.fields) ...[
                    TextFormField(
                      controller: _controllers[field.key],
                      decoration: InputDecoration(
                        labelText: field.label,
                        hintText: field.hint,
                        border: const OutlineInputBorder(),
                      ),
                      obscureText: field.obscure,
                      validator: (v) {
                        if (v == null || v.trim().isEmpty) {
                          return '${field.label} is required';
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: 12),
                  ],
                  const SizedBox(height: 8),
                  SizedBox(
                    width: double.infinity,
                    child: FilledButton(
                      onPressed: _isSaving ? null : _connect,
                      child: _isSaving
                          ? const SizedBox(
                              width: 16,
                              height: 16,
                              child: CircularProgressIndicator(
                                  strokeWidth: 2, color: Colors.white),
                            )
                          : Text(isConnected ? 'Update' : 'Connect'),
                    ),
                  ),
                ],
              ),
            ),
          ],

          // No fields and not OAuth
          if (!widget.meta.isOAuth && widget.meta.fields.isEmpty) ...[
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: FilledButton(
                onPressed: _isSaving ? null : _connect,
                child: _isSaving
                    ? const SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(
                            strokeWidth: 2, color: Colors.white),
                      )
                    : Text(isConnected ? 'Reconnect' : 'Connect'),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _statusRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 4),
      child: Row(
        children: [
          Text('$label: ',
              style: const TextStyle(fontWeight: FontWeight.w500)),
          Text(value),
        ],
      ),
    );
  }

  String _formatTime(DateTime dt) {
    final diff = DateTime.now().difference(dt);
    if (diff.inMinutes < 1) return 'Just now';
    if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
    if (diff.inHours < 24) return '${diff.inHours}h ago';
    if (diff.inDays < 7) return '${diff.inDays}d ago';
    return '${dt.day}/${dt.month}/${dt.year}';
  }
}

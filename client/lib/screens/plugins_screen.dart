import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../config/plugin_registry.dart';
import '../models/plugin.dart';
import '../providers/plugin_provider.dart';
import 'plugin_connect_screen.dart';

class PluginsScreen extends StatefulWidget {
  const PluginsScreen({super.key});

  @override
  State<PluginsScreen> createState() => _PluginsScreenState();
}

class _PluginsScreenState extends State<PluginsScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<PluginProvider>().loadPlugins();
    });
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<PluginProvider>();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Plugins'),
      ),
      body: RefreshIndicator(
        onRefresh: () => provider.loadPlugins(),
        child: _buildBody(provider),
      ),
    );
  }

  Widget _buildBody(PluginProvider provider) {
    if (provider.isLoading && provider.plugins.isEmpty) {
      return const Center(child: CircularProgressIndicator());
    }

    if (provider.errorMessage != null && provider.plugins.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.error_outline,
                  size: 48, color: Theme.of(context).colorScheme.error),
              const SizedBox(height: 16),
              Text(provider.errorMessage!, textAlign: TextAlign.center),
              const SizedBox(height: 16),
              FilledButton(
                onPressed: () => provider.loadPlugins(),
                child: const Text('Retry'),
              ),
            ],
          ),
        ),
      );
    }

    // Build from registry, merging server status
    final categories = PluginRegistry.categories;
    final serverMap = <String, Plugin>{};
    for (final p in provider.plugins) {
      serverMap[p.id] = p;
    }

    return ListView(
      padding: const EdgeInsets.only(bottom: 24),
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
          child: Text(
            'Connect external services to automatically track your habits.',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                ),
          ),
        ),
        for (final category in categories) ...[
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 4),
            child: Text(
              PluginRegistry.categoryLabels[category] ?? category,
              style: Theme.of(context).textTheme.titleSmall?.copyWith(
                    color: Theme.of(context).colorScheme.primary,
                    fontWeight: FontWeight.bold,
                  ),
            ),
          ),
          ...PluginRegistry.byCategory(category).map((meta) {
            final serverPlugin = serverMap[meta.id];
            final isConnected = serverPlugin?.connected ?? false;
            final status = serverPlugin?.status ?? 'disconnected';

            return ListTile(
              leading: CircleAvatar(
                backgroundColor: meta.color.withValues(alpha: 0.15),
                child: Icon(meta.icon, color: meta.color, size: 20),
              ),
              title: Text(meta.displayName),
              subtitle: Text(meta.description),
              trailing: _buildStatusChip(isConnected, status),
              onTap: () async {
                final result = await Navigator.of(context).push<bool>(
                  MaterialPageRoute(
                    builder: (_) => PluginConnectScreen(
                      meta: meta,
                      currentPlugin: serverPlugin,
                    ),
                  ),
                );
                if (result == true) {
                  provider.loadPlugins();
                }
              },
            );
          }),
        ],
      ],
    );
  }

  Widget _buildStatusChip(bool connected, String status) {
    if (!connected) {
      return const Chip(
        label: Text('Connect'),
        padding: EdgeInsets.zero,
        visualDensity: VisualDensity.compact,
      );
    }

    final color = switch (status) {
      'active' => Colors.green,
      'error' => Colors.red,
      'syncing' => Colors.orange,
      _ => Colors.grey,
    };

    return Chip(
      avatar: Icon(
        connected ? Icons.check_circle : Icons.circle_outlined,
        size: 16,
        color: color,
      ),
      label: Text(status.isNotEmpty ? status[0].toUpperCase() + status.substring(1) : 'Unknown'),
      padding: EdgeInsets.zero,
      visualDensity: VisualDensity.compact,
    );
  }
}

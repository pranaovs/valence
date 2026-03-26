import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import '../config/api_config.dart';
import '../config/plugin_registry.dart';
import '../models/plugin.dart';
import '../providers/auth_provider.dart';
import '../providers/plugin_provider.dart';
import '../services/screen_time_service.dart';

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

class _PluginConnectScreenState extends State<PluginConnectScreen>
    with WidgetsBindingObserver {
  final _formKey = GlobalKey<FormState>();
  late final Map<String, TextEditingController> _controllers;
  bool _isSaving = false;

  // Screen time state
  bool _hasPermission = false;
  bool _checkingPermission = true;
  ScreenTimeData? _screenTimeData;
  bool _isReporting = false;

  @override
  void initState() {
    super.initState();
    _controllers = {
      for (final field in widget.meta.fields)
        field.key: TextEditingController(),
    };
    if (widget.meta.isDeviceBased || widget.meta.isOAuth) {
      WidgetsBinding.instance.addObserver(this);
    }
    if (widget.meta.isDeviceBased) {
      _checkPermission();
    }
  }

  @override
  void dispose() {
    if (widget.meta.isDeviceBased || widget.meta.isOAuth) {
      WidgetsBinding.instance.removeObserver(this);
    }
    for (final c in _controllers.values) {
      c.dispose();
    }
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state != AppLifecycleState.resumed) return;
    // Re-check permission when user returns from Settings
    if (widget.meta.isDeviceBased) {
      _checkPermission();
    }
    // Re-check plugin connection when user returns from OAuth browser
    if (widget.meta.isOAuth) {
      context.read<PluginProvider>().loadPlugins();
    }
  }

  Future<void> _checkPermission() async {
    setState(() => _checkingPermission = true);
    final provider = context.read<PluginProvider>();
    final granted = await provider.hasScreenTimePermission();
    if (!mounted) return;
    setState(() {
      _hasPermission = granted;
      _checkingPermission = false;
    });
    if (granted) {
      _loadScreenTime();
    }
  }

  Future<void> _loadScreenTime() async {
    final provider = context.read<PluginProvider>();
    final data = await provider.getScreenTimeData();
    if (mounted) {
      setState(() => _screenTimeData = data);
    }
  }

  Future<void> _reportScreenTime() async {
    if (_screenTimeData == null) return;
    setState(() => _isReporting = true);

    final provider = context.read<PluginProvider>();
    final result = await provider.reportScreenTime(
      screenMinutes: _screenTimeData!.screenMinutes,
      appUsage: _screenTimeData!.appUsage,
    );

    if (!mounted) return;
    setState(() => _isReporting = false);

    if (result != null) {
      final evaluated = result['habits_evaluated'] ?? 0;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'Screen time reported: ${_screenTimeData!.screenMinutes} min'
            '${evaluated > 0 ? ' — $evaluated habit(s) evaluated' : ''}',
          ),
        ),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            provider.errorMessage ?? 'Failed to report screen time.',
          ),
        ),
      );
    }
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

  Future<void> _disconnect() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Disconnect plugin?'),
        content: Text(
          'This will remove ${widget.meta.displayName} from your connected plugins.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            child: const Text('Disconnect'),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;

    final provider = context.read<PluginProvider>();
    final success = await provider.disconnectPlugin(widget.meta.id);
    if (mounted) {
      if (success) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('${widget.meta.displayName} disconnected.'),
          ),
        );
        Navigator.of(context).pop(true);
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              provider.errorMessage ?? 'Failed to disconnect.',
            ),
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isConnected = widget.currentPlugin?.connected ?? false;
    final cs = Theme.of(context).colorScheme;

    return Scaffold(
      appBar: AppBar(
        title: Text(widget.meta.displayName),
        actions: [
          if (isConnected)
            IconButton(
              icon: const Icon(Icons.link_off),
              tooltip: 'Disconnect',
              onPressed: _disconnect,
            ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Plugin info card
          _buildInfoCard(isConnected),
          const SizedBox(height: 16),

          // Status info for connected plugins
          if (isConnected && widget.currentPlugin != null) ...[
            _buildStatusCard(cs),
            const SizedBox(height: 16),
          ],

          // Device-based plugin (screen_time)
          if (widget.meta.isDeviceBased) ...[
            _buildDevicePluginSection(cs),
          ],

          // OAuth info
          if (widget.meta.isOAuth && !widget.meta.isDeviceBased) ...[
            _buildOAuthSection(cs, isConnected),
          ],

          // Credential fields for non-OAuth, non-device plugins
          if (!widget.meta.isOAuth &&
              !widget.meta.isDeviceBased &&
              widget.meta.fields.isNotEmpty) ...[
            _buildCredentialSection(cs, isConnected),
          ],

          // No fields and not OAuth and not device
          if (!widget.meta.isOAuth &&
              !widget.meta.isDeviceBased &&
              widget.meta.fields.isEmpty) ...[
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

  Widget _buildInfoCard(bool isConnected) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            CircleAvatar(
              radius: 24,
              backgroundColor: widget.meta.color.withValues(alpha: 0.15),
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
    );
  }

  Widget _buildStatusCard(ColorScheme cs) {
    return Card(
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
    );
  }

  Widget _buildDevicePluginSection(ColorScheme cs) {
    if (_checkingPermission) {
      return const Card(
        child: Padding(
          padding: EdgeInsets.all(32),
          child: Center(child: CircularProgressIndicator()),
        ),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (!_hasPermission) ...[
          // Permission not granted — show request flow
          Card(
            color: cs.errorContainer.withValues(alpha: 0.3),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(Icons.shield_outlined, color: cs.error),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          'Usage Access Permission Required',
                          style: Theme.of(context)
                              .textTheme
                              .titleSmall
                              ?.copyWith(fontWeight: FontWeight.bold),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Text(
                    'To track screen time, Valence needs permission to access '
                    'usage statistics. You\'ll be taken to system settings where '
                    'you need to find and enable Valence.',
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                  const SizedBox(height: 16),
                  SizedBox(
                    width: double.infinity,
                    child: FilledButton.icon(
                      onPressed: () async {
                        final provider = context.read<PluginProvider>();
                        final opened = await provider.requestScreenTimePermission();
                        if (!opened && mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                              content: Text(
                                'Could not open settings. Please go to '
                                'Settings → Apps → Special access → Usage access '
                                'and enable Valence manually.',
                              ),
                            ),
                          );
                        }
                      },
                      icon: const Icon(Icons.settings),
                      label: const Text('Open Settings'),
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Settings → Apps → Special access → Usage access → Valence',
                    style: Theme.of(context).textTheme.labelSmall?.copyWith(
                          color: cs.onSurfaceVariant,
                        ),
                    textAlign: TextAlign.center,
                  ),
                ],
              ),
            ),
          ),
        ] else ...[
          // Permission granted — show screen time data
          Card(
            color: Colors.green.withValues(alpha: 0.08),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  const Icon(Icons.check_circle, color: Colors.green),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      'Usage access permission granted',
                      style: Theme.of(context).textTheme.bodyMedium,
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 12),

          if (_screenTimeData == null) ...[
            const Card(
              child: Padding(
                padding: EdgeInsets.all(32),
                child: Center(child: CircularProgressIndicator()),
              ),
            ),
          ] else ...[
            // Today's screen time summary
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text("Today's Screen Time",
                        style: Theme.of(context)
                            .textTheme
                            .titleSmall
                            ?.copyWith(fontWeight: FontWeight.bold)),
                    const SizedBox(height: 12),
                    Center(
                      child: Column(
                        children: [
                          Text(
                            _formatMinutes(_screenTimeData!.screenMinutes),
                            style: Theme.of(context)
                                .textTheme
                                .headlineLarge
                                ?.copyWith(
                                  fontWeight: FontWeight.bold,
                                  color: _screenTimeColor(
                                      _screenTimeData!.screenMinutes),
                                ),
                          ),
                          Text('total screen time',
                              style: Theme.of(context).textTheme.bodySmall),
                        ],
                      ),
                    ),
                    if (_screenTimeData!.appUsage.isNotEmpty) ...[
                      const SizedBox(height: 16),
                      const Divider(),
                      const SizedBox(height: 8),
                      Text('Top Apps',
                          style: Theme.of(context).textTheme.titleSmall),
                      const SizedBox(height: 8),
                      ..._screenTimeData!.appUsage.entries.take(10).map(
                            (entry) => Padding(
                              padding:
                                  const EdgeInsets.symmetric(vertical: 3),
                              child: Row(
                                children: [
                                  Expanded(
                                    child: Text(entry.key,
                                        style: Theme.of(context)
                                            .textTheme
                                            .bodySmall),
                                  ),
                                  Text(
                                    _formatMinutes(entry.value),
                                    style: Theme.of(context)
                                        .textTheme
                                        .bodySmall
                                        ?.copyWith(
                                            fontWeight: FontWeight.bold),
                                  ),
                                ],
                              ),
                            ),
                          ),
                    ],
                  ],
                ),
              ),
            ),
            const SizedBox(height: 12),

            // Report button
            SizedBox(
              width: double.infinity,
              child: FilledButton.icon(
                onPressed: _isReporting ? null : _reportScreenTime,
                icon: _isReporting
                    ? const SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Icon(Icons.cloud_upload),
                label: Text(_isReporting
                    ? 'Reporting...'
                    : 'Report ${_screenTimeData!.screenMinutes} min to Valence'),
              ),
            ),
            const SizedBox(height: 8),

            // Refresh button
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: _loadScreenTime,
                icon: const Icon(Icons.refresh),
                label: const Text('Refresh'),
              ),
            ),
          ],
        ],

        const SizedBox(height: 16),
        // How it works
        Card(
          color: cs.surfaceContainerHighest.withValues(alpha: 0.5),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('How it works',
                    style: Theme.of(context)
                        .textTheme
                        .titleSmall
                        ?.copyWith(fontWeight: FontWeight.bold)),
                const SizedBox(height: 8),
                _howItWorksStep('1', 'Grant usage access permission above'),
                _howItWorksStep('2',
                    'Create a habit with tracking method "Plugin" and plugin ID "screen_time"'),
                _howItWorksStep('3',
                    'Set a goal like "screen time ≤ 120 min" on your habit'),
                _howItWorksStep('4',
                    'Report your screen time here — the habit auto-completes if you\'re under your goal'),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _howItWorksStep(String number, String text) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          CircleAvatar(
            radius: 10,
            backgroundColor: widget.meta.color.withValues(alpha: 0.15),
            child: Text(number,
                style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                    color: widget.meta.color)),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(text,
                style: Theme.of(context).textTheme.bodySmall),
          ),
        ],
      ),
    );
  }

  Future<void> _launchOAuth() async {
    final userId = context.read<AuthProvider>().user?.id;
    if (userId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Not logged in.')),
      );
      return;
    }

    // Map plugin ID to OAuth path
    final oauthPath = switch (widget.meta.id) {
      'google_fit' => '/api/v1/oauth/google-fit/authorize',
      'strava' => '/api/v1/oauth/strava/authorize',
      _ => null,
    };
    if (oauthPath == null) return;

    final url = Uri.parse(
      '${ApiConfig.baseUrl}$oauthPath?user_id=$userId',
    );

    setState(() => _isSaving = true);
    try {
      final launched = await launchUrl(url, mode: LaunchMode.externalApplication);
      if (!launched && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Could not open browser.')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Failed to open OAuth page.')),
        );
      }
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  Widget _buildOAuthSection(ColorScheme cs, bool isConnected) {
    return Column(
      children: [
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
                    'You\'ll be redirected to ${widget.meta.displayName} to authorize access. '
                    'Come back here after granting permission.',
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
            onPressed: _isSaving ? null : _launchOAuth,
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
    );
  }

  Widget _buildCredentialSection(ColorScheme cs, bool isConnected) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
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

  String _formatMinutes(int minutes) {
    if (minutes < 60) return '${minutes}m';
    final hours = minutes ~/ 60;
    final mins = minutes % 60;
    if (mins == 0) return '${hours}h';
    return '${hours}h ${mins}m';
  }

  Color _screenTimeColor(int minutes) {
    if (minutes <= 60) return Colors.green;
    if (minutes <= 120) return Colors.lightGreen;
    if (minutes <= 180) return Colors.orange;
    if (minutes <= 300) return Colors.deepOrange;
    return Colors.red;
  }
}

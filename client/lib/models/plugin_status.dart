class PluginStatus {
  final String pluginId;
  final bool connected;
  final String status;
  final DateTime? lastSyncedAt;
  final String? error;

  const PluginStatus({
    required this.pluginId,
    required this.connected,
    required this.status,
    this.lastSyncedAt,
    this.error,
  });

  factory PluginStatus.fromJson(Map<String, dynamic> json) {
    return PluginStatus(
      pluginId: (json['pluginId'] ?? json['plugin_id']) as String,
      connected: (json['connected'] as bool?) ?? false,
      status: (json['status'] as String?) ?? 'disconnected',
      lastSyncedAt: _parseDateTime(
          json['lastSyncedAt'] ?? json['last_synced_at']),
      error: json['error'] as String?,
    );
  }

  static DateTime? _parseDateTime(dynamic value) {
    if (value == null) return null;
    return DateTime.tryParse(value as String);
  }
}

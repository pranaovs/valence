class Plugin {
  final String id;
  final String name;
  final String description;
  final String category;
  final List<String> credentialFields;
  final bool connected;
  final String status;
  final DateTime? lastSyncedAt;

  const Plugin({
    required this.id,
    required this.name,
    required this.description,
    required this.category,
    required this.credentialFields,
    required this.connected,
    required this.status,
    this.lastSyncedAt,
  });

  factory Plugin.fromJson(Map<String, dynamic> json) {
    return Plugin(
      id: json['id'] as String,
      name: json['name'] as String,
      description: (json['description'] as String?) ?? '',
      category: (json['category'] as String?) ?? 'other',
      credentialFields:
          (json['credentialFields'] ?? json['credential_fields'] ?? []) is List
          ? List<String>.from(
              json['credentialFields'] ?? json['credential_fields'] ?? [],
            )
          : <String>[],
      connected: (json['connected'] as bool?) ?? false,
      status: (json['status'] as String?) ?? 'disconnected',
      lastSyncedAt: _parseDateTime(
        json['lastSyncedAt'] ?? json['last_synced_at'],
      ),
    );
  }

  static DateTime? _parseDateTime(dynamic value) {
    if (value == null) return null;
    return DateTime.tryParse(value as String);
  }
}

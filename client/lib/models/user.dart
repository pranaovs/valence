class ValenceUser {
  final String id;
  final String firebaseUid;
  final String email;
  final String name;
  final String? avatar;
  final int xp;
  final int sparks;
  final String rank;
  final String personaType;
  final Map<String, dynamic> equipped;
  final Map<String, dynamic> notificationPreferences;
  final String timezone;
  final DateTime createdAt;
  final DateTime updatedAt;

  const ValenceUser({
    required this.id,
    required this.firebaseUid,
    required this.email,
    required this.name,
    this.avatar,
    required this.xp,
    required this.sparks,
    required this.rank,
    required this.personaType,
    required this.equipped,
    required this.notificationPreferences,
    required this.timezone,
    required this.createdAt,
    required this.updatedAt,
  });

  factory ValenceUser.fromJson(Map<String, dynamic> json) {
    return ValenceUser(
      id: json['id'] as String,
      firebaseUid: (json['firebaseUid'] ?? json['firebase_uid']) as String,
      email: json['email'] as String,
      name: json['name'] as String,
      avatar: json['avatar'] as String?,
      xp: (json['xp'] as int?) ?? 0,
      sparks: (json['sparks'] as int?) ?? 0,
      rank: (json['rank'] as String?) ?? 'bronze',
      personaType:
          (json['personaType'] ?? json['persona_type'] ?? 'general') as String,
      equipped: Map<String, dynamic>.from(
          (json['equipped'] as Map?) ?? {}),
      notificationPreferences: Map<String, dynamic>.from(
          (json['notificationPreferences'] ??
              json['notification_preferences'] ??
              {}) as Map),
      timezone: (json['timezone'] as String?) ?? 'UTC',
      createdAt: DateTime.parse(
          (json['createdAt'] ?? json['created_at']) as String),
      updatedAt: DateTime.parse(
          (json['updatedAt'] ?? json['updated_at']) as String),
    );
  }
}

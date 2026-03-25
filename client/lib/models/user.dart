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
      firebaseUid: json['firebase_uid'] as String,
      email: json['email'] as String,
      name: json['name'] as String,
      avatar: json['avatar'] as String?,
      xp: json['xp'] as int,
      sparks: json['sparks'] as int,
      rank: json['rank'] as String,
      personaType: json['persona_type'] as String,
      equipped: Map<String, dynamic>.from(json['equipped'] as Map),
      notificationPreferences:
          Map<String, dynamic>.from(json['notification_preferences'] as Map),
      timezone: json['timezone'] as String,
      createdAt: DateTime.parse(json['created_at'] as String),
      updatedAt: DateTime.parse(json['updated_at'] as String),
    );
  }
}

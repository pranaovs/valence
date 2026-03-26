class Group {
  final String id;
  final String name;
  final String inviteCode;
  final String tier;
  final int currentStreak;
  final int longestStreak;
  final int totalLinks;
  final int memberCount;
  final String createdBy;
  final String? role;
  final DateTime? joinedAt;
  final DateTime createdAt;
  final DateTime updatedAt;

  const Group({
    required this.id,
    required this.name,
    required this.inviteCode,
    required this.tier,
    required this.currentStreak,
    required this.longestStreak,
    required this.totalLinks,
    required this.memberCount,
    required this.createdBy,
    this.role,
    this.joinedAt,
    required this.createdAt,
    required this.updatedAt,
  });

  factory Group.fromJson(Map<String, dynamic> json) {
    return Group(
      id: json['id'] as String,
      name: json['name'] as String,
      inviteCode: (json['inviteCode'] ?? json['invite_code'] ?? '') as String,
      tier: (json['tier'] as String?) ?? 'spark',
      currentStreak: _toInt(json['currentStreak'] ?? json['current_streak']),
      longestStreak: _toInt(json['longestStreak'] ?? json['longest_streak']),
      totalLinks: _toInt(json['totalLinks'] ?? json['total_links']),
      memberCount: _toInt(
        json['memberCount'] ?? json['member_count'],
        fallback: 1,
      ),
      createdBy: (json['createdBy'] ?? json['created_by'] ?? '') as String,
      role: json['role'] as String?,
      joinedAt: json['joinedAt'] != null
          ? DateTime.parse(json['joinedAt'] as String)
          : json['joined_at'] != null
          ? DateTime.parse(json['joined_at'] as String)
          : null,
      createdAt: DateTime.parse(
        (json['createdAt'] ?? json['created_at']) as String,
      ),
      updatedAt: DateTime.parse(
        (json['updatedAt'] ??
                json['updated_at'] ??
                json['createdAt'] ??
                json['created_at'])
            as String,
      ),
    );
  }

  static int _toInt(dynamic value, {int fallback = 0}) {
    if (value is int) return value;
    if (value is num) return value.toInt();
    if (value is String) return int.tryParse(value) ?? fallback;
    return fallback;
  }
}

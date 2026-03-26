class GroupMemberStatus {
  final String userId;
  final String name;
  final String? avatar;
  final String role;
  final bool allDoneToday;
  final int habitsCompleted;
  final int habitsTotal;
  final String rank;

  const GroupMemberStatus({
    required this.userId,
    required this.name,
    this.avatar,
    required this.role,
    required this.allDoneToday,
    required this.habitsCompleted,
    required this.habitsTotal,
    required this.rank,
  });

  factory GroupMemberStatus.fromJson(Map<String, dynamic> json) {
    return GroupMemberStatus(
      userId: (json['userId'] ?? json['user_id']) as String,
      name: json['name'] as String,
      avatar: json['avatar'] as String?,
      role: (json['role'] as String?) ?? 'member',
      allDoneToday:
          (json['allDoneToday'] ?? json['all_done_today'] ?? false) as bool,
      habitsCompleted: _toInt(
        json['habitsCompleted'] ?? json['habits_completed'],
      ),
      habitsTotal: _toInt(json['habitsTotal'] ?? json['habits_total']),
      rank: (json['rank'] as String?) ?? 'bronze',
    );
  }

  static int _toInt(dynamic value) {
    if (value is int) return value;
    if (value is num) return value.toInt();
    if (value is String) return int.tryParse(value) ?? 0;
    return 0;
  }
}

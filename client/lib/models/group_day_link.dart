class GroupDayLink {
  final String id;
  final String groupId;
  final String date;
  final int completionPercentage;
  final String linkType;
  final bool freezeUsed;
  final DateTime createdAt;

  const GroupDayLink({
    required this.id,
    required this.groupId,
    required this.date,
    required this.completionPercentage,
    required this.linkType,
    required this.freezeUsed,
    required this.createdAt,
  });

  factory GroupDayLink.fromJson(Map<String, dynamic> json) {
    return GroupDayLink(
      id: json['id'] as String,
      groupId: (json['groupId'] ?? json['group_id']) as String,
      date: json['date'] as String,
      completionPercentage:
          _toInt(json['completionPercentage'] ?? json['completion_percentage']),
      linkType:
          (json['linkType'] ?? json['link_type'] ?? 'broken') as String,
      freezeUsed:
          (json['freezeUsed'] ?? json['freeze_used'] ?? false) as bool,
      createdAt: DateTime.parse(
          (json['createdAt'] ?? json['created_at']) as String),
    );
  }

  static int _toInt(dynamic value) {
    if (value is int) return value;
    if (value is num) return value.toInt();
    if (value is String) return int.tryParse(value) ?? 0;
    return 0;
  }
}

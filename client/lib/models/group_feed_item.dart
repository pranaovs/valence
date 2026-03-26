class GroupFeedItem {
  final String id;
  final String groupId;
  final String? actorId;
  final String type;
  final Map<String, dynamic> data;
  final DateTime createdAt;

  const GroupFeedItem({
    required this.id,
    required this.groupId,
    this.actorId,
    required this.type,
    required this.data,
    required this.createdAt,
  });

  factory GroupFeedItem.fromJson(Map<String, dynamic> json) {
    return GroupFeedItem(
      id: json['id'] as String,
      groupId: (json['groupId'] ?? json['group_id']) as String,
      actorId: (json['actorId'] ?? json['actor_id']) as String?,
      type: json['type'] as String,
      data: Map<String, dynamic>.from((json['data'] as Map?) ?? {}),
      createdAt: DateTime.parse(
        (json['createdAt'] ?? json['created_at']) as String,
      ),
    );
  }

  String get displayText {
    switch (type) {
      case 'completion':
        return '${data['user_name'] ?? data['userName'] ?? 'Someone'} completed ${data['habit_name'] ?? data['habitName'] ?? 'a habit'}';
      case 'perfect_day':
        return '${data['user_name'] ?? data['userName'] ?? 'Someone'} had a perfect day!';
      case 'group_link_gold':
        return 'Gold link forged! ${data['completion_percentage'] ?? data['completionPercentage'] ?? 100}% completion';
      case 'group_link_silver':
        return 'Silver link forged. ${data['completion_percentage'] ?? data['completionPercentage'] ?? 75}% completion';
      case 'group_link_broken':
        return 'Chain link broken. ${data['completion_percentage'] ?? data['completionPercentage'] ?? 0}% completion';
      case 'freeze_used':
        return '${data['user_name'] ?? data['userName'] ?? 'Someone'} used a streak freeze!';
      case 'member_joined':
        return '${data['user_name'] ?? data['userName'] ?? 'Someone'} joined the group';
      case 'member_left':
        return '${data['user_name'] ?? data['userName'] ?? 'Someone'} left the group';
      case 'group_tier_change':
        return 'Group tier changed: ${data['old_tier'] ?? data['oldTier']} → ${data['new_tier'] ?? data['newTier']}';
      case 'rank_promotion':
        return '${data['user_name'] ?? data['userName'] ?? 'Someone'} promoted to ${data['new_rank'] ?? data['newRank']}!';
      case 'streak_milestone':
        return '${data['user_name'] ?? data['userName'] ?? 'Someone'} hit ${data['milestone_days'] ?? data['milestoneDays']}-day streak!';
      case 'nudge':
        return '${data['sender_name'] ?? data['senderName'] ?? 'Someone'} nudged ${data['receiver_name'] ?? data['receiverName'] ?? 'someone'}';
      case 'kudos':
        return '${data['sender_name'] ?? data['senderName'] ?? 'Someone'} sent kudos to ${data['receiver_name'] ?? data['receiverName'] ?? 'someone'}';
      default:
        return type;
    }
  }
}

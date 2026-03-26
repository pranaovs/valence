class AppNotification {
  final String id;
  final String type;
  final String? title;
  final String? body;
  final Map<String, dynamic> data;
  final bool read;
  final DateTime createdAt;

  const AppNotification({
    required this.id,
    required this.type,
    this.title,
    this.body,
    required this.data,
    required this.read,
    required this.createdAt,
  });

  factory AppNotification.fromJson(Map<String, dynamic> json) {
    return AppNotification(
      id: json['id'] as String,
      type: (json['type'] as String?) ?? 'unknown',
      title: json['title'] as String?,
      body: (json['body'] ?? json['message']) as String?,
      data: Map<String, dynamic>.from((json['data'] as Map?) ?? {}),
      read: (json['read'] as bool?) ?? false,
      createdAt: DateTime.parse(
        (json['createdAt'] ?? json['created_at']) as String,
      ),
    );
  }

  String get displayTitle {
    if (title != null && title!.isNotEmpty) return title!;
    switch (type) {
      case 'morning_activation':
        return 'Good morning!';
      case 'friend_nudge':
        return 'You got nudged';
      case 'preemptive_warning':
        return 'Heads up';
      case 'reflection_prompt':
        return 'Time to reflect';
      case 'kudos_received':
        return 'Kudos received';
      case 'streak_milestone':
        return 'Streak milestone';
      case 'goal_milestone':
        return 'Goal milestone';
      case 'rank_promotion':
        return 'Rank up!';
      case 'weekly_summary':
        return 'Weekly summary';
      default:
        return 'Notification';
    }
  }

  String get displayBody {
    if (body != null && body!.isNotEmpty) return body!;
    final message = data['message'] as String?;
    if (message != null) return message;
    switch (type) {
      case 'morning_activation':
        return 'Start your day strong — complete your habits!';
      case 'reflection_prompt':
        return 'How did today go? Take a moment to reflect.';
      default:
        return '';
    }
  }
}

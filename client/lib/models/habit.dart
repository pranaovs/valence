import 'plugin_goal.dart';

class Habit {
  final String id;
  final String userId;
  final String name;
  final String intensity;
  final String trackingMethod;
  final String? pluginId;
  final PluginGoal? pluginGoal;
  final String? redirectUrl;
  final String visibility;
  final bool isActive;
  final int currentStreak;
  final int longestStreak;
  final int totalCompleted;
  final String goalStage;
  final String? lastCompletedDate;
  final bool todayCompleted;
  final DateTime createdAt;
  final DateTime updatedAt;

  const Habit({
    required this.id,
    required this.userId,
    required this.name,
    required this.intensity,
    required this.trackingMethod,
    this.pluginId,
    this.pluginGoal,
    this.redirectUrl,
    required this.visibility,
    required this.isActive,
    required this.currentStreak,
    required this.longestStreak,
    required this.totalCompleted,
    required this.goalStage,
    this.lastCompletedDate,
    required this.todayCompleted,
    required this.createdAt,
    required this.updatedAt,
  });

  factory Habit.fromJson(Map<String, dynamic> json) {
    final goalRaw = json['pluginGoal'] ?? json['plugin_goal'];
    return Habit(
      id: json['id'] as String,
      userId: (json['userId'] ?? json['user_id']) as String,
      name: json['name'] as String,
      intensity: (json['intensity'] as String?) ?? 'moderate',
      trackingMethod:
          (json['trackingMethod'] ?? json['tracking_method'] ?? 'manual')
              as String,
      pluginId: (json['pluginId'] ?? json['plugin_id']) as String?,
      pluginGoal: goalRaw is Map<String, dynamic>
          ? PluginGoal.fromJson(goalRaw)
          : null,
      redirectUrl: (json['redirectUrl'] ?? json['redirect_url']) as String?,
      visibility: (json['visibility'] as String?) ?? 'full',
      isActive: (json['isActive'] ?? json['is_active'] ?? true) as bool,
      currentStreak:
          (json['currentStreak'] ?? json['current_streak'] ?? 0) as int,
      longestStreak:
          (json['longestStreak'] ?? json['longest_streak'] ?? 0) as int,
      totalCompleted:
          (json['totalCompleted'] ?? json['total_completed'] ?? 0) as int,
      goalStage:
          (json['goalStage'] ?? json['goal_stage'] ?? 'ignition') as String,
      lastCompletedDate:
          (json['lastCompletedDate'] ?? json['last_completed_date']) as String?,
      todayCompleted:
          (json['completedToday'] ?? json['today_completed'] ?? false) as bool,
      createdAt: DateTime.parse(
          (json['createdAt'] ?? json['created_at']) as String),
      updatedAt: DateTime.parse(
          (json['updatedAt'] ?? json['updated_at']) as String),
    );
  }
}

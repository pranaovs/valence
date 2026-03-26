import 'habit.dart';

class HabitCompletionResult {
  final Habit habit;
  final int xpEarned;
  final int sparksEarned;
  final String? newRank;
  final bool perfectDay;
  final bool goalStageChanged;

  const HabitCompletionResult({
    required this.habit,
    required this.xpEarned,
    required this.sparksEarned,
    this.newRank,
    required this.perfectDay,
    required this.goalStageChanged,
  });

  int get totalPointsEarned => xpEarned;

  factory HabitCompletionResult.fromJson(Map<String, dynamic> json) {
    final points = json['points'] as Map<String, dynamic>? ?? {};
    // Support both camelCase and snake_case response formats
    final pointsEarned = json['pointsEarned'] ?? json['points_earned'];
    final pe = pointsEarned is Map<String, dynamic>
        ? pointsEarned
        : <String, dynamic>{};

    return HabitCompletionResult(
      habit: Habit.fromJson(json['habit'] as Map<String, dynamic>),
      xpEarned: _toInt(points['xpEarned'] ?? pe['xp'] ?? pe['xpEarned']),
      sparksEarned: _toInt(
        points['sparksEarned'] ?? pe['sparks'] ?? pe['sparksEarned'],
      ),
      newRank:
          (points['newRank'] ?? json['newRank'] ?? json['new_rank']) as String?,
      perfectDay: (json['perfectDay'] ?? json['perfect_day'] ?? false) as bool,
      goalStageChanged:
          (json['goalStageChanged'] ?? json['goal_stage_changed'] ?? false)
              as bool,
    );
  }

  static int _toInt(dynamic value) {
    if (value is int) return value;
    if (value is num) return value.toInt();
    if (value is String) return int.tryParse(value) ?? 0;
    return 0;
  }
}

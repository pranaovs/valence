class HabitLog {
  final String? id;
  final String habitId;
  final String date;
  final bool completed;
  final String? verificationSource;
  final String? proofUrl;
  final int? reflectionDifficulty;
  final String? reflectionText;
  final DateTime? completedAt;
  final DateTime? createdAt;

  const HabitLog({
    this.id,
    required this.habitId,
    required this.date,
    required this.completed,
    this.verificationSource,
    this.proofUrl,
    this.reflectionDifficulty,
    this.reflectionText,
    this.completedAt,
    this.createdAt,
  });

  factory HabitLog.fromJson(Map<String, dynamic> json) {
    return HabitLog(
      id: json['id'] as String?,
      habitId: (json['habitId'] ?? json['habit_id']) as String,
      date: json['date'] as String,
      completed: (json['completed'] as bool?) ?? false,
      verificationSource:
          (json['verificationSource'] ?? json['verification_source'])
              as String?,
      proofUrl: (json['proofUrl'] ?? json['proof_url']) as String?,
      reflectionDifficulty:
          (json['reflectionDifficulty'] ?? json['reflection_difficulty'])
              as int?,
      reflectionText:
          (json['reflectionText'] ?? json['reflection_text']) as String?,
      completedAt: _parseDateTime(json['completedAt'] ?? json['completed_at']),
      createdAt: _parseDateTime(json['createdAt'] ?? json['created_at']),
    );
  }

  static DateTime? _parseDateTime(dynamic value) {
    if (value == null) return null;
    return DateTime.parse(value as String);
  }
}

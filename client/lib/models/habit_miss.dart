class HabitMissResult {
  final String supportiveMessage;

  const HabitMissResult({required this.supportiveMessage});

  factory HabitMissResult.fromJson(Map<String, dynamic> json) {
    return HabitMissResult(
      supportiveMessage:
          (json['supportiveMessage'] ?? json['supportive_message'])
              as String? ??
          'Tomorrow is a fresh start.',
    );
  }
}

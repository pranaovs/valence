class FreezeResult {
  final String message;
  final int sparksSpent;
  final int sparksRemaining;

  const FreezeResult({
    required this.message,
    required this.sparksSpent,
    required this.sparksRemaining,
  });

  factory FreezeResult.fromJson(Map<String, dynamic> json) {
    return FreezeResult(
      message: (json['message'] as String?) ?? 'Freeze activated.',
      sparksSpent:
          (json['sparksSpent'] ?? json['sparks_spent'] ?? 100) as int,
      sparksRemaining:
          (json['sparksRemaining'] ?? json['sparks_remaining'] ?? 0) as int,
    );
  }
}

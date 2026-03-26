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
          _toInt(json['sparksSpent'] ?? json['sparks_spent'], fallback: 100),
      sparksRemaining:
          _toInt(json['sparksRemaining'] ?? json['sparks_remaining']),
    );
  }

  static int _toInt(dynamic value, {int fallback = 0}) {
    if (value is int) return value;
    if (value is num) return value.toInt();
    if (value is String) return int.tryParse(value) ?? fallback;
    return fallback;
  }
}

class MotivationResult {
  final String message;
  final String persona;

  const MotivationResult({
    required this.message,
    required this.persona,
  });

  factory MotivationResult.fromJson(Map<String, dynamic> json) {
    return MotivationResult(
      message: (json['message'] as String?) ?? '',
      persona: (json['persona'] as String?) ?? 'general',
    );
  }
}

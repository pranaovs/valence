class InsightsResult {
  final String insights;
  final Map<String, int> byReason;
  final Map<String, int> byDay;

  const InsightsResult({
    required this.insights,
    required this.byReason,
    required this.byDay,
  });

  factory InsightsResult.fromJson(Map<String, dynamic> json) {
    final patterns = json['patterns'] as Map<String, dynamic>? ?? {};
    final byReasonRaw = patterns['by_reason'] ?? patterns['byReason'] ?? {};
    final byDayRaw = patterns['by_day'] ?? patterns['byDay'] ?? {};

    return InsightsResult(
      insights: (json['insights'] as String?) ?? '',
      byReason: (byReasonRaw as Map<String, dynamic>)
          .map((k, v) => MapEntry(k, (v as num).toInt())),
      byDay: (byDayRaw as Map<String, dynamic>)
          .map((k, v) => MapEntry(k, (v as num).toInt())),
    );
  }
}

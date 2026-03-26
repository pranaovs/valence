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
    final rawPatterns = json['patterns'];
    final patterns = rawPatterns is Map<String, dynamic>
        ? rawPatterns
        : <String, dynamic>{};
    final byReasonRaw = patterns['by_reason'] ?? patterns['byReason'] ?? {};
    final byDayRaw = patterns['by_day'] ?? patterns['byDay'] ?? {};

    return InsightsResult(
      insights: (json['insights'] as String?) ?? '',
      byReason: _toIntMap(byReasonRaw),
      byDay: _toIntMap(byDayRaw),
    );
  }

  static Map<String, int> _toIntMap(dynamic raw) {
    if (raw is! Map) return {};
    return Map<String, int>.fromEntries(
      raw.entries.map(
        (e) => MapEntry(
          e.key.toString(),
          e.value is num
              ? (e.value as num).toInt()
              : int.tryParse(e.value.toString()) ?? 0,
        ),
      ),
    );
  }
}

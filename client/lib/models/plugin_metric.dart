class PluginMetric {
  final String metric;
  final String label;
  final String unit;
  final num? example;

  const PluginMetric({
    required this.metric,
    required this.label,
    required this.unit,
    this.example,
  });

  factory PluginMetric.fromJson(Map<String, dynamic> json) {
    return PluginMetric(
      metric: json['metric'] as String,
      label: json['label'] as String,
      unit: (json['unit'] as String?) ?? '',
      example: json['example'] as num?,
    );
  }
}

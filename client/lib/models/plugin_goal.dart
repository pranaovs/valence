class PluginGoal {
  final String metric;
  final String operator;
  final num value;

  const PluginGoal({
    required this.metric,
    required this.operator,
    required this.value,
  });

  factory PluginGoal.fromJson(Map<String, dynamic> json) {
    return PluginGoal(
      metric: json['metric'] as String,
      operator: json['operator'] as String,
      value: json['value'] as num,
    );
  }

  Map<String, dynamic> toJson() => {
        'metric': metric,
        'operator': operator,
        'value': value,
      };
}

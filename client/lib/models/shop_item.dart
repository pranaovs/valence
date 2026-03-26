class ShopItem {
  final String id;
  final String name;
  final String category;
  final int sparksCost;
  final String minRank;
  final bool owned;
  final bool meetsRank;

  const ShopItem({
    required this.id,
    required this.name,
    required this.category,
    required this.sparksCost,
    required this.minRank,
    required this.owned,
    required this.meetsRank,
  });

  factory ShopItem.fromJson(Map<String, dynamic> json) {
    return ShopItem(
      id: json['id'] as String,
      name: json['name'] as String,
      category: (json['category'] as String?) ?? 'theme',
      sparksCost: _toInt(json['sparksCost'] ?? json['sparks_cost']),
      minRank: (json['minRank'] ?? json['min_rank'] ?? 'bronze') as String,
      owned: (json['owned'] as bool?) ?? false,
      meetsRank: (json['meets_rank'] ?? json['meetsRank'] ?? true) as bool,
    );
  }

  static int _toInt(dynamic value) {
    if (value is int) return value;
    if (value is num) return value.toInt();
    if (value is String) return int.tryParse(value) ?? 0;
    return 0;
  }
}

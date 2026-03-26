import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/api_response.dart';
import '../models/shop_item.dart';
import '../providers/auth_provider.dart';
import '../services/api_service.dart';
import '../services/auth_service.dart';

class ShopScreen extends StatefulWidget {
  const ShopScreen({super.key});

  @override
  State<ShopScreen> createState() => _ShopScreenState();
}

class _ShopScreenState extends State<ShopScreen> {
  final _apiService = ApiService();
  final _authService = AuthService();
  List<ShopItem> _items = [];
  bool _loading = true;
  String? _error;
  String? _selectedCategory;

  static const _categories = [
    null,
    'theme',
    'flame',
    'animation',
    'card_style',
    'font',
    'pattern',
    'icon',
  ];

  static const _categoryLabels = {
    null: 'All',
    'theme': 'Themes',
    'flame': 'Flames',
    'animation': 'Animations',
    'card_style': 'Cards',
    'font': 'Fonts',
    'pattern': 'Patterns',
    'icon': 'Icons',
  };

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final token = await _authService.getIdToken();
      _items = await _apiService.getShopItems(
        token: token,
        category: _selectedCategory,
      );
    } on ApiException catch (e) {
      _error = e.message;
    } catch (e) {
      _error = 'Failed to load shop.';
    }
    if (mounted) setState(() => _loading = false);
  }

  Future<void> _purchase(ShopItem item) async {
    final user = context.read<AuthProvider>().user;
    if (user == null) return;

    if (user.sparks < item.sparksCost) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Not enough Sparks.')),
      );
      return;
    }

    if (!item.meetsRank) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Requires ${item.minRank} rank or higher.'),
        ),
      );
      return;
    }

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('Buy ${item.name}?'),
        content: Text('This will cost ${item.sparksCost} Sparks.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            child: const Text('Purchase'),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;

    try {
      final token = await _authService.getIdToken();
      await _apiService.purchaseItem(token: token, itemId: item.id);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Purchased ${item.name}!')),
        );
        _load();
      }
    } on ApiException catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.message)),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Purchase failed.')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthProvider>().user;
    final cs = Theme.of(context).colorScheme;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Shop'),
        actions: [
          if (user != null)
            Padding(
              padding: const EdgeInsets.only(right: 16),
              child: Center(
                child: Row(
                  children: [
                    Text('${user.sparks} Sparks',
                        style: Theme.of(context)
                            .textTheme
                            .labelLarge
                            ?.copyWith(
                              fontWeight: FontWeight.w600,
                              color: cs.onSurfaceVariant,
                            )),
                  ],
                ),
              ),
            ),
        ],
      ),
      body: Column(
        children: [
          // Category filter chips
          SizedBox(
            height: 48,
            child: ListView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 12),
              children: _categories.map((cat) {
                final selected = _selectedCategory == cat;
                return Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 4),
                  child: FilterChip(
                    label: Text(_categoryLabels[cat] ?? 'All'),
                    selected: selected,
                    onSelected: (_) {
                      setState(() => _selectedCategory = cat);
                      _load();
                    },
                  ),
                );
              }).toList(),
            ),
          ),
          // Items
          Expanded(
            child: RefreshIndicator(
              onRefresh: _load,
              child: _buildBody(cs),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildBody(ColorScheme cs) {
    if (_loading) {
      return const Center(child: CircularProgressIndicator());
    }
    if (_error != null) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(_error!),
            const SizedBox(height: 12),
            FilledButton(onPressed: _load, child: const Text('Retry')),
          ],
        ),
      );
    }
    if (_items.isEmpty) {
      return ListView(
        children: const [
          SizedBox(height: 100),
          Icon(Icons.storefront, size: 64, color: Colors.grey),
          SizedBox(height: 16),
          Text('No items available.',
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.grey, fontSize: 16)),
        ],
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(12),
      itemCount: _items.length,
      itemBuilder: (context, index) {
        final item = _items[index];
        return Card(
          child: ListTile(
            title: Text(item.name),
            subtitle: Text(
              '${item.category} · ${item.minRank} rank',
              style: Theme.of(context).textTheme.bodySmall,
            ),
            trailing: item.owned
                ? Chip(
                    avatar: const Icon(Icons.check, size: 14),
                    label: const Text('Owned'),
                    visualDensity: VisualDensity.compact,
                  )
                : FilledButton.tonal(
                    onPressed: () => _purchase(item),
                    child: Text('${item.sparksCost} Sparks'),
                  ),
          ),
        );
      },
    );
  }
}

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/insights_provider.dart';

class MotivationCard extends StatefulWidget {
  const MotivationCard({super.key});

  @override
  State<MotivationCard> createState() => _MotivationCardState();
}

class _MotivationCardState extends State<MotivationCard> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<InsightsProvider>().loadMotivation();
    });
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<InsightsProvider>();
    final motivation = provider.motivation;

    if (provider.isMotivationLoading && motivation == null) {
      return const SizedBox.shrink();
    }

    if (motivation == null) return const SizedBox.shrink();

    final cs = Theme.of(context).colorScheme;

    return Card(
      margin: const EdgeInsets.fromLTRB(16, 8, 16, 4),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Row(
          children: [
            Icon(
              Icons.format_quote_rounded,
              color: cs.onSurfaceVariant,
              size: 20,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                motivation.message,
                style: Theme.of(
                  context,
                ).textTheme.bodyMedium?.copyWith(color: cs.onSurfaceVariant),
              ),
            ),
            IconButton(
              icon: Icon(Icons.refresh, size: 18, color: cs.onSurfaceVariant),
              tooltip: 'New message',
              padding: EdgeInsets.zero,
              constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
              onPressed: () => provider.loadMotivation(),
            ),
          ],
        ),
      ),
    );
  }
}

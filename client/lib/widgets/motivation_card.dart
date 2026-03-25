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
      color: cs.primaryContainer,
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Row(
          children: [
            Icon(
              _personaIcon(motivation.persona),
              color: cs.onPrimaryContainer,
              size: 22,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                motivation.message,
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: cs.onPrimaryContainer,
                    ),
              ),
            ),
            IconButton(
              icon: Icon(Icons.refresh, size: 18, color: cs.onPrimaryContainer),
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

  IconData _personaIcon(String persona) {
    switch (persona) {
      case 'socialiser':
        return Icons.groups;
      case 'achiever':
        return Icons.emoji_events;
      default:
        return Icons.auto_awesome;
    }
  }
}

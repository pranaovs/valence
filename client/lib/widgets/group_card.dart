import 'package:flutter/material.dart';
import '../config/group_tiers.dart';
import '../models/group.dart';

class GroupCard extends StatelessWidget {
  final Group group;
  final VoidCallback? onTap;

  const GroupCard({
    super.key,
    required this.group,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final tier = GroupTiers.getTier(group.tier);

    return Card(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          child: Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      group.name,
                      style: Theme.of(context).textTheme.titleMedium,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 8, vertical: 2),
                          decoration: BoxDecoration(
                            color: tier.color.withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(
                            tier.name,
                            style: Theme.of(context)
                                .textTheme
                                .labelSmall
                                ?.copyWith(color: tier.color),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 8, vertical: 2),
                          decoration: BoxDecoration(
                            color: cs.secondaryContainer,
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(
                            '${group.memberCount} members',
                            style: Theme.of(context)
                                .textTheme
                                .labelSmall
                                ?.copyWith(color: cs.onSecondaryContainer),
                          ),
                        ),
                        if (group.role == 'admin') ...[
                          const SizedBox(width: 8),
                          Icon(Icons.shield,
                              size: 14, color: cs.primary),
                        ],
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              Column(
                children: [
                  Icon(Icons.local_fire_department,
                      color: tier.color, size: 20),
                  Text(
                    '${group.currentStreak}',
                    style: Theme.of(context)
                        .textTheme
                        .titleMedium
                        ?.copyWith(
                          fontWeight: FontWeight.bold,
                          color: tier.color,
                        ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

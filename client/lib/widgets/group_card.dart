import 'package:flutter/material.dart';
import '../config/group_tiers.dart';
import '../models/group.dart';

class GroupCard extends StatelessWidget {
  final Group group;
  final VoidCallback? onTap;

  const GroupCard({super.key, required this.group, this.onTap});

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final tier = GroupTiers.getTier(group.tier);

    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
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
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w500,
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 6),
                    Row(
                      children: [
                        _badge(context, label: tier.name),
                        const SizedBox(width: 6),
                        _badge(context, label: '${group.memberCount} members'),
                        if (group.role == 'admin') ...[
                          const SizedBox(width: 6),
                          Icon(
                            Icons.shield_outlined,
                            size: 14,
                            color: cs.onSurfaceVariant,
                          ),
                        ],
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              Column(
                children: [
                  Icon(
                    Icons.local_fire_department,
                    color: cs.onSurfaceVariant,
                    size: 20,
                  ),
                  Text(
                    '${group.currentStreak}',
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                      color: cs.onSurface,
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

  Widget _badge(BuildContext context, {required String label}) {
    final cs = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: cs.onSurface.withValues(alpha: 0.06),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(
        label,
        style: Theme.of(context).textTheme.labelSmall?.copyWith(
          color: cs.onSurfaceVariant,
          fontWeight: FontWeight.w500,
        ),
      ),
    );
  }
}

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/group.dart';
import '../models/group_member_status.dart';
import '../providers/auth_provider.dart';
import '../providers/group_provider.dart';

class NudgePromptSheet extends StatefulWidget {
  const NudgePromptSheet({super.key});

  @override
  State<NudgePromptSheet> createState() => _NudgePromptSheetState();
}

class _NudgePromptSheetState extends State<NudgePromptSheet> {
  bool _loading = true;
  final Map<String, List<GroupMemberStatus>> _incompleteByGroup = {};
  final List<Group> _groups = [];
  final Set<String> _nudgedUserIds = {};

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    final groupProvider = context.read<GroupProvider>();
    final currentUserId = context.read<AuthProvider>().user?.id;
    await groupProvider.loadGroups();
    if (!mounted) return;
    final groups = groupProvider.groups;

    for (final group in groups) {
      final members = await groupProvider.getGroupMembers(group.id);
      final incomplete = members
          .where((m) => !m.allDoneToday && m.userId != currentUserId)
          .toList();
      if (incomplete.isNotEmpty) {
        _incompleteByGroup[group.id] = incomplete;
        _groups.add(group);
      }
    }

    if (mounted) setState(() => _loading = false);
  }

  Future<void> _nudge(Group group, GroupMemberStatus member) async {
    final groupProvider = context.read<GroupProvider>();
    final result = await groupProvider.sendNudge(
      receiverId: member.userId,
      groupId: group.id,
    );

    if (!mounted) return;

    if (result != null) {
      setState(() => _nudgedUserIds.add(member.userId));
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('Nudged ${member.name}!')));
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(groupProvider.errorMessage ?? 'Failed to send nudge.'),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;

    return DraggableScrollableSheet(
      initialChildSize: 0.5,
      minChildSize: 0.3,
      maxChildSize: 0.85,
      expand: false,
      builder: (ctx, scrollController) => Column(
        children: [
          // Handle + header
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
            child: Column(
              children: [
                Center(
                  child: Container(
                    width: 40,
                    height: 4,
                    decoration: BoxDecoration(
                      color: Colors.grey[300],
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                Icon(Icons.celebration, size: 40, color: cs.primary),
                const SizedBox(height: 8),
                Text(
                  'Perfect day!',
                  style: Theme.of(
                    context,
                  ).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 4),
                Text(
                  'You finished all your habits. Nudge a friend who hasn\'t?',
                  style: Theme.of(
                    context,
                  ).textTheme.bodyMedium?.copyWith(color: cs.onSurfaceVariant),
                  textAlign: TextAlign.center,
                ),
                const Divider(height: 24),
              ],
            ),
          ),
          // Content
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator())
                : _groups.isEmpty
                ? Padding(
                    padding: const EdgeInsets.all(24),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          Icons.check_circle_outline,
                          size: 48,
                          color: Theme.of(context).colorScheme.primary,
                        ),
                        const SizedBox(height: 12),
                        Text(
                          'Everyone in your groups is done too!',
                          style: Theme.of(context).textTheme.bodyMedium,
                          textAlign: TextAlign.center,
                        ),
                      ],
                    ),
                  )
                : ListView.builder(
                    controller: scrollController,
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    itemCount: _groups.length,
                    itemBuilder: (context, index) {
                      final group = _groups[index];
                      final members = _incompleteByGroup[group.id] ?? [];
                      return _buildGroupSection(group, members);
                    },
                  ),
          ),
          // Dismiss button
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
            child: SizedBox(
              width: double.infinity,
              child: OutlinedButton(
                onPressed: () => Navigator.of(context).pop(),
                child: const Text('Maybe later'),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildGroupSection(Group group, List<GroupMemberStatus> members) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(top: 8, bottom: 4),
          child: Text(
            group.name,
            style: Theme.of(
              context,
            ).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.bold),
          ),
        ),
        ...members.map((member) {
          final alreadyNudged = _nudgedUserIds.contains(member.userId);
          return ListTile(
            contentPadding: EdgeInsets.zero,
            leading: CircleAvatar(
              radius: 18,
              backgroundColor: Theme.of(
                context,
              ).colorScheme.surfaceContainerHighest,
              child: Text(
                member.name.isNotEmpty ? member.name[0].toUpperCase() : '?',
                style: const TextStyle(fontWeight: FontWeight.bold),
              ),
            ),
            title: Text(member.name),
            subtitle: Text(
              '${member.habitsCompleted}/${member.habitsTotal} done',
              style: Theme.of(context).textTheme.bodySmall,
            ),
            trailing: alreadyNudged
                ? Chip(
                    avatar: const Icon(Icons.check, size: 14),
                    label: const Text('Nudged'),
                    visualDensity: VisualDensity.compact,
                  )
                : FilledButton.tonalIcon(
                    onPressed: () => _nudge(group, member),
                    icon: const Icon(Icons.notifications_active, size: 16),
                    label: const Text('Nudge'),
                  ),
          );
        }),
        const Divider(),
      ],
    );
  }
}

/// Show the nudge prompt sheet. Call after a habit completion returns perfectDay=true.
void showNudgePrompt(BuildContext context) {
  showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
    ),
    builder: (_) => const NudgePromptSheet(),
  );
}

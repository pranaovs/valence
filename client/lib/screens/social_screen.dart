import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../main.dart';
import '../providers/group_provider.dart';
import '../widgets/group_card.dart';
import '../widgets/group_help_sheet.dart';
import 'group_create_screen.dart';
import 'group_detail_screen.dart';

class SocialScreen extends StatefulWidget {
  const SocialScreen({super.key});

  @override
  State<SocialScreen> createState() => _SocialScreenState();
}

class _SocialScreenState extends State<SocialScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<GroupProvider>().loadGroups();
    });
  }

  void _showJoinDialog() {
    final groupIdController = TextEditingController();
    final inviteCodeController = TextEditingController();

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Join Group'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: groupIdController,
              decoration: const InputDecoration(
                labelText: 'Group ID',
                hintText: 'UUID of the group',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: inviteCodeController,
              decoration: const InputDecoration(
                labelText: 'Invite Code',
                hintText: 'e.g., AB3XK9Z2',
                border: OutlineInputBorder(),
              ),
              textCapitalization: TextCapitalization.characters,
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () async {
              final groupId = groupIdController.text.trim();
              final code = inviteCodeController.text.trim();
              if (groupId.isEmpty || code.isEmpty) return;

              Navigator.of(ctx).pop();
              final success = await context.read<GroupProvider>().joinGroup(
                groupId: groupId,
                inviteCode: code,
              );
              if (mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text(
                      success ? 'Joined group!' : 'Failed to join group.',
                    ),
                  ),
                );
              }
            },
            child: const Text('Join'),
          ),
        ],
      ),
    );
  }

  void _showAddOptions() {
    showModalBottomSheet(
      context: context,
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.add),
              title: const Text('Create a Group'),
              onTap: () async {
                Navigator.of(ctx).pop();
                final groupProv = context.read<GroupProvider>();
                final created = await Navigator.of(context).push<bool>(
                  MaterialPageRoute(
                    builder: (_) => const GroupCreateScreen(),
                    fullscreenDialog: true,
                  ),
                );
                if (created == true) {
                  groupProv.loadGroups();
                }
              },
            ),
            ListTile(
              leading: const Icon(Icons.group_add),
              title: const Text('Join a Group'),
              onTap: () {
                Navigator.of(ctx).pop();
                _showJoinDialog();
              },
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final groupProvider = context.watch<GroupProvider>();

    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.menu),
          onPressed: () => MainShell.scaffoldKey.currentState?.openDrawer(),
        ),
        title: const Text('Social'),
        actions: [
          IconButton(
            icon: const Icon(Icons.help_outline),
            tooltip: 'Help',
            onPressed: () => showGroupHelpSheet(context),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () => groupProvider.loadGroups(),
        child: _buildBody(groupProvider),
      ),
      floatingActionButton: FloatingActionButton(
        heroTag: 'social_fab',
        onPressed: _showAddOptions,
        child: const Icon(Icons.group_add),
      ),
    );
  }

  Widget _buildBody(GroupProvider groupProvider) {
    if (groupProvider.isLoading && groupProvider.groups.isEmpty) {
      return const Center(child: CircularProgressIndicator());
    }

    if (groupProvider.errorMessage != null && groupProvider.groups.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                Icons.error_outline,
                size: 48,
                color: Theme.of(context).colorScheme.error,
              ),
              const SizedBox(height: 16),
              Text(groupProvider.errorMessage!, textAlign: TextAlign.center),
              const SizedBox(height: 16),
              FilledButton(
                onPressed: () => groupProvider.loadGroups(),
                child: const Text('Retry'),
              ),
            ],
          ),
        ),
      );
    }

    if (groupProvider.groups.isEmpty) {
      return ListView(
        children: [
          SizedBox(height: MediaQuery.of(context).size.height * 0.25),
          const Icon(Icons.groups, size: 64, color: Colors.grey),
          const SizedBox(height: 16),
          const Text(
            'No groups yet.\nCreate or join a group to start!',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 16, color: Colors.grey),
          ),
        ],
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.only(top: 8, bottom: 80),
      itemCount: groupProvider.groups.length,
      itemBuilder: (context, index) {
        final group = groupProvider.groups[index];
        return GroupCard(
          group: group,
          onTap: () async {
            await Navigator.of(context).push(
              MaterialPageRoute(
                builder: (_) => GroupDetailScreen(group: group),
              ),
            );
            groupProvider.loadGroups();
          },
        );
      },
    );
  }
}

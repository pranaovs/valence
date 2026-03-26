import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../config/group_tiers.dart';
import '../models/group.dart';
import '../models/group_day_link.dart';
import '../models/group_feed_item.dart';
import '../models/group_member_status.dart';
import '../models/weekly_score.dart';
import '../providers/auth_provider.dart';
import '../providers/group_provider.dart';

class GroupDetailScreen extends StatefulWidget {
  final Group group;

  const GroupDetailScreen({super.key, required this.group});

  @override
  State<GroupDetailScreen> createState() => _GroupDetailScreenState();
}

class _GroupDetailScreenState extends State<GroupDetailScreen> {
  bool _loading = true;
  Map<String, dynamic>? _detail;
  List<GroupMemberStatus> _todayMembers = [];
  List<GroupDayLink> _chainLinks = [];
  List<WeeklyScore> _leaderboard = [];
  List<GroupFeedItem> _feed = [];
  Group get _group => widget.group;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() => _loading = true);
    final provider = context.read<GroupProvider>();

    final results = await Future.wait([
      provider.getGroupDetail(_group.id),
      provider.getGroupStreak(_group.id),
      provider.getGroupLeaderboard(_group.id),
      provider.getGroupFeed(_group.id),
    ]);

    if (!mounted) return;

    final detail = results[0] as Map<String, dynamic>?;
    final chainLinks = results[1] as List<GroupDayLink>;
    final leaderboard = results[2] as List<WeeklyScore>;
    final feed = results[3] as List<GroupFeedItem>;

    List<GroupMemberStatus> members = [];
    if (detail != null && detail['members'] is List) {
      members = (detail['members'] as List)
          .whereType<Map<String, dynamic>>()
          .map((m) => GroupMemberStatus.fromJson(m))
          .toList();
    }

    setState(() {
      _detail = detail;
      _todayMembers = members;
      _chainLinks = chainLinks;
      _leaderboard = leaderboard;
      _feed = feed;
      _loading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final tier = GroupTiers.getTier(_group.tier);

    return Scaffold(
      appBar: AppBar(
        title: Text(_group.name),
        actions: [
          PopupMenuButton<String>(
            onSelected: (value) async {
              if (value == 'leave') {
                final groupProv = context.read<GroupProvider>();
                final nav = Navigator.of(context);
                final messenger = ScaffoldMessenger.of(context);
                final confirmed = await showDialog<bool>(
                  context: context,
                  builder: (ctx) => AlertDialog(
                    title: const Text('Leave Group'),
                    content: Text(
                        'Are you sure you want to leave "${_group.name}"?'),
                    actions: [
                      TextButton(
                        onPressed: () => Navigator.of(ctx).pop(false),
                        child: const Text('Cancel'),
                      ),
                      FilledButton(
                        onPressed: () => Navigator.of(ctx).pop(true),
                        child: const Text('Leave'),
                      ),
                    ],
                  ),
                );
                if (confirmed == true && mounted) {
                  final success =
                      await groupProv.leaveGroup(_group.id);
                  if (mounted) {
                    if (success) {
                      nav.pop();
                    } else {
                      messenger.showSnackBar(
                        const SnackBar(
                            content: Text('Failed to leave group.')),
                      );
                    }
                  }
                }
              }
            },
            itemBuilder: (_) => [
              const PopupMenuItem(
                value: 'leave',
                child: Text('Leave Group'),
              ),
            ],
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _loadData,
        child: _loading
            ? const Center(child: CircularProgressIndicator())
            : ListView(
                padding: const EdgeInsets.only(bottom: 24),
                children: [
                  _buildSummary(cs, tier),
                  _buildTodayStatus(cs),
                  if (_chainLinks.isNotEmpty) _buildChainHistory(cs),
                  if (_leaderboard.isNotEmpty) _buildLeaderboard(cs),
                  _buildFreezeSection(cs),
                  _buildInviteCode(cs),
                  if (_feed.isNotEmpty) _buildFeed(cs),
                ],
              ),
      ),
    );
  }

  Widget _buildSummary(ColorScheme cs, ({String name, Color color}) tier) {
    final progress = GroupTiers.getProgress(_group.currentStreak);
    final nextTier = GroupTiers.getNextTierStreak(_group.currentStreak);

    return Card(
      margin: const EdgeInsets.all(16),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            SizedBox(
              width: 56,
              height: 56,
              child: Stack(
                alignment: Alignment.center,
                children: [
                  CircularProgressIndicator(
                    value: progress,
                    strokeWidth: 4,
                    backgroundColor: cs.surfaceContainerHighest,
                    color: tier.color,
                  ),
                  Icon(Icons.local_fire_department,
                      color: tier.color, size: 24),
                ],
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 8, vertical: 2),
                        decoration: BoxDecoration(
                          color: tier.color.withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(tier.name,
                            style: TextStyle(
                                color: tier.color,
                                fontWeight: FontWeight.bold,
                                fontSize: 12)),
                      ),
                      const SizedBox(width: 8),
                      Text('${_group.currentStreak}/$nextTier days',
                          style: Theme.of(context).textTheme.bodySmall),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Streak: ${_group.currentStreak}  |  Longest: ${_group.longestStreak}  |  Links: ${_group.totalLinks}',
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTodayStatus(ColorScheme cs) {
    final raw = _detail?['today_status'] ?? _detail?['todayStatus'];
    final todayStatus = raw is Map<String, dynamic> ? raw : <String, dynamic>{};
    final membersDone =
        todayStatus['members_done'] ?? todayStatus['membersDone'] ?? 0;
    final membersTotal =
        todayStatus['members_total'] ?? todayStatus['membersTotal'] ?? 0;
    final projectedLink = (todayStatus['projected_link_type'] ??
        todayStatus['projectedLinkType'] ??
        'broken') as String;
    final currentUserId = context.read<AuthProvider>().user?.id;

    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Text("Today's Status",
                    style: Theme.of(context)
                        .textTheme
                        .titleSmall
                        ?.copyWith(fontWeight: FontWeight.bold)),
                const Spacer(),
                Icon(GroupTiers.chainLinkIcon(projectedLink),
                    color: GroupTiers.chainLinkColor(projectedLink),
                    size: 20),
                const SizedBox(width: 4),
                Text('$membersDone/$membersTotal done',
                    style: Theme.of(context).textTheme.bodySmall),
              ],
            ),
            if (_todayMembers.isNotEmpty) ...[
              const SizedBox(height: 8),
              ..._todayMembers.map((m) {
                final isSelf = m.userId == currentUserId;
                return Padding(
                  padding: const EdgeInsets.symmetric(vertical: 2),
                  child: Row(
                    children: [
                      Icon(
                        m.allDoneToday
                            ? Icons.check_circle
                            : Icons.radio_button_unchecked,
                        color: m.allDoneToday ? Colors.green : Colors.grey,
                        size: 18,
                      ),
                      const SizedBox(width: 8),
                      Expanded(child: Text(m.name)),
                      Text('${m.habitsCompleted}/${m.habitsTotal}',
                          style: Theme.of(context).textTheme.bodySmall),
                      if (!isSelf) ...[
                        const SizedBox(width: 4),
                        if (m.allDoneToday)
                          _kudosButton(m.userId, m.name)
                        else
                          _nudgeButton(m.userId, m.name),
                      ],
                    ],
                  ),
                );
              }),
            ],
          ],
        ),
      ),
    );
  }

  Widget _nudgeButton(String receiverId, String receiverName) {
    return IconButton(
      icon: const Icon(Icons.notifications_active, size: 18),
      tooltip: 'Nudge $receiverName',
      padding: EdgeInsets.zero,
      constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
      onPressed: () => _sendNudge(receiverId, receiverName),
    );
  }

  Widget _kudosButton(String receiverId, String receiverName) {
    return IconButton(
      icon: const Icon(Icons.thumb_up, size: 18),
      tooltip: 'Send kudos to $receiverName',
      padding: EdgeInsets.zero,
      constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
      onPressed: () => _sendKudos(receiverId, receiverName),
    );
  }

  Future<void> _sendNudge(String receiverId, String receiverName) async {
    final result = await context.read<GroupProvider>().sendNudge(
          receiverId: receiverId,
          groupId: _group.id,
        );
    if (!mounted) return;

    if (result != null) {
      showDialog(
        context: context,
        builder: (ctx) => AlertDialog(
          title: Text('Nudge sent to $receiverName'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(result.llmGeneratedMessage),
              if (result.memeGifUrl != null) ...[
                const SizedBox(height: 12),
                ClipRRect(
                  borderRadius: BorderRadius.circular(8),
                  child: Image.network(
                    result.memeGifPreview ?? result.memeGifUrl!,
                    height: 150,
                    fit: BoxFit.cover,
                    errorBuilder: (_, __, ___) => const SizedBox.shrink(),
                  ),
                ),
              ],
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(ctx).pop(),
              child: const Text('OK'),
            ),
          ],
        ),
      );
      _loadData();
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(context.read<GroupProvider>().errorMessage ??
              'Failed to send nudge.'),
        ),
      );
    }
  }

  Future<void> _sendKudos(String receiverId, String receiverName) async {
    final result = await context.read<GroupProvider>().sendKudos(
          receiverId: receiverId,
          groupId: _group.id,
        );
    if (!mounted) return;

    if (result != null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Kudos sent to $receiverName!')),
      );
      _loadData();
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(context.read<GroupProvider>().errorMessage ??
              'Failed to send kudos.'),
        ),
      );
    }
  }

  Widget _buildChainHistory(ColorScheme cs) {
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Chain Link History',
                style: Theme.of(context)
                    .textTheme
                    .titleSmall
                    ?.copyWith(fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            SizedBox(
              height: 40,
              child: ListView.builder(
                scrollDirection: Axis.horizontal,
                itemCount: _chainLinks.length,
                itemBuilder: (context, index) {
                  final link = _chainLinks[index];
                  return Tooltip(
                    message:
                        '${link.date} — ${link.linkType}${link.freezeUsed ? ' (frozen)' : ''}',
                    child: Container(
                      width: 28,
                      height: 28,
                      margin: const EdgeInsets.symmetric(horizontal: 2),
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: GroupTiers.chainLinkColor(link.linkType),
                        border: link.freezeUsed
                            ? Border.all(color: Colors.blue, width: 2)
                            : null,
                      ),
                      child: Icon(
                        GroupTiers.chainLinkIcon(link.linkType),
                        size: 14,
                        color: Colors.white,
                      ),
                    ),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildLeaderboard(ColorScheme cs) {
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Weekly Leaderboard',
                style: Theme.of(context)
                    .textTheme
                    .titleSmall
                    ?.copyWith(fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            ..._leaderboard.map((score) => Padding(
                  padding: const EdgeInsets.symmetric(vertical: 4),
                  child: Row(
                    children: [
                      SizedBox(
                        width: 24,
                        child: Text(
                          '#${score.rankInGroup ?? '-'}',
                          style: Theme.of(context)
                              .textTheme
                              .bodySmall
                              ?.copyWith(fontWeight: FontWeight.bold),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(child: Text(score.userName)),
                      Text('${score.contributionScore} pts',
                          style: Theme.of(context).textTheme.bodySmall),
                    ],
                  ),
                )),
          ],
        ),
      ),
    );
  }

  Widget _buildFreezeSection(ColorScheme cs) {
    final user = context.read<AuthProvider>().user;
    final sparks = user?.sparks ?? 0;

    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Group Freeze',
                style: Theme.of(context)
                    .textTheme
                    .titleSmall
                    ?.copyWith(fontWeight: FontWeight.bold)),
            const SizedBox(height: 4),
            Text(
              'Protect the chain for today. Costs 100 Sparks. Max 1/day.',
              style: Theme.of(context).textTheme.bodySmall,
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                FilledButton.icon(
                  onPressed: sparks >= 100
                      ? () async {
                          final result = await context
                              .read<GroupProvider>()
                              .groupFreeze(_group.id);
                          if (mounted) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Text(result?.message ??
                                    'Failed to activate freeze.'),
                              ),
                            );
                            if (result != null) _loadData();
                          }
                        }
                      : null,
                  icon: const Icon(Icons.ac_unit),
                  label: const Text('Use Freeze (100 Sparks)'),
                ),
                const Spacer(),
                Text('$sparks Sparks',
                    style: Theme.of(context).textTheme.bodySmall),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildInviteCode(ColorScheme cs) {
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Invite Code',
                      style: Theme.of(context)
                          .textTheme
                          .titleSmall
                          ?.copyWith(fontWeight: FontWeight.bold)),
                  const SizedBox(height: 4),
                  Text(_group.inviteCode,
                      style: Theme.of(context)
                          .textTheme
                          .headlineSmall
                          ?.copyWith(
                            fontFamily: 'monospace',
                            letterSpacing: 2,
                          )),
                ],
              ),
            ),
            IconButton(
              icon: const Icon(Icons.copy),
              tooltip: 'Copy invite code',
              onPressed: () {
                Clipboard.setData(ClipboardData(text: _group.inviteCode));
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Invite code copied!')),
                );
              },
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFeed(ColorScheme cs) {
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Activity',
                style: Theme.of(context)
                    .textTheme
                    .titleSmall
                    ?.copyWith(fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            ..._feed.take(20).map((item) => Padding(
                  padding: const EdgeInsets.symmetric(vertical: 4),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Icon(_feedIcon(item.type),
                          size: 16, color: cs.onSurfaceVariant),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(item.displayText,
                            style: Theme.of(context).textTheme.bodySmall),
                      ),
                    ],
                  ),
                )),
          ],
        ),
      ),
    );
  }

  IconData _feedIcon(String type) {
    switch (type) {
      case 'completion':
        return Icons.check_circle_outline;
      case 'perfect_day':
        return Icons.star;
      case 'group_link_gold':
        return Icons.link;
      case 'group_link_silver':
        return Icons.link;
      case 'group_link_broken':
        return Icons.link_off;
      case 'freeze_used':
        return Icons.ac_unit;
      case 'member_joined':
        return Icons.person_add;
      case 'member_left':
        return Icons.person_remove;
      case 'nudge':
        return Icons.notifications_active;
      case 'kudos':
        return Icons.thumb_up;
      case 'streak_milestone':
        return Icons.emoji_events;
      case 'rank_promotion':
        return Icons.arrow_upward;
      default:
        return Icons.circle;
    }
  }
}

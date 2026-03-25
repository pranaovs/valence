import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/app_notification.dart';
import '../providers/notification_provider.dart';

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  bool _showUnreadOnly = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<NotificationProvider>().loadNotifications();
    });
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<NotificationProvider>();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Notifications'),
        actions: [
          FilterChip(
            label: const Text('Unread'),
            selected: _showUnreadOnly,
            onSelected: (v) {
              setState(() => _showUnreadOnly = v);
              provider.loadNotifications(unreadOnly: v);
            },
          ),
          const SizedBox(width: 4),
          if (provider.unreadCount > 0)
            IconButton(
              icon: const Icon(Icons.done_all),
              tooltip: 'Mark all as read',
              onPressed: () => provider.markAllAsRead(),
            ),
          const SizedBox(width: 8),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () =>
            provider.loadNotifications(unreadOnly: _showUnreadOnly),
        child: _buildBody(provider),
      ),
    );
  }

  Widget _buildBody(NotificationProvider provider) {
    if (provider.isLoading && provider.notifications.isEmpty) {
      return const Center(child: CircularProgressIndicator());
    }

    if (provider.errorMessage != null && provider.notifications.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.error_outline,
                  size: 48, color: Theme.of(context).colorScheme.error),
              const SizedBox(height: 16),
              Text(provider.errorMessage!, textAlign: TextAlign.center),
              const SizedBox(height: 16),
              FilledButton(
                onPressed: () => provider.loadNotifications(
                    unreadOnly: _showUnreadOnly),
                child: const Text('Retry'),
              ),
            ],
          ),
        ),
      );
    }

    if (provider.notifications.isEmpty) {
      return ListView(
        children: [
          SizedBox(height: MediaQuery.of(context).size.height * 0.25),
          const Icon(Icons.notifications_none, size: 64, color: Colors.grey),
          const SizedBox(height: 16),
          Text(
            _showUnreadOnly
                ? 'No unread notifications.'
                : 'No notifications yet.',
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 16, color: Colors.grey),
          ),
        ],
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.only(top: 4, bottom: 24),
      itemCount: provider.notifications.length,
      itemBuilder: (context, index) {
        final notification = provider.notifications[index];
        return _NotificationTile(
          notification: notification,
          onTap: () {
            if (!notification.read) {
              provider.markAsRead(notification.id);
            }
          },
        );
      },
    );
  }
}

class _NotificationTile extends StatelessWidget {
  final AppNotification notification;
  final VoidCallback onTap;

  const _NotificationTile({
    required this.notification,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;

    return ListTile(
      leading: CircleAvatar(
        backgroundColor: notification.read
            ? cs.surfaceContainerHighest
            : _typeColor(notification.type).withValues(alpha: 0.15),
        child: Icon(
          _typeIcon(notification.type),
          size: 20,
          color: notification.read
              ? cs.onSurfaceVariant
              : _typeColor(notification.type),
        ),
      ),
      title: Text(
        notification.displayTitle,
        style: TextStyle(
          fontWeight: notification.read ? FontWeight.normal : FontWeight.bold,
        ),
      ),
      subtitle: notification.displayBody.isNotEmpty
          ? Text(
              notification.displayBody,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            )
          : null,
      trailing: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          Text(
            _formatTime(notification.createdAt),
            style: Theme.of(context).textTheme.labelSmall,
          ),
          if (!notification.read) ...[
            const SizedBox(height: 4),
            Container(
              width: 8,
              height: 8,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: cs.primary,
              ),
            ),
          ],
        ],
      ),
      tileColor: notification.read ? null : cs.primaryContainer.withValues(alpha: 0.1),
      onTap: onTap,
    );
  }

  IconData _typeIcon(String type) {
    switch (type) {
      case 'morning_activation':
        return Icons.wb_sunny;
      case 'friend_nudge':
        return Icons.notifications_active;
      case 'preemptive_warning':
        return Icons.warning_amber;
      case 'reflection_prompt':
        return Icons.edit_note;
      case 'kudos_received':
        return Icons.thumb_up;
      case 'streak_milestone':
        return Icons.local_fire_department;
      case 'goal_milestone':
        return Icons.flag;
      case 'rank_promotion':
        return Icons.arrow_upward;
      case 'weekly_summary':
        return Icons.summarize;
      default:
        return Icons.notifications;
    }
  }

  Color _typeColor(String type) {
    switch (type) {
      case 'morning_activation':
        return Colors.amber;
      case 'friend_nudge':
        return Colors.blue;
      case 'preemptive_warning':
        return Colors.orange;
      case 'reflection_prompt':
        return Colors.purple;
      case 'kudos_received':
        return Colors.green;
      case 'streak_milestone':
        return Colors.deepOrange;
      case 'goal_milestone':
        return Colors.teal;
      case 'rank_promotion':
        return Colors.indigo;
      case 'weekly_summary':
        return Colors.blueGrey;
      default:
        return Colors.grey;
    }
  }

  String _formatTime(DateTime dt) {
    final diff = DateTime.now().difference(dt);
    if (diff.inMinutes < 1) return 'now';
    if (diff.inMinutes < 60) return '${diff.inMinutes}m';
    if (diff.inHours < 24) return '${diff.inHours}h';
    if (diff.inDays < 7) return '${diff.inDays}d';
    return '${dt.day}/${dt.month}';
  }
}

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/habit_completion.dart';
import '../providers/auth_provider.dart';
import '../providers/habit_provider.dart';
import '../providers/notification_provider.dart';
import '../providers/theme_provider.dart';
import '../widgets/habit_card.dart';
import '../widgets/motivation_card.dart';
import '../widgets/nudge_prompt_sheet.dart';
import 'habit_detail_screen.dart';
import 'habit_edit_screen.dart';
import 'notifications_screen.dart';
import '../main.dart';

class HabitsScreen extends StatefulWidget {
  const HabitsScreen({super.key});

  @override
  State<HabitsScreen> createState() => _HabitsScreenState();
}

class _HabitsScreenState extends State<HabitsScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<HabitProvider>().loadHabits();
      context.read<NotificationProvider>().loadNotifications();
    });
  }

  void _showCompletionSnackbar(HabitCompletionResult result) {
    final msg = StringBuffer('+${result.xpEarned} XP, +${result.sparksEarned} Sparks');
    if (result.perfectDay) msg.write(' | Perfect day!');
    if (result.goalStageChanged) msg.write(' | Stage changed!');
    ScaffoldMessenger.of(context)
        .showSnackBar(SnackBar(content: Text(msg.toString())));

    if (result.perfectDay) {
      // Small delay so the snackbar shows first
      Future.delayed(const Duration(milliseconds: 500), () {
        if (mounted) showNudgePrompt(context);
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final habitProvider = context.watch<HabitProvider>();
    final user = auth.user;

    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.menu),
          onPressed: () => MainShell.scaffoldKey.currentState?.openDrawer(),
        ),
        title: const Text('Valence'),
        bottom: user != null
            ? PreferredSize(
                preferredSize: const Size.fromHeight(32),
                child: Padding(
                  padding:
                      const EdgeInsets.only(left: 16, right: 16, bottom: 8),
                  child: Row(
                    children: [
                      Text('${user.xp} XP',
                          style: Theme.of(context).textTheme.labelMedium?.copyWith(
                                color: Theme.of(context).colorScheme.onSurfaceVariant,
                              )),
                      const SizedBox(width: 12),
                      Container(
                        width: 3, height: 3,
                        decoration: BoxDecoration(
                          color: Theme.of(context).colorScheme.onSurfaceVariant,
                          shape: BoxShape.circle,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Text('${user.sparks} Sparks',
                          style: Theme.of(context).textTheme.labelMedium?.copyWith(
                                color: Theme.of(context).colorScheme.onSurfaceVariant,
                              )),
                      const Spacer(),
                      Text(
                        user.rank.isNotEmpty ? user.rank[0].toUpperCase() + user.rank.substring(1) : '',
                        style: Theme.of(context).textTheme.labelMedium
                            ?.copyWith(
                              fontWeight: FontWeight.w600,
                              color: Theme.of(context).colorScheme.onSurfaceVariant,
                            ),
                      ),
                    ],
                  ),
                ),
              )
            : null,
        actions: [
          Consumer<NotificationProvider>(
            builder: (context, notifProvider, _) {
              final unread = notifProvider.unreadCount;
              return IconButton(
                icon: Badge(
                  isLabelVisible: unread > 0,
                  label: Text('$unread'),
                  child: const Icon(Icons.notifications_outlined),
                ),
                tooltip: 'Notifications',
                onPressed: () async {
                  await Navigator.of(context).push(
                    MaterialPageRoute(
                      builder: (_) => const NotificationsScreen(),
                    ),
                  );
                  notifProvider.loadNotifications();
                },
              );
            },
          ),
          Builder(builder: (context) {
            final themeProvider = context.watch<ThemeProvider>();
            return IconButton(
              icon: Icon(
                themeProvider.isDark
                    ? Icons.light_mode_outlined
                    : Icons.dark_mode_outlined,
              ),
              tooltip: themeProvider.isDark ? 'Light mode' : 'Dark mode',
              onPressed: () => themeProvider.toggle(),
            );
          }),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () => habitProvider.loadHabits(),
        child: _buildBody(habitProvider),
      ),
      floatingActionButton: FloatingActionButton(
        heroTag: 'habits_fab',
        onPressed: () async {
          final created = await Navigator.of(context).push<bool>(
            MaterialPageRoute(
              builder: (_) => const HabitEditScreen(),
              fullscreenDialog: true,
            ),
          );
          if (created == true) {
            habitProvider.loadHabits();
          }
        },
        child: const Icon(Icons.add),
      ),
    );
  }

  Widget _buildBody(HabitProvider habitProvider) {
    if (habitProvider.isLoading && habitProvider.habits.isEmpty) {
      return const Center(child: CircularProgressIndicator());
    }

    if (habitProvider.errorMessage != null && habitProvider.habits.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.error_outline, size: 48,
                  color: Theme.of(context).colorScheme.error),
              const SizedBox(height: 16),
              Text(habitProvider.errorMessage!,
                  textAlign: TextAlign.center),
              const SizedBox(height: 16),
              FilledButton(
                onPressed: () => habitProvider.loadHabits(),
                child: const Text('Retry'),
              ),
            ],
          ),
        ),
      );
    }

    if (habitProvider.habits.isEmpty) {
      return ListView(
        children: [
          SizedBox(height: MediaQuery.of(context).size.height * 0.25),
          const Icon(Icons.track_changes, size: 64, color: Colors.grey),
          const SizedBox(height: 16),
          const Text(
            'No habits yet.\nTap + to create your first habit!',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 16, color: Colors.grey),
          ),
        ],
      );
    }

    final done = habitProvider.habits.where((h) => h.todayCompleted).length;
    final total = habitProvider.habits.length;

    return ListView.builder(
      padding: const EdgeInsets.only(top: 0, bottom: 80),
      itemCount: habitProvider.habits.length + 2, // motivation + summary + habits
      itemBuilder: (context, index) {
        if (index == 0) return const MotivationCard();
        if (index == 1) {
          return _buildDailySummary(done, total);
        }
        final habit = habitProvider.habits[index - 2];
        return HabitCard(
          habit: habit,
          onTap: () async {
            await Navigator.of(context).push(
              MaterialPageRoute(
                builder: (_) => HabitDetailScreen(habit: habit),
              ),
            );
            habitProvider.loadHabits();
          },
          onComplete: () async {
            final result = await habitProvider.completeHabit(habit.id);
            if (result != null && mounted) {
              _showCompletionSnackbar(result);
            }
          },
        );
      },
    );
  }

  Widget _buildDailySummary(int done, int total) {
    final cs = Theme.of(context).colorScheme;
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Row(
        children: [
          Expanded(
            child: ClipRRect(
              borderRadius: BorderRadius.circular(4),
              child: LinearProgressIndicator(
                value: total > 0 ? done / total : 0,
                minHeight: 6,
                backgroundColor: cs.onSurface.withValues(alpha: 0.08),
                color: cs.primary,
              ),
            ),
          ),
          const SizedBox(width: 12),
          Text(
            '$done/$total',
            style: Theme.of(context).textTheme.labelLarge?.copyWith(
                  fontWeight: FontWeight.w600,
                  color: cs.onSurfaceVariant,
                ),
          ),
        ],
      ),
    );
  }
}

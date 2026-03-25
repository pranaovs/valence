import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/habit_completion.dart';
import '../providers/auth_provider.dart';
import '../providers/habit_provider.dart';
import '../widgets/habit_card.dart';
import 'habit_detail_screen.dart';
import 'habit_edit_screen.dart';

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
    });
  }

  void _showCompletionSnackbar(HabitCompletionResult result) {
    final msg = StringBuffer('+${result.xpEarned} XP, +${result.sparksEarned} Sparks');
    if (result.perfectDay) msg.write(' | Perfect day!');
    if (result.goalStageChanged) msg.write(' | Stage changed!');
    ScaffoldMessenger.of(context)
        .showSnackBar(SnackBar(content: Text(msg.toString())));
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final habitProvider = context.watch<HabitProvider>();
    final user = auth.user;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Valence'),
        bottom: user != null
            ? PreferredSize(
                preferredSize: const Size.fromHeight(32),
                child: Padding(
                  padding:
                      const EdgeInsets.only(left: 16, right: 16, bottom: 8),
                  child: Row(
                    children: [
                      Icon(Icons.star, size: 16,
                          color: Theme.of(context).colorScheme.primary),
                      const SizedBox(width: 4),
                      Text('${user.xp} XP',
                          style: Theme.of(context).textTheme.labelMedium),
                      const SizedBox(width: 16),
                      Icon(Icons.bolt, size: 16,
                          color: Theme.of(context).colorScheme.tertiary),
                      const SizedBox(width: 4),
                      Text('${user.sparks} Sparks',
                          style: Theme.of(context).textTheme.labelMedium),
                      const Spacer(),
                      Text(
                        user.rank[0].toUpperCase() + user.rank.substring(1),
                        style: Theme.of(context).textTheme.labelMedium
                            ?.copyWith(fontWeight: FontWeight.bold),
                      ),
                    ],
                  ),
                ),
              )
            : null,
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            tooltip: 'Sign out',
            onPressed: () => auth.signOut(),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () => habitProvider.loadHabits(),
        child: _buildBody(habitProvider),
      ),
      floatingActionButton: FloatingActionButton(
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

    return ListView.builder(
      padding: const EdgeInsets.only(top: 8, bottom: 80),
      itemCount: habitProvider.habits.length,
      itemBuilder: (context, index) {
        final habit = habitProvider.habits[index];
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
}

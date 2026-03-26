import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/api_response.dart';
import '../providers/auth_provider.dart';
import '../services/api_service.dart';
import '../services/auth_service.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  final _apiService = ApiService();
  final _authService = AuthService();
  bool _saving = false;

  late String _personaType;
  late bool _morningNotifs;
  late bool _nudgeNotifs;
  late bool _memeNotifs;
  late bool _reflectionNotifs;

  @override
  void initState() {
    super.initState();
    final user = context.read<AuthProvider>().user;
    _personaType = user?.personaType ?? 'general';
    final prefs = user?.notificationPreferences ?? {};
    _morningNotifs = prefs['morning'] as bool? ?? true;
    _nudgeNotifs = prefs['nudges'] as bool? ?? true;
    _memeNotifs = prefs['memes'] as bool? ?? true;
    _reflectionNotifs = prefs['reflection'] as bool? ?? true;
  }

  Future<void> _save() async {
    setState(() => _saving = true);
    try {
      final token = await _authService.getIdToken();
      await _apiService.updateSettings(
        token: token,
        personaType: _personaType,
        notificationPreferences: {
          'morning': _morningNotifs,
          'nudges': _nudgeNotifs,
          'memes': _memeNotifs,
          'reflection': _reflectionNotifs,
        },
      );
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(const SnackBar(content: Text('Settings saved.')));
        Navigator.of(context).pop();
      }
    } on ApiException catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(e.message)));
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Failed to save settings.')),
        );
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthProvider>().user;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Settings'),
        actions: [
          TextButton(
            onPressed: _saving ? null : _save,
            child: _saving
                ? const SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Text('Save'),
          ),
        ],
      ),
      body: ListView(
        children: [
          // Profile info
          if (user != null) ...[
            ListTile(
              leading: CircleAvatar(
                child: Text(
                  user.name.isNotEmpty ? user.name[0].toUpperCase() : '?',
                ),
              ),
              title: Text(user.name),
              subtitle: Text(user.email),
            ),
            ListTile(
              leading: const Icon(Icons.access_time),
              title: const Text('Timezone'),
              subtitle: Text(user.timezone),
            ),
            const Divider(),
          ],

          // Persona type
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
            child: Text(
              'Persona',
              style: Theme.of(
                context,
              ).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.bold),
            ),
          ),
          RadioGroup<String>(
            groupValue: _personaType,
            onChanged: (v) {
              if (v != null) setState(() => _personaType = v);
            },
            child: Column(
              children: [
                RadioListTile<String>(
                  title: const Text('Achiever'),
                  subtitle: const Text(
                    'Stats-forward: streaks, XP, rank progress',
                  ),
                  value: 'achiever',
                ),
                RadioListTile<String>(
                  title: const Text('Socialiser'),
                  subtitle: const Text('Group-focused: friends, chain links'),
                  value: 'socialiser',
                ),
                RadioListTile<String>(
                  title: const Text('General'),
                  subtitle: const Text('Balanced mix of stats and social'),
                  value: 'general',
                ),
              ],
            ),
          ),

          const Divider(),

          // Notification preferences
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
            child: Text(
              'Notifications',
              style: Theme.of(
                context,
              ).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.bold),
            ),
          ),
          SwitchListTile(
            title: const Text('Morning activation'),
            subtitle: const Text('Daily reminder to start your habits'),
            value: _morningNotifs,
            onChanged: (v) => setState(() => _morningNotifs = v),
          ),
          SwitchListTile(
            title: const Text('Friend nudges'),
            subtitle: const Text('Receive nudges from group members'),
            value: _nudgeNotifs,
            onChanged: (v) => setState(() => _nudgeNotifs = v),
          ),
          SwitchListTile(
            title: const Text('Memes'),
            subtitle: const Text('Include meme GIFs in nudge notifications'),
            value: _memeNotifs,
            onChanged: (v) => setState(() => _memeNotifs = v),
          ),
          SwitchListTile(
            title: const Text('Evening reflection'),
            subtitle: const Text('End-of-day prompt to reflect on habits'),
            value: _reflectionNotifs,
            onChanged: (v) => setState(() => _reflectionNotifs = v),
          ),

          const SizedBox(height: 32),
        ],
      ),
    );
  }
}

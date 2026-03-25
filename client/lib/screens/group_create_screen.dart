import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/group_provider.dart';

class GroupCreateScreen extends StatefulWidget {
  const GroupCreateScreen({super.key});

  @override
  State<GroupCreateScreen> createState() => _GroupCreateScreenState();
}

class _GroupCreateScreenState extends State<GroupCreateScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  bool _saving = false;

  @override
  void dispose() {
    _nameController.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _saving = true);

    final success = await context.read<GroupProvider>().createGroup(
          name: _nameController.text.trim(),
        );

    if (!mounted) return;
    setState(() => _saving = false);

    if (success) {
      Navigator.of(context).pop(true);
    } else {
      final error = context.read<GroupProvider>().errorMessage;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(error ?? 'Failed to create group.')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Create Group'),
        actions: [
          TextButton(
            onPressed: _saving ? null : _save,
            child: _saving
                ? const SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Text('Create'),
          ),
        ],
      ),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            TextFormField(
              controller: _nameController,
              decoration: const InputDecoration(
                labelText: 'Group Name',
                hintText: 'e.g., Morning Warriors',
                border: OutlineInputBorder(),
              ),
              maxLength: 100,
              validator: (v) {
                if (v == null || v.trim().isEmpty) {
                  return 'Name is required';
                }
                return null;
              },
              autofocus: true,
            ),
          ],
        ),
      ),
    );
  }
}

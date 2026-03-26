import 'package:flutter/material.dart';

class MissReasonDialog extends StatefulWidget {
  const MissReasonDialog({super.key});

  @override
  State<MissReasonDialog> createState() => _MissReasonDialogState();
}

class _MissReasonDialogState extends State<MissReasonDialog> {
  String _category = 'busy';
  final _textController = TextEditingController();

  static const _categories = [
    ('busy', 'Busy'),
    ('tired', 'Tired'),
    ('forgot', 'Forgot'),
    ('sick', 'Sick'),
    ('travel', 'Travel'),
    ('other', 'Other'),
  ];

  @override
  void dispose() {
    _textController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Log a miss'),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Why did you miss today?'),
          const SizedBox(height: 12),
          DropdownButtonFormField<String>(
            initialValue: _category,
            decoration: const InputDecoration(
              border: OutlineInputBorder(),
              labelText: 'Reason',
            ),
            items: _categories
                .map((c) => DropdownMenuItem(value: c.$1, child: Text(c.$2)))
                .toList(),
            onChanged: (v) {
              if (v != null) setState(() => _category = v);
            },
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _textController,
            decoration: const InputDecoration(
              border: OutlineInputBorder(),
              labelText: 'Details (optional)',
              hintText: 'e.g., Had meetings all day',
            ),
            maxLines: 2,
            maxLength: 500,
          ),
        ],
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: const Text('Cancel'),
        ),
        FilledButton(
          onPressed: () {
            Navigator.of(context).pop({
              'category': _category,
              'text': _textController.text.trim().isEmpty
                  ? null
                  : _textController.text.trim(),
            });
          },
          child: const Text('Submit'),
        ),
      ],
    );
  }
}

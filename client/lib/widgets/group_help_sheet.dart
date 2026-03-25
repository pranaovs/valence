import 'package:flutter/material.dart';

void showGroupHelpSheet(BuildContext context) {
  showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
    ),
    builder: (ctx) => DraggableScrollableSheet(
      initialChildSize: 0.6,
      minChildSize: 0.3,
      maxChildSize: 0.9,
      expand: false,
      builder: (ctx, scrollController) => SingleChildScrollView(
        controller: scrollController,
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: 40,
                height: 4,
                margin: const EdgeInsets.only(bottom: 16),
                decoration: BoxDecoration(
                  color: Colors.grey[300],
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const ExpansionTile(
              title: Text('What is a Group?',
                  style: TextStyle(fontWeight: FontWeight.bold)),
              initiallyExpanded: true,
              children: [
                Padding(
                  padding: EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Groups are teams of 3-7 friends who hold each other accountable for building habits together.',
                      ),
                      SizedBox(height: 12),
                      Text('How Chain Links Work',
                          style: TextStyle(fontWeight: FontWeight.bold)),
                      SizedBox(height: 4),
                      Text(
                        'Each day, a chain link is forged based on group completion:\n\n'
                        '🥇 Gold link — ALL members complete all habits (bonus XP)\n'
                        '🥈 Silver link — ≥75% of members complete (streak continues)\n'
                        '🔗 Broken link — <75% complete (streak pauses)\n\n'
                        'Your individual streaks are NEVER affected by group performance.',
                      ),
                      SizedBox(height: 12),
                      Text('Group Tiers',
                          style: TextStyle(fontWeight: FontWeight.bold)),
                      SizedBox(height: 4),
                      Text(
                        '• Spark — 0+ days (default)\n'
                        '• Ember — 7+ days\n'
                        '• Flame — 21+ days\n'
                        '• Blaze — 66+ days\n\n'
                        'Tiers reflect current consistency and CAN go down if the streak breaks.',
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const ExpansionTile(
              title: Text('What are Freezes?',
                  style: TextStyle(fontWeight: FontWeight.bold)),
              children: [
                Padding(
                  padding: EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Altruistic streak freezes protect your group\'s chain when not enough members complete their habits.',
                      ),
                      SizedBox(height: 12),
                      Text('How it works:',
                          style: TextStyle(fontWeight: FontWeight.bold)),
                      SizedBox(height: 4),
                      Text(
                        '• Costs 100 Sparks from your balance\n'
                        '• Protects the group chain for today\n'
                        '• Max 1 freeze per group per day\n'
                        '• Converts a "broken" link to "silver"\n'
                        '• The streak continues but no bonus XP is awarded\n\n'
                        'This is a genuinely social act — you spend your earned currency to protect your friends.',
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const ExpansionTile(
              title: Text('Nudges & Kudos',
                  style: TextStyle(fontWeight: FontWeight.bold)),
              children: [
                Padding(
                  padding: EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Nudge',
                          style: TextStyle(fontWeight: FontWeight.bold)),
                      SizedBox(height: 4),
                      Text(
                        'Nudge a group member who hasn\'t completed their habits yet today. '
                        'An AI-generated personalized message is sent to encourage them.\n\n'
                        '• You must complete ALL your habits first before nudging\n'
                        '• Limit: 5 nudges per day, 1 per person per day\n'
                        '• May include a fun meme GIF if the receiver has memes enabled',
                      ),
                      SizedBox(height: 12),
                      Text('Kudos',
                          style: TextStyle(fontWeight: FontWeight.bold)),
                      SizedBox(height: 4),
                      Text(
                        'Send kudos to celebrate a group member who completed all their habits. '
                        'A quick positive reaction that boosts their weekly contribution score.\n\n'
                        '• Appears in the group activity feed\n'
                        '• Contributes to the weekly leaderboard',
                      ),
                    ],
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

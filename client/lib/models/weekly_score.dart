class WeeklyScore {
  final String id;
  final String userId;
  final String groupId;
  final String weekStartDate;
  final int contributionScore;
  final int habitsCompleted;
  final int goldLinkContributions;
  final int kudosReceived;
  final int? rankInGroup;
  final String userName;
  final String? userAvatar;
  final String userRank;

  const WeeklyScore({
    required this.id,
    required this.userId,
    required this.groupId,
    required this.weekStartDate,
    required this.contributionScore,
    required this.habitsCompleted,
    required this.goldLinkContributions,
    required this.kudosReceived,
    this.rankInGroup,
    required this.userName,
    this.userAvatar,
    required this.userRank,
  });

  factory WeeklyScore.fromJson(Map<String, dynamic> json) {
    return WeeklyScore(
      id: json['id'] as String,
      userId: (json['userId'] ?? json['user_id']) as String,
      groupId: (json['groupId'] ?? json['group_id']) as String,
      weekStartDate:
          (json['weekStartDate'] ?? json['week_start_date']) as String,
      contributionScore:
          (json['contributionScore'] ?? json['contribution_score'] ?? 0)
              as int,
      habitsCompleted:
          (json['habitsCompleted'] ?? json['habits_completed'] ?? 0) as int,
      goldLinkContributions: (json['goldLinkContributions'] ??
          json['gold_link_contributions'] ??
          0) as int,
      kudosReceived:
          (json['kudosReceived'] ?? json['kudos_received'] ?? 0) as int,
      rankInGroup:
          (json['rankInGroup'] ?? json['rank_in_group']) as int?,
      userName: (json['userName'] ?? json['user_name'] ?? '') as String,
      userAvatar:
          (json['userAvatar'] ?? json['user_avatar']) as String?,
      userRank:
          (json['userRank'] ?? json['user_rank'] ?? 'bronze') as String,
    );
  }
}

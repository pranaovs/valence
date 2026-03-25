import 'dart:convert';
import 'package:http/http.dart' as http;
import '../config/api_config.dart';
import '../models/api_response.dart';
import '../models/freeze_result.dart';
import '../models/group.dart';
import '../models/kudos_result.dart';
import '../models/nudge_result.dart';
import '../models/app_notification.dart';
import '../models/insights_result.dart';
import '../models/motivation_result.dart';
import '../models/group_day_link.dart';
import '../models/group_feed_item.dart';
import '../models/group_member_status.dart';
import '../models/habit.dart';
import '../models/habit_completion.dart';
import '../models/habit_log.dart';
import '../models/habit_miss.dart';
import '../models/user.dart';

class ApiService {
  final String baseUrl;
  final http.Client _client;

  ApiService({String? baseUrl, http.Client? client})
      : baseUrl = baseUrl ?? ApiConfig.baseUrl,
        _client = client ?? http.Client();

  Map<String, String> get _headers => {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      };

  Map<String, String> _authHeaders(String token) => {
        ..._headers,
        'Authorization': 'Bearer $token',
      };

  Future<ValenceUser> login({
    required String firebaseToken,
    String? fcmToken,
  }) async {
    final response = await _client.post(
      Uri.parse('$baseUrl${ApiConfig.loginPath}'),
      headers: _authHeaders(firebaseToken),
      body: jsonEncode({
        if (fcmToken != null) 'fcm_token': fcmToken,
      }),
    );
    return ApiResponse.parseSuccess(response, ValenceUser.fromJson);
  }

  Future<ValenceUser> register({
    required String firebaseToken,
    String? name,
    String? timezone,
  }) async {
    final response = await _client.post(
      Uri.parse('$baseUrl${ApiConfig.registerPath}'),
      headers: _authHeaders(firebaseToken),
      body: jsonEncode({
        if (name != null) 'name': name,
        if (timezone != null) 'timezone': timezone,
      }),
    );
    return ApiResponse.parseSuccess(response, ValenceUser.fromJson);
  }

  Future<ValenceUser> refresh({required String firebaseToken}) async {
    final response = await _client.post(
      Uri.parse('$baseUrl${ApiConfig.refreshPath}'),
      headers: _authHeaders(firebaseToken),
    );
    return ApiResponse.parseSuccess(response, ValenceUser.fromJson);
  }

  // ── Habits ──

  Future<List<Habit>> getHabits({required String token}) async {
    final response = await _client.get(
      Uri.parse('$baseUrl${ApiConfig.habitsPath}'),
      headers: _authHeaders(token),
    );
    return ApiResponse.parseSuccessList(response, Habit.fromJson);
  }

  Future<Habit> createHabit({
    required String token,
    required String name,
    String? intensity,
    String? trackingMethod,
    String? pluginId,
    String? redirectUrl,
    String? visibility,
  }) async {
    final response = await _client.post(
      Uri.parse('$baseUrl${ApiConfig.habitsPath}'),
      headers: _authHeaders(token),
      body: jsonEncode({
        'name': name,
        if (intensity != null) 'intensity': intensity,
        if (trackingMethod != null) 'tracking_method': trackingMethod,
        if (pluginId != null) 'plugin_id': pluginId,
        if (redirectUrl != null) 'redirect_url': redirectUrl,
        if (visibility != null) 'visibility': visibility,
      }),
    );
    return ApiResponse.parseSuccess(response, Habit.fromJson);
  }

  Future<Habit> updateHabit({
    required String token,
    required String habitId,
    String? name,
    String? intensity,
    String? trackingMethod,
    String? pluginId,
    String? redirectUrl,
    String? visibility,
  }) async {
    final response = await _client.patch(
      Uri.parse('$baseUrl${ApiConfig.habitsPath}/$habitId'),
      headers: _authHeaders(token),
      body: jsonEncode({
        if (name != null) 'name': name,
        if (intensity != null) 'intensity': intensity,
        if (trackingMethod != null) 'tracking_method': trackingMethod,
        if (pluginId != null) 'plugin_id': pluginId,
        if (redirectUrl != null) 'redirect_url': redirectUrl,
        if (visibility != null) 'visibility': visibility,
      }),
    );
    return ApiResponse.parseSuccess(response, Habit.fromJson);
  }

  Future<void> archiveHabit({
    required String token,
    required String habitId,
  }) async {
    final response = await _client.delete(
      Uri.parse('$baseUrl${ApiConfig.habitsPath}/$habitId'),
      headers: _authHeaders(token),
    );
    if (response.statusCode < 200 || response.statusCode >= 300) {
      final body = jsonDecode(response.body) as Map<String, dynamic>;
      final error = body['error'] as Map<String, dynamic>?;
      throw ApiException(
        code: error?['code'] as String? ?? 'UNKNOWN',
        message: error?['message'] as String? ?? 'Failed to archive habit.',
      );
    }
  }

  Future<HabitCompletionResult> completeHabit({
    required String token,
    required String habitId,
  }) async {
    final response = await _client.post(
      Uri.parse('$baseUrl${ApiConfig.habitsPath}/$habitId/complete'),
      headers: _authHeaders(token),
      body: jsonEncode({'verification_source': 'manual'}),
    );
    return ApiResponse.parseSuccess(response, HabitCompletionResult.fromJson);
  }

  Future<HabitMissResult> missHabit({
    required String token,
    required String habitId,
    required String reasonCategory,
    String? reasonText,
  }) async {
    final response = await _client.post(
      Uri.parse('$baseUrl${ApiConfig.habitsPath}/$habitId/miss'),
      headers: _authHeaders(token),
      body: jsonEncode({
        'reason_category': reasonCategory,
        if (reasonText != null) 'reason_text': reasonText,
      }),
    );
    return ApiResponse.parseSuccess(response, HabitMissResult.fromJson);
  }

  Future<List<HabitLog>> getHabitLogs({
    required String token,
    required String habitId,
    String range = 'month',
  }) async {
    final response = await _client.get(
      Uri.parse('$baseUrl${ApiConfig.habitsPath}/$habitId/logs?range=$range'),
      headers: _authHeaders(token),
    );
    return ApiResponse.parseSuccessList(response, HabitLog.fromJson);
  }

  // ── Groups ──

  Future<List<Group>> getGroups({required String token}) async {
    final response = await _client.get(
      Uri.parse('$baseUrl${ApiConfig.groupsPath}'),
      headers: _authHeaders(token),
    );
    return ApiResponse.parseSuccessList(response, Group.fromJson);
  }

  Future<Map<String, dynamic>> createGroup({
    required String token,
    required String name,
  }) async {
    final response = await _client.post(
      Uri.parse('$baseUrl${ApiConfig.groupsPath}'),
      headers: _authHeaders(token),
      body: jsonEncode({'name': name}),
    );
    final body = jsonDecode(response.body) as Map<String, dynamic>;
    if (response.statusCode < 200 || response.statusCode >= 300) {
      final error = body['error'] as Map<String, dynamic>?;
      throw ApiException(
        code: error?['code'] as String? ?? 'UNKNOWN',
        message: error?['message'] as String? ?? 'Failed to create group.',
      );
    }
    return body['data'] as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> getGroupDetail({
    required String token,
    required String groupId,
  }) async {
    final response = await _client.get(
      Uri.parse('$baseUrl${ApiConfig.groupsPath}/$groupId'),
      headers: _authHeaders(token),
    );
    final body = jsonDecode(response.body) as Map<String, dynamic>;
    if (response.statusCode < 200 || response.statusCode >= 300) {
      final error = body['error'] as Map<String, dynamic>?;
      throw ApiException(
        code: error?['code'] as String? ?? 'UNKNOWN',
        message: error?['message'] as String? ?? 'Failed to load group.',
      );
    }
    return body['data'] as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> joinGroup({
    required String token,
    required String groupId,
    required String inviteCode,
  }) async {
    final response = await _client.post(
      Uri.parse('$baseUrl${ApiConfig.groupsPath}/$groupId/join'),
      headers: _authHeaders(token),
      body: jsonEncode({'invite_code': inviteCode}),
    );
    final body = jsonDecode(response.body) as Map<String, dynamic>;
    if (response.statusCode < 200 || response.statusCode >= 300) {
      final error = body['error'] as Map<String, dynamic>?;
      throw ApiException(
        code: error?['code'] as String? ?? 'UNKNOWN',
        message: error?['message'] as String? ?? 'Failed to join group.',
      );
    }
    return body['data'] as Map<String, dynamic>;
  }

  Future<void> leaveGroup({
    required String token,
    required String groupId,
  }) async {
    final response = await _client.delete(
      Uri.parse('$baseUrl${ApiConfig.groupsPath}/$groupId/leave'),
      headers: _authHeaders(token),
    );
    if (response.statusCode < 200 || response.statusCode >= 300) {
      final body = jsonDecode(response.body) as Map<String, dynamic>;
      final error = body['error'] as Map<String, dynamic>?;
      throw ApiException(
        code: error?['code'] as String? ?? 'UNKNOWN',
        message: error?['message'] as String? ?? 'Failed to leave group.',
      );
    }
  }

  Future<List<GroupFeedItem>> getGroupFeed({
    required String token,
    required String groupId,
    int limit = 50,
    int offset = 0,
  }) async {
    final response = await _client.get(
      Uri.parse(
          '$baseUrl${ApiConfig.groupsPath}/$groupId/feed?limit=$limit&offset=$offset'),
      headers: _authHeaders(token),
    );
    return ApiResponse.parseSuccessList(response, GroupFeedItem.fromJson);
  }

  Future<List<GroupDayLink>> getGroupStreak({
    required String token,
    required String groupId,
  }) async {
    final response = await _client.get(
      Uri.parse('$baseUrl${ApiConfig.groupsPath}/$groupId/streak'),
      headers: _authHeaders(token),
    );
    return ApiResponse.parseSuccessList(response, GroupDayLink.fromJson);
  }

  Future<Map<String, dynamic>> getGroupLeaderboard({
    required String token,
    required String groupId,
    String period = 'week',
  }) async {
    final response = await _client.get(
      Uri.parse(
          '$baseUrl${ApiConfig.groupsPath}/$groupId/leaderboard?period=$period'),
      headers: _authHeaders(token),
    );
    final body = jsonDecode(response.body) as Map<String, dynamic>;
    if (response.statusCode < 200 || response.statusCode >= 300) {
      final error = body['error'] as Map<String, dynamic>?;
      throw ApiException(
        code: error?['code'] as String? ?? 'UNKNOWN',
        message:
            error?['message'] as String? ?? 'Failed to load leaderboard.',
      );
    }
    return body['data'] as Map<String, dynamic>;
  }

  Future<List<GroupMemberStatus>> getGroupMembers({
    required String token,
    required String groupId,
  }) async {
    final response = await _client.get(
      Uri.parse('$baseUrl${ApiConfig.groupsPath}/$groupId/members'),
      headers: _authHeaders(token),
    );
    return ApiResponse.parseSuccessList(
        response, GroupMemberStatus.fromJson);
  }

  Future<FreezeResult> groupFreeze({
    required String token,
    required String groupId,
  }) async {
    final response = await _client.post(
      Uri.parse('$baseUrl${ApiConfig.groupsPath}/$groupId/freeze'),
      headers: _authHeaders(token),
    );
    return ApiResponse.parseSuccess(response, FreezeResult.fromJson);
  }

  // ── Social (Nudge / Kudos) ──

  Future<NudgeResult> sendNudge({
    required String token,
    required String receiverId,
    required String groupId,
  }) async {
    final response = await _client.post(
      Uri.parse('$baseUrl${ApiConfig.socialPath}/nudge'),
      headers: _authHeaders(token),
      body: jsonEncode({
        'receiver_id': receiverId,
        'group_id': groupId,
      }),
    );
    return ApiResponse.parseSuccess(response, NudgeResult.fromJson);
  }

  Future<KudosResult> sendKudos({
    required String token,
    required String receiverId,
    required String groupId,
    String? habitLogId,
  }) async {
    final response = await _client.post(
      Uri.parse('$baseUrl${ApiConfig.socialPath}/kudos'),
      headers: _authHeaders(token),
      body: jsonEncode({
        'receiver_id': receiverId,
        'group_id': groupId,
        if (habitLogId != null) 'habit_log_id': habitLogId,
      }),
    );
    return ApiResponse.parseSuccess(response, KudosResult.fromJson);
  }

  // ── Insights ──

  Future<InsightsResult> getInsights({required String token}) async {
    final response = await _client.get(
      Uri.parse('$baseUrl${ApiConfig.insightsPath}'),
      headers: _authHeaders(token),
    );
    return ApiResponse.parseSuccess(response, InsightsResult.fromJson);
  }

  Future<MotivationResult> getMotivation({required String token}) async {
    final response = await _client.get(
      Uri.parse('$baseUrl${ApiConfig.insightsPath}/motivation'),
      headers: _authHeaders(token),
    );
    return ApiResponse.parseSuccess(response, MotivationResult.fromJson);
  }

  Future<void> submitReflections({
    required String token,
    required List<Map<String, dynamic>> reflections,
  }) async {
    final response = await _client.post(
      Uri.parse('$baseUrl${ApiConfig.insightsPath}/reflections'),
      headers: _authHeaders(token),
      body: jsonEncode(reflections),
    );
    if (response.statusCode < 200 || response.statusCode >= 300) {
      final body = jsonDecode(response.body) as Map<String, dynamic>;
      final error = body['error'] as Map<String, dynamic>?;
      throw ApiException(
        code: error?['code'] as String? ?? 'UNKNOWN',
        message:
            error?['message'] as String? ?? 'Failed to submit reflections.',
      );
    }
  }

  // ── Notifications ──

  Future<List<AppNotification>> getNotifications({
    required String token,
    bool unreadOnly = false,
  }) async {
    final query = unreadOnly ? '?unread_only=true' : '';
    final response = await _client.get(
      Uri.parse('$baseUrl${ApiConfig.notificationsPath}$query'),
      headers: _authHeaders(token),
    );
    return ApiResponse.parseSuccessList(response, AppNotification.fromJson);
  }

  Future<void> markNotificationRead({
    required String token,
    required String notificationId,
  }) async {
    final response = await _client.post(
      Uri.parse(
          '$baseUrl${ApiConfig.notificationsPath}/$notificationId/read'),
      headers: _authHeaders(token),
    );
    if (response.statusCode < 200 || response.statusCode >= 300) {
      final body = jsonDecode(response.body) as Map<String, dynamic>;
      final error = body['error'] as Map<String, dynamic>?;
      throw ApiException(
        code: error?['code'] as String? ?? 'UNKNOWN',
        message: error?['message'] as String? ??
            'Failed to mark notification as read.',
      );
    }
  }
}

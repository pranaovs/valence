import 'dart:convert';
import 'package:http/http.dart' as http;
import '../config/api_config.dart';
import '../models/api_response.dart';
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
}

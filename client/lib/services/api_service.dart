import 'dart:convert';
import 'package:http/http.dart' as http;
import '../config/api_config.dart';
import '../models/api_response.dart';
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

  Future<ValenceUser> login({
    required String firebaseToken,
    String? fcmToken,
  }) async {
    final response = await _client.post(
      Uri.parse('$baseUrl${ApiConfig.loginPath}'),
      headers: _headers,
      body: jsonEncode({
        'firebase_token': firebaseToken,
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
      headers: _headers,
      body: jsonEncode({
        'firebase_token': firebaseToken,
        if (name != null) 'name': name,
        if (timezone != null) 'timezone': timezone,
      }),
    );
    return ApiResponse.parseSuccess(response, ValenceUser.fromJson);
  }

  Future<ValenceUser> refresh({required String firebaseToken}) async {
    final response = await _client.post(
      Uri.parse('$baseUrl${ApiConfig.refreshPath}'),
      headers: _headers,
      body: jsonEncode({'firebase_token': firebaseToken}),
    );
    return ApiResponse.parseSuccess(response, ValenceUser.fromJson);
  }
}

import 'package:flutter/foundation.dart';
import '../models/api_response.dart';
import '../models/insights_result.dart';
import '../models/motivation_result.dart';
import '../services/api_service.dart';
import '../services/auth_service.dart';

class InsightsProvider extends ChangeNotifier {
  final AuthService _authService;
  final ApiService _apiService;

  InsightsResult? _insights;
  MotivationResult? _motivation;
  bool _isLoading = false;
  bool _isMotivationLoading = false;
  String? _errorMessage;

  InsightsProvider({AuthService? authService, ApiService? apiService})
      : _authService = authService ?? AuthService(),
        _apiService = apiService ?? ApiService();

  Future<String> _getToken() async {
    return _authService.getIdToken();
  }

  InsightsResult? get insights => _insights;
  MotivationResult? get motivation => _motivation;
  bool get isLoading => _isLoading;
  bool get isMotivationLoading => _isMotivationLoading;
  String? get errorMessage => _errorMessage;

  void clearError() {
    _errorMessage = null;
    notifyListeners();
  }

  Future<void> loadInsights() async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final token = await _getToken();
      _insights = await _apiService.getInsights(token: token);
    } on ApiException catch (e) {
      _errorMessage = e.message;
    } catch (e) {
      _errorMessage = 'Failed to load insights.';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> loadMotivation() async {
    _isMotivationLoading = true;
    notifyListeners();

    try {
      final token = await _getToken();
      _motivation = await _apiService.getMotivation(token: token);
    } catch (_) {
      // Silent failure — motivation is non-critical
    } finally {
      _isMotivationLoading = false;
      notifyListeners();
    }
  }

  Future<bool> submitReflections(
      List<Map<String, dynamic>> reflections) async {
    try {
      final token = await _getToken();
      await _apiService.submitReflections(
        token: token,
        reflections: reflections,
      );
      return true;
    } on ApiException catch (e) {
      _errorMessage = e.message;
      notifyListeners();
      return false;
    } catch (e) {
      _errorMessage = 'Failed to submit reflections.';
      notifyListeners();
      return false;
    }
  }
}

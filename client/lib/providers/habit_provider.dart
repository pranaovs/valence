import 'package:flutter/foundation.dart';
import '../models/api_response.dart';
import '../models/habit.dart';
import '../models/habit_completion.dart';
import '../models/habit_log.dart';
import '../models/habit_miss.dart';
import '../services/api_service.dart';
import '../services/auth_service.dart';

class HabitProvider extends ChangeNotifier {
  final AuthService _authService;
  final ApiService _apiService;

  List<Habit> _habits = [];
  bool _isLoading = false;
  String? _errorMessage;

  HabitProvider({AuthService? authService, ApiService? apiService})
      : _authService = authService ?? AuthService(),
        _apiService = apiService ?? ApiService();

  Future<String> _getToken() async {
    return _authService.getIdToken();
  }

  List<Habit> get habits => _habits;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;

  void clearError() {
    _errorMessage = null;
    notifyListeners();
  }

  Future<void> loadHabits() async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final token = await _getToken();
      _habits = await _apiService.getHabits(token: token);
    } on ApiException catch (e) {
      _errorMessage = e.message;
    } catch (e) {
      _errorMessage = 'Failed to load habits. Please try again.';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<HabitCompletionResult?> completeHabit(String habitId) async {
    try {
      final token = await _getToken();
      final result =
          await _apiService.completeHabit(token: token, habitId: habitId);
      await loadHabits();
      return result;
    } on ApiException catch (e) {
      _errorMessage = e.message;
      notifyListeners();
      return null;
    } catch (e) {
      _errorMessage = 'Failed to complete habit.';
      notifyListeners();
      return null;
    }
  }

  Future<HabitMissResult?> missHabit(
    String habitId,
    String reasonCategory, {
    String? reasonText,
  }) async {
    try {
      final token = await _getToken();
      final result = await _apiService.missHabit(
        token: token,
        habitId: habitId,
        reasonCategory: reasonCategory,
        reasonText: reasonText,
      );
      await loadHabits();
      return result;
    } on ApiException catch (e) {
      _errorMessage = e.message;
      notifyListeners();
      return null;
    } catch (e) {
      _errorMessage = 'Failed to log miss.';
      notifyListeners();
      return null;
    }
  }

  Future<bool> createHabit({
    required String name,
    String? intensity,
    String? trackingMethod,
    String? pluginId,
    String? redirectUrl,
    String? visibility,
  }) async {
    try {
      final token = await _getToken();
      await _apiService.createHabit(
        token: token,
        name: name,
        intensity: intensity,
        trackingMethod: trackingMethod,
        pluginId: pluginId,
        redirectUrl: redirectUrl,
        visibility: visibility,
      );
      await loadHabits();
      return true;
    } on ApiException catch (e) {
      _errorMessage = e.message;
      notifyListeners();
      return false;
    } catch (e) {
      _errorMessage = 'Failed to create habit.';
      notifyListeners();
      return false;
    }
  }

  Future<bool> updateHabit({
    required String habitId,
    String? name,
    String? intensity,
    String? trackingMethod,
    String? pluginId,
    String? redirectUrl,
    String? visibility,
  }) async {
    try {
      final token = await _getToken();
      await _apiService.updateHabit(
        token: token,
        habitId: habitId,
        name: name,
        intensity: intensity,
        trackingMethod: trackingMethod,
        pluginId: pluginId,
        redirectUrl: redirectUrl,
        visibility: visibility,
      );
      await loadHabits();
      return true;
    } on ApiException catch (e) {
      _errorMessage = e.message;
      notifyListeners();
      return false;
    } catch (e) {
      _errorMessage = 'Failed to update habit.';
      notifyListeners();
      return false;
    }
  }

  Future<bool> archiveHabit(String habitId) async {
    try {
      final token = await _getToken();
      await _apiService.archiveHabit(token: token, habitId: habitId);
      await loadHabits();
      return true;
    } on ApiException catch (e) {
      _errorMessage = e.message;
      notifyListeners();
      return false;
    } catch (e) {
      _errorMessage = 'Failed to archive habit.';
      notifyListeners();
      return false;
    }
  }

  Future<bool> deleteHabit(String habitId) async {
    try {
      final token = await _getToken();
      await _apiService.deleteHabit(token: token, habitId: habitId);
      await loadHabits();
      return true;
    } on ApiException catch (e) {
      _errorMessage = e.message;
      notifyListeners();
      return false;
    } catch (e) {
      _errorMessage = 'Failed to delete habit.';
      notifyListeners();
      return false;
    }
  }

  Future<List<HabitLog>> getHabitLogs(
    String habitId, {
    String range = 'month',
  }) async {
    try {
      final token = await _getToken();
      return await _apiService.getHabitLogs(
        token: token,
        habitId: habitId,
        range: range,
      );
    } catch (e) {
      return [];
    }
  }
}

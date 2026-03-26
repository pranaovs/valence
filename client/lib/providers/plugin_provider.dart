import 'package:flutter/foundation.dart';
import '../models/api_response.dart';
import '../models/plugin.dart';
import '../models/plugin_metric.dart';
import '../models/plugin_status.dart';
import '../services/api_service.dart';
import '../services/auth_service.dart';
import '../services/screen_time_service.dart';

class PluginProvider extends ChangeNotifier {
  final AuthService _authService;
  final ApiService _apiService;
  final ScreenTimeService _screenTimeService;

  List<Plugin> _plugins = [];
  bool _isLoading = false;
  String? _errorMessage;

  PluginProvider({
    AuthService? authService,
    ApiService? apiService,
    ScreenTimeService? screenTimeService,
  })  : _authService = authService ?? AuthService(),
        _apiService = apiService ?? ApiService(),
        _screenTimeService = screenTimeService ?? ScreenTimeService();

  Future<String> _getToken() async {
    return _authService.getIdToken();
  }

  List<Plugin> get plugins => _plugins;
  List<Plugin> get connectedPlugins =>
      _plugins.where((p) => p.connected).toList();
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;

  void clearError() {
    _errorMessage = null;
    notifyListeners();
  }

  Future<void> loadPlugins() async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final token = await _getToken();
      _plugins = await _apiService.getPlugins(token: token);
    } on ApiException catch (e) {
      _errorMessage = e.message;
    } catch (e) {
      _errorMessage = 'Failed to load plugins.';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> connectPlugin({
    required String pluginId,
    required Map<String, String> credentials,
  }) async {
    try {
      final token = await _getToken();
      await _apiService.connectPlugin(
        token: token,
        pluginId: pluginId,
        credentials: credentials,
      );
      await loadPlugins();
      return true;
    } on ApiException catch (e) {
      _errorMessage = e.message;
      notifyListeners();
      return false;
    } catch (e) {
      _errorMessage = 'Failed to connect plugin.';
      notifyListeners();
      return false;
    }
  }

  Future<PluginStatus?> getPluginStatus(String pluginId) async {
    try {
      final token = await _getToken();
      return await _apiService.getPluginStatus(
        token: token,
        pluginId: pluginId,
      );
    } catch (e) {
      return null;
    }
  }

  Future<List<PluginMetric>> getPluginMetrics(String pluginId) async {
    try {
      final token = await _getToken();
      return await _apiService.getPluginMetrics(
        token: token,
        pluginId: pluginId,
      );
    } catch (e) {
      return [];
    }
  }

  Future<bool> disconnectPlugin(String pluginId) async {
    try {
      final token = await _getToken();
      await _apiService.disconnectPlugin(token: token, pluginId: pluginId);
      await loadPlugins();
      return true;
    } on ApiException catch (e) {
      _errorMessage = e.message;
      notifyListeners();
      return false;
    } catch (e) {
      _errorMessage = 'Failed to disconnect plugin.';
      notifyListeners();
      return false;
    }
  }

  // ── Screen Time ──

  Future<bool> hasScreenTimePermission() async {
    return _screenTimeService.hasPermission();
  }

  Future<bool> requestScreenTimePermission() async {
    return _screenTimeService.requestPermission();
  }

  Future<ScreenTimeData?> getScreenTimeData() async {
    return _screenTimeService.getScreenTime();
  }

  Future<Map<String, dynamic>?> reportScreenTime({
    required int screenMinutes,
    Map<String, int>? appUsage,
  }) async {
    try {
      final token = await _getToken();
      return await _apiService.reportScreenTime(
        token: token,
        screenMinutes: screenMinutes,
        appUsage: appUsage,
      );
    } on ApiException catch (e) {
      _errorMessage = e.message;
      notifyListeners();
      return null;
    } catch (e) {
      _errorMessage = 'Failed to report screen time.';
      notifyListeners();
      return null;
    }
  }
}

import 'package:flutter/foundation.dart';
import '../models/api_response.dart';
import '../models/plugin.dart';
import '../models/plugin_status.dart';
import '../services/api_service.dart';
import '../services/auth_service.dart';

class PluginProvider extends ChangeNotifier {
  final AuthService _authService;
  final ApiService _apiService;

  List<Plugin> _plugins = [];
  bool _isLoading = false;
  String? _errorMessage;

  PluginProvider({AuthService? authService, ApiService? apiService})
      : _authService = authService ?? AuthService(),
        _apiService = apiService ?? ApiService();

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
}

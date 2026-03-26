import 'package:flutter/foundation.dart';
import '../models/api_response.dart';
import '../models/app_notification.dart';
import '../services/api_service.dart';
import '../services/auth_service.dart';

class NotificationProvider extends ChangeNotifier {
  final AuthService _authService;
  final ApiService _apiService;

  List<AppNotification> _notifications = [];
  bool _isLoading = false;
  String? _errorMessage;

  NotificationProvider({AuthService? authService, ApiService? apiService})
    : _authService = authService ?? AuthService(),
      _apiService = apiService ?? ApiService();

  Future<String> _getToken() async {
    return _authService.getIdToken();
  }

  List<AppNotification> get notifications => _notifications;
  int get unreadCount => _notifications.where((n) => !n.read).length;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;

  void clearError() {
    _errorMessage = null;
    notifyListeners();
  }

  Future<void> loadNotifications({bool unreadOnly = false}) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final token = await _getToken();
      _notifications = await _apiService.getNotifications(
        token: token,
        unreadOnly: unreadOnly,
      );
    } on ApiException catch (e) {
      _errorMessage = e.message;
    } catch (e) {
      _errorMessage = 'Failed to load notifications.';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> markAsRead(String notificationId) async {
    try {
      final token = await _getToken();
      await _apiService.markNotificationRead(
        token: token,
        notificationId: notificationId,
      );
      // Update local state
      _notifications = _notifications.map((n) {
        if (n.id == notificationId) {
          return AppNotification(
            id: n.id,
            type: n.type,
            title: n.title,
            body: n.body,
            data: n.data,
            read: true,
            createdAt: n.createdAt,
          );
        }
        return n;
      }).toList();
      notifyListeners();
      return true;
    } catch (e) {
      return false;
    }
  }

  Future<void> markAllAsRead() async {
    final unread = _notifications.where((n) => !n.read).toList();
    for (final n in unread) {
      await markAsRead(n.id);
    }
  }
}

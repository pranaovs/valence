import 'package:flutter/foundation.dart';
import '../models/api_response.dart';
import '../models/user.dart';
import '../services/auth_service.dart';

class AuthProvider extends ChangeNotifier {
  final AuthService _authService;

  ValenceUser? _user;
  bool _isLoading = false;
  String? _errorMessage;
  bool _needsRegistration = false;
  bool _isSignUp = false;

  AuthProvider({AuthService? authService})
    : _authService = authService ?? AuthService();

  ValenceUser? get user => _user;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  bool get needsRegistration => _needsRegistration;
  bool get isSignUp => _isSignUp;
  bool get isSupported => _authService.isSupported;

  void clearError() {
    _errorMessage = null;
    notifyListeners();
  }

  void setSignUp(bool value) {
    _isSignUp = value;
    _errorMessage = null;
    notifyListeners();
  }

  Future<void> signInWithEmail(String email, String password) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      _user = await _authService.signInWithEmail(email, password);
      _needsRegistration = false;
    } on UserNotFoundException {
      _needsRegistration = true;
    } on ApiException catch (e) {
      _errorMessage = e.message;
    } catch (e) {
      _errorMessage = _friendlyError(e);
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> signInWithGoogle() async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      _user = await _authService.signInWithGoogle();
      _needsRegistration = false;
    } on UserNotFoundException {
      _needsRegistration = true;
    } on ApiException catch (e) {
      _errorMessage = e.message;
    } catch (e) {
      _errorMessage = _friendlyError(e);
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> signUpWithEmail(String email, String password) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      await _authService.createEmailAccount(email, password);
      _needsRegistration = true;
    } catch (e) {
      _errorMessage = _friendlyError(e);
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> register({
    required String name,
    required String timezone,
  }) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      _user = await _authService.registerUser(name: name, timezone: timezone);
      _needsRegistration = false;
    } on ApiException catch (e) {
      _errorMessage = e.message;
    } catch (e) {
      _errorMessage = _friendlyError(e);
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> tryAutoLogin() async {
    _isLoading = true;
    notifyListeners();

    try {
      _user = await _authService.tryRefresh();
    } catch (_) {
      // Silent failure — user just stays on login screen
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> signOut() async {
    _isLoading = true;
    notifyListeners();

    try {
      await _authService.signOut();
      _user = null;
      _needsRegistration = false;
      _isSignUp = false;
    } catch (e) {
      _errorMessage = _friendlyError(e);
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  String _friendlyError(Object e) {
    final msg = e.toString();
    if (msg.contains('network') || msg.contains('SocketException')) {
      return 'Unable to reach the server. Check your connection.';
    }
    if (msg.contains('wrong-password') || msg.contains('invalid-credential')) {
      return 'Incorrect email or password.';
    }
    if (msg.contains('user-not-found')) {
      return 'No account found with this email.';
    }
    if (msg.contains('email-already-in-use')) {
      return 'An account with this email already exists.';
    }
    if (msg.contains('weak-password')) {
      return 'Password is too weak. Use at least 6 characters.';
    }
    if (msg.contains('invalid-email')) {
      return 'Please enter a valid email address.';
    }
    if (msg.contains('cancelled')) {
      return 'Sign-in was cancelled.';
    }
    return 'Something went wrong. Please try again.';
  }
}

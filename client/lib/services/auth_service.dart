import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/foundation.dart';
import 'package:google_sign_in/google_sign_in.dart';
import '../models/user.dart';
import 'api_service.dart';

class AuthService {
  final FirebaseAuth _firebaseAuth;
  final GoogleSignIn _googleSignIn;
  final ApiService _apiService;

  AuthService({
    FirebaseAuth? firebaseAuth,
    GoogleSignIn? googleSignIn,
    ApiService? apiService,
  })  : _firebaseAuth = firebaseAuth ?? FirebaseAuth.instance,
        _googleSignIn = googleSignIn ?? GoogleSignIn(),
        _apiService = apiService ?? ApiService();

  User? get currentFirebaseUser => _firebaseAuth.currentUser;

  Stream<User?> get authStateChanges => _firebaseAuth.authStateChanges();

  bool get isSupported =>
      kIsWeb || defaultTargetPlatform == TargetPlatform.android;

  Future<String> getIdToken() async {
    final user = _firebaseAuth.currentUser;
    if (user == null) throw Exception('No Firebase user signed in.');
    final token = await user.getIdToken(true);
    if (token == null) throw Exception('Failed to get Firebase ID token.');
    return token;
  }

  Future<ValenceUser> signInWithEmail(String email, String password) async {
    await _firebaseAuth.signInWithEmailAndPassword(
      email: email,
      password: password,
    );
    final token = await getIdToken();
    return _apiService.login(firebaseToken: token);
  }

  Future<ValenceUser> signInWithGoogle() async {
    final googleUser = await _googleSignIn.signIn();
    if (googleUser == null) throw Exception('Google Sign-In was cancelled.');

    final googleAuth = await googleUser.authentication;
    final credential = GoogleAuthProvider.credential(
      accessToken: googleAuth.accessToken,
      idToken: googleAuth.idToken,
    );
    await _firebaseAuth.signInWithCredential(credential);
    final token = await getIdToken();
    return _apiService.login(firebaseToken: token);
  }

  Future<void> createEmailAccount(String email, String password) async {
    await _firebaseAuth.createUserWithEmailAndPassword(
      email: email,
      password: password,
    );
  }

  Future<ValenceUser> registerUser({
    String? name,
    String? timezone,
  }) async {
    final token = await getIdToken();
    return _apiService.register(
      firebaseToken: token,
      name: name,
      timezone: timezone,
    );
  }

  Future<ValenceUser?> tryRefresh() async {
    if (_firebaseAuth.currentUser == null) return null;
    final token = await getIdToken();
    return _apiService.refresh(firebaseToken: token);
  }

  Future<void> signOut() async {
    await _googleSignIn.signOut();
    await _firebaseAuth.signOut();
  }
}

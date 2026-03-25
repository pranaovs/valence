import 'package:flutter/foundation.dart';
import '../models/api_response.dart';
import '../models/freeze_result.dart';
import '../models/group.dart';
import '../models/kudos_result.dart';
import '../models/nudge_result.dart';
import '../models/group_day_link.dart';
import '../models/group_feed_item.dart';
import '../models/group_member_status.dart';
import '../models/weekly_score.dart';
import '../services/api_service.dart';
import '../services/auth_service.dart';

class GroupProvider extends ChangeNotifier {
  final AuthService _authService;
  final ApiService _apiService;

  List<Group> _groups = [];
  bool _isLoading = false;
  String? _errorMessage;

  GroupProvider({AuthService? authService, ApiService? apiService})
      : _authService = authService ?? AuthService(),
        _apiService = apiService ?? ApiService();

  Future<String> _getToken() async {
    return _authService.getIdToken();
  }

  List<Group> get groups => _groups;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;

  void clearError() {
    _errorMessage = null;
    notifyListeners();
  }

  Future<void> loadGroups() async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final token = await _getToken();
      _groups = await _apiService.getGroups(token: token);
    } on ApiException catch (e) {
      _errorMessage = e.message;
    } catch (e) {
      _errorMessage = 'Failed to load groups. Please try again.';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> createGroup({required String name}) async {
    try {
      final token = await _getToken();
      await _apiService.createGroup(token: token, name: name);
      await loadGroups();
      return true;
    } on ApiException catch (e) {
      _errorMessage = e.message;
      notifyListeners();
      return false;
    } catch (e) {
      _errorMessage = 'Failed to create group.';
      notifyListeners();
      return false;
    }
  }

  Future<bool> joinGroup({
    required String groupId,
    required String inviteCode,
  }) async {
    try {
      final token = await _getToken();
      await _apiService.joinGroup(
        token: token,
        groupId: groupId,
        inviteCode: inviteCode,
      );
      await loadGroups();
      return true;
    } on ApiException catch (e) {
      _errorMessage = e.message;
      notifyListeners();
      return false;
    } catch (e) {
      _errorMessage = 'Failed to join group.';
      notifyListeners();
      return false;
    }
  }

  Future<bool> leaveGroup(String groupId) async {
    try {
      final token = await _getToken();
      await _apiService.leaveGroup(token: token, groupId: groupId);
      await loadGroups();
      return true;
    } on ApiException catch (e) {
      _errorMessage = e.message;
      notifyListeners();
      return false;
    } catch (e) {
      _errorMessage = 'Failed to leave group.';
      notifyListeners();
      return false;
    }
  }

  Future<Map<String, dynamic>?> getGroupDetail(String groupId) async {
    try {
      final token = await _getToken();
      return await _apiService.getGroupDetail(
          token: token, groupId: groupId);
    } catch (e) {
      return null;
    }
  }

  Future<List<GroupDayLink>> getGroupStreak(String groupId) async {
    try {
      final token = await _getToken();
      return await _apiService.getGroupStreak(
          token: token, groupId: groupId);
    } catch (e) {
      return [];
    }
  }

  Future<List<GroupFeedItem>> getGroupFeed(String groupId) async {
    try {
      final token = await _getToken();
      return await _apiService.getGroupFeed(
          token: token, groupId: groupId);
    } catch (e) {
      return [];
    }
  }

  Future<List<WeeklyScore>> getGroupLeaderboard(String groupId,
      {String period = 'week'}) async {
    try {
      final token = await _getToken();
      final data = await _apiService.getGroupLeaderboard(
        token: token,
        groupId: groupId,
        period: period,
      );
      final rankings = data['rankings'] as List? ?? [];
      return rankings
          .map((r) => WeeklyScore.fromJson(r as Map<String, dynamic>))
          .toList();
    } catch (e) {
      return [];
    }
  }

  Future<List<GroupMemberStatus>> getGroupMembers(String groupId) async {
    try {
      final token = await _getToken();
      return await _apiService.getGroupMembers(
          token: token, groupId: groupId);
    } catch (e) {
      return [];
    }
  }

  Future<FreezeResult?> groupFreeze(String groupId) async {
    try {
      final token = await _getToken();
      return await _apiService.groupFreeze(
          token: token, groupId: groupId);
    } on ApiException catch (e) {
      _errorMessage = e.message;
      notifyListeners();
      return null;
    } catch (e) {
      _errorMessage = 'Failed to activate freeze.';
      notifyListeners();
      return null;
    }
  }

  Future<NudgeResult?> sendNudge({
    required String receiverId,
    required String groupId,
  }) async {
    try {
      final token = await _getToken();
      return await _apiService.sendNudge(
        token: token,
        receiverId: receiverId,
        groupId: groupId,
      );
    } on ApiException catch (e) {
      _errorMessage = e.message;
      notifyListeners();
      return null;
    } catch (e) {
      _errorMessage = 'Failed to send nudge.';
      notifyListeners();
      return null;
    }
  }

  Future<KudosResult?> sendKudos({
    required String receiverId,
    required String groupId,
    String? habitLogId,
  }) async {
    try {
      final token = await _getToken();
      return await _apiService.sendKudos(
        token: token,
        receiverId: receiverId,
        groupId: groupId,
        habitLogId: habitLogId,
      );
    } on ApiException catch (e) {
      _errorMessage = e.message;
      notifyListeners();
      return null;
    } catch (e) {
      _errorMessage = 'Failed to send kudos.';
      notifyListeners();
      return null;
    }
  }
}

import 'package:flutter/services.dart';

class ScreenTimeData {
  final int screenMinutes;
  final Map<String, int> appUsage;

  const ScreenTimeData({required this.screenMinutes, required this.appUsage});
}

class ScreenTimeService {
  static const _channel = MethodChannel('me.pranaovs.valence/screen_time');

  Future<bool> hasPermission() async {
    try {
      final result = await _channel.invokeMethod<bool>('hasPermission');
      return result ?? false;
    } on PlatformException {
      return false;
    } on MissingPluginException {
      // Not on Android
      return false;
    }
  }

  Future<bool> requestPermission() async {
    try {
      await _channel.invokeMethod<bool>('requestPermission');
      return true;
    } on PlatformException {
      return false;
    } on MissingPluginException {
      return false;
    }
  }

  Future<ScreenTimeData?> getScreenTime() async {
    try {
      final result = await _channel.invokeMethod<Map>('getScreenTime');
      if (result == null) return null;

      final screenMinutes = (result['screen_minutes'] as num?)?.toInt() ?? 0;
      final rawAppUsage = result['app_usage'] as Map? ?? {};
      final appUsage = rawAppUsage.map(
        (key, value) => MapEntry(key.toString(), (value as num).toInt()),
      );

      return ScreenTimeData(screenMinutes: screenMinutes, appUsage: appUsage);
    } on PlatformException {
      return null;
    } on MissingPluginException {
      return null;
    }
  }
}

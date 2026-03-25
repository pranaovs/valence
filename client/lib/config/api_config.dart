class ApiConfig {
  static const String baseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://10.31.5.129:3000',
  );

  static const String loginPath = '/api/v1/auth/login';
  static const String registerPath = '/api/v1/auth/register';
  static const String refreshPath = '/api/v1/auth/refresh';

  static const String habitsPath = '/api/v1/habits';
  static const String groupsPath = '/api/v1/groups';
  static const String socialPath = '/api/v1/social';
  static const String insightsPath = '/api/v1/insights';
  static const String notificationsPath = '/api/v1/notifications';
}

class ApiConfig {
  static const String baseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://localhost:3000',
  );

  static const String loginPath = '/api/v1/auth/login';
  static const String registerPath = '/api/v1/auth/register';
  static const String refreshPath = '/api/v1/auth/refresh';
}

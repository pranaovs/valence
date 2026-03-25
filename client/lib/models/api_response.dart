import 'dart:convert';
import 'package:http/http.dart' as http;

class ApiException implements Exception {
  final String code;
  final String message;

  const ApiException({required this.code, required this.message});

  @override
  String toString() => 'ApiException($code): $message';
}

class UserNotFoundException extends ApiException {
  const UserNotFoundException()
      : super(
          code: 'USER_NOT_FOUND',
          message: 'No account found. Please register first.',
        );
}

class UserExistsException extends ApiException {
  const UserExistsException()
      : super(
          code: 'USER_EXISTS',
          message: 'A user with this account already exists.',
        );
}

class ApiResponse {
  static T parseSuccess<T>(
    http.Response response,
    T Function(Map<String, dynamic>) fromJson,
  ) {
    final body = jsonDecode(response.body) as Map<String, dynamic>;

    if (response.statusCode == 404) {
      throw const UserNotFoundException();
    }

    if (response.statusCode == 409) {
      throw const UserExistsException();
    }

    if (response.statusCode < 200 || response.statusCode >= 300) {
      final error = body['error'] as Map<String, dynamic>?;
      throw ApiException(
        code: error?['code'] as String? ?? 'UNKNOWN',
        message: error?['message'] as String? ?? 'An unknown error occurred.',
      );
    }

    return fromJson(body['data'] as Map<String, dynamic>);
  }

  static List<T> parseSuccessList<T>(
    http.Response response,
    T Function(Map<String, dynamic>) fromJson,
  ) {
    final body = jsonDecode(response.body) as Map<String, dynamic>;

    if (response.statusCode < 200 || response.statusCode >= 300) {
      final error = body['error'] as Map<String, dynamic>?;
      throw ApiException(
        code: error?['code'] as String? ?? 'UNKNOWN',
        message: error?['message'] as String? ?? 'An unknown error occurred.',
      );
    }

    final data = body['data'] as List;
    return data
        .map((item) => fromJson(item as Map<String, dynamic>))
        .toList();
  }
}

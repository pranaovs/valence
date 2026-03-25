class KudosResult {
  final String? message;

  const KudosResult({this.message});

  factory KudosResult.fromJson(Map<String, dynamic> json) {
    return KudosResult(
      message: json['message'] as String?,
    );
  }
}

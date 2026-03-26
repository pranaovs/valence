class NudgeResult {
  final String id;
  final String senderId;
  final String receiverId;
  final String llmGeneratedMessage;
  final String? memeGifUrl;
  final String? memeGifPreview;

  const NudgeResult({
    required this.id,
    required this.senderId,
    required this.receiverId,
    required this.llmGeneratedMessage,
    this.memeGifUrl,
    this.memeGifPreview,
  });

  factory NudgeResult.fromJson(Map<String, dynamic> json) {
    final nudge = json['nudge'] as Map<String, dynamic>? ?? json;
    final memeGif = json['memeGif'] ?? json['meme_gif'];
    Map<String, dynamic>? meme;
    if (memeGif is Map<String, dynamic>) {
      meme = memeGif;
    }

    return NudgeResult(
      id: (nudge['id'] as String?) ?? '',
      senderId: (nudge['senderId'] ?? nudge['sender_id'] ?? '') as String,
      receiverId: (nudge['receiverId'] ?? nudge['receiver_id'] ?? '') as String,
      llmGeneratedMessage:
          (nudge['llmGeneratedMessage'] ??
                  nudge['llm_generated_message'] ??
                  json['message'] ??
                  '')
              as String,
      memeGifUrl: meme?['url'] as String?,
      memeGifPreview: meme?['preview'] as String?,
    );
  }
}

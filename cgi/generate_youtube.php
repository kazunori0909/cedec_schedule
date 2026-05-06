<?php
/**
 * generate_youtube.php
 *
 * CEDECチャンネルの全動画を YouTube Data API v3 で取得し、
 * web_data_original/youtube_videos.json にキャッシュする。
 *
 * 使用方法:
 *   php cgi/generate_youtube.php        # キャッシュがあれば再利用
 *   php cgi/generate_youtube.php --force # 強制再取得
 */

require __DIR__ . '/load_env.php';
load_env();

$api_key     = getenv('YOUTUBE_API_KEY');
$base_dir    = realpath(__DIR__ . '/..');
$cache_path  = "{$base_dir}/web_data_original/youtube_videos.json";
$playlist_id = 'UUmHaPXvwn9_4pMNAV6ewgoA'; // CEDECチャンネル uploads playlist

$force = in_array('--force', $argv ?? []);

if (!$api_key) {
    echo "[ERROR] YOUTUBE_API_KEY が設定されていません（.env を確認してください）\n";
    exit(1);
}

if (!$force && file_exists($cache_path)) {
    echo "[INFO] キャッシュを使用します: {$cache_path}\n";
    $data = json_decode(file_get_contents($cache_path), true);
    echo "[INFO] " . count($data['videos']) . " 件の動画データが存在します\n";
    exit(0);
}

echo "[INFO] YouTube Data API からチャンネル動画を取得します\n";

$videos     = array();
$page_token = null;
$page       = 1;

do {
    $url = 'https://www.googleapis.com/youtube/v3/playlistItems'
         . '?part=snippet'
         . '&playlistId=' . urlencode($playlist_id)
         . '&maxResults=50'
         . '&key=' . urlencode($api_key);
    if ($page_token) {
        $url .= '&pageToken=' . urlencode($page_token);
    }

    $res = @file_get_contents($url);
    if ($res === false) {
        echo "[ERROR] APIリクエストに失敗しました\n";
        exit(1);
    }

    $data = json_decode($res, true);
    if (isset($data['error'])) {
        echo "[ERROR] API エラー: " . $data['error']['message'] . "\n";
        exit(1);
    }

    foreach ($data['items'] as $item) {
        $snippet  = $item['snippet'];
        $video_id = $snippet['resourceId']['videoId'];
        $title    = $snippet['title'];

        // 削除済み動画はスキップ
        if ($title === 'Deleted video' || $title === 'Private video') continue;

        // 【CEDEC20XX】プレフィックスから年度を抽出
        preg_match('/【CEDEC(\d{4})】/', $title, $m);
        $year = isset($m[1]) ? $m[1] : null;

        // 2019年以前・年度不明はスキップ
        if ($year === null || (int)$year < 2020) continue;

        // プレフィックスを除いたセッションタイトル
        $session_title = trim(preg_replace('/^【CEDEC\d{4}】\s*/', '', $title));

        $videos[$year][] = array(
            'video_id'      => $video_id,
            'session_title' => $session_title,
            'url'           => 'https://www.youtube.com/watch?v=' . $video_id,
        );
    }

    $page_token = isset($data['nextPageToken']) ? $data['nextPageToken'] : null;
    echo "[INFO] ページ {$page}: " . count($data['items']) . " 件取得\n";
    $page++;

} while ($page_token);

// 年度降順にソート
krsort($videos);

$total  = array_sum(array_map('count', $videos));
$output = array(
    'generated' => date('c'),
    'total'     => $total,
    'videos'    => (object)$videos,
);

file_put_contents($cache_path, json_encode($output, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT));
echo "[OK] {$cache_path} に {$total} 件を保存しました\n";

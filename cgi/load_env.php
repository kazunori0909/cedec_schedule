<?php
/**
 * プロジェクトルートの .env ファイルを読み込み、$_ENV に展開する。
 * 既に環境変数として設定済みの値は上書きしない。
 *
 * 書式: KEY=VALUE（# コメント・空行は無視）
 */
function load_env($path = null)
{
    if ($path === null) {
        $path = realpath(__DIR__ . '/../.env');
    }
    if (!$path || !file_exists($path)) {
        return;
    }
    foreach (file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
        $line = trim($line);
        if ($line === '' || $line[0] === '#') continue;
        if (strpos($line, '=') === false) continue;
        list($key, $value) = explode('=', $line, 2);
        $key   = trim($key);
        $value = trim($value);
        if (!isset($_ENV[$key]) && getenv($key) === false) {
            $_ENV[$key] = $value;
            putenv("{$key}={$value}");
        }
    }
}

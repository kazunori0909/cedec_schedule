<?php
/**
 * generate_xml.php
 *
 * web_data_original/{year}/custom.html を年度別フォーマットで解析し、
 * web_data/{year}/schedule.json に共通フォーマット JSON を出力する。
 *
 * phpQuery は使用せず PHP 組み込みの DOMDocument / DOMXPath を使用 (PHP 7.4+)。
 *
 * 使用方法:
 *   php cgi/generate_json.php          # 全年度処理
 *   php cgi/generate_json.php 2023     # 指定年度のみ
 */

ini_set('memory_limit', '512M');

$base_dir = realpath(__DIR__ . '/..');

// ── 年度設定 ──────────────────────────────────────────────
$year_configs = array(
    '2020' => array('first_date' => '0902', 'domain' => 'https://cedec.cesa.or.jp/2020/', 'format' => 'format_2020'),
    '2021' => array('first_date' => '0824', 'domain' => 'https://cedec.cesa.or.jp/2021/', 'format' => 'format_2020'),
    '2022' => array('first_date' => '0823', 'domain' => 'https://cedec.cesa.or.jp/2022/', 'format' => 'format_2020'),
    '2023' => array('first_date' => '0823', 'domain' => 'https://cedec.cesa.or.jp/2023/', 'format' => 'format_2023'),
    '2024' => array('first_date' => '0821', 'domain' => 'https://cedec.cesa.or.jp/2024/', 'format' => 'format_2024'),
    '2025' => array('first_date' => '0722', 'domain' => 'https://cedec.cesa.or.jp/2025/', 'format' => 'format_2025', 'split_files' => true, 'live' => 'https://cedec.cesa.or.jp/2025/timetable/free_lives/'),
);

if (!empty($argv[1])) {
    $target = $argv[1];
    if (!isset($year_configs[$target])) {
        echo "[ERROR] 年度 '{$target}' は未定義です\n";
        exit(1);
    }
    $year_configs = array($target => $year_configs[$target]);
}

foreach ($year_configs as $year => $config) {
    process_year($base_dir, $year, $config);
}

// ════════════════════════════════════════════════════════════
// 年度処理
// ════════════════════════════════════════════════════════════
function process_year($base_dir, $year, $config)
{
    $input_path  = "{$base_dir}/web_data_original/{$year}/custom.html";
    $output_path = "{$base_dir}/web_data/{$year}/schedule.json";

    echo "[INFO] {$year} 処理開始 (format={$config['format']})\n";
    flush();

    $sessions = array();

    if (!empty($config['split_files'])) {
        // day1.html / day2.html / day3.html を個別に読み込む
        for ($day = 1; $day <= 3; $day++) {
            $day_path = "{$base_dir}/web_data_original/{$year}/day{$day}.html";
            if (!file_exists($day_path)) {
                echo "[SKIP] {$year} Day{$day}: {$day_path} が見つかりません\n";
                continue;
            }
            $html = file_get_contents($day_path);
            $dom  = new DOMDocument();
            libxml_use_internal_errors(true);
            $dom->loadHTML('<?xml encoding="UTF-8">' . $html);
            libxml_clear_errors();
            $xp       = new DOMXPath($dom);
            $sessions = array_merge($sessions,
                call_user_func("parse_{$config['format']}", $xp, $day));
            unset($dom, $xp);
        }
    } else {
        if (!file_exists($input_path)) {
            echo "[SKIP] {$year}: {$input_path} が見つかりません\n";
            return;
        }
        $html = file_get_contents($input_path);
        $dom  = new DOMDocument();
        libxml_use_internal_errors(true);
        $dom->loadHTML('<?xml encoding="UTF-8">' . $html);
        libxml_clear_errors();
        $xp = new DOMXPath($dom);
        switch ($config['format']) {
            case 'format_2020': $sessions = parse_format_2020($xp); break;
            case 'format_2023': $sessions = parse_format_2023($xp); break;
            case 'format_2024': $sessions = parse_format_2024($xp); break;
        }
        unset($dom, $xp);
    }

    $live_map = array();
    if (!empty($config['live'])) {
        $live_cache = "{$base_dir}/web_data_original/{$year}/live.html";
        $live_map   = fetch_live_sessions($config['live'], $config['first_date'], $live_cache);
        echo "[INFO] LIVE配信URL: " . count($live_map) . " 件取得\n";
    }

    $youtube_map  = build_youtube_map($base_dir, $year);
    $event_over   = is_event_over((int)$year, $config['first_date']);
    if ($event_over) echo "[INFO] 会期終了後モード: liveパラメータを処理します\n";
    $sessions     = postprocess_sessions($sessions, $live_map, $youtube_map, $event_over);
    $json_content = generate_json($year, $config, $sessions);

    $output_dir = dirname($output_path);
    if (!is_dir($output_dir)) {
        mkdir($output_dir, 0755, true);
    }
    file_put_contents($output_path, $json_content);
    echo "[OK]   {$output_path} に " . count($sessions) . " 件を出力\n";
}

// ════════════════════════════════════════════════════════════
// XPath ヘルパー
// ════════════════════════════════════════════════════════════

/** XPath クエリ実行。コンテキスト指定可能 */
function xp_nodes(DOMXPath $xp, $query, DOMNode $ctx = null)
{
    $result = $ctx ? $xp->query($query, $ctx) : $xp->query($query);
    if ($result === false) return new DOMNodeList();
    return $result;
}

/** 最初のノードを返す。なければ null */
function xp_first(DOMXPath $xp, $query, DOMNode $ctx = null)
{
    $nodes = xp_nodes($xp, $query, $ctx);
    return $nodes->length > 0 ? $nodes->item(0) : null;
}

/** 最初にマッチしたノードのテキストを返す */
function xp_text(DOMXPath $xp, $query, DOMNode $ctx = null)
{
    $node = xp_first($xp, $query, $ctx);
    return $node ? trim($node->textContent) : '';
}

/** CSS クラス名を XPath の contains 条件文字列に変換（単語境界チェック付き） */
function cls($class)
{
    return "contains(concat(' ', normalize-space(@class), ' '), ' {$class} ')";
}

/** DOMElement の属性値を返す。なければ空文字 */
function get_attr(DOMNode $node, $attr)
{
    if (!($node instanceof DOMElement)) return '';
    $val = $node->getAttribute($attr);
    return $val !== false ? $val : '';
}

// ════════════════════════════════════════════════════════════
// 2020 / 2021 / 2022 フォーマット
//
// HTML 構造:
//   #day{N}
//     .hide-desktop
//       div.session-post[data-toggle="modal"][data-target="#mobileModal-NNN"]
//         .session-time   "09:25-10:45 /80分"
//         b.fo-fa-initial タイトル
//         .session-meta
//           .btn-top-session.cate-type          主分野 (ENG/VA等)
//           .btn-top-session.cate-type.ses-subcategory  関連分野
//         .session-speakers > ul > li > .name > b / .prof > p
//       div#mobileModal-NNN (モーダル)
//         .btn-top-session.ses-type  セッション種別 (公募/招待等)
// ════════════════════════════════════════════════════════════
function parse_format_2020(DOMXPath $xp)
{
    $sessions = array();

    for ($day = 1; $day <= 3; $day++) {
        $query = "//div[@id='day{$day}']//div[" . cls('session-post') . " and @data-toggle='modal']";
        foreach (xp_nodes($xp, $query) as $el) {
            $data_target = get_attr($el, 'data-target');
            if ($data_target === '') continue;

            $modal_id   = ltrim($data_target, '#');
            $session_id = preg_replace('/[^0-9]/', '', $modal_id);
            $modal      = xp_first($xp, "//*[@id='{$modal_id}']");
            if (!$modal) continue;

            $room_no     = room_no_from_text(get_attr($el, 'data-room'));
            list($start, $end) = parse_time_range(xp_text($xp, ".//*[" . cls('session-time') . "]", $el));
            $title       = xp_text($xp, ".//b[" . cls('fo-fa-initial') . "]", $el);
            if ($title === '') $title = xp_text($xp, ".//*[" . cls('session-title') . "]//b", $el);
            $data_filter = get_attr($el, 'data-filter');

            // session-post 内の cate-type から分野を取得 (2020 モーダルは「主分野:」テキストが混入するため $el を使用)
            $category     = xp_text($xp,
                ".//*[" . cls('btn-top-session') . " and " . cls('cate-type') . " and not(" . cls('ses-subcategory') . ")]",
                $el);
            $sub_category = xp_text($xp,
                ".//*[" . cls('btn-top-session') . " and " . cls('cate-type') . " and " . cls('ses-subcategory') . "]",
                $el);
            // 分野なし (基調講演等) は ses-type にフォールバック（セッション種別は除外）
            $excluded_session_types = ['公募', '招待'];
            if ($category === '') {
                $ses_type = xp_text($xp,
                    ".//*[" . cls('btn-top-session') . " and " . cls('ses-type') . "]", $modal);
                if (!in_array($ses_type, $excluded_session_types)) $category = $ses_type;
            }

            $speakers   = extract_speakers_legacy($xp, $el);
            if (empty($speakers)) $speakers = extract_speakers_legacy($xp, $modal);
            $detail_url = extract_detail_url_legacy($xp, $modal);

            $cancelled = extract_cancelled($title);

            $sessions[] = build_session($session_id, $day, $room_no, $start, $end,
                                        $category, $sub_category, $data_filter, $title, $speakers, $detail_url, $cancelled);
        }
    }
    return $sessions;
}

// ════════════════════════════════════════════════════════════
// 2023 フォーマット
//
// HTML 構造:
//   #day{N}
//     td.td-content
//       div.session-post[data-id][data-room][data-filter]
//         .session-time
//         b.fo-fa-initial
//         .session-meta
//           .btn-top-session.cate-type          主分野 (ENG/VA等)
//           .btn-top-session.cate-type.ses-subcategory  関連分野
//         .session-speakers
//       div[id^="exampleModal-"]
//         .btn-top-session.ses-type  セッション種別 (公募/招待等)
//         .ses-detail-link > a
// ════════════════════════════════════════════════════════════
function parse_format_2023(DOMXPath $xp)
{
    $sessions = array();

    for ($day = 1; $day <= 3; $day++) {
        $tds = xp_nodes($xp, "//div[@id='day{$day}']//td[" . cls('td-content') . "]");
        foreach ($tds as $td) {
            $sp = xp_first($xp, ".//div[" . cls('session-post') . "]", $td);
            if (!$sp) continue;

            $session_id  = get_attr($sp, 'data-id');
            $room_no     = room_no_from_text(get_attr($sp, 'data-room'));
            $data_filter = get_attr($sp, 'data-filter');
            list($start, $end) = parse_time_range(xp_text($xp, ".//*[" . cls('session-time') . "]", $sp));
            $title       = xp_text($xp, ".//b[" . cls('fo-fa-initial') . "]", $sp);

            $modal    = xp_first($xp, ".//*[starts-with(@id,'exampleModal-')]", $td);
            // session-post 内の cate-type から分野を取得
            $category     = xp_text($xp,
                ".//*[" . cls('btn-top-session') . " and " . cls('cate-type') . " and not(" . cls('ses-subcategory') . ")]",
                $sp);
            $sub_category = xp_text($xp,
                ".//*[" . cls('btn-top-session') . " and " . cls('cate-type') . " and " . cls('ses-subcategory') . "]",
                $sp);
            // 分野なし (基調講演等) は ses-type にフォールバック（セッション種別は除外）
            $excluded_session_types = ['公募', '招待'];
            if ($category === '') {
                $ses_type = $modal ? xp_text($xp,
                    ".//*[" . cls('btn-top-session') . " and " . cls('ses-type') . "]", $modal) : '';
                if (!in_array($ses_type, $excluded_session_types)) $category = $ses_type;
            }

            $speakers   = extract_speakers_legacy($xp, $sp);
            $detail_url = $modal ? extract_detail_url_legacy($xp, $modal) : '';

            $cancelled = extract_cancelled($title);

            $sessions[] = build_session($session_id, $day, $room_no, $start, $end,
                                        $category, $sub_category, $data_filter, $title, $speakers, $detail_url, $cancelled);
        }
    }
    return $sessions;
}

// ════════════════════════════════════════════════════════════
// 2024 フォーマット
//
// HTML 構造:
//   div[id^="Day{N}Area"]
//     div.c-timetable__venue  "第1会場"
//     div.c-timetable__item[data-id][data-uuid][data-category ...]
//       a[href]
//       div.timetable-time > time  "11:10-12:10"
//       div.timetable-category > span  "ENG"
//       div.timetable-title
//       div.timetable-speakers > div.speakers-item
// ════════════════════════════════════════════════════════════
function parse_format_2024(DOMXPath $xp)
{
    $sessions = array();

    for ($day = 1; $day <= 3; $day++) {
        $areas = xp_nodes($xp, "//div[starts-with(@id,'Day{$day}Area')]");
        foreach ($areas as $area) {
            $venue    = xp_first($xp, ".//*[" . cls('c-timetable__venue') . "]", $area);
            $room_raw = $venue ? trim($venue->textContent) : '';
            if ($room_raw === '') {
                $first_child = xp_first($xp, './*', $area);
                $room_raw = $first_child ? trim($first_child->textContent) : '';
            }
            $room_no = room_no_from_text($room_raw);

            foreach (xp_nodes($xp, ".//*[" . cls('c-timetable__item') . "]", $area) as $item) {
                $session_id = get_attr($item, 'data-uuid');
                if ($session_id === '') $session_id = get_attr($item, 'data-id');
                $data_filter = build_data_filter_2024($item);

                $time_text = xp_text($xp, ".//div[" . cls('timetable-time') . "]/time", $item);
                $start = $end = '';
                if ($time_text !== '') {
                    $parts = explode('-', $time_text, 2);
                    $start = trim($parts[0]);
                    $end   = isset($parts[1]) ? trim($parts[1]) : '';
                }

                $category  = xp_text($xp, "(.//div[" . cls('timetable-category') . "]/span)[1]", $item);
                $exclude_categories_2024 = ['事前収録', '事前収録講演'];
                if (in_array($category, $exclude_categories_2024)) $category = '';
                $title = xp_text($xp, ".//*[" . cls('timetable-title') . "]", $item);

                $speakers = array();
                foreach (xp_nodes($xp, ".//*[" . cls('speakers-item') . "]", $item) as $sp_el) {
                    $name    = xp_text($xp, ".//*[" . cls('speakers-name') . "]", $sp_el);
                    $company = xp_text($xp, ".//*[" . cls('speakers-company') . "]", $sp_el);
                    if ($name !== '') $speakers[] = compact('name', 'company');
                }

                $link       = xp_first($xp, './a', $item);
                $detail_url = $link ? get_attr($link, 'href') : '';

                $sessions[] = build_session($session_id, $day, $room_no, $start, $end,
                                            $category, '', $data_filter, $title, $speakers, $detail_url);
            }
        }
    }
    return $sessions;
}

// ════════════════════════════════════════════════════════════
// 2025 フォーマット
//
// HTML 構造:
//   div#Day{N}.c-timetable__list
//     div.c-timetable__list__group[id="t{YYYY}{MM}{DD}{HHMM}"]
//       a.c-timetable__list__session[href]
//         .c-timetable__list__session__room    "第1会場"
//         .c-timetable__list__session__type    "主催者" (分野なし時のみ)
//         .c-timetable__list__session__format  "レギュラーセッション"
//         .c-timetable__list__session__time    "60分"
//         .c-timetable__list__session__categories > li  "ENG", "PRD" など (複数可)
//         .c-timetable__list__session__title
//         .c-timetable__list__session__speakers li > span + small
// ════════════════════════════════════════════════════════════
/** $day が指定された場合はそのファイルが単一日のHTMLとみなし Day{N} ラッパーなしで解析する */
function parse_format_2025(DOMXPath $xp, $day = null)
{
    $sessions  = array();
    $day_range = ($day !== null) ? array((int)$day) : array(1, 2, 3);

    foreach ($day_range as $d) {
        $query  = ($day !== null)
            ? "//*[" . cls('c-timetable__list__group') . "]"
            : "//*[@id='Day{$d}']//*[" . cls('c-timetable__list__group') . "]";
        $groups = xp_nodes($xp, $query);
        foreach ($groups as $group) {
            $group_id = get_attr($group, 'id');
            $time_str = substr($group_id, -4);
            $start    = (strlen($time_str) === 4)
                ? substr($time_str, 0, 2) . ':' . substr($time_str, 2, 2)
                : '';

            foreach (xp_nodes($xp, ".//a[" . cls('c-timetable__list__session') . "]", $group) as $ses_el) {
                $room_no = room_no_from_text(
                    xp_text($xp, ".//*[" . cls('c-timetable__list__session__room') . "]", $ses_el));
                $title   = xp_text($xp, ".//*[" . cls('c-timetable__list__session__title') . "]", $ses_el);

                // 分野リスト (ENG/VA等) を __categories__item から取得
                $cat_nodes = xp_nodes($xp,
                    ".//*[" . cls('c-timetable__list__session__categories__item') . "]", $ses_el);
                $exclude_categories = ['事前収録講演'];
                $cat_texts = array();
                foreach ($cat_nodes as $cn) {
                    $t = trim($cn->textContent);
                    if ($t !== '' && !in_array($t, $exclude_categories)) $cat_texts[] = $t;
                }
                $category     = isset($cat_texts[0]) ? $cat_texts[0] : '';
                $sub_category = implode(',', array_slice($cat_texts, 1));

                // 分野なし (主催者挨拶・基調講演等): __format 優先、なければ __type にフォールバック
                // (__type は "YouTube配信あり" 等の配信インジケーターにも使われるため後回し)
                // 汎用フォーマット名はフィルター用カテゴリとして意味がないため除外する
                if ($category === '') {
                    $format = xp_text($xp, ".//*[" . cls('c-timetable__list__session__format') . "]", $ses_el);
                    $type   = xp_text($xp, ".//*[" . cls('c-timetable__list__session__type') . "]", $ses_el);
                    $generic_formats = ['レギュラーセッション', 'ショートセッション', 'ライトニングトーク', 'CEDEC AWARDS', '主催者挨拶', '事前収録講演'];
                    if (!in_array($format, $generic_formats)) {
                        $category = $format !== '' ? $format : $type;
                    }
                }

                // 所要時間から終了時刻を計算
                $dur_text = xp_text($xp, ".//*[" . cls('c-timetable__list__session__time') . "]", $ses_el);
                preg_match('/(\d+)/', $dur_text, $dm);
                $dur_min = (int)(isset($dm[1]) ? $dm[1] : 0);
                $end     = '';
                if ($dur_min > 0 && $start !== '') {
                    $s_min = (int)substr($start, 0, 2) * 60 + (int)substr($start, 3, 2);
                    $e_min = $s_min + $dur_min;
                    $end   = sprintf('%02d:%02d', intdiv($e_min, 60), $e_min % 60);
                }

                $speakers = array();
                foreach (xp_nodes($xp,
                    ".//*[" . cls('c-timetable__list__session__speakers') . "]//li", $ses_el) as $li) {
                    $name    = xp_text($xp, './/span', $li);
                    $company = preg_replace('/^\s*\/\s*/', '', xp_text($xp, './/small', $li));
                    if ($name !== '') $speakers[] = compact('name', 'company');
                }

                $detail_url = get_attr($ses_el, 'href');
                preg_match('/\/([^\/]+)\/?$/', rtrim($detail_url, '/'), $id_m);
                $session_id = isset($id_m[1]) ? $id_m[1] : '';

                $cancelled = xp_first($xp,
                    ".//*[" . cls('c-timetable__list__session__type') . " and contains(@class,'--cancel')]",
                    $ses_el) !== null;
                if ($cancelled) {
                    $title = '【講演キャンセル】' . $title;
                }

                $sessions[] = build_session($session_id, $d, $room_no, $start, $end,
                                            $category, $sub_category, '', $title, $speakers, $detail_url, $cancelled);
            }
        }
    }
    return $sessions;
}

// ════════════════════════════════════════════════════════════
// JSON 生成
// ════════════════════════════════════════════════════════════
function generate_json($year, $config, $sessions)
{
    $data = array(
        'year'       => $year,
        'first_date' => $config['first_date'],
        'domain'     => $config['domain'],
        'generated'  => date('c'),
        'sessions'   => array(),
    );

    foreach ($sessions as $s) {
        if ($s['title'] === '') continue;

        $sub_category = array_values(array_filter(array_map('trim', explode(',', $s['sub_category']))));
        $entry = array(
            'id'          => $s['session_id'],
            'day'         => (string)$s['day'],
            'room'        => $s['room_no'],
            'start'       => $s['start'],
            'end'         => $s['end'],
            'category'    => $s['category'],
            'data_filter' => $s['data_filter'],
            'title'       => $s['title'],
            'speakers'    => $s['speakers'],
            'detail_url'  => $s['detail_url'],
        );
        if (!empty($sub_category))      $entry['sub_category'] = $sub_category;
        if ($s['cancelled'])            $entry['cancelled']    = true;
        if ($s['live'] !== null)        $entry['live']         = $s['live'];
        if ($s['youtube'] !== null)     $entry['youtube']      = $s['youtube'];
        $data['sessions'][] = $entry;
    }

    return json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
}

// ════════════════════════════════════════════════════════════
// ヘルパー
// ════════════════════════════════════════════════════════════

/** "第3会場" → "3"、"第12会場" → "12" */
function room_no_from_text($text)
{
    return trim(str_replace(array('第', '会場'), '', $text));
}

/** "09:35-09:40 /5分" → array('09:35', '09:40') */
function parse_time_range($text)
{
    $text = trim(preg_replace('/\s+/', ' ', $text));
    preg_match('/(\d{2}:\d{2})-(\d{2}:\d{2})/', $text, $m);
    return array(isset($m[1]) ? $m[1] : '', isset($m[2]) ? $m[2] : '');
}

/** 開催最終日（初日+2日）の翌日以降であれば true を返す */
function is_event_over($year, $first_date)
{
    $month    = (int)substr($first_date, 0, 2);
    $day      = (int)substr($first_date, 2, 2);
    $last_day = mktime(0, 0, 0, $month, $day + 2, $year); // 3日間開催
    return time() > $last_day + 86400;
}

/** タイトルに「【講演キャンセル】」が含まれているかを返す */
function extract_cancelled($title)
{
    return strpos($title, '【講演キャンセル】') !== false;
}

/** データ取得後・保存前に全セッションへ適用する加工処理 */
function postprocess_sessions($sessions, $live_map = array(), $youtube_map = array(), $event_over = false)
{
    foreach ($sessions as &$s) {
        $s['title'] = normalize_whitespace($s['title']);
        foreach ($s['speakers'] as &$sp) {
            // 「\n     」のような、不要な文字列が混入することがあるので、削除
            $sp['name']    = str_replace('　', ' ', $sp['name']);
            $sp['name']    = normalize_whitespace($sp['name']);
            // 会社名が長くなるので略語対応
            $sp['company'] = abbreviate_company($sp['company']);
        }
        unset($sp);

        $live    = isset($live_map[$s['session_id']]) ? $live_map[$s['session_id']] : null;
        $youtube = find_youtube_url($s['title'], $youtube_map);

        if ($event_over && $live !== null) {
            if ($youtube === null) {
                // 基調講演・CEDEC Awards等: YouTubeチャンネルに再投稿されないため
                // live URLをyoutubeパラメータに変換して永続化する
                $youtube = $live;
            }
            // 会期後はliveパラメータを削除
            $live = null;
        }

        $s['live']    = $live;
        $s['youtube'] = $youtube;
    }
    unset($s);
    return $sessions;
}

/**
 * LIVEページを取得し、session_id => YouTube URL のマッピングを返す
 *
 * ページ構造:
 *   .p-session__time-item  日付ブロック（YouTube URL一覧）
 *     .p-session__time-title  "7月22日（火）"
 *     .p-session__time-body   会場名 + <a href="youtube URL">
 *   .c-guide-card__link  セッションカード
 *     .c-session__date    "7/22"
 *     .c-session__venue   "第1会場"
 */
function fetch_live_sessions($live_url, $first_date, $cache_path)
{
    if (file_exists($cache_path)) {
        echo "[INFO] LIVEページをキャッシュから読み込みます: {$cache_path}\n";
        $html = file_get_contents($cache_path);
    } else {
        echo "[INFO] LIVEページをフェッチします: {$live_url}\n";
        $html = @file_get_contents($live_url);
        if ($html === false) {
            echo "[WARN] LIVEページの取得に失敗しました: {$live_url}\n";
            return array();
        }
        file_put_contents($cache_path, $html);
        echo "[INFO] LIVEページを保存しました: {$cache_path}\n";
    }

    $dom = new DOMDocument();
    libxml_use_internal_errors(true);
    $dom->loadHTML('<?xml encoding="UTF-8">' . $html);
    libxml_clear_errors();
    $xp = new DOMXPath($dom);

    $first_month = (int)substr($first_date, 0, 2);
    $first_day   = (int)substr($first_date, 2, 2);

    // 1. {day_index}_{room_no} => YouTube URL のマッピングを構築
    $room_youtube = array();
    foreach (xp_nodes($xp, "//*[" . cls('p-session__time-item') . "]") as $item) {
        $title_text = xp_text($xp, ".//*[" . cls('p-session__time-title') . "]", $item);
        preg_match('/(\d+)月(\d+)日/', $title_text, $dm);
        if (!$dm) continue;
        $day_index = day_index_from_date((int)$dm[1], (int)$dm[2], $first_month, $first_day);

        foreach (xp_nodes($xp, ".//*[" . cls('p-session__time-body') . "]", $item) as $body) {
            $room_text = xp_text($xp, './/span[1]', $body);
            $room_no   = room_no_from_text($room_text);
            $link      = xp_first($xp, './/a', $body);
            $youtube   = $link ? get_attr($link, 'href') : '';
            if ($room_no !== '' && $youtube !== '') {
                $room_youtube["{$day_index}_{$room_no}"] = $youtube;
            }
        }
    }

    // 2. セッションカードから session_id => YouTube URL を解決
    $result = array();
    foreach (xp_nodes($xp, "//a[" . cls('c-guide-card__link') . "]") as $card) {
        $href = get_attr($card, 'href');
        preg_match('/\/detail\/([^\/]+)/', $href, $m);
        if (!$m) continue;
        $session_id = $m[1];

        $date_text  = xp_text($xp, ".//*[" . cls('c-session__date') . "]", $card);
        $venue_text = xp_text($xp, ".//*[" . cls('c-session__venue') . "]", $card);
        preg_match('/(\d+)\/(\d+)/', $date_text, $dm);
        if (!$dm) continue;
        $day_index = day_index_from_date((int)$dm[1], (int)$dm[2], $first_month, $first_day);
        $room_no   = room_no_from_text($venue_text);

        $key = "{$day_index}_{$room_no}";
        if (isset($room_youtube[$key])) {
            $result[$session_id] = $room_youtube[$key];
        }
    }

    return $result;
}

/** 月・日から開催初日基準の day_index (1〜3) を計算する */
function day_index_from_date($month, $day, $first_month, $first_day)
{
    $ts_first = mktime(0, 0, 0, $first_month, $first_day, 2000);
    $ts_event = mktime(0, 0, 0, $month,       $day,       2000);
    return (int)(($ts_event - $ts_first) / 86400) + 1;
}

/**
 * youtube_videos.json から指定年度の session_title => url マッピングを構築する。
 * キーはタイトル正規化済み。
 */
function build_youtube_map($base_dir, $year)
{
    $cache = "{$base_dir}/web_data_original/youtube_videos.json";
    if (!file_exists($cache)) return array();

    $data   = json_decode(file_get_contents($cache), true);
    $videos = isset($data['videos'][$year]) ? $data['videos'][$year] : array();

    $map = array();
    foreach ($videos as $v) {
        $key = normalize_title_for_match($v['session_title']);
        $map[$key] = $v['url'];
    }
    return $map;
}

/**
 * セッションタイトルに対応する YouTube URL を返す。
 *
 * マッチング戦略:
 *   1. 正規化後の完全一致
 *   2. YouTubeタイトルが切り捨てられているケース:
 *      スケジュールタイトルがYTタイトルで始まる（20文字以上の場合のみ）
 */
function find_youtube_url($session_title, $youtube_map)
{
    if (empty($youtube_map)) return null;

    $norm = normalize_title_for_match($session_title);

    // 1. 完全一致
    if (isset($youtube_map[$norm])) return $youtube_map[$norm];

    // 2. YouTubeタイトルが切り捨てられた場合（スケジュール側が長い）
    foreach ($youtube_map as $yt_norm => $url) {
        if (mb_strlen($yt_norm) >= 20 && mb_strpos($norm, $yt_norm) === 0) {
            return $url;
        }
    }
    return null;
}

/**
 * タイトルをマッチング比較用に正規化する。
 *   - 【...】ブロックをすべて除去（スポンサータグ・キャンセルタグ等）
 *   - スラッシュ前後のスペースを統一（"A / B" → "A/B"）
 *   - 連続空白・改行を1スペースに圧縮
 */
function normalize_title_for_match($title)
{
    $title = preg_replace('/【[^】]+】\s*/u', '', $title);
    $title = preg_replace('/\s*\/\s*/', '/', $title);
    return trim(preg_replace('/\s+/', ' ', $title));
}

/** 改行・連続空白を半角スペース1つに正規化し、前後の空白を除去する */
function normalize_whitespace($str)
{
    return trim(preg_replace('/[\r\n\t ]+/', ' ', $str));
}

/** 会社名の法人格を略称に変換（前後の半角スペースも除去） */
function abbreviate_company($company)
{
    $map = array('株式会社' => '(株)', '有限会社' => '(有)', '合同会社' => '(同)');
    foreach ($map as $full => $abbr) {
        $company = preg_replace('/\s*' . preg_quote($full, '/') . '\s*/', $abbr, $company);
    }
    return $company;
}

/** 2020/2021/2022/2023 の .session-speakers からスピーカー配列を返す */
function extract_speakers_legacy(DOMXPath $xp, DOMNode $ctx)
{
    $speakers = array();
    foreach (xp_nodes($xp, ".//*[" . cls('session-speakers') . "]//li", $ctx) as $li) {
        $name    = xp_text($xp, ".//*[" . cls('name') . "]//b", $li);
        $company = xp_text($xp, ".//*[" . cls('prof') . "]//p", $li);
        if ($name !== '') $speakers[] = compact('name', 'company');
    }
    return $speakers;
}

/** 2020/2021/2022/2023 の .ses-detail-link から詳細URL を返す */
function extract_detail_url_legacy(DOMXPath $xp, DOMNode $ctx)
{
    $link = xp_first($xp, ".//*[" . cls('ses-detail-link') . "]//a", $ctx);
    return $link ? get_attr($link, 'href') : '';
}

/** 2024 の data-* 属性を "cat_1,format_2,difficulty_1" 形式に変換 */
function build_data_filter_2024(DOMElement $item)
{
    $map = array(
        'data-category'    => 'cat',
        'data-subcategory' => 'subcat',
        'data-format'      => 'format',
        'data-difficulty'  => 'difficulty',
        'data-sessiontype' => 'type',
        'data-platforms'   => 'platform',
        'data-keywords'    => 'keywords',
    );
    $parts = array();
    foreach ($map as $attr => $key) {
        $v = $item->getAttribute($attr);
        if ($v !== '') $parts[] = "{$key}_{$v}";
    }
    return implode(',', $parts);
}

/** セッション配列を組み立てる */
function build_session($session_id, $day, $room_no, $start, $end,
                       $category, $sub_category, $data_filter, $title, $speakers, $detail_url, $cancelled = false)
{
    return compact('session_id', 'day', 'room_no', 'start', 'end',
                   'category', 'sub_category', 'data_filter', 'title', 'speakers', 'detail_url', 'cancelled');
}

<?php

$tag  = "756"; //$_GET['tag'];
$year = "2025";

$result = array(
    "list"        => array(),
    "update_date" => date("c"),
);

echo "tag : " . $tag . "<br/>";
echo "<hr/>";

readPage(1);

echo "<br/><h2>Result</h2>";
echo print_r($result, true);

$output_dir = __DIR__ . '/../web_data/' . $year;
if (!is_dir($output_dir)) {
    mkdir($output_dir, 0755, true);
}
$write_json = fopen($output_dir . '/cedil.json', 'w+b');
fwrite($write_json, json_encode($result, JSON_UNESCAPED_UNICODE));
fclose($write_json);


function cls_xpath($class)
{
    return "contains(concat(' ', normalize-space(@class), ' '), ' {$class} ')";
}

function readPage($page)
{
    global $tag, $result;

    $content = file_get_contents(
        "https://cedil.cesa.or.jp/cedil_sessions/search_tag/" . $tag . "?page=" . $page
    );

    $dom = new DOMDocument();
    libxml_use_internal_errors(true);
    $dom->loadHTML('<?xml encoding="UTF-8">' . $content);
    libxml_clear_errors();
    $xp = new DOMXPath($dom);

    if ($page == 1) {
        $msg = $xp->query("//*[" . cls_xpath('search_message') . "]");
        if ($msg->length > 0) echo trim($msg->item(0)->textContent) . "<br/>";
    }

    foreach ($xp->query("//*[" . cls_xpath('session_list') . "]") as $session) {
        $h2 = $xp->query(".//h2", $session);
        if ($h2->length === 0) continue;
        $h2_node = $h2->item(0);

        $title = trim($h2_node->textContent);
        $title = str_replace(array("\n", ' ', '　'), '', $title);

        $a = $xp->query(".//a", $h2_node);
        $url = ($a->length > 0) ? $a->item(0)->getAttribute('href') : '';

        $result["list"][] = array("title" => $title, "url" => $url);
    }

    // 次ページ: .page_change span.active の次の兄弟 span
    $next_nodes = $xp->query(
        "//*[" . cls_xpath('page_change') . "]//span[" . cls_xpath('active') . "]/following-sibling::span[1]"
    );
    $next_page = ($next_nodes->length > 0) ? trim($next_nodes->item(0)->textContent) : '';

    if ($next_page !== '') {
        sleep(1);
        readPage((int)$next_page);
    }
}

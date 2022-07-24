<?php

$tag = "740"; //$_GET['tag'];
$year = "2021";

$result["list"] = [];
$result["update_date"] = date("c");

echo "tag : " . $tag . "<br/>";
echo "<hr/>";

require_once("./phpQuery-onefile.php");


readPage(1);

echo "<br/><h2>Result</h2>";
echo print_r($result,true);


// 書き込み
$write_json = fopen('../web_data/' . $year . '/cedil.json', 'w+b');
fwrite($write_json, json_encode($result, JSON_UNESCAPED_UNICODE));
fclose($write_json);


function readPage($page) {

    global $tag, $result;

    $content = file_get_contents("https://cedil.cesa.or.jp/cedil_sessions/search_tag/".$tag."?page=".$page);
    $html = phpQuery::newDocument($content);

    if ($page==1) {
        echo $html->find(".search_message")->text()."<br/>";
    }

    $session_list = $html->find(".session_list");
    foreach( $session_list as $session){
        $s = pq($session);

        $h2 = $s->find('h2');

        // タイトル名を加工
        $title = $h2->text();
        $title = str_replace('\n', '', $title);
        $title = str_replace(' ', '', $title);
        $title = str_replace('　', '', $title);

        // オブジェクト追加
        $info = Array(
            "title" => $title,
            "url" => $h2->find("a")->attr("href")
        );

        $result["list"][] = $info;

    }


    $next_page = $html->find(".page_change span.active")->next()->text();
//    echo " next page :".$next_page."<br/>";
    if ($next_page != "") {
        sleep(1);
        readPage($next_page);
        return;
    }




}

?>
<?php

    $receive_json = file_get_contents("php://input");

    // JSON形式データをPHPの配列型に変換
    $data = json_decode($receive_json);

    // 書き込み
    $write_json = fopen('../web_data/' . $data->year . '/cedil.json', 'w+b');
    fwrite($write_json, json_encode($data, JSON_UNESCAPED_UNICODE));
    fclose($write_json);

    // JSON形式で送信するためのヘッダー。これないとerorrになる。
    header("Content-Type: application/json; charset=utf-8");
    print_r($receive_json);

?>
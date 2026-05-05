# cedec_schedule

CEDEC非公式タイムスケジュール。CEDEC公式スケジュールページのデータを部屋別タイムテーブル形式で整形・表示します。  
CEDiLに登録済みの資料リンクも自動付与します。

## 機能

- 部屋別タイムテーブル表示
- 分野フィルター（クリックで表示/非表示切り替え）
- お気に入り登録（Cookieで保存・タップ長押しまたは星アイコンで操作）
- 現在時刻の自動ハイライト（開催期間中は1分ごとに更新）
- CEDiL資料リンクの自動付与
- 非公式イベントの追加表示（`custom.js` で設定）

## 技術構成

| ライブラリ | バージョン | 用途 |
|---|---|---|
| jQuery | 2.1.4 | DOM操作・Ajax |
| jQuery Mobile | 1.4.5 | メニューパネル・ボタンUI |
| js.cookie | - | お気に入り設定の保存 |
| FontAwesome | 5.0.6 (CDN) | Twitterアイコン |

## ファイル構成

```
cedec_schedule/
├── index.html                    エントリーポイント
├── main.css                      スタイル
├── impl/
│   ├── cedec.js                  年度設定・セッションデータモデル
│   ├── cedil.js                  CEDiL資料リンクの取得・付与
│   ├── custom.js                 非公式イベント設定
│   ├── index.js                  メインアプリケーション
│   └── lib/                      外部ライブラリ
├── cgi/
│   ├── generate_json.php         スケジュールJSON生成スクリプト
│   └── generate_cedil.php        CEDiL JSONデータ生成スクリプト
├── web_data_original/            公式サイトから取得したHTMLキャッシュ
│   └── {year}/
└── web_data/                     生成済みJSONデータ
    └── {year}/
        ├── schedule.json
        └── cedil.json
```

## 年度別対応方法

### 1. 公式HTMLの取得・配置

CEDEC公式スケジュールページのHTMLをブラウザで保存し、以下のパスに配置する。

**2025年以降（日別ファイル形式）:**
```
web_data_original/{year}/day1.html
web_data_original/{year}/day2.html
web_data_original/{year}/day3.html
```

**2020〜2024年（1ファイル形式）:**
```
web_data_original/{year}/custom.html
```

### 2. schedule.json の生成

```bash
# 指定年度のみ生成
php cgi/generate_json.php {year}

# 全年度を一括生成
php cgi/generate_json.php
```

生成結果は `web_data/{year}/schedule.json` に出力される。  
公式サイトのHTMLフォーマットが変わった場合は、`cgi/generate_json.php` の該当パーサー関数を更新する。

### 3. SCHEDULE_SETTING への追加（cedec.js）

[impl/cedec.js](impl/cedec.js) の `SCHEDULE_SETTING` 配列の**先頭**に新年度の設定を追加する。

```javascript
{ year:"2026", first_date:"MMDD", domain:"https://cedec.cesa.or.jp/2026/", cedil_tag_no:XXX },
```

| パラメータ | 説明 |
|---|---|
| `year` | 開催年度 |
| `first_date` | 初日の日付（MMDD形式）例: `"0820"` |
| `domain` | 公式サイトURL |
| `cedil_tag_no` | CEDiL検索タグID（CEDiLサイトで確認） |
| `events` | 公式付随イベント設定（任意、後述） |

公式イベント（Developers' Night等）がある場合は `events` に追加する:

```javascript
{ year:"2026", first_date:"MMDD", domain:"https://cedec.cesa.or.jp/2026/", cedil_tag_no:XXX,
  events:[
    { title:"Developers' Night", day_index:1, start_time:"19:30", end_time:"21:30", room_no:"多目的ホール",
      html:'<a href="..." target="blank">詳細</a>' }
  ]
},
```

### 4. キャッシュ設定の更新（cedec.js）

[impl/cedec.js](impl/cedec.js) の `CASH_SETTING` に、`web_data_original/` の公式HTMLを取得した日時を手動で記録する。  
UIでデータ取得日時として表示される（CEDiLのような自動取得は未対応）。

```javascript
var CASH_SETTING = {
     "2026":{ time:"2026/xx/xx xx:xx" }  // HTMLを取得した日時を記録
    ,"2025":{ time:"2026/05/03 22:00" }
    // ...
}
```

### 5. 非公式イベントの追加（custom.js、任意）

[impl/custom.js](impl/custom.js) に非公式イベント（懇親会等）を追加する。

```javascript
"2026": {
    events: [
        {
            title:      "イベント名",
            room_no:    "会場名",
            day_index:  2,            // 1〜3（CEDECの開催日）
            start_time: "19:00",
            end_time:   "21:00",
            html:       '<a href="..." target="blank">詳細</a>',
            hash_tag:   "ハッシュタグ"  // 任意: Twitterリンクが自動生成される
        }
    ]
}
```

## 更新履歴

- 2025年 リファクタリング（jQuery UI削除・不要CSS削除・コード整理）
- 2022/07/24 Ver.3.0: 2011〜2019年設定を削除
- 2020/09/09 Ver.2.2: 2020年フォーマット対応
- 2018/08/24 Ver.2.0: 2018年新フォーマット対応・CEDiLリンクをJSONに移行

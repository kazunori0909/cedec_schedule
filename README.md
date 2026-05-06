# cedec_schedule

CEDEC非公式タイムスケジュール。CEDEC公式スケジュールページのデータを部屋別タイムテーブル形式で整形・表示します。  
CEDiLに登録済みの資料リンクも自動付与します。

## 機能

- 部屋別タイムテーブル表示
- 分野フィルター（クリックで表示/非表示切り替え）
- お気に入り登録（localStorageで保存・タップ長押しまたは星アイコンで操作）
- 現在時刻の自動ハイライト（開催期間中は1分ごとに更新）
- CEDiL資料リンクの自動付与
- 会期中セッションのYouTube Live配信リンク表示
- 会期後セッションのYouTube動画リンク自動付与（YouTube Data API v3連携）
- 非公式イベントの追加表示（`custom.js` で設定）

## 技術構成

| ライブラリ | バージョン | 用途 |
|---|---|---|
| jQuery | 2.1.4 | DOM操作・Ajax |
| jQuery Mobile | 1.4.5 | メニューパネル・ボタンUI |
| FontAwesome | 5.0.6 (CDN) | Twitterアイコン |

## ファイル構成

```
cedec_schedule/
├── index.html                    エントリーポイント
├── main.css                      スタイル
├── .env.example                  環境変数テンプレート
├── impl/
│   ├── cedec.js                  年度設定・セッションデータモデル
│   ├── cedil.js                  CEDiL資料リンクの取得・付与
│   ├── custom.js                 非公式イベント設定
│   ├── index.js                  メインアプリケーション
│   └── lib/                      外部ライブラリ
├── cgi/
│   ├── generate_json.php         スケジュールJSON生成スクリプト
│   ├── generate_cedil.php        CEDiL JSONデータ生成スクリプト
│   ├── generate_youtube.php      YouTube動画リスト生成スクリプト
│   └── load_env.php              .envファイル読み込みユーティリティ
├── web_data_original/            公式サイトから取得したHTMLキャッシュ
│   ├── {year}/
│   │   ├── day1.html             公式スケジュールHTML（2025年以降）
│   │   ├── day2.html
│   │   ├── day3.html
│   │   ├── live.html             YouTube Live配信ページキャッシュ
│   │   └── custom.html           公式スケジュールHTML（2020〜2024年）
│   └── youtube_videos.json       CEDECチャンネル動画リスト（APIキャッシュ）
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

### 2. YouTube動画リストの生成（任意）

YouTube Data API v3 を使って CEDECチャンネルの動画一覧を取得し、`schedule.json` に動画URLを付与する。

#### 2-1. 環境変数の設定

`.env.example` をコピーして `.env` を作成し、YouTube Data API キーを設定する。

```bash
cp .env.example .env
# .env を編集して YOUTUBE_API_KEY を設定
```

#### 2-2. 動画リストの生成

```bash
# キャッシュがあれば再利用
php cgi/generate_youtube.php

# 強制再取得
php cgi/generate_youtube.php --force
```

生成結果は `web_data_original/youtube_videos.json` にキャッシュされる。  
`generate_json.php` 実行時に自動参照し、セッションタイトルと照合して `youtube` フィールドに動画URLを付与する。

### 3. schedule.json の生成

```bash
# 指定年度のみ生成
php cgi/generate_json.php {year}

# 全年度を一括生成
php cgi/generate_json.php
```

生成結果は `web_data/{year}/schedule.json` に出力される。  
公式サイトのHTMLフォーマットが変わった場合は、`cgi/generate_json.php` の該当パーサー関数を更新する。

### 4. SCHEDULE_SETTING への追加（cedec.js）

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
| `live` | 無料Live配信ページURL（任意、会期中のみ有効） |
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

### 5. キャッシュ設定の更新（cedec.js）

[impl/cedec.js](impl/cedec.js) の `CASH_SETTING` に、`web_data_original/` の公式HTMLを取得した日時を手動で記録する。  
UIでデータ取得日時として表示される（CEDiLのような自動取得は未対応）。

```javascript
var CASH_SETTING = {
     "2026":{ time:"2026/xx/xx xx:xx" }  // HTMLを取得した日時を記録
    ,"2025":{ time:"2026/05/03 22:00" }
    // ...
}
```

### 6. 非公式イベントの追加（custom.js、任意）

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

- 2026年 YouTube Live配信リンク・YouTube動画URL自動付与に対応
- 2025年 お気に入り等の保存をCookieからlocalStorageに変更
- 2025年 リファクタリング（jQuery UI削除・不要CSS削除・コード整理）
- 2022/07/24 Ver.3.0: 2011〜2019年設定を削除
- 2020/09/09 Ver.2.2: 2020年フォーマット対応
- 2018/08/24 Ver.2.0: 2018年新フォーマット対応・CEDiLリンクをJSONに移行

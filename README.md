# cedec_schedule
CEDEC公式のスケジュールページを読み込み、部屋別のタイムスケジュールに整形して表示するページです。  
CEDiLページからも読み込みを行い対応するリンクを追加しています。

# 設計思想
* 毎年の対応コストを下げる
* ファイルプロトコルでも動作
* Webページから表を選択しコピーしてExcelに貼り付けられる

# 仕組み
* jQuery  
Webアクセス。解析。ページ生成はｊQueryを使用。

* クロスドメイン  
公式サイトへjQueryプラグイン「Cross-Domain Ajax mod」を使用しアクセス。  
YQL(Yahoo Query Language)を使用していたが、2017年 YQLの仕様変更により、HTMLが非サポートに。  
HTML stringは対応しているので、プラグインを書き換え使用。

* スケジュールデータ・画像  
ローディングアイコン等の最低限の画像しかサイトには存在せず、公式サイトの物を使用する。  

# 年度別対応方法
* ページ情報の更新( impl/cedil.js )
```javascript
var SCHEDULE_SETTING = [
    { year:"2017", first_date:"0830", format:'session/schedule_{date}/' },
    { year:"2016", first_date:"0824", format:'session/schedule_{date}.html', cedil_tag_no:712 },
    ...
    { year:"2013", first_date:"0821", format:'schedule/day{day_no}.html',    cedil_tag_no:8 },
    ...
];
```
* デフォルトページ設定( impl/index.js )  
```javascript
var DEFAULT_YEAR = 2017;`
```

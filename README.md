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
	{ 
        year:"2018",
        first_date:"0822",
        domain:"https://2018.cedec.cesa.or.jp/",
        format:'session#tab{day_no}',
        single_page:true,
        unit_setting: UNIT_SETTING,
        convert_path:PATH_CONVERT_2018
    },
	{
        year:"2017",
        first_date:"0830",
        domain:"http://cedec.cesa.or.jp/",
        format:'2017/session/schedule_{date}/',	
        unit_setting: {
            selector	:	function( $xml, day_index ){
                return $xml.find( "div.schedule_timeframe_normal" );
            },
            info_selector: "td",
            param		:{
                "room_no"		:	function($xml){ return $xml.find(".room_number").text();},
                "start_time"	:	function($xml){ return $xml.find(".ss_time_start").text();},
                "end_time"		:	function($xml){ return $xml.find(".ss_time_end").text();},
                "main_spec"		:	function($xml){ return $xml.find(".ss_ippr_icon + img"); }
            }
        },
        convert_path:function( $dom ){
            var domain = this.domain;
            $dom.find("a").each(function(){
                // 相対パスを httpからのパスに変更
            });	
        },
        cedil_tag_no:713
    },
    ...
];
```
* デフォルトページ設定( impl/index.js )  
```javascript
var DEFAULT_YEAR = 2018;
```

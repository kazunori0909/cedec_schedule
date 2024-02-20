;
//------------------------------------------------------------------------------
// CEDEC
//------------------------------------------------------------------------------
var CEDEC = (function($){
	//==========================================================================
	// 定義
	//==========================================================================
	//==========================================================================
	// Schedule DOM 解析用
	//
	// ※フォーマットが変わった際に変更が必要
	//==========================================================================
	var PATH_CONVERT = function( $dom ){
		var domain = this.domain;
		var rootURL = this.rootURL;
		var year = this.year;

		// 相対パスのURLを変更。 さらにスライドが面倒なので #content に飛ばしてみる
		$dom.find("a").each(function(){
			var $this = $(this);
			var path = $this.attr("href");
			if( path.indexOf("http") == 0 ) return;

			path = domain + path.substr(0);
			$this.attr({
				"href"   : path,
				"target" : "blank"
			});
		});
		// イメージタグのパスをグローバルに編子
		$dom.find("img").each(function(){
			var $this = $(this);
			var path = $this.attr("src");
			if( path.indexOf("http") == 0 ) return;
			if( path.indexOf("/") == 0 ){
				path = domain + path;
				$this.attr("src", path );
			}
		});
	}

	//--------------------------------------------------------------------------
	// 2020年のフォーマット
	//--------------------------------------------------------------------------
	var UNIT_SETTING_2020 = {
		selector	:	function( $xml, day_index ){
			var day = day_index + 1;
			return $xml.find('#day'+day).find("div.hide-desktop div[data-toggle=modal]");
		},
		param		:{
			"room_no"		:	function($xml){ return $xml.attr("data-room").replace("第","").replace("会場",""); },
			"start_time"	:	function($xml){
				var text = $xml.find('.session-time').text();
				var indexOfKara = text.indexOf('-');
				return text.slice( indexOfKara - 5, indexOfKara);
			},
			"end_time"		:	function($xml){
				var text = $xml.find('.session-time').text();
				var indexOfKara = text.indexOf('-');
				return text.slice( indexOfKara + 1, indexOfKara + 1 + 5 );
			},

			"main_spec"		:	function($xml){ return $xml.find("div.btn-top-session:not(.ses-type,.ses-difficulty):first"); },
			"youtube"		:	function($xml){ return $xml.attr("youtube"); }
		},
		info : function($xml, $fullXml){

			var dataTarget = $xml.attr('data-target');
			var $modal = $fullXml.find(dataTarget);
			
			$xml.css({
				"padding-left":"0em"
				,"padding-right":"0em"
			});

			var contents = [
				$xml
				,$modal.find("div.col-12").has('img:not(".img-sponsor")')
				,$modal.find("div.ses-detail-link")
			];

			var $timeShift = $modal.find(".btn-time-shift");
			if( $timeShift.text().indexOf("タイムシフト配信:なし") != -1 ){
				contents.unshift($timeShift);
			}


			if( $modal.find("p").text().indexOf("資料公開: 予定あり") != -1) {
				contents.push(" 資料公開: 予定あり");
			} else if( $modal.find("p").text().indexOf("資料公開: 予定なし") != -1) {
				contents.push(" 資料公開: 予定なし");
			} else {
				contents.push(" 資料公開: 不明");
			}

			return $('<div/>').append(contents);
		}
	};

	//--------------------------------------------------------------------------
	// 2021年のフォーマット
	//--------------------------------------------------------------------------
	var UNIT_SETTING_2021 = $.extend(true,{},UNIT_SETTING_2020);
	UNIT_SETTING_2021.events = [
			{ 
				title:"CEDEC AWARDS", 	 day_index:1,	start_time: "17:30",	end_time:"19:00", room_no:"1", colspan:"all",
				html:"※公式サイトに終了時間は明記されていません<br/>"
//				,youtube:"https://youtu.be/c8mW57QwefM"
			}
		]

	//--------------------------------------------------------------------------
	// 2022年のフォーマット
	//--------------------------------------------------------------------------
	var UNIT_SETTING_2023 = {
		selector	:	function( $xml, day_index ){
			var day = day_index + 1;
			return $xml.find('#day'+day).find('td.td-content');
		},
		param		:{
			"room_no"		:	function($xml){ return $xml.find('div.session-post').attr("data-room").replace("第","").replace("会場",""); },
			"start_time"	:	function($xml){
				var text = $xml.find('.session-time').text();
				var indexOfKara = text.indexOf('-');
				return text.slice( indexOfKara - 5, indexOfKara);
			},
			"end_time"		:	function($xml){
				var text = $xml.find('.session-time').text();
				var indexOfKara = text.indexOf('-');
				return text.slice( indexOfKara + 1, indexOfKara + 1 + 5 );
			},

			"main_spec"		:	function($xml){ return $xml.find("div.btn-top-session:not(.ses-type,.ses-difficulty):first"); },
			"youtube"		:	function($xml){ return $xml.attr("youtube"); }
		},
		info : function( $xml, $fullXml ){
			var $modal = $xml.find('[id^="exampleModal-"]');
			
			$xml.css({
				"padding-left":"0em"
				,"padding-right":"0em"
			});

			// タイムシフト
			var canTimeshiftDelivery = true
			var $timeShift = $modal.find(".btn-time-shift");
			if( $timeShift.text().indexOf("タイムシフト配信:なし") != -1 ){
				canTimeshiftDelivery = false
			}

			var contents = [
				$xml
					.find("div.modal-header").remove().end()
					.find("div.container")
						.find("div.img-difficulty").closest("div.row").remove().end().end()
						.find('div:contains("講演形式")').closest("div.row").remove().end().end()
						.find("ul.list-unstyled").remove().end()
						.end()
				,$modal.find("div.ses-detail-link")
			];

			if( canTimeshiftDelivery == false ){
				contents.unshift($timeShift);
			}

			if( $modal.find("p").text().indexOf("資料公開: 予定あり") != -1) {
				contents.push(" 資料公開: 予定あり");
			} else if( $modal.find("p").text().indexOf("資料公開: 予定なし") != -1) {
				contents.push(" 資料公開: 予定なし");
			} else {
				contents.push(" 資料公開: 不明");
			}

			return $('<div/>').append(contents);
		}
	}


	//==========================================================================
	// 年度別設定
	//==========================================================================
	var SCHEDULE_SETTING = [
		{ year:"2023", first_date:"0823", domain:"https://cedec.cesa.or.jp/2023/", unit_setting: UNIT_SETTING_2023, 		convert_path:PATH_CONVERT	},
		{ year:"2022", first_date:"0823", domain:"https://cedec.cesa.or.jp/2022/", unit_setting: UNIT_SETTING_2021, 		convert_path:PATH_CONVERT,	cedil_tag_no:743	},
		{ year:"2021", first_date:"0824", domain:"https://cedec.cesa.or.jp/2021/", unit_setting: UNIT_SETTING_2021, 		convert_path:PATH_CONVERT,	cedil_tag_no:740	},
		{ year:"2020", first_date:"0902", domain:"https://cedec.cesa.or.jp/2020/", unit_setting: UNIT_SETTING_2020, 		convert_path:PATH_CONVERT,	cedil_tag_no:728	},
	];

	// GitHubにはアップしないが、キャッシュ用の設定
	var CASH＿SETTING = {
		 "2023":{ time:"2023/08/15 21:00", file:"custom.html" }
		,"2022":{ time:"2022/08/28 16:00", file:"custom.html" }
		,"2021":{ time:"2021/08/24 00:30", file:"custom.html" }
		,"2020":{ time:"2020/09/07 16:00", file:"custom.html" }
	}

	var TIME_SPAN	= 3;

	var FLOOR_GUIDE_URL = "http://www.pacifico.co.jp/visitor/floorguide/conference/tabid/204/Default.aspx";


	var m_dataCash	= undefined;

	//==========================================================================
	// 年単位の情報オブジェクト
	//==========================================================================
	function Unit( year ){
		var setting = findSetting( year );
		$.extend( true, this, setting );

		this.rootURL = setting.domain ;
		this.cash    = CASH＿SETTING[year];

		function findSetting( year ){
			for( var i = 0 ; i < SCHEDULE_SETTING.length ; ++i ){
				var rSetting = SCHEDULE_SETTING[i];
				if( rSetting.year == year ){
					return rSetting;
				}
			}
			return SCHEDULE_SETTING[0];
		}
	}

	//--------------------------------------------------------------------------
	// 開催日のDateリストを取得する
	//--------------------------------------------------------------------------
	Unit.prototype.getDateList = function(){
		var list = [];
		var month = parseInt(this.first_date.slice(0,2),10);
		var first_day = parseInt(this.first_date.slice(2,4),10);

		for( var i = 0 ; i < TIME_SPAN ; ++i ){
			var date = new Date( parseInt(this.year), month-1, first_day + i );
			list.push( date );
		}
		return list;
	}

	//--------------------------------------------------------------------------
	// スケジュールページへのパスを取得する
	//--------------------------------------------------------------------------
	Unit.prototype.getSchedulePagePath = function(){

		var cash_setting = CASH＿SETTING[ this.year ];
		if( cash_setting == undefined )	return "";

		var temp = location.href.split("/");
		temp.pop();
		return temp.join("/") + "/web_data/" + this.year + "/" + cash_setting.file;
	}

	//--------------------------------------------------------------------------
	// スケジュールページを読み込む
	//--------------------------------------------------------------------------
	Unit.prototype.readSchedule = function( option ){
	
		if( m_dataCash !== undefined ){
			option.success( option.index, m_dataCash );
			return;
		}

		var url =  this.getSchedulePagePath();

		$.ajax({
			type: 'GET',
			url: url,
			dataType: 'html',
			success: function(option,rUnit) {
				return function(xml){
					if( option.success !== undefined ){
						if( xml.responseText !== undefined ){
							m_dataCash = xml.responseText;
						}else{
							m_dataCash = xml;
						}

						option.success( option.index, m_dataCash );
					}
				}
			}(option,this),
			error:function( request, textStatus, errorThrown ) {
				if( option.error !== undefined ){
					option.error( request, textStatus, errorThrown);
				}
			}
		});
	}

	//==========================================================================
	// 
	//==========================================================================
	return {
		createSettingFromYear	:	createSettingFromYear,
		createSessionData		:	createSessionData,
		createEventSessionData	:	createEventSessionData,

		// DOM
		appendNaviMenuTo		:	appendNaviMenuTo,

		getFloorURL				:	getFloorURL
	};



	//--------------------------------------------------------------------------
	//
	//--------------------------------------------------------------------------
	function createSettingFromYear( year ){
		return new Unit( year );
	}

	//==========================================================================
	//  Session Data
	//==========================================================================
	function createSessionData( $xml, $fullXml, unit_setting ){
		var m_unit_setting = unit_setting;
		var m_$info = $xml;
		var m_$infoMain = undefined;
		var m_cash = {};

		if ($xml){
			if( typeof(m_unit_setting.info_selector)=="string" ) { 
				m_$infoMain = $xml.find( m_unit_setting.info_selector );
			} else if( typeof(m_unit_setting.info)=="function" ) { 
				m_$infoMain = m_unit_setting.info($xml, $fullXml);
			} 

		}

		// Session Data Object
		return {
			main 				: m_$infoMain,
			getRoomNo			: function(){return getParamText("room_no");},
			getStartTimeString 	: function(){return getParamText("start_time");},
			getEndTimeString 	: function(){return getParamText("end_time");},

			getStartTime 		: function(){
				var s = this.getStartTimeString().split(':');
				return parseInt(s[0]) * 60 + parseInt(s[1]);
			},
			getEndTime 			: function(){
				var s = this.getEndTimeString().split(':');
				return parseInt(s[0]) * 60 + parseInt(s[1]);
			},

			// 引数のSession Data と時間が重複していないかチェック
			isOverlap			: function( rData ){
				if( this.getStartTime() >= rData.getEndTime() )	return false;
				if( this.getEndTime() < rData.getStartTime() )	return false;
				return true;
			},

			getMainSpecObject		: function(){return getParamObject("main_spec");},
			getYoutubeURL			: function(){return getParamObject("youtube");},
			getNiconamaURL			: function(){return getParamObject("niconama");}
		};

		function getParamText( cash_name ){
			if(typeof(m_unit_setting.param[cash_name])=="undefined") return undefined;
			if( m_cash[cash_name] !== undefined )	return m_cash[cash_name];
			m_cash[cash_name] = m_unit_setting.param[cash_name]( m_$info );
			if( m_cash[cash_name] == undefined ) m_cash[cash_name] = "";
			return m_cash[cash_name];
		}
		function getParamObject( cash_name ){
			if(typeof(m_unit_setting.param[cash_name])=="undefined") return undefined;
			if( m_cash[cash_name] !== undefined )	return m_cash[cash_name];
			m_cash[cash_name] = m_unit_setting.param[cash_name]( m_$info );
			return m_cash[cash_name];
		}
	};

	//==========================================================================
	//  Event Session Data
	//==========================================================================
	function createEventSessionData( rEvent, unit_setting ){

		var contents = [];
		contents.push( "<h2>" + rEvent.title + "</h2>" );
		if( rEvent.hash_tag ){
			var temp = rEvent.hash_tag.split(",");
			for(var i=0;i<temp.length;++i) {
				contents.push( '#' + temp[i] );
				contents.push( '　' );
				contents.push( '<a href="https://twitter.com/hashtag/' + temp[i] + '" target="blank"><i class="fab fa-2x fa-twitter-square"></i></a>' );
				contents.push( '<br/>' );
			}
		}

		if( rEvent.html ){
			contents.push( rEvent.html );
		}

		// イベント用設定
		var session = createSessionData( $("<div>"), $("<div>"), unit_setting );
		session.event				= $.extend({}, rEvent );
		session.main 				= $("<div>").append( contents ),
		session.getRoomNo			= function(){return this.event.room_no;},
		session.getStartTimeString 	= function(){return this.event.start_time; }
		session.getEndTimeString 	= function(){return this.event.end_time; }

		session.getYoutubeURL		= function(){return this.event.youtube;}

		return session;
	}


	//--------------------------------------------------------------------------
	// 時間文字列を変換する
	// "19:30" → 19*60 + 30 = 1170
	//--------------------------------------------------------------------------
	function getMinutesFromTimeString( str ){
		var s = str.split(':');
		return parseInt(s[0]) * 60 + parseInt(s[1]);		
	}

	//==========================================================================
	// DOM
	//==========================================================================
	//--------------------------------------------------------------------------
	//
	//--------------------------------------------------------------------------
	function appendNaviMenuTo( $dom ){
		var list = [];

		for( var i = 0 ; i < SCHEDULE_SETTING.length ; ++i ){
			var rSetting = SCHEDULE_SETTING[i];
			if( i == 0 ){
				list.push('<div><a class="ui-btn" data-ajax="false" href="./index.html">Top(' + rSetting.year + '年)</a></div>' );
			}else{
				list.push('<div><a class="ui-btn" data-ajax="false" href="./index.html?year=' + rSetting.year + '">' + rSetting.year + '年</a></div>' );
			}
		}

		return $dom.append( list );
	}

	//--------------------------------------------------------------------------
	// 部屋名から フロアマップのURLを取得する
	//--------------------------------------------------------------------------
	function getFloorURL( room_name, year ){

		if (room_name=="不明") 		return undefined;
		if (room_name=="オンライン") return undefined;

		if (year<="2019") {
			var floorURL = FLOOR_GUIDE_URL + "#floor";

			if( room_name == "メインホール" ){
				return floorURL + "1";
			}

			if( room_name.indexOf("R") == 0 ){
				return floorURL + room_name.substr(1,1);
			}

			var floorNo = parseInt( room_name.substr(0,1), 10 );
			if( 1 <= floorNo && floorNo <= 6 ){
				return floorURL + floorNo;
			}
		} else if( year<="2021" ){
			return encodeURI("https://cedec.cesa.or.jp/"+year+"/enquete/live/第" + room_name +"会場");
		} else if( year<="2022" ){
			return encodeURI("https://cedec.cesa.or.jp/"+year+"/session/live/VNE" +  ( '00' + room_name ).slice( -2 ));
		}

		return undefined;
	}



})(jQuery);
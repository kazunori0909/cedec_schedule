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
	//--------------------------------------------------------------------------
	// 2018年のフォーマット
	//--------------------------------------------------------------------------
	var UNIT_SETTING = {
		selector	:	function( $xml, day_index ){
			return $xml.find( "div[id*=taballday"+ (day_index+1) +"] > div.session-post" );
		},
		info_selector: "div.session-right",
		param		:{
			"room_no"		:	function($xml){ return $xml.attr("room_number"); },
			"start_time"	:	function($xml){
				var text = $xml.find('.detail-session-meta-top').text();
				var indexOfKara = text.indexOf(' 〜 ');
				return text.slice( indexOfKara - 5, indexOfKara);
			},
			"end_time"		:	function($xml){
				var text = $xml.find('.detail-session-meta-top').text();
				var indexOfKara = text.indexOf(' 〜 ');
				return text.slice( indexOfKara + 3, indexOfKara + 3 + 5 );
			},

			"main_spec"		:	function($xml){ return $xml.find("div.btn-top-session:not(.ses-type,.ses-difficulty):first"); },
			"youtube"		:	function($xml){ return $xml.attr("youtube"); },
			"niconama"		:	function($xml){ return $xml.attr("niconama"); }
		},
		events : [
			{ 
				title:"CEDEC AWARDS", 	 day_index:1,	start_time: "17:50",	end_time:"19:25", room_no:"メインホール", colspan:"all",
				html:"※公式サイトに終了時間は明記されていません<br/>"
			},
			{
				title:"Developer's Night", day_index:1,	start_time: "19:30",	end_time:"21:30", room_no:"501＋502", colspan:"all",
				html:"※CEDEC AWARDS終了後に開始<br/>※会期中、2F総合受付にてチケットを販売<br/>"
			}
		]

	};

	var PATH_CONVERT_2018 = function( $dom ){
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
	// 2017年までのフォーマット
	//--------------------------------------------------------------------------
	var UNIT_SETTING_BEFORE_2017 = {
		selector	:	function( $xml, day_index ){
			return $xml.find( "div.schedule_timeframe_normal" );
		},
		info_selector: "td",
		param		:{
			"room_no"		:	function($xml){ return $xml.find(".room_number").text();},
			"start_time"	:	function($xml){ return $xml.find(".ss_time_start").text();},
			"end_time"		:	function($xml){ return $xml.find(".ss_time_end").text();},
			"main_spec"		:	function($xml){ return $xml.find(".ss_ippr_icon + img"); },
			"youtube"		:	function($xml){ return ""; },
			"niconama"		:	function($xml){ return ""; }
		}
	};

	var PATH_CONVERT_2017 = function( $dom ){
		var domain = this.domain;
		$dom.find("a").each(function(){
			var $this = $(this);
			var path = $this.attr("href");
			if( path.indexOf("http") == 0 ) return;
			if( path.indexOf("/") == 0 ){
				path = domain + path.substr(1)  + "#content";
				$this.attr({
					"href"   : path,
					"target" : "blank"
				});
			}
		});	
	}

	var PATH_CONVERT_BEFORE_2016 = function( $dom ){
		var domain = this.domain;
		var rootURL = this.rootURL;
		var year = this.year;

		// 相対パスのURLを変更。 さらにスライドが面倒なので #content に飛ばしてみる
		$dom.find("a").each(function(){
			var $this = $(this);
			var path = $this.attr("href");
			if( path.indexOf("http") == 0 ) return;
			if( path.indexOf("../") == 0 ){
				path = path = rootURL + path.replace("../", year + "/" )  + "#content";
			}else{
				path = domain + path.substr(1)  + "#content";
			}
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
			if( path.indexOf("../") == 0 ){
				path = rootURL + path.replace("../", year + "/" );
				$this.attr("src", path );
			}
		});
	}


	//==========================================================================
	// 年度別設定
	//==========================================================================
	var SCHEDULE_SETTING = [
		{ year:"2018", first_date:"0822", domain:"https://2018.cedec.cesa.or.jp/", format:'session#tab{day_no}', single_page:true, unit_setting: UNIT_SETTING, 			convert_path:PATH_CONVERT_2018	},
		{ year:"2017", first_date:"0830", domain:"http://cedec.cesa.or.jp/", format:'2017/session/schedule_{date}/',		unit_setting: UNIT_SETTING_BEFORE_2017, convert_path:PATH_CONVERT_2017,		cedil_tag_no:713	},
		{ year:"2016", first_date:"0824", domain:"http://cedec.cesa.or.jp/", format:'2016/session/schedule_{date}.html',	unit_setting: UNIT_SETTING_BEFORE_2017, convert_path:PATH_CONVERT_BEFORE_2016,	cedil_tag_no:712	},
		{ year:"2015", first_date:"0826", domain:"http://cedec.cesa.or.jp/", format:'2015/session/schedule_{date}.html',	unit_setting: UNIT_SETTING_BEFORE_2017, convert_path:PATH_CONVERT_BEFORE_2016,	cedil_tag_no:709	},
		{ year:"2014", first_date:"0902", domain:"http://cedec.cesa.or.jp/", format:'2014/session/schedule_{date}.html',	unit_setting: UNIT_SETTING_BEFORE_2017, convert_path:PATH_CONVERT_BEFORE_2016,	cedil_tag_no:9	},
		{ year:"2013", first_date:"0821", domain:"http://cedec.cesa.or.jp/", format:'2013/schedule/day{day_no}.html',		unit_setting: UNIT_SETTING_BEFORE_2017, convert_path:PATH_CONVERT_BEFORE_2016,	cedil_tag_no:8	},
		{ year:"2012", first_date:"0820", domain:"http://cedec.cesa.or.jp/", format:'2012/schedule/day{day_no}.html',		unit_setting: UNIT_SETTING_BEFORE_2017, convert_path:PATH_CONVERT_BEFORE_2016,	cedil_tag_no:4	},
		{ year:"2011", first_date:"0906", domain:"http://cedec.cesa.or.jp/", format:'2011/schedule/day{day_no}.html',		unit_setting: UNIT_SETTING_BEFORE_2017, convert_path:PATH_CONVERT_BEFORE_2016,	cedil_tag_no:6	},
	];

	// GitHubにはアップしないが、キャッシュ用の設定
	var CASH＿SETTING = {
//		 "2018":{ time:"2018/08/23 20:00", file:"custom.html" }
//		,"2017":{ time:"2017/08/25 23:30" }
//		,"2016":{ time:"2017/08/25 23:30" }
	}

	var TIME_SPAN	= 3;

	var FLOOR_GUIDE_URL = "http://www.pacifico.co.jp/visitor/floorguide/conference/tabid/204/Default.aspx";


	var m_dataCash	= [];

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
	// 日付インデックスからスケジュールページへのパスを取得する
	//--------------------------------------------------------------------------
	Unit.prototype.getSchedulePagePath = function( day_index ){

		var cash_setting = CASH＿SETTING[ this.year ];
		if( cash_setting != undefined ){
			var temp = location.href.split("/");
			temp.pop();
			if( cash_setting.file ){
				return temp.join("/") + "/web_data/" + this.year + "/" + cash_setting.file;
			}else{
				return temp.join("/") + "/web_data/" + this.year + "/" + day_index + ".html";
			}
		}		

		if( this.format.indexOf('{day_no}') > 0 ){
			return this.rootURL + this.format.replace('{day_no}',day_index + 1);
		}else if( this.format.indexOf('{day_index}') > 0 ){
			return this.rootURL + this.format.replace('{day_index}',day_index);
		}else if( this.format.indexOf('{date}') > 0 ){
			var month = parseInt(this.first_date.slice(0,2),10);
			var first_day = parseInt(this.first_date.slice(2,4),10);
			var date = new Date( this.year, month-1, first_day);
			date.setDate( date.getDate() + day_index );

			var month 		= date.getMonth() + 1;
			var day 		= date.getDate();
			var month_str	= month.toString().length < 2 ? "0" + month : month.toString();
			var day_str		= day.toString().length < 2 ? "0" + day : day.toString();

			return this.rootURL + this.format.replace('{date}',month_str + day_str);
		}

		return this.rootURL + this.format;
	}

	//--------------------------------------------------------------------------
	// スケジュールページを読み込む
	//--------------------------------------------------------------------------
	Unit.prototype.readSchedule = function( option ){
	
		if( m_dataCash[option.index] !== undefined ){
			option.success( option.index, m_dataCash[option.index] );
			return;
		}

		var url =  this.getSchedulePagePath(option.index);

		$.ajax({
			type: 'GET',
			url: url,
			dataType: 'html',
			success: function(option,rUnit) {
				return function(xml){
					if( option.success !== undefined ){
						if( xml.responseText !== undefined ){
							m_dataCash[option.index] = xml.responseText;
						}else{
							m_dataCash[option.index] = xml;
						}

						// シングルページ指定があれば全日程のキャッシュを作成
						if( rUnit.single_page ){
							for( var i = 0 ; i < TIME_SPAN ; ++i ){
								m_dataCash[i] = m_dataCash[option.index];
							}
						}

						option.success( option.index, m_dataCash[option.index] );
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
	function createSessionData( $xml, unit_setting ){
		var m_unit_setting = unit_setting;
		var m_$info = $xml;
		var m_$infoMain = $xml ? $xml.find( m_unit_setting.info_selector ) : undefined;
		var m_cash = {};

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
				if( this.getStartTime() <= rData.getStartTime() && rData.getStartTime() < this.getEndTime() )	return true;
				if( this.getStartTime() <= rData.getEndTime() && rData.getEndTime() < this.getEndTime() )	return true;
				return false;
			},

			getMainSpecObject		: function(){return getParamObject("main_spec");},
			getYoutubeURL			: function(){return getParamObject("youtube");},
			getNiconamaURL			: function(){return getParamObject("niconama");}
		};

		function getParamText( cash_name ){
			if( m_cash[cash_name] !== undefined )	return m_cash[cash_name];
			m_cash[cash_name] = m_unit_setting.param[cash_name]( m_$info );
			if( m_cash[cash_name] == undefined ) m_cash[cash_name] = "";
			return m_cash[cash_name];
		}
		function getParamObject( cash_name ){
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
			contents.push( '#' + rEvent.hash_tag );
			contents.push( '　' );
			contents.push( '<a href="https://twitter.com/hashtag/' + rEvent.hash_tag + '" target="blank"><i class="fab fa-2x fa-twitter-square"></i></a>' );
			contents.push( '<br/>' );
		}

		if( rEvent.html ){
			contents.push( rEvent.html );
		}

		// イベント用設定
		var session = createSessionData( $("<div>"), unit_setting );
		session.event				= $.extend({}, rEvent );
		session.main 				= $("<div>").append( contents ),
		session.getRoomNo			= function(){return this.event.room_no;},
		session.getStartTimeString 	= function(){return this.event.start_time; }
		session.getEndTimeString 	= function(){return this.event.end_time; }

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
	function getFloorURL( room_name ){

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

		return undefined;
	}



})(jQuery);

;
//------------------------------------------------------------------------------
// CEDEC
//------------------------------------------------------------------------------
var CEDEC = (function($){
	//==========================================================================
	// 定義
	//==========================================================================
	var MASTER_URL	= "http://cedec.cesa.or.jp/";

	var SCHEDULE_SETTING = [
		{ year:"2017", first_date:"0830", format:'session/schedule_{date}.html'	},
		{ year:"2016", first_date:"0824", format:'session/schedule_{date}.html',	cedil_tag_no:712	},
		{ year:"2015", first_date:"0826", format:'session/schedule_{date}.html',	cedil_tag_no:709	},
		{ year:"2014", first_date:"0902", format:'session/schedule_{date}.html',	cedil_tag_no:9		},
		{ year:"2013", first_date:"0821", format:'schedule/day{day_no}.html',		cedil_tag_no:8		},
		{ year:"2012", first_date:"0820", format:'schedule/day{day_no}.html',		cedil_tag_no:4		},
		{ year:"2011", first_date:"0906", format:'schedule/day{day_no}.html',		cedil_tag_no:6		},
		{ year:"2010", first_date:"0831", format:'schedule/day{day_no}.html',		cedil_tag_no:5		},
	];

	var TIME_SPAN	= 3;

	//==========================================================================
	// Schedule DOM 解析用
	//
	// ※フォーマットが変わった際に変更が必要
	// 　年ごとで切り分けるとかも可能か
	//==========================================================================
	var SCHEDULE_UNIT_SELECTOR = "div.schedule_timeframe_normal";
	var SCHEDULE_PARAM_SELECTOR_MAP = {
		"room_no"		:	".room_number",
		"start_time"	:	".ss_time_start",
		"end_time"		:	".ss_time_end",
		"main_spec"		:	".ss_ippr_icon + img"
	};

	var m_dataCash	= [];


	return {
		MASTER_URL				:	MASTER_URL,
		TIME_SPAN				:	TIME_SPAN,
		SCHEDULE_UNIT_SELECTOR	:	SCHEDULE_UNIT_SELECTOR,
		findSettingFromYear		: 	findSettingFromYear,
		convertFormatPath		:	convertFormatPath,
		readData				:	readData,
		createSessionData		:	createSessionData,


		// DOM
		appendNaviMenuTo		:	appendNaviMenuTo
	};

	//--------------------------------------------------------------------------
	//
	//--------------------------------------------------------------------------
	function findSettingFromYear( year ){

		for( var i = 0 ; i < SCHEDULE_SETTING.length ; ++i ){
			var rSetting = SCHEDULE_SETTING[i];
			if( rSetting.year == year ){
				return rSetting;
			}
		}

		return SCHEDULE_SETTING[0];
	}

	//--------------------------------------------------------------------------
	//
	//--------------------------------------------------------------------------
	function convertFormatPath( setting, day_index ){

		var rel_path = setting.format;

		if( rel_path.indexOf('{day_no}') > 0 ){
			rel_path = rel_path.replace('{day_no}',day_index + 1);
		}else if( rel_path.indexOf('{day_index}') > 0 ){
			rel_path = rel_path.replace('{day_index}',day_index);
		}else if( rel_path.indexOf('{date}') > 0 ){
			var month = parseInt(setting.first_date.slice(0,2),10);
			var first_day = parseInt(setting.first_date.slice(2,4),10);
			var date = new Date( setting.year, month-1, first_day);
			date.setDate( date.getDate() + day_index );

			var month 		= date.getMonth() + 1;
			var day 		= date.getDate();
			var month_str	= month.toString().length < 2 ? "0" + month : month.toString();
			var day_str		= day.toString().length < 2 ? "0" + day : day.toString();

			rel_path = rel_path.replace('{date}',month_str + day_str);
		}

		return rel_path;
	}

	//--------------------------------------------------------------------------
	//
	//--------------------------------------------------------------------------
	function readData( option ){

		if( m_dataCash[option.index] !== undefined ){
			option.success( option.index, m_dataCash[option.index] );
			return;
		}

		$.ajax({
			type: 'GET',
			url: option.url,
			dataType: 'html',
			success: function(xml) {
				if( option.success !== undefined ){
					if( xml.responseText !== undefined ){
						m_dataCash[option.index] = xml.responseText;
					}else{
						m_dataCash[option.index] = xml;
					}
					option.success( option.index, m_dataCash[option.index] );
				}
			},
			error:function() {
				if( option.error !== undefined ){
					option.error();
				}
			}
		});
	}

	//==========================================================================
	//  Session Data
	//==========================================================================
	function createSessionData( $xml ){
		var m_$info = $xml;
		var m_cash = {};

		// Session Data Object
		return {
			info 				: m_$info,
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

		};

		function getParamText( cash_name ){
			if( m_cash[cash_name] !== undefined )	return m_cash[cash_name];
			m_cash[cash_name] = m_$info.find( SCHEDULE_PARAM_SELECTOR_MAP[cash_name] ).text();
			return m_cash[cash_name];
		}
		function getParamObject( cash_name ){
			if( m_cash[cash_name] !== undefined )	return m_cash[cash_name];
			m_cash[cash_name] = m_$info.find( SCHEDULE_PARAM_SELECTOR_MAP[cash_name] );
			return m_cash[cash_name];
		}
	};

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

})(jQuery);

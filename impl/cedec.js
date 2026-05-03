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
	//==========================================================================
	// 年度別設定
	//==========================================================================
	var SCHEDULE_SETTING = [
		{ year:"2025", first_date:"0722", domain:"https://cedec.cesa.or.jp/2025/",
		  events:[
			{ title:"Developers' Night", day_index:1, start_time:"19:30", end_time:"21:30", room_no:"多目的ホール",
			  html:'※会場で先着500名の限定販売<br/><a href="https://cedec.cesa.or.jp/2025/event/developer/" target="blank">詳細</a>' }
		  ]
		},
		{ year:"2024", first_date:"0821", domain:"https://cedec.cesa.or.jp/2024/", cedil_tag_no:752,
		  events:[
			{ title:"Developers' Night", day_index:1, start_time:"19:30", end_time:"21:30", room_no:"多目的ホール",
			  html:'※会場で先着500名の限定販売<br/><a href="https://cedec.cesa.or.jp/2024/event/developer/" target="blank">詳細</a>' }
		  ]
		},
		{ year:"2023", first_date:"0823", domain:"https://cedec.cesa.or.jp/2023/", cedil_tag_no:748 },
		{ year:"2022", first_date:"0823", domain:"https://cedec.cesa.or.jp/2022/", cedil_tag_no:743,
		  events:[
			{ title:"CEDEC AWARDS", day_index:1, start_time:"17:30", end_time:"19:00", room_no:"1", colspan:"all",
			  html:"※公式サイトに終了時間は明記されていません<br/>" }
		  ]
		},
		{ year:"2021", first_date:"0824", domain:"https://cedec.cesa.or.jp/2021/", cedil_tag_no:740,
		  events:[
			{ title:"CEDEC AWARDS", day_index:1, start_time:"17:30", end_time:"19:00", room_no:"1", colspan:"all",
			  html:"※公式サイトに終了時間は明記されていません<br/>" }
		  ]
		},
		{ year:"2020", first_date:"0902", domain:"https://cedec.cesa.or.jp/2020/", cedil_tag_no:728 },
	];

	// GitHubにはアップしないが、キャッシュ用の設定
	var CASH＿SETTING = {
		 "2025":{ time:"2025/07/02 23:00" }
		,"2024":{ time:"2024/08/19 23:00" }
		,"2023":{ time:"2023/08/23 01:23" }
		,"2022":{ time:"2022/08/28 16:00" }
		,"2021":{ time:"2021/08/24 00:30" }
		,"2020":{ time:"2020/09/07 16:00" }
	}

	var TIME_SPAN	= 3;

	var FLOOR_GUIDE_URL = "http://www.pacifico.co.jp/visitor/floorguide/conference/tabid/204/Default.aspx";


	var m_dataCash	= undefined;

	// 分野コード → CSS クラス名マッピング
	var SPEC_CLASS = {
		'ENG': '-eng', 'VA': '-va', 'PRD': '-prd',
		'BP' : '-bp',  'SND': '-snd', 'GD': '-gd', 'AC': '-ac'
	};

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
		var temp = location.href.split("/");
		temp.pop();
		return temp.join("/") + "/web_data/" + this.year + "/schedule.json";
	}

	//--------------------------------------------------------------------------
	// スケジュールデータ(JSON)を読み込む
	//--------------------------------------------------------------------------
	Unit.prototype.readSchedule = function( option ){

		if( m_dataCash !== undefined ){
			option.success( option.index, m_dataCash );
			return;
		}

		var url = this.getSchedulePagePath();

		$.ajax({
			type: 'GET',
			url: url,
			dataType: 'json',
			success: function(option) {
				return function(data){
					if( option.success !== undefined ){
						m_dataCash = data;
						option.success( option.index, m_dataCash );
					}
				}
			}(option),
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
	//  Session Data (JSONオブジェクトから生成)
	//==========================================================================
	function createSessionData( session, domain ){
		var m_$main = buildSessionDom( session, domain );

		return {
			main				: m_$main,
			getRoomNo			: function(){ return session.room; },
			getStartTimeString	: function(){ return session.start; },
			getEndTimeString	: function(){ return session.end; },

			getStartTime		: function(){
				var s = session.start.split(':');
				return parseInt(s[0]) * 60 + parseInt(s[1]);
			},
			getEndTime			: function(){
				var s = session.end.split(':');
				return parseInt(s[0]) * 60 + parseInt(s[1]);
			},

			isOverlap			: function( rData ){
				if( this.getStartTime() >= rData.getEndTime() )	return false;
				if( this.getEndTime() <= rData.getStartTime() )	return false;
				return true;
			},

			getMainSpecObject	: function(){ return m_$main.find('.timetable-category > span:first'); },
			getYoutubeURL		: function(){ return undefined; },
			getNiconamaURL		: function(){ return undefined; }
		};
	}

	//--------------------------------------------------------------------------
	// JSONセッションからDOM要素を構築する
	//--------------------------------------------------------------------------
	function buildSessionDom( session, domain ) {
		var $div = $('<div/>');

		// 分野（フィルター用）
		if( session.spec ){
			var $span = $('<span/>').text( session.spec );
			if( SPEC_CLASS[session.spec] ) $span.addClass( SPEC_CLASS[session.spec] );
			$('<div class="timetable-category"/>').append( $span ).appendTo( $div );
		}

		// タイトル（詳細リンク付き）
		var detailUrl = session.detail_url || '';
		if( detailUrl && detailUrl.indexOf('http') !== 0 ){
			var base = domain.replace(/\/[0-9]{4}\/$/, '');
			detailUrl = base + (detailUrl.indexOf('/') === 0 ? detailUrl : '/' + detailUrl);
		}

		if( detailUrl ){
			$('<a class="session-title" target="_blank"/>').attr('href', detailUrl).text( session.title ).appendTo( $div );
		} else {
			$('<span class="session-title"/>').text( session.title ).appendTo( $div );
		}

		// 登壇者
		var $speakers = $('<div class="timetable-speakers"/>').appendTo( $div );
		$.each( session.speakers || [], function( i, sp ){
			$('<div class="speakers-item"/>')
				.append( $('<span class="speakers-name"/>').text( sp.name ) )
				.append( $('<span class="speakers-company"/>').text( sp.company ) )
				.appendTo( $speakers );
		});

		// 登壇者が複数の場合は2人目以降を折りたたむ
		var $speakerItems = $speakers.children('.speakers-item');
		if( $speakerItems.length > 1 ){
			$('<div class="disp_all_speaker"/>')
				.text( 'ほか' + ($speakerItems.length - 1) + '名' )
				.click(function(){ $(this).next().toggle('slow'); })
				.insertAfter( $speakerItems.eq(0) );
			$('<div/>')
				.append( $speakerItems.filter(':not(:first)') )
				.hide()
				.click(function(){ $(this).toggle('slow'); })
				.insertAfter( $speakers.children('.disp_all_speaker') );
		}

		// 資料公開（CEDiLリンク置換のターゲット）
		$div.append(' 資料公開: 不明');

		return $div;
	}

	//==========================================================================
	//  Event Session Data
	//==========================================================================
	function createEventSessionData( rEvent ){

		var contents = [];
		contents.push( "<h2>" + rEvent.title + "</h2>" );
		if( rEvent.hash_tag ){
			var temp = rEvent.hash_tag.split(",");
			for(var i=0;i<temp.length;++i) {
				contents.push( '#' + temp[i] );
				contents.push( '　' );
				contents.push( '<a href="https://x.com/hashtag/' + temp[i] + '" target="blank"><i class="fab fa-2x fa-twitter-square"></i></a>' );
				contents.push( '<br/>' );
			}
		}

		if( rEvent.html ){
			contents.push( rEvent.html );
		}

		return {
			event				: $.extend({}, rEvent),
			main				: $("<div>").append( contents ),
			getRoomNo			: function(){ return this.event.room_no; },
			getStartTimeString	: function(){ return this.event.start_time; },
			getEndTimeString	: function(){ return this.event.end_time; },
			getStartTime		: function(){
				var s = this.event.start_time.split(':');
				return parseInt(s[0]) * 60 + parseInt(s[1]);
			},
			getEndTime			: function(){
				var s = this.event.end_time.split(':');
				return parseInt(s[0]) * 60 + parseInt(s[1]);
			},
			isOverlap			: function( rData ){
				if( this.getStartTime() >= rData.getEndTime() )	return false;
				if( this.getEndTime() <= rData.getStartTime() )	return false;
				return true;
			},
			getMainSpecObject	: function(){ return $(); },
			getYoutubeURL		: function(){ return this.event.youtube; },
			getNiconamaURL		: function(){ return undefined; }
		};
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
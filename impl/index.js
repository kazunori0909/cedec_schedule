//------------------------------------------------------------------------------
//
//------------------------------------------------------------------------------
(function(){
	//==========================================================================
	// 定義
	//==========================================================================
	var WEEK_DAY_SHORT_STRING = [ "日", "月", "火", "水", "木", "金", "土", "日" ];
	var MIN_MINUTES	= 5;
	var DEFAULT_YEAR = 2018;

	// DOM関連
	var CONTENTS_BODY_SELECTOR = '#contents_body';
	var CONTENTS_HEADER_SELECTOR = '#contents_header';
	var CONTENTS_TABLE_ID = 'day_table';
	var CONTENTS_TABLE_SELECTOR = '#'+CONTENTS_TABLE_ID;

	var CONTENTS_FAVORITE_TABLE_ID = 'day_favorite_table';
	var CONTENTS_FAVORITE_TABLE_SELECTOR = '#'+CONTENTS_FAVORITE_TABLE_ID;

	// 除外する文字列リスト
	var REMOVE_SPECS_STRINGS_BEFORE_2017 = [
		"基調講演"
		,"レギュラーセッション"
		,"ショートセッション"
		,"［招待セッション］"
		,"［協賛セッション］"
		,"［セッション］"
		,"［セッション（60分）］"
	];

	// 除外する文字列リスト
	var REMOVE_HTML_STRINGS_2018 = [
		 new RegExp('(□ 講演時間:)(.*)(<br>)','g')
		,new RegExp('(□ 講演形式: [基調講演|レギュラーセッション|ショートセッション])(.*)(<br>)','g')
	];

	// タイトル名に keywordが含まれていると class名を追加する設定
	var ADD_CLASS_NAME_FROM_TITLE = [
		{ keyword:"【講演キャンセル】", class_name:"session_cancel" }
	];

	// タイトル名に keywordが含まれていると class名を追加する設定
	var CUSTOM_SETTING = {
		"2018": { 
			events:[
				{ 
					title:"ProCEDEC2018", 	 day_index:2,	start_time: "19:30",	end_time:"22:30", room_no:"ニューヨークグランドキッチン"
					,html:'<a href="https://procedec2018.peatix.com/">イベント詳細</a><br/>'
					,hash_tag:"ProCEDEC"
				}
				,{ 
					title:"Artists Meets Technicals 2018", 	 day_index:2,	start_time: "20:00",	end_time:"22:00", room_no:"サンタモニカ・サードストリート ミートテラス"
					,html:'<a href="https://artistsmeetstechnicals.doorkeeper.jp/events/77430">イベント詳細</a><br/>'
				}
				,{ 
					title:"UI CEDEC 2018", 	 day_index:2,	start_time: "19:30",	end_time:"21:30", room_no:"HUB Colette・Mare みなとみらい店"
					,html:'<a href="https://ui-cedec.connpass.com/event/96867/">イベント詳細</a><br/>'
					,hash_tag:"UICEDEC"
				}
				,{ 
					title:"裏 CEDEC 2018", 	 day_index:2,	start_time: "19:30",	end_time:"21:30", room_no:"のげ（ちょっと遠いので、時間厳守）"
					,html:'<a href="https://ura-cedec.com/">イベント詳細</a><br/>'
				}
				,{ 
					title:"音 CEDEC 2018", 	 day_index:2,	start_time: "19:30",	end_time:"21:30", room_no:"不明"
					,html:'<font color="#FF4500">招待制<br/>場所・時間ともに詳細不明</font>'
				}
				,{ 
					title:"CEDECON 2018", 	 day_index:2,	start_time: "19:30",	end_time:"21:30", room_no:"HUB Colette・Mare みなとみらい店"
					,html:'<a href="https://cedecon2018.peatix.com/">イベント詳細</a><br/>'
					,hash_tag:"cedecon"
				}
				,{ 
					title:"AiCEDEC2018", 	 day_index:2,	start_time: "19:45",	end_time:"21:45", room_no:"横浜モノリス"
					,html:'<a href="https://aicedec2018.peatix.com/">イベント詳細</a><br/>'
					,hash_tag:"AiCEDEC"
				}
				,{ 
					title:"第1回 cedec女子会", 	 day_index:0,	start_time: "19:00",	end_time:"22:00", room_no:"SANTA MONICA 3rd st. MEAT TERRACE"
					,html:'<a href="https://www.facebook.com/events/507327916393384/">イベント詳細</a><br/>'
				}
			]
		}
	};
	

	//==========================================================================
	//==========================================================================
	var m_url_params = getURL_Params();
	var m_year       = DEFAULT_YEAR;

	if( m_url_params.year !== undefined )	m_year = m_url_params.year;

	var m_highlightInfo = {
		enabled	: false,
		dayIndex: 0,
		intervalId:-1,
	}

	var m_opendDay = new Date();

	// for Debug
	var m_debugHighlighDay = undefined;
//	var m_opendDay	 = new Date(2017,8-1,31,11,24);
//	var m_debugHighlighDay = m_opendDay;

	var m_setting;
	var m_dateList = [];

	var m_hideInfo	= {};
	var m_favoriteList = {};	
	
	$(document).ready(function(){

		m_setting  = CEDEC.createSettingFromYear( m_year );
		m_dateList = m_setting.getDateList();
		
		$('body')
			.removeClass('ui-overlay-a')
			.css('overflow-x','visible')
			.find('.ui-page')
				.css('overflow-x','visible');

		appendContentsHeader( CONTENTS_HEADER_SELECTOR );
		CEDEC.appendNaviMenuTo( $('#old').next() );

		startupHighlightInfo();

		var dayIndex = parseInt(Cookies.get( m_year + '_dayIndex' )) || 0;
		if( m_highlightInfo.enabled ){
			// 開催期間中は日付優先
			dayIndex = m_highlightInfo.dayIndex;
		}

		setTimeout( appendSessionSchedule, 10, dayIndex );
	});

	//--------------------------------------------------------------------------
	// コンテンツのヘッダーにDOMを追加
	//--------------------------------------------------------------------------
	function appendContentsHeader( dom_selector ){

		var $header = $(dom_selector).empty();

		$header.append('<h1>CEDEC ' + m_year + 'スケジュール</h1>');
		
		var $div = $('<div></div>');

		for( var i = 0 ; i < m_dateList.length ; ++i ){
			var date = m_dateList[i];
			$('<input type="button" class="schedule_button"></input>')
				.val( (date.getMonth() + 1) + "/" + date.getDate() + "(" + WEEK_DAY_SHORT_STRING[date.getDay()] +")" )
				.attr( 'data_index', i )
				.click(function(){
					var index = $(this).attr('data_index');
					Cookies.set( m_year + '_dayIndex', index, {expires:365*10} )
					setTimeout( appendSessionSchedule, 10, parseInt( index ) );
				})
				.appendTo( $div );
		}

		$div.appendTo( $header );

		if( m_setting.cash != undefined ){
			$header.append("※セッション情報 取得日時：" + m_setting.cash.time + "　");
		}
	}


	//--------------------------------------------------------------------------
	// 
	//--------------------------------------------------------------------------
	function appendSessionSchedule( day_index ){

		// ハイライト処理を停止
		if( m_highlightInfo.intervalId >= 0 ){
			clearInterval( m_highlightInfo.intervalId );
			m_highlightInfo.intervalId = -1;
		}

		// loading icon
		$(CONTENTS_BODY_SELECTOR).prepend(
			'<img id="contents_loading_icon" src="./image/rolling.gif" />'
		)
		$(CONTENTS_TABLE_SELECTOR).parent().remove();

		// 
		m_setting.readSchedule({
			index : day_index,
			success	: function(index,data){
				$('#contents_loading_icon').remove();
				appendTable( data, index );
				CEDiL.readJsonData( m_setting.year, m_setting.cedil_tag_no, appendLinkToCEDiL );
				//CEDiL.readData( m_setting.cedil_tag_no, appendLinkToCEDiL );
			},
			error: function(request, textStatus, errorThrown){
				$('#contents_loading_icon').remove();
				alert('スケジュールデータの読み込みに失敗しました。');
			}
		})

	}

	//--------------------------------------------------------------------------
	// XMLからテーブルを作成し追加する
	//--------------------------------------------------------------------------
	function appendTable( xml, day_index ){
		var $xml		  = $(xml);
		var $contets_body = $(CONTENTS_BODY_SELECTOR);

		// 情報取得
		var roomList = createRoomSessionList( $xml, day_index );	// 部屋毎のデータを取得
		var timeRange = getMinMaxTime( roomList );		// 開催時間の取得

		m_favoriteList = {};

		// テーブル作成
		var $table = createBaseTable( timeRange, roomList );
		$table.attr({
			"id": CONTENTS_TABLE_ID
			,"dayIndex":day_index
		});
		appendSessionListTo( $table, roomList, day_index );
		if( m_setting.convert_path ) m_setting.convert_path( $table );

		// 非表示のタグを削除。
		// ※行列のインデックスがずれる為、最後にまとめて削除。
		$contets_body.find("tr:hidden,td:hidden").remove();

		// フィルター作成
		var $filter = createFilter( roomList );
		if( m_setting.convert_path ) m_setting.convert_path( $filter );
		commitFilterInfoTo( $table );

		var $favorite = $('<img id="favorite_selector" src="./image/favorite_0.png"></img>');

		var h2 = "<br/><br/><h2>" + $xml.find("h2").html() +"</h2>";
		if( m_setting.year == "2018" ){
			h2 = '<br/><br/><h2>Day ' + (day_index+1) + '</h2>';
		}

		// commit
		$("<div></div>")
			.append([
				$filter
				,$favorite
				,h2
				,$table
			])
			.appendTo( $contets_body );

		$contets_body.find("h2 > img").each(function(){
			var $this = $(this);
			var image_path = m_setting.rootURL + "images" + $this.attr("src").split("../images")[1];
			$this.attr("src", image_path );
		});

		$favorite.click(function(){
			var $this = $(this);

			if( Cookies.get( m_year + '_favorite_mode' ) !== undefined ){
				Cookies.remove( m_year + '_favorite_mode' );
				$this.attr("src","./image/favorite_0.png");
				$(CONTENTS_TABLE_SELECTOR).show();
				$(CONTENTS_FAVORITE_TABLE_SELECTOR).remove();
			}else{
				Cookies.set( m_year + '_favorite_mode', '1', {expires:365*10} );
				$this.attr("src","./image/favorite_1.png");
				appendFavoriteTable();
			}
		});
		
		if( Cookies.get( m_year + '_favorite_mode' ) !== undefined ){
			$favorite
				.addClass("favorite_mode")
				.attr("src","./image/favorite_1.png");
			appendFavoriteTable();
			$(CONTENTS_TABLE_SELECTOR).hide();
			$(CONTENTS_FAVORITE_TABLE_SELECTOR).show();
		}

		customizeTable(day_index);

		return;

		//----------------------------------------------------------------------
		// 部屋毎のセッションのデータ連想配列データ
		//----------------------------------------------------------------------
		function createRoomSessionList( $xml, day_index ){
			var roomList 	= {};	//
			var unique 		= 0;	// 無名ルームがあった場合の簡易カウンター

			m_setting.unit_setting.selector( $xml, day_index ).each(function(){
				if( $(this).css('display') == "none" ) return; 
				var $table = $(this).find("table");

				if( $table.length ){
					$table.each(function(){
						var session  = CEDEC.createSessionData( $(this), m_setting.unit_setting );
						findAppendToRoomList( session ).push( session );
					});
				}else{
					var session  = CEDEC.createSessionData( $(this), m_setting.unit_setting );
					findAppendToRoomList( session ).push( session );
				}
			});

			//keyでソートする
			roomList = keySort(roomList);

			// イベントの追加部屋は、強制的にリストの最初に追加する
			var rEventRoom
			for( r in roomList ){
				rEventRoom = roomList[r];
				break;
			}

			var rEvents = m_setting.unit_setting.events;
			if( rEvents && rEvents.length ){
				for( var i = 0 ; i < rEvents.length ; ++i ){
					var rEvent = rEvents[i];
					if( rEvent.day_index != day_index ) continue;

					var session = CEDEC.createEventSessionData( rEvent, m_setting.unit_setting );
					rEventRoom.push( session );
				}
			}

			if( CUSTOM_SETTING[m_year] ){
				var rCustomEvents = CUSTOM_SETTING[m_year].events;
				if( rCustomEvents && rCustomEvents.length ){
					for( var i = 0 ; i < rCustomEvents.length ; ++i ){
						var rEvent = rCustomEvents[i];
						if( rEvent.day_index != day_index ) continue;

						var session = CEDEC.createEventSessionData( rEvent, m_setting.unit_setting );

						session.main.find('h2').prepend("【非公式】<br/>");

						findAppendToFreeSpaceRoomList().push( session );
					}
				}
			}


			return roomList;

			// スケジュール情報から 追加先リストを返す
			function findAppendToRoomList( session ){
				var room_name = session.getRoomNo();

				if( room_name != "" ){
					if( roomList[room_name] === undefined ){
						roomList[room_name] = [];
					}
					return roomList[room_name];
				}

				// ルーム表記がない場合は、空いてるリストに詰める
				for(var name in roomList){
					if( name.indexOf("不明_") != 0 ) continue;
					var rList = roomList[name];
					var isOverlaped = false;

					for( var l = 0 ; l < rList.length ; ++l ){
						if( rList[l].isOverlap( session ) ){
							isOverlaped = true;
							break;
						}
					}
					if( isOverlaped == false ){
						room_name = name;
						break;
					}
				}

				// 無名なので新しくリストを追加する
				if( room_name == "" ){
					room_name = "不明_" + unique;
					roomList[room_name] = [];
					++unique;
				}
				return roomList[room_name];
			}

			// スケジュール情報から 追加先リストを返す
			function findAppendToFreeSpaceRoomList(){

				// ルーム表記がない場合は、空いてるリストに詰める
				for(var name in roomList){
					var rList = roomList[name];
					var isOverlaped = false;

					for( var l = 0 ; l < rList.length ; ++l ){
						if( rList[l].isOverlap( session ) ){
							isOverlaped = true;
							break;
						}
					}
					if( isOverlaped == false ){
						room_name = name;
						break;
					}
				}
				return roomList[room_name];
			}

			function keySort(hash){
				var keys = [];
				var newHash = {};
				var main_hall = false;
				for (var k in hash){
					if( k == "メインホール" ){
						main_hall = true;
						continue;
					}
					keys.push(k);
				}
				keys.sort(function(a,b){
					var room_no_A = parseInt(a.replace("R","").split("+")[0]);
					var room_no_B = parseInt(b.replace("R","").split("+")[0]);

					if( room_no_A < room_no_B ) return -1;
					if( room_no_A > room_no_B ) return 1;
					return 0;
				});
				if( main_hall ){
					keys.unshift("メインホール");
				}
				
				for(var i = 0; i < keys.length; i++){
					var room_no = keys[i];
					newHash[room_no] = hash[room_no];
				}
				return newHash;	
			}
		}

		//----------------------------------------------------------------------
		// 分野等の表示フィルター部生成
		//----------------------------------------------------------------------
		function createFilter( room_list ){
			var filterList = {};
			var img = false;
			for(var room_name in room_list){
				for( var i = 0 ; i < room_list[room_name].length ; ++i ){
					var rSession = room_list[room_name][i];
					var $spec = rSession.getMainSpecObject();
					if( $spec.length == 0 ) continue;

					var spec;
					if( $spec[0].nodeName == "IMG"){
						spec = $spec.attr("alt");
						img = true;
					}else{
						spec = $spec.text();
					}

					filterList[spec] = $spec;
					$spec.attr("spec", spec );
				}
			}

			var $filter = $('<div class="spec_filter"></div>');
			for(var filter_name in filterList){
				$filter.append( filterList[filter_name].clone() );
			}
			var $sortted;
			if( img ){
				$sortted = $filter.children().sort(function(a,b){
					return ($(a).attr("src") > $(b).attr("src") ? 1 : -1);
				});
			}else{
				$sortted = $filter.children().sort(function(a,b){
					return ($(a).text() > $(b).text() ? 1 : -1);
				});
			}

			$filter.empty().append( $sortted );
			
			$filter.children().click(function(){
				var $this = $(this);
				var spec   = $this.attr('spec');

				if( $this.hasClass('hide') ){
					$this.removeClass('hide');
					m_hideInfo[spec]=undefined;
					Cookies.remove( m_year + '_hide_' + spec );
				}else{
					$this.addClass('hide');
					m_hideInfo[spec]=true;
					Cookies.set( m_year + '_hide_' + spec, '1', {expires:365} );
				}

				commitFilterInfoTo( $(CONTENTS_TABLE_SELECTOR) );

				// crossDomain では動作せず
				//this.src =  grayscale(this.src);
			}).each(function(){
				var $this = $(this);
				var spec   = $this.attr('spec');

				if( Cookies.get( m_year + '_hide_' + spec ) !== undefined ){
					$this.addClass('hide');
					m_hideInfo[spec]=true;
				}
			});

			return $filter;

		}

		//----------------------------------------------------------------------
		// 指定DOMにフィルター情報を反映
		//----------------------------------------------------------------------
		function commitFilterInfoTo( $table ){

			$table.find('td[spec]').each(function(){
				var $this = $(this);
				var spec  = $this.attr('spec');

				if( m_hideInfo[spec] === undefined ){
					$this.children().show();
				}else{
					$this.children().hide();
				}
			})
		}

		//----------------------------------------------------------------------
		// 時間と部屋番号のテーブルを作成
		//----------------------------------------------------------------------
		function createBaseTable( time_range, room_list ){
			var $tbody = $("<tbody></tbody>");
			var $thead = $("<thead></thead>");

			var $tr_base = $('<tr><td class="time"></td></tr>');
			var $th = $('<tr><th class="time"></th></tr>');

			for(var room_name in room_list){
				$tr_base.append( '<td room="' + room_name + '"></td>' );

				var floorMapURL = CEDEC.getFloorURL( room_name );

				if( floorMapURL !== undefined ){
					$th.append( '<th room="' + room_name + '"><a href="' + floorMapURL +'" target="blank">'+room_name+'</a></th>' );
				}else{
					$th.append( '<th room="' + room_name + '">'+room_name+'</th>' );
				}
			}

			$thead.append( $th );

			var hour 	= Math.floor(time_range.min/60);		// 最少時間
			var minutes = time_range.min%60;

			for(;;){
				// 最後に一行残しているが消す場合は、「>=」にする
				if( (hour*60 + minutes) > (time_range.max) ){
					break;
				}

				var $tr = $tr_base.clone(true);

				var time_str = (hour.toString().length == 1 ? "0" + hour.toString() : hour.toString()) + ':' +
						  (minutes.toString().length == 1 ? "0" + minutes.toString() : minutes.toString());

				$tr.attr( 'time', time_str )
					.children('.time')
						.text( time_str );

				$tbody.append( $tr );

				minutes += MIN_MINUTES;
				if( minutes >= 60 ){
					minutes = 0;
					hour	+= 1;
				}
			}

			return $('<table></table>').append([
				$thead,
				$tbody
			]);

		}

		//----------------------------------------------------------------------
		//
		//----------------------------------------------------------------------
		function getRowSpan( startTimeStr, endTimeStr ){
			var s = startTimeStr.split(':');
			s = parseInt(s[0]) * 60 + parseInt(s[1]);

			var e = endTimeStr.split(':');
			e = parseInt(e[0]) * 60 + parseInt(e[1]);
			return (e - s) / MIN_MINUTES;
		}

		//----------------------------------------------------------------------
		// テーブルにイベントを追加
		//----------------------------------------------------------------------
		function appendSessionListTo( $table, room_list, day_index ){

			var $thead = $table.children("thead");
			var $tbody = $table.children("tbody");
			var $trList = $tbody.find('tr');

			for(var room_name in room_list){
				var rRoom = room_list[room_name];

				for( var i = 0 ; i < rRoom.length ; ++i ){
					var rSession = rRoom[i];
					appendSession( rSession );
				}
			}

			return;

			//------------------------------------------------------------------
			//
			//------------------------------------------------------------------
			function appendSession( rSession ){

				var startTime = rSession.getStartTimeString();
				var endTime   = rSession.getEndTimeString();

				var $tr = $trList.filter('[time="' + startTime +'"]');
				var $td = $tr.find('[room="'+room_name +'"]');
				var rowSpan = getRowSpan(startTime,endTime);

				var mainSpec = function(){
					var $spec = rSession.getMainSpecObject();
					if( $spec.length == 0 ) return;
					if( $spec[0].nodeName == "IMG" ){
						return $spec.attr("alt");
					}else{
						return $spec.text();
					}
				}

				

				var room_label = "Room";
				var $room;
				var dispRoomName = room_name;
				if( rSession.event ){
					dispRoomName = rSession.event.room_no;
					room_label = "会場";
				}
				if( dispRoomName.indexOf("不明_") != -1 ){
					dispRoomName = "不明";
				}

				var floorMapURL = CEDEC.getFloorURL( dispRoomName );
				if( floorMapURL !== undefined ){
					$room = $('<p class="room">' + room_label + ':<a href="' + floorMapURL + '" target="blank">' + dispRoomName + '</a></p>');
				}else{
					$room = $('<p class="room">' + room_label + ':' + dispRoomName + '</p>');
				}

				// 一度空にしておく
				// セッションキャンセル時対応。後優先
				$td.empty()
					.addClass( "session")
					.attr({
						'rowspan':rowSpan,
						'spec' : mainSpec
					})
					.addClass( "session_color_style_normal" )
					.on("taphold dblclick",function(){
						var $this = $(this);
						var id = $this.attr('id');
						if( $this.hasClass('session_color_style_favorite') ){
							$this.removeClass('session_color_style_favorite');
							Cookies.remove( m_year + '_' + id );
							m_favoriteList[id] = undefined;
						}else{
							$this.addClass('session_color_style_favorite');
							Cookies.set( m_year + '_' + id, '1', {expires:365*10} );
							m_favoriteList[id] = { session:rSession, dom:$this };
						}
					})
					.append([
						$room,
						"<hr/>",
						rSession.main
					]);

				// ライブ配信設定
				var youtube = rSession.getYoutubeURL();
				if( youtube ){
					$td.append( '<a href="' + youtube + '" title="ライブ配信 Youtube" target="blank"><img src="./image/youtube_icon.png" alt="Youtube" style="margin:8px;"/></a>' );
				}
				var niconama = rSession.getNiconamaURL();
				if( niconama ){
					$td.append( '<a href="' + niconama + '" title="ライブ配信 ニコニコ生放送" target="blank"><img src="./image/niconico_icon.png" alt="ニコ生" style="margin:8px;"/></a>' );
				}

				// IDを取得
				var $title = $td.find('.ss_title,.btn-elinvar-detail');
				var id = getIdFromTitleTag( $title );

				// イベント時には別処理
				if( rSession.event ){
					id = day_index + "_event_" + rSession.event.title.split(" ").join("");
				}

				$td.attr( 'id', id );

				// お気に入り登録の確認
				if( Cookies.get( m_year + '_' + id ) !== undefined ){
					$td.addClass('session_color_style_favorite');
					m_favoriteList[id] = { session:rSession, dom:$td };
				}


				if( parseInt(m_setting.year) <= 2017 ){
					customizedBefore2017($td);
				}else{
					customized2018($td);
				}

				// クラス名の追加
				var titleName = $title.text();
				for( var i = 0 ; i < ADD_CLASS_NAME_FROM_TITLE.length ; ++i ){
					var rAddClassName = ADD_CLASS_NAME_FROM_TITLE[i];
					$td.removeClass( rAddClassName.class_name );	// 重複がある為、一度消す
					if( titleName.indexOf(rAddClassName.keyword) == -1 ) continue;
					$td.addClass( rAddClassName.class_name );
				};

				// セル結合している部分のセルを非表示に
				var $hideTr = $tr;
				for( var d = 0 ; d < rowSpan-1 ; ++d ){
					$hideTr = $hideTr.next();
					$hideTr.find('[room="'+room_name +'"]').hide();
				}

				// CEDEC AWARDS 等のイベント 
				if( rSession.event ){
					colspan = 1;

					var event_css = {"text-align":"center"};

					if( rSession.event.colspan != undefined ){
						switch( rSession.event.colspan ){
						case "all":
							colspan = $tr.children("td").length;

							event_css["fontSize"]="300%";
							event_css["line-height"]="300%";
							break;
						}
					}

					$td.attr('colspan',colspan)
						.addClass( "event")
						.css(event_css);
					
					$hideTr = $tr;
					for( var d = 0 ; d < rowSpan ; ++d ){

						if( colspan > 1 ){
							$hideTr.children("td:gt(1)").hide();
						}
						$hideTr = $hideTr.next();
					}
				}

			}

			//------------------------------------------------------------------
			// 
			//------------------------------------------------------------------
			function customized2018( $td ){

				var $td_detail = $td.find(".detail-session-meta-top");

				$td.find(".col-5.col-sm-3.col-md-2").remove();

				// 文字列削除
				var html = $td_detail.html();
				if( html ){
					for( var i = 0 ; i < REMOVE_HTML_STRINGS_2018.length ; ++i ){
						html = html.replace( REMOVE_HTML_STRINGS_2018[i], "" );
					}
					$td_detail.html( html );
				}

				// 公募マークは不要
				$td.find('.ses-type:contains(公募)').remove();

				// 役職だけではどこのかわからない為、これらのキーワードを含む場合は部署名を追加する
				var PositionList = [
					"部長","次長","係長","室長","チーム長","チームリーダー","リーダー"
				];

				// プロフィールのカスタマイズ
				$td.find('p.prof')
					// 株式会社 を略
					.filter(':nth-child(1)')
						.each(function(){
							var $this = $(this);
							$this.text( $this.text().split("株式会社").join("(株)").split("有限会社").join("(有)") );
						})
						.end()
					// 室長 の肩書がある場合は、部署名を先頭に追加する
					.filter(':nth-child(3)')
						.filter(function(){
							var text = $(this).text();
							for( var i = 0 ; i < PositionList.length ; ++i ){
								if( text.indexOf( PositionList[i] ) != -1 ){
									return true;
								}
							}
							return false;
						}).each(function(){
								var $this = $(this);
								$this.text( $this.prev().text() + " " + $this.text() );
							})
							.end()
						.end()
					// プロフィールの「部署名」を削除
					.filter(':nth-child(2)')
						.remove();

				// タイムシフト有 を削除
				if( 0 ){
					$td.find('img.note_icon[src*=timeshift_ok]')
						.next()
							.remove()
							.end()
						.remove();
				}

				// 登壇者が複数いたら
				var $speaker_info = $td.find('.speaker_info');
				if( $speaker_info.length > 1){
					// ２名以上はグループ化し非表示にしておく
					$('<div/>')
						.append( $speaker_info.filter(':not(:first)') )
						.hide()
						.click(function(){ $(this).toggle("slow"); })
						.insertAfter( $speaker_info[0] );

					// 非表示の講演者を表示させるボタン
					$('<div class="disp_all_speaker"/>')
						.text('ほか'+ ($speaker_info.length - 1) +"名" )
						.click(function(){ $(this).next().toggle("slow"); })
						.insertAfter( $speaker_info[0] );
				}

				// 画像が大きい為リサイズ
				$td.find('img')
					.filter('[height=48px]')
						.attr('height','36px')
						.end()
					.filter('[height=96px]')
						.attr('height','64px')
				}

			//------------------------------------------------------------------
			// 
			//------------------------------------------------------------------
			function customizedBefore2017( $td ){
				// 不要項目の削除
				$td.find('.ss_spec').each(function(){
					var $this = $(this);
					var $style = $this.find('.ss_style');
					var text = $style.text();

					for( var i = 0 ; i < REMOVE_SPECS_STRINGS_BEFORE_2017.length ; ++i){
						if( text.indexOf( REMOVE_SPECS_STRINGS_BEFORE_2017[i] ) >= 0 ){
							$style.remove();
							return;
						}
					}

					$style.before('<br/>');
				});
			}
			
			//------------------------------------------------------------------
			// タイトルタグからIDを取得する
			// 
			// Cookieに使用される
			//------------------------------------------------------------------
			function getIdFromTitleTag( $title ){
				var link = undefined;					
				if( $title.attr('href') != undefined )	link = $title.attr('href');
				else									link = $title.find('a').attr('href');

				if( link !== undefined ){
					// HTMLファイル指定と、ディレクトリ指定で分岐
					if( link.lastIndexOf('.html') != -1 ){
						// "../session/KN/12048.html"
						// return "12048"
						return link.slice( link.lastIndexOf('/'), link.lastIndexOf('.html') ).replace('/','');
					}else{
						// "/2017/session/KN/s5966bc0d596d9/"
						// return "s5966bc0d596d9"
						var urlsplit = link.split('/');
						for( var u = urlsplit.length - 1 ; u >= 0 ; --u ){
							if( urlsplit[u] == "" ) continue;
							return urlsplit[u];
						}
					}
				}

				// どうしても検出できなければ、データ順をIDとする
				// 該当セッションに限らず、スケジュールの割り込みや、部屋番号変更で破綻する
				// return "0_メインホール0"
				return day_index + "_" + room_name + i;
			}

		}

		//----------------------------------------------------------------------
		//
		//----------------------------------------------------------------------
		function appendFavoriteTable(){

			$(CONTENTS_FAVORITE_TABLE_SELECTOR).remove();

			var roomList = createFavoriteSessionList();	// 部屋毎のデータを取得				

			// お気に入りテーブル作成
			var $favorite_table = createBaseTable( timeRange, roomList );
			$favorite_table.attr({ "id": CONTENTS_FAVORITE_TABLE_ID });
			
			var $tbody = $favorite_table.children("tbody");
			var $trList = $tbody.find('tr');

			for(var room_name in roomList){
				var rRoom = roomList[room_name];

				for( var i = 0 ; i < rRoom.length ; ++i ){
					var rInfo = rRoom[i];
					var rSession = rInfo.session;

					var startTime = rSession.getStartTimeString();
					var endTime   = rSession.getEndTimeString();

					var rowSpan = getRowSpan(startTime,endTime);

					var $tr = $trList.filter('[time="' + startTime +'"]');
					var $td = $tr.find('[room="'+room_name +'"]');

					var $temp = rInfo.dom.clone();
					$temp.children().show();

					$td.append([
							$temp.html()
						])
						.attr({
							'rowSpan': rowSpan,
							"spec"	 : rSession.getMainSpecObject().attr("alt"),
							"class"  : $temp.attr("class")
						});


					// セル結合している部分のセルを非表示に
					var $deteleTr = $tr;
					for( var d = 0 ; d < rowSpan-1 ; ++d ){
						$deteleTr = $deteleTr.next();
						$deteleTr.children('[room="'+room_name +'"]').hide();
					}

				}
			}


			$(CONTENTS_TABLE_SELECTOR)
				.hide()
				.before( $favorite_table );


			if( m_highlightInfo.enabled && m_highlightInfo.dayIndex == day_index ){
				// 強制的にハイライト関数をコール
				highlightedNowTime();
			}

			return;

			//----------------------------------------------------------------------
			// 
			//----------------------------------------------------------------------
			function createFavoriteSessionList(){
				var roomList 	= {};	//
				var unique 		= 0;

				var finded = false;

				for(var favorite_id in m_favoriteList){
					var rInfo = m_favoriteList[favorite_id];
					if( rInfo == undefined ) continue;
					var rSession = rInfo.session;
					findAppendToList( rSession ).push( rInfo );
					finded = true;
				};

				if( finded == false ){
					return { "お気に入り登録がありません。" : [] };
				}
				
				return roomList;

				// スケジュール情報から 追加先リストを返す
				function findAppendToList( session ){
					var room_name = "";

					for(var name in roomList){
						if( name.indexOf("お気に入り_") != 0 ) continue;
						var rList = roomList[name];
						var isOverlaped = false;

						for( var l = 0 ; l < rList.length ; ++l ){
							if( rList[l].session.isOverlap( rSession ) ){
								isOverlaped = true;
								break;
							}
						}
						if( isOverlaped == false ){
							room_name = name;
							break;
						}
					}

					// 無名なので新しくリストを追加する
					if( room_name == "" ){
						room_name = "お気に入り_" + unique;
						roomList[room_name] = [];
						++unique;
					}
					return roomList[room_name];
				}
			}
		}

		//----------------------------------------------------------------------
		// 部屋別スケジュールリストから開催時間の最小と最大をを取得する
		// 
		// return { min:開始時間(分) max:終了時間(分) }
		//----------------------------------------------------------------------
		function getMinMaxTime( room_list ){

			var min_time = 24*60;
			var max_time = 0*60;

			for(var room_name in room_list){
				var rList = room_list[room_name];

				for( var s = 0 ; s < rList.length ; ++s ){
					var time_s = rList[s].getStartTime();
					var time_e = rList[s].getEndTime();
					if( min_time > time_s ){ min_time = time_s; }
					if( max_time < time_e ){ max_time = time_e; }
				}
			}
			//return { min:6*60, max:21*60 };
			return { min:min_time, max:max_time };
		}

		//----------------------------------------------------------------------
		//  開催時間外の不要なtrタグを非表示に
		//----------------------------------------------------------------------
		function hideUnnecessaryTimeTr( $table, time_range ){

			$table.find("tbody > tr").each(function(){
				var $this = $(this);

				var s = $this.attr("time");
				if( s===undefined )	return;
				s = s.split(':');
				if( s === undefined )	return;
				var time = parseInt(s[0]) * 60 + parseInt(s[1]);
				if( time < time_range.min )	$this.hide();
				if( time > time_range.max )	$this.hide();
			});
		}

		//----------------------------------------------------------------------
		// 
		//----------------------------------------------------------------------
		function customizeTable(day_index){
			if( m_highlightInfo.enabled && m_highlightInfo.dayIndex == day_index ){
				highlightedNowTime( m_debugHighlighDay );

				m_highlightInfo.intervalId = setInterval(function(){
					highlightedNowTime();
				}, 1000 * 60 );
			}
		}
	}

	//--------------------------------------------------------------------------
	//
	//--------------------------------------------------------------------------
	function startupHighlightInfo(){
		if( m_opendDay.getFullYear() != m_setting.year ) return;

		for( var i = 0 ; i < m_dateList.length ; ++i ){
			var date = m_dateList[i];

			if( m_opendDay.getMonth() != date.getMonth() ) continue;
			if( m_opendDay.getDate() != date.getDate() ) continue;

			m_highlightInfo.enabled  = true;
			m_highlightInfo.dayIndex = i;
			break;
		}
	}

	//--------------------------------------------------------------------------
	//
	//--------------------------------------------------------------------------
	function highlightedNowTime( date ){

		if( date === undefined ){
			date = new Date();
		}

		var hours = date.getHours();
		if( hours.toString().length == 1 ) hours = "0" + hours;
		var minutes = date.getMinutes();

		highlight( $(CONTENTS_TABLE_SELECTOR) );
		highlight( $(CONTENTS_FAVORITE_TABLE_SELECTOR) );

		return;

		function highlight( $table ){
			var $trList = $table.find('tbody tr[time*="' + hours +':"]');
	
			var currentIndex = 0;
			for(; currentIndex < $trList.length ; ++currentIndex ){
				var $tr	= $( $trList[currentIndex] );
				var temp = $tr.attr("time").split(":");
				var tr_hour    = parseInt( temp[0], 10 );
				var tr_minutes = parseInt( temp[1], 10 );
				var tr_date    = new Date(date.getFullYear(),date.getMonth(),date.getDate(),tr_hour,tr_minutes);
	
				if( tr_date.getTime() > date.getTime() ){
					currentIndex -= 1;
					if( currentIndex < 0 ) currentIndex = 0;
					break;
				}else if( tr_date.getTime() == date.getTime() ){
					break;
				}
			}
	
			if( currentIndex == $trList.length ){
				currentIndex -= 1;
			}
	
			// ハイライトクラスを設定
			var highlightSecelctor = ':eq(0),:empty';
	
			$table.find('tbody td.current_time').removeClass('current_time');
			$( $trList[currentIndex] ).children(highlightSecelctor).addClass('current_time');
					
		}

	}

	//==========================================================================
	// CEDiL
	//==========================================================================
	//--------------------------------------------------------------------------
	//
	//--------------------------------------------------------------------------
	function appendLinkToCEDiL( list, update_date ){
//		var debugList = [];
//		for( var i = 0 ; i < list.length ; ++i ){
//			debugList.push( list[i].title );
//		}
//		alert( debugList.length + "\n" + debugList.join("\r\n") );

		var day_index = $(CONTENTS_TABLE_SELECTOR).attr('dayIndex');
		var current_date = m_dateList[day_index].getDate();

		$(CONTENTS_TABLE_SELECTOR + "," + CONTENTS_FAVORITE_TABLE_SELECTOR)
			.find('td.session').each(function(){
				var $this = $(this);

				if( m_year < 2018 ){
					if( $this.text().indexOf("CEDiL page") != -1 ) return;	// 多重登録防止
					var title = $this.find('.ss_title,.session-title').text()
									.replace(/\n/g, "")
									.replace(/ /g, "")
									.replace(/　/g, "");
					for( var i = 0 ; i < list.length ; ++i ){
						if( list[i].date ){
							if( current_date != list[i].date ) continue;
						}
						if( title.indexOf( list[i].title ) == -1 ) continue;
						$this.append( '<p><a href="' + list[i].url +'#breadcrumbs" target="blank">CEDiL page</a></p>')
						break;
					}
				}else{
					var title = $this.find('.session-title').text()
									.replace(/\n/g, "")
									.replace(/ /g, "")
									.replace(/　/g, "");
					for( var i = 0 ; i < list.length ; ++i ){
						if( list[i].date ){
							if( current_date != list[i].date ) continue;
						}
						if( title.indexOf( list[i].title ) == -1 ) continue;

						// 「□ 資料公開: 予定あり」「□ 資料公開: 予定なし」を置換する
						var $detail = $this.find(".detail-session-meta-top");
						$detail.html( $detail.html().replace(
											new RegExp('(□ 資料公開:)(.*)(<br>)','g'),
											'$1<a href="' + list[i].url +'#breadcrumbs" target="blank">公開済み</a>$3'
										)
									);
						break;
					}
				}
			});

		if( update_date ){
			var date  = new Date(update_date);
			var date_string = date.getFullYear() + "/";
			date_string += ("0" + (date.getMonth() + 1)).slice(-2) + "/";
			date_string += ("0" + date.getDate()).slice(-2) + "/";
			date_string += " ";
			date_string += ("0" + date.getHours()).slice(-2) + ":";
			date_string += ("0" + date.getMinutes()).slice(-2);
			
			var $header = $(CONTENTS_HEADER_SELECTOR);
			if( $header.text().indexOf('※CEDiL情報') == -1 ){
				$header.append("※CEDiL情報 " + list.length +"件 取得日時：" + date_string );
			}
		}

	}

	//==========================================================================
	// 
	//==========================================================================
	//--------------------------------------------------------------------------
	// 
	//--------------------------------------------------------------------------
	function getURL_Params(){
		var params = {};
		var tmp = location.href.split('?');
		var pair = tmp.length < 2 ? [] : tmp[1].split('&');

		for( var i = 0 ; i < pair.length ; ++i ){
			var p = pair[i].split('=');
			if( p.length < 2 ) continue;
			params[ p[0] ] = p[1];
		}
		return params;
	}

	//--------------------------------------------------------------------------
	// test code
	// failed: クロスドメインアクセスの画像ではエラーの為未使用。未実装。
	//         元のカラーに戻す処理を書いてないので使用する際は要追加。
	//--------------------------------------------------------------------------
	function grayscale(img){
	    var canvas = document.createElement('canvas');
	    var ctx = canvas.getContext('2d');

	    var imgObj = new Image();
	    imgObj.src = img;

	    canvas.width = imgObj.width;
	    canvas.height = imgObj.height;

	    ctx.drawImage(imgObj, 0, 0);

	    var imgPixels = ctx.getImageData(0, 0, canvas.width, canvas.height);

	    for(var y = 0; y < imgPixels.height; y++){
	            for(var x = 0; x < imgPixels.width; x++){
	               var i = (y * 4) * imgPixels.width + x * 4;
	               var avg = (imgPixels.data[i] +
	                          imgPixels.data[i + 1] +
	                          imgPixels.data[i + 2]
	                          ) / 3;
	               imgPixels.data[i] = avg;
	               imgPixels.data[i + 1] = avg;
	               imgPixels.data[i + 2] = avg;
	            }
	    }

        ctx.putImageData(imgPixels, 0, 0, 0, 0, imgPixels.width, imgPixels.height);
        return canvas.toDataURL();
    }

})();

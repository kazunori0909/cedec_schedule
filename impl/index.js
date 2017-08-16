//------------------------------------------------------------------------------
//
//------------------------------------------------------------------------------
(function(){
	//==========================================================================
	// 定義
	//==========================================================================
	var WEEK_DAY_SHORT_STRING = [ "日", "月", "火", "水", "木", "金", "土", "日" ];
	var MIN_MINUTES	= 5;
	var DEFAULT_YEAR = 2017;

	// DOM関連
	var CONTENTS_BODY_SELECTOR = '#contents_body';
	var CONTENTS_HEADER_SELECTOR = '#contents_header';
	var CONTENTS_TABLE_ID = 'day_table';
	var CONTENTS_TABLE_SELECTOR = '#'+CONTENTS_TABLE_ID;

	var CONTENTS_FAVORITE_TABLE_ID = 'day_favorite_table';
	var CONTENTS_FAVORITE_TABLE_SELECTOR = '#'+CONTENTS_FAVORITE_TABLE_ID;

	// 除外する文字列リスト
	var REMOVE_SPECS_STRINGS = [
		"基調講演"
		,"レギュラーセッション"
		,"ショートセッション"
		,"［招待セッション］"
		,"［協賛セッション］"
		,"［セッション］"
		,"［セッション（60分）］"
	];
	
	var REMOVE_SPECS_SELECTOR = [
//		".timeshift-icon:has(img[alt*=あり])"
	];

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
				appendTable( index,data );
				CEDiL.readData( m_setting.cedil_tag_no, appendLinkToCEDiL );
			},
			error: function(index,data){
				$('#contents_loading_icon').remove();
			   alert('読み込みに失敗');
			}
		})

	}

	//--------------------------------------------------------------------------
	// XMLからテーブルを作成し追加する
	//--------------------------------------------------------------------------
	function appendTable( day_index, xml ){
		var $xml		  = $(xml);
		var $contets_body = $(CONTENTS_BODY_SELECTOR);

		// 情報取得
		var roomList = createRoomSessionList( $xml );	// 部屋毎のデータを取得
		var timeRange = getMinMaxTime( roomList );		// 開催時間の取得

		m_favoriteList = {};

		// テーブル作成
		var $table = createBaseTable( timeRange, roomList );
		$table.attr({ "id": CONTENTS_TABLE_ID, "_fixedhead":"cols:1" });
		appendSessionListTo( $table, roomList, day_index );
		convertGlobalPath( $table );

		// 非表示のタグを削除。
		// ※行列のインデックスがずれる為、最後にまとめて削除。
		$contets_body.find("tr:hidden,td:hidden").remove();

		// フィルター作成
		var $filter = createFilter( roomList );
		convertGlobalPath( $filter );
		commitFilterInfoTo( $table );

		var $favorite = $('<img id="favorite_selector" src="./image/favorite_0.png"></img>');

		// commit
		$("<div></div>")
			.append([
				$filter,
				$favorite,
				"<br/><br/><h2>" + $xml.find("h2").html() +"</h2>",
				$table
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
		FixedMidashi.create();



		return;

		//----------------------------------------------------------------------
		// 部屋毎のセッションのデータ連想配列データ
		//----------------------------------------------------------------------
		function createRoomSessionList( $xml ){
			var roomList 	= {};	//
			var unique 		= 0;	// 無名ルームがあった場合の簡易カウンター

			$xml.find( CEDEC.SCHEDULE_UNIT_SELECTOR ).each(function(){
				$(this).find("table").each(function(){
					var session  = CEDEC.createSessionData( $(this) );
					findAppendToRoomList( session ).push( session );
				});
			});
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
		}

		//----------------------------------------------------------------------
		// 分野等の表示フィルター部生成
		//----------------------------------------------------------------------
		function createFilter( room_list ){
			var filterList = {};
			for(var room_name in room_list){
				for( var i = 0 ; i < room_list[room_name].length ; ++i ){
					var rSession = room_list[room_name][i];
					var $spec = rSession.getMainSpecObject();
					filterList[$spec.attr("alt")] = $spec;
				}
			}

			var $filter = $('<div class="spec_filter"></div>');
			for(var filter_name in filterList){
				$filter.append( filterList[filter_name].clone() );
			}
			$filter.children().click(function(){
				var $this = $(this);
				var alt   = $this.attr('alt');

				if( $this.hasClass('hide') ){
					$this.removeClass('hide');
					m_hideInfo[alt]=undefined;
					Cookies.remove( m_year + '_hide_' + alt );
				}else{
					$this.addClass('hide');
					m_hideInfo[alt]=true;
					Cookies.set( m_year + '_hide_' + alt, '1', {expires:365} );
				}

				commitFilterInfoTo( $(CONTENTS_TABLE_SELECTOR) );

				// crossDomain では動作せず
				//this.src =  grayscale(this.src);
			}).each(function(){
				var $this = $(this);
				var alt   = $this.attr('alt');

				if( Cookies.get( m_year + '_hide_' + alt ) !== undefined ){
					$this.addClass('hide');
					m_hideInfo[alt]=true;
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
				var alt	  = $this.attr('spec');

				if( m_hideInfo[alt] === undefined ){
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
				var $info = rSession.info;
				var $infoMain = $info.find("td").children();
				var startTime = rSession.getStartTimeString();
				var endTime   = rSession.getEndTimeString();

				var $tr = $trList.filter('[time="' + startTime +'"]');
				var $td = $tr.find('[room="'+room_name +'"]');
				var rowSpan = getRowSpan(startTime,endTime);

				// 一度空にしておく
				// セッションキャンセル時対応。後優先
				$td.empty()
					.attr('rowSpan', rowSpan )
					.attr("spec", rSession.getMainSpecObject().attr("alt") )
					.addClass( "session")
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
					.append($infoMain);

				// IDを取得
				var id = getIdFromTitleTag( $td.find('.ss_title') );
				$td.attr( 'id', id );

				// お気に入り登録の確認
				if( Cookies.get( m_year + '_' + id ) !== undefined ){
					$td.addClass('session_color_style_favorite');
					m_favoriteList[id] = { session:rSession, dom:$td };
				}

				// 不要項目の削除
				$td.find('.ss_spec').each(function(){
					var $this = $(this);
					var $style = $this.find('.ss_style');
					var text = $style.text();

					for( var i = 0 ; i < REMOVE_SPECS_SELECTOR.length ; ++i){
						$this.find( REMOVE_SPECS_SELECTOR[i] ).remove();
					}

					for( var i = 0 ; i < REMOVE_SPECS_STRINGS.length ; ++i){
						if( text.indexOf( REMOVE_SPECS_STRINGS[i] ) >= 0 ){
							$style.remove();
							return;
						}
					}

					$style.before('<br/>');
				});

				// セル結合している部分のセルを非表示に
				var $deteleTr = $tr;
				for( var d = 0 ; d < rowSpan-1 ; ++d ){
					$deteleTr = $deteleTr.next();
					$deteleTr.find('[room="'+room_name +'"]').hide();
				}
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

					var floorMapURL = CEDEC.getFloorURL( rSession.getRoomNo() );

					var $room;
					if( floorMapURL !== undefined ){
						$room = $('<p>Room:<a href="' + floorMapURL + '" target="blank">' + $temp.attr('room') + '</a></p>')
					}else{
						$room = $('<p>Room:' + $temp.attr('room') + '</p>')
					}

					$td.append([
							$room,
							$temp.html()
						])
						.attr('rowSpan', rowSpan )
						.attr("spec", rSession.getMainSpecObject().attr("alt") )
						.addClass( "session")
						.addClass( "session_color_style_favorite" );

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
		// 埋め込まれている相対パスからの間違ったパスを変換する
		//----------------------------------------------------------------------
		function convertGlobalPath( $dom ){

			// イメージタグのパスをグローバルに編子
			$dom.find("img").each(function(){
				var $this = $(this);
				var path = $this.attr("src");
				if( path.indexOf("http") == 0 ) return;
				if( path.indexOf("/") == 0 ){
					path = CEDEC.MASTER_URL + path.substr(1);
				}else{
					path = path.replace("../",m_setting.rootURL );
				}
				$this.attr("src", path );
			});

			// 相対パスのURLを変更。 さらにスライドが面倒なので #content に飛ばしてみる
			$dom.find("a").each(function(){
				var $this = $(this);
				var path = $this.attr("href");
				if( path.indexOf("http") == 0 ) return;
				if( path.indexOf("/") == 0 ){
					path = CEDEC.MASTER_URL + path.substr(1)  + "#content";
				}else{
					path = path.replace("../",m_setting.rootURL )  + "#content";
				}
				$this.attr("href", path );
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
	function appendLinkToCEDiL( list ){
//		var debugList = [];
//		for( var i = 0 ; i < list.length ; ++i ){
//			debugList.push( list[i].title );
//		}
//		alert( debugList.length + "\n" + debugList.join("\r\n") );

		$(CONTENTS_TABLE_SELECTOR + "," + CONTENTS_FAVORITE_TABLE_SELECTOR)
			.find('td.session').each(function(){
				var $this = $(this);
				if( $this.text().indexOf("CEDiL page") != -1 ) return;	// 多重登録防止
				var title = $this.find('.ss_title').text()
								.replace(/\n/g, "")
								.replace(/ /g, "")
								.replace(/　/g, "");
				for( var i = 0 ; i < list.length ; ++i ){
					if( title.indexOf( list[i].title ) == -1 ) continue;
					$this.append( '<p><a href="' + list[i].url +'#breadcrumbs" target="blank">CEDiL page</a></p>')
					break;
				}
			});


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

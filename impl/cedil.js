;
//------------------------------------------------------------------------------
// CEDiL
//------------------------------------------------------------------------------
var CEDiL = (function($){
	//==========================================================================
	// 定義
	//==========================================================================
	var MASTER_URL = "https://cedil.cesa.or.jp/";
	var READ_URL   = MASTER_URL + "cedil_sessions/search_tag/";

	var m_list = {};
	var m_dataCash = {};

	return {
		
		readData : readData					// 直接 クロスドメインで読み込んで結果を得る

		,readJsonData : readJsonData		// サーバーに保存したJSONファイルを読み込む
		,writeJsonData	: writeJsonData		// サーバーにJSONファイルを保存する
	};


	//--------------------------------------------------------------------------
	// 直接 クロスドメインで読み込んで結果を得る
	// ※ページが無くなるまで再起的に読み続け、ページ読み込完了毎に success を呼び出す
	//
	// param	tag			CEDiLの検索用タグID
	// param	success		ページ読み成功時のコールバック
	// param	page		読み込むページ番号
	// param	end			全てのページを読み終えた際のコールバック
	//--------------------------------------------------------------------------
	function readData( tag, success, page, end ){
		if( tag === undefined )	return;
		readPage(tag,success,page,end);
	}

	//--------------------------------------------------------------------------
	// param	tag			CEDiLの検索用タグID
	// param	success		ページ読み成功時のコールバック
	// param	page		読み込むページ番号
	// param	end			全てのページを読み終えた際のコールバック
	//--------------------------------------------------------------------------
	function readPage(tag,success,page,end){

		if( page === undefined )	page = 1;
		page = parseInt(page);

		var cash_id = tag + "_" + page;
		if( m_dataCash[cash_id] !== undefined ){
			read_impl(tag,success,page);
			return;
		}

		var url = READ_URL + tag + "/page:" + page;

		$.ajax({
			type: 'GET',
			url: url,
			dataType: 'html',
			success: (function(tag,success,page){
				return function(html) {
					var cash_id = tag + "_" + page;
					if( m_dataCash[cash_id] === undefined ){
						if( html.responseText !== undefined ){
							m_dataCash[cash_id] = $(html.responseText);
						}else{
							m_dataCash[cash_id] = $(html);
						}
					}
					read_impl(tag,success,page,end);
				};
			})(tag,success,page,end),
			error:function(html){
				alert("CEDiLのページが読み込めませんでした");
			}
		});

		function read_impl(tag,success,page,end){

			var $content = m_dataCash[cash_id].find('#content');
			var list = getList( $content );

			if( list.length > 0 && success != undefined ){
				success( list );
			}

			if( m_list[tag] === undefined ){
				m_list[tag] = [];
			}
			Array.prototype.push.apply( m_list[tag], list );

			$content
				.find('div.page_change')
					.children(':eq(1)')
						.children().each(function(){
							if( $(this).text() != page ) return;

							var $next = $(this).next();
							if( $next.length ){
								readPage(tag,success, $next.text(), end );
							}else{
								if( end != undefined ){
									end( m_list[tag] );
								}
							}
						});
		}
	}

	//--------------------------------------------------------------------------
	//
	//--------------------------------------------------------------------------
	function getList( $content ){

		var list = [];
		var $session_detail_list = $content.find(".session_detail_list");

		$session_detail_list.find('h2').each(function(){
			var $this = $(this);
			var obj = {};

			// 加工はしたくないがHTMLによってスペース有り無しがあったため
			// スペース削除
			obj.title = $this.text()
							.replace(/\n/g, "")
							.replace(/ /g, "")
							.replace(/　/g, "");

			// ex) https://cedil.cesa.or.jp/cedil_sessions/view/1464
			obj.url  = MASTER_URL + "/cedil_sessions" + $this.find("a")[0].href.split("/cedil_sessions")[1];

			list.push( obj );
		});

		return list;
	}

	//--------------------------------------------------------------------------
	//
	//--------------------------------------------------------------------------
	function readJsonData( year, tag, success ){

		$.getJSON('./web_data/' + year + "/cedil.json")
			.done(function(year,tag,success){
				return function(data){
					if( data.list.length > 0 && success != undefined ){
						success( data.list,  data.update_date );
					}
					console.log('成功');
				}
			}(year,tag,success))
			.fail(function(){
				console.log('失敗');
			});
	}

	//--------------------------------------------------------------------------
	//
	//--------------------------------------------------------------------------
	function writeJsonData( year, tag, success ){

		readData( tag, undefined, undefined, function(year){
			
			return function( list ){
				
				// 書き込むJSONデータ
				var write_data = {
					year : year
					,update_date : new Date()
					,list : list
				};

				var json = JSON.stringify( write_data );

				$.ajax({
					type: "POST",
					url: "./cgi/write_cedil_json.php", // 送信先のPHP
					dataType: 'json',
					contentType: 'application/json',
					data:json
				}).success(function(data, status, xhr) {
					// 通信成功時の処理
					console.log("success");
					console.log("data ="+data);
					console.log("status ="+status);
					console.log("xhr ="+xhr);
				}).error(function(xhr, status, error) {
					// 通信失敗時の処理
					console.log("error");
				}).complete(function(xhr, status) {
					// 通信完了時の処理
					console.log("fin");
				});
			}
		}(year));


	}
})(jQuery);

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
		readData : readData
	};


	//--------------------------------------------------------------------------
	//
	//--------------------------------------------------------------------------
	function readData( tag, success, page ){
		if( tag === undefined )	return;
		readPage(tag,success,page);
	}

	//--------------------------------------------------------------------------
	//
	//--------------------------------------------------------------------------
	function readPage(tag,success,page){

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
					if( success === undefined )	return;
					var cash_id = tag + "_" + page;
					if( m_dataCash[cash_id] === undefined ){
						if( html.responseText !== undefined ){
							m_dataCash[cash_id] = $(html.responseText);
						}else{
							m_dataCash[cash_id] = $(html);
						}
					}
					read_impl(tag,success,page);
				};
			})(tag,success,page),
			error:function(html){
				alert("CEDiLのページが読み込めませんでした");
			}
		});

		function read_impl(tag,success,page){

			var $content = m_dataCash[cash_id].find('#content');
			var list = getList( $content );

			if( list.length > 0 ){
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
								readPage(tag,success, $next.text() );
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
			obj.title = $this.text();

			// ex) https://cedil.cesa.or.jp/cedil_sessions/view/1464
			obj.url  = MASTER_URL + "/cedil_sessions" + $this.find("a")[0].href.split("/cedil_sessions")[1];

			list.push( obj );
		});

		return list;
	}

})(jQuery);

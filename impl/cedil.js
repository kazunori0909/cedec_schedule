;
//------------------------------------------------------------------------------
// CEDiL
//------------------------------------------------------------------------------
var CEDiL = (function($){
	//==========================================================================
	// 定義
	//==========================================================================
	var m_jsonCache = {};

	return {
		readJsonData : readJsonData		// サーバーに保存したJSONファイルを読み込む
	};


	//--------------------------------------------------------------------------
	//
	//--------------------------------------------------------------------------
	function readJsonData( year, success ){
		if( m_jsonCache[year] !== undefined ){
			var cached = m_jsonCache[year];
			if( cached.list.length > 0 && success != undefined ){
				success( cached.list, cached.update_date );
			}
			return;
		}

		$.ajaxSetup({ cache: false });
		$.getJSON('./web_data/' + year + "/cedil.json")
			.done(function(year, success){
				return function(data){
					if( data.list.length > 0 && success != undefined ){
						m_jsonCache[year] = { list: data.list, update_date: data.update_date };
						success( data.list, data.update_date );
					}
				}
			}(year, success))
			.fail(function(){
				console.log('CEDiL JSON 読み込み失敗');
			});
	}
})(jQuery);

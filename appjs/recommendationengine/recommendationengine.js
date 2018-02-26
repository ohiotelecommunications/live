/*$Id$*/
var Recommendationengine = (function() {
	return {
		init: function( appCont, data ) {
			var recommendationengine = document.createElement('div');
			recommendationengine.id  = 'recommendationengine_id';
			recommendationengine.innerHTML = 'First Recommendation Engine';//No I18N
			appCont.appendChild(recommendationengine);
			data.next()
		}
	};

})();

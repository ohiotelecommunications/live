/*$Id$*/

var server_entities_comments = function () {

	function init(appContainer) {
		var elements = document.querySelectorAll("[data-zs-entity-commentbox-id]"); // No I18N

		if (elements.length == 0) {
			return;
		}

		var resourceIds = [];
		var commentBoxType = "";
		for (var i = 0; i < elements.length; i++) {
			var element = elements[i];
			resourceIds.push(element.getAttribute("data-zs-entity-commentbox-id")); // No I18N
			if (i == 0) {
				commentBoxType = element.getAttribute("data-zs-entity-commentbox-type"); // No I18N
			}
		}

		var params = {
			resource_ids: resourceIds.join(",") // No I18N
		}

		$X.get({
			url: "/siteapps/commentbox/commentscount", // No I18N
			params: params,
			args: {
				elements: elements,
				commentBoxType: commentBoxType
			},
			handler: handleServerEntityCommentBoxes
		});
	}

	function handleServerEntityCommentBoxes (args) {
		var elements = args.elements;
		var commentBoxType = args.commentBoxType;
		var length = elements.length;

		var response = JSON.parse(this.responseText);
		var comments = response;

		for (var i = 0; i < length; i++) {
			var element = elements[i];
			var resourceId = element.getAttribute("data-zs-entity-commentbox-id"); // No I18N
			element.innerHTML = comments[resourceId];
		}
	}

	return {
		init: init
	}
}
/*$Id$*/
'use strict'; // No I18N
var cart = (function () {
	var CURRENCY_COOKIE_NAME = 'currency' //NO I18N
	var _getCartDetails = function () {
		_getCartCount(function (cartCount) {
			var viewCartCountElem = document.querySelectorAll('[data-zs-view-cart-count]')[0];
			viewCartCountElem.innerText = cartCount;
		});
	}

	var _getCartCount = function (handler) {
		$X.get({
			url: '/store-user/api/v1/cart/getCartDetails', // No I18N
			args: {
				handler: handler
			},
			handler: function (args) {
				var res = JSON.parse(this.responseText);
				var cartCount = 0;
				if (res.cart_details) {
					var cartInfo = res.cart_details;
					cartCount = cartInfo.line_items.length;
				}
				args.handler(cartCount);
			}
		});
	}

	var _addProductToCart = function () {
		var addToCartButton = this;
		var productVariantId = this.getAttribute('data-zs-product-variant-id'); // No I18N

		var quantity = document.querySelectorAll('[data-zs-quantity]').length > 0 ? document.querySelectorAll('[data-zs-quantity]')[0].value : 1; // No I18N
		if (productVariantId === "") {
			var addToCartWithInvalidVariant = new CustomEvent("zp-event-add-to-cart-invalid-variant", { // No I18N
				detail: {
					target: addToCartButton,
					view: window.zs_view || "store_page" // No I18N
				}
			});
			document.dispatchEvent(addToCartWithInvalidVariant);
			return;
		}
		if (!_testQuantity(document.querySelectorAll('[data-zs-quantity]')[0]) ) { // No I18N
			return;
		}
		var addToCartLoadingEvent = new CustomEvent("zp-event-add-to-cart-loading", { // No I18N
			detail: {
				target: addToCartButton,
				productVariantId: productVariantId,
				view: window.zs_view || "store_page" // No I18N
			}
		});
		document.dispatchEvent(addToCartLoadingEvent);
		$E.unbind(addToCartButton, "click", _addProductToCart); // No I18N
		var params = {
			product_variant_id: productVariantId,
			quantity: quantity
		};
		$X.post({
			url: '/store-user/api/v1/cart/addProductToCart', // No I18N
			bodyJSON: params,
			args: {
				button: addToCartButton
			},
			handler: function (args) {
				var res = JSON.parse(this.responseText);
				if (res.cart_details && res.cart_details.cart) {
					var cartInfo = res.cart_details.cart;
					var viewCartCountElem = document.querySelectorAll('[data-zs-view-cart-count]')[0];
					viewCartCountElem.innerText = cartInfo.line_items.length;

					var addToCartSuccessEvent = new CustomEvent("zp-event-add-to-cart-success", { // No I18N
						detail: {
							cart: cartInfo,
							target: args.button,
							view: window.zs_view || "store_page" // No I18N
						}
					});
					document.dispatchEvent(addToCartSuccessEvent);
				} else {
					var addToCartFailureEvent = new CustomEvent("zp-event-add-to-cart-failure", { // No I18N
						detail: {
							response: res,
							target: args.button,
							view: window.zs_view || "store_page" // No I18N
						}
					});
					document.dispatchEvent(addToCartFailureEvent);
				}
		        $E.bind(args.button, "click", _addProductToCart); // No I18N
			},
			error: {
				handler: function (args) {
					var addToCartFailureEvent = new CustomEvent("zp-event-add-to-cart-failure", { // No I18N
						detail: {
							target: args.button,
							view: window.zs_view || "store_page" // No I18N
						}
					});
					document.dispatchEvent(addToCartFailureEvent);
		            $E.bind(args.button, "click", _addProductToCart); // No I18N
				},
				condition: function () {
					return this.status >= 300;
				}
			}
		});
	}

	var _testQuantity = function (quantityElement) {
		if (!quantityElement) {
			return true;
		}
		var quantity = quantityElement.value;
		var numberPattern = /^\d*.?\d*$/;
		var condition = !numberPattern.test(quantity);
		if (!condition) {
			condition = quantity.length == 0 || Number(quantity) > 1000 || Number(quantity) == 0;
		}
        if (!condition) {
            condition = (quantity % 1) != 0;
        }		
		if (condition) {
			var invalidProductQuantityEvent = new CustomEvent("zp-event-invalid-product-quantity", { // No I18N
				detail: {
					quantity: quantity,
					quantityElement: quantityElement,
					target: this,
					view: window.zs_view || "store_page" // No I18N
				}
			});
			document.dispatchEvent(invalidProductQuantityEvent);
			return false;
		}
		return true;
	}

	var _updateProductInCart = function () {
		var productVariantId = this.getAttribute('data-zs-product-variant-id'); // No I18N
		var updateCartButton = this;

        var quantityElement = document.querySelector("[data-zs-product-variant-id='" + productVariantId + "'][data-zs-quantity]"); // No I18N
        if (!quantityElement) {
            quantityElement = this.previousElementSibling;
        }

		if (!_testQuantity(quantityElement)) {
			return;
		}
		$E.unbind(updateCartButton, "mousedown", _updateProductInCart); // No I18N
		var updateToCartLoadingEvent = new CustomEvent("zp-event-update-to-cart-loading", { // No I18N
			detail: {
				target: updateCartButton,
				productVariantId: productVariantId,
                view: window.zs_view || "store_page" // No I18N
			}
		});
		document.dispatchEvent(updateToCartLoadingEvent);

		var params = {
			product_variant_id: productVariantId,
			quantity: quantityElement.value
		};
		$X.put({
			url: '/store-user/api/v1/cart/updateProductInCart', // No I18N
			bodyJSON: params,
			args: {
				button: updateCartButton
			},
			handler: function (args) {
				var res = JSON.parse(this.responseText);
				var updateProductEvent;
				if (res.status_code === "0") {
					var items = res.cart_details.cart.line_items;
					for (var i in items) {
						var item = items[i];
						if (params.product_variant_id === item.item_id) {
							document.querySelectorAll('[data-zs-sub-total-item-' + params.product_variant_id + ']')[0].innerHTML = item.item_total_formatted; // No I18N
							var buttonSpan = args.button.parentElement;
							if (buttonSpan) {
								var quantityDiv = buttonSpan.parentElement;
								var quantityInput = quantityDiv.querySelector("[data-zs-quantity]"); // No I18N
								if (quantityInput) {
									quantityInput.value = item.quantity;
								}
							}
						}
					}
					var cartTotalElement = document.querySelectorAll('[data-zs-cart-total]')[0]; // No I18N
					if (cartTotalElement) {
						cartTotalElement.innerHTML = res.cart_details.cart.sub_total_formatted;
					}

					updateProductEvent = new CustomEvent("zp-event-update-to-cart-success", { // No I18N
						detail: {
							cart: res.cart_details.cart,
							target: args.button,
							view: window.zs_view || "store_page" // No I18N
						}
					});
				} else {
					updateProductEvent = new CustomEvent("zp-event-update-to-cart-failure", { // No I18N
						detail: {
							response: res,
							target: args.button,
							view: window.zs_view || "store_page" // No I18N
						}
					});
				}
				document.dispatchEvent(updateProductEvent);
				$E.bind(args.button, "mousedown", _updateProductInCart); // No I18N
			},
			error: {
				handler: function (args) {
					var updateProductEvent = new CustomEvent("zp-event-update-to-cart-failure", { // No I18N
						detail: {
							target: args.button,
							view: window.zs_view || "store_page" // No I18N
						}
					});
					document.dispatchEvent(updateProductEvent);
				    $E.bind(args.button, "mousedown", _updateProductInCart); // No I18N
				},
				condition: function () {
					return this.status >= 300;
				}
			}
		});
	}

	var _deleteProductInCart = function () {
		var elem = this;
		var productVariantId = elem.getAttribute('data-zs-product-variant-id'); // No I18N
		$E.unbind(elem, "click", _deleteProductInCart); // No I18N

		var deleteFromCartLoadingEvent = new CustomEvent("zp-event-delete-from-cart-loading", { // No I18N
			detail: {
				target: elem,
				productVariantId: productVariantId,
				view: window.zs_view || "store_page" // No I18N
			}
		});
		document.dispatchEvent(deleteFromCartLoadingEvent);

		var params = {
			product_variant_id: productVariantId
		};
		$X.del({
			url: '/store-user/api/v1/cart/deleteProductInCart', // No I18N
			bodyJSON: params,
			args: {
				button: elem
			},
			handler: function (args) {
				var res = JSON.parse(this.responseText);
				if (res.status_code === "0") {
					elem.parentNode.parentNode.style.display = "none";
					_getCartCount(function (cartCount) {
						var viewCartCountElem = document.querySelectorAll('[data-zs-view-cart-count]')[0];
						viewCartCountElem.innerText = cartCount;
						var deleteProductEvent = new CustomEvent("zp-event-delete-from-cart-success", { // No I18N
							detail: {
								response: res,
								target: args.button,
								view: window.zs_view || "store_page" // No I18N
							}
						});
						document.dispatchEvent(deleteProductEvent);
					})
				} else {
					var deleteProductEvent = new CustomEvent("zp-event-delete-from-cart-failure", { // No I18N
						detail: {
							response: res,
							target: args.button,
							view: window.zs_view || "store_page" // No I18N
						}
					});
					document.dispatchEvent(deleteProductEvent);
				}
				$E.bind(args.button, "click", _deleteProductInCart); // No I18N
			},
			error: {
				handler: function (args) {
					var deleteProductEvent = new CustomEvent("zp-event-delete-from-cart-failure", { // No I18N
						detail: {
							response: res,
							target: args.button,
							view: window.zs_view || "store_page" // No I18N
						}
					})
					document.dispatchEvent(deleteProductEvent);
					$E.bind(args.button, "click", _deleteProductInCart); // No I18N
				},
				condition: function () {
					return this.status >= 300;
				}
			}
		});
	}

	var _showOrderDetails = function () {
		document.querySelectorAll('[data-zs-order-area]')[0].style.display = 'block';
		document.querySelectorAll('[data-zs-message-area]')[0].style.display = 'none';
		document.querySelectorAll('[data-zs-comments]')[0].style.visibility = 'hidden';
		document.querySelectorAll('[data-zs-status]')[0].style.visibility = 'hidden';
		document.querySelectorAll('[data-zs-reasonforcancel]')[0].style.visibility = 'hidden';
		document.querySelectorAll('[data-zs-cancel-submit]')[0].style.visibility = 'hidden';

		var reasonList = document.querySelectorAll('[data-zs-reasonforcancellist]'); // No I18N
		for (var i = 0; i < reasonList.length; i++) {
			reasonList[i].style.visibility = 'hidden';
		}
		var commentsAreas = document.querySelectorAll('[data-zs-comments-area]'); // No I18N
		for (var i = 0; i < commentsAreas.length; i++) {
			commentsAreas[i].style.visibility = 'hidden';
		}

		var statusAreas = document.querySelectorAll('[data-zs-status-area]'); // No I18N
		for (var i = 0; i < statusAreas.length; i++) {
			statusAreas[i].style.visibility = 'hidden';
		}

		var productList = document.querySelectorAll('[data-zs-choose-product]'); // No I18N
		for (var i = 0; i < productList.length; i++) {
			productList[i].style.visibility = 'hidden';
		}

		var quantityAreas = document.querySelectorAll('[data-zs-quantity]'); // No I18N
		for (var i = 0; i < quantityAreas.length; i++) {
			quantityAreas[i].setAttribute('style', "border:#000000;");
			quantityAreas[i].disabled = false;
		}

	}



	var _cancelORReturnRequestEnable = function () {
		document.querySelectorAll('[data-zs-order-area]')[0].style.display = 'block';
		document.querySelectorAll('[data-zs-message-area]')[0].style.display = 'none';
		document.querySelectorAll('[data-zs-comments]')[0].style.visibility = '';
		document.querySelectorAll('[data-zs-status]')[0].style.visibility = '';
		document.querySelectorAll('[data-zs-reasonforcancel]')[0].style.visibility = '';
		document.querySelectorAll('[data-zs-cancel-submit]')[0].style.visibility = '';

		var reasonList = document.querySelectorAll('[data-zs-reasonforcancellist]'); // No I18N
		for (var i = 0; i < reasonList.length; i++) {
			reasonList[i].style.visibility = '';
		}
		var commentsAreas = document.querySelectorAll('[data-zs-comments-area]'); // No I18N
		for (var i = 0; i < commentsAreas.length; i++) {
			commentsAreas[i].style.visibility = '';
		}

		var statusAreas = document.querySelectorAll('[data-zs-status-area]'); // No I18N
		for (var i = 0; i < statusAreas.length; i++) {
			statusAreas[i].style.visibility = '';
		}

		var productList = document.querySelectorAll('[data-zs-choose-product]'); // No I18N
		for (var i = 0; i < productList.length; i++) {
			productList[i].style.visibility = '';
		}

		var quantityAreas = document.querySelectorAll('[data-zs-quantity]'); // No I18N
		for (var i = 0; i < quantityAreas.length; i++) {
			quantityAreas[i].removeAttribute('style');
			quantityAreas[i].removeAttribute('disabled');
		}
	}

	var _submitCancelOrReturnData = function () {
		var data = {};
		var productDetails = [];
		var productList = document.querySelectorAll('[data-zs-choose-product]'); // No I18N
		for (var i = 0; i < productList.length; i++) {
			if (productList[i].checked) {
				var listElem = productList[i].parentNode.parentNode;
				var productDetail = {};
				var itemIds = productList[i].getAttribute('data-zs-product-variant-id');
				//productDetail["line_item_id"] = itemIds[0].trim();
				productDetail.item_id = itemIds.trim();
				productDetail.quantity = parseInt(listElem.querySelectorAll('[data-zs-quantity]')[0].value);
				//productDetail["reason"] = listElem.getElementsByTagName('select')[0].value;
				//productDetail["comments"] = listElem.getElementsByTagName('textarea')[0].value
				productDetails[productDetails.length] = productDetail;
			}
		}
		if (productDetails.length === 0) {
			alert('Please choose product for cancel'); // No I18N
			return;
		} else {
			data.line_items = productDetails;
			$X.post({
				url: '/store-user/api/v1/returns/addReturnItem/' + location.pathname.split("/")[2], // No I18N
				bodyJSON: data,
				handler: function () {
					var res = JSON.parse(this.responseText);
					/*if (res.message === 0 ) {
					    //console.log("success");
					}
					else{
					    //console.log("error");
					}*/
				}
			});

		}
	}

	var _showMessageArea = function () {
		document.querySelectorAll('[data-zs-order-area]')[0].style.display = 'none';
		document.querySelectorAll('[data-zs-message-area]')[0].style.display = 'block';

	}

	var _submitMessage = function () {
		var subject = document.querySelectorAll('[data-zs-message-subject]')[0].value;
		var message = document.querySelectorAll('[data-zs-message-textarea]')[0].value;

		params = {};
		params.message = subject + "|" + message;
		$X.post({
			url: '/store-user/api/v1/returns/addMessage/' + location.pathname.split("/")[2], // No I18N
			params: params,
			handler: function () {
				var res = JSON.parse(this.responseText);
				/*if (res.message === 0 ) {
				    //console.log("success");
				}
				else{
				    //console.log("error");
				}*/
			}
		});


	}

	function setHrefCart(viewcartelem) {
		viewcartelem.addEventListener('click', function () {
		    if (window.location.pathname.startsWith("/fb-store")) {
		        window.location.href = "/fb-store/cart"; // No I18N
		    } else {
			    window.location.href = "/cart"; // No I18N
			}
		}, false);
	}

	function _checkWhetherOrgIsLiveOrTest() {
		$X.get({
			url: "/store-user/api/v1/organizations/meta", // No I18N
			handler: function () {
				var res = JSON.parse(this.responseText);
				if (res.status_code == 0) {
					var organization = res.data.organization;
					if (organization.org_mode && organization.org_mode.toLowerCase() == "test") {
						var height = 20;
						var contentDiv = document.createElement("div"); // No I18N
						
						contentDiv.setAttribute("style", 'color: #fff389;    text-shadow: 1px 1px 1px #000; font-size: 13px;font-family: Lucida Grande,Segoe UI,Arial,Helvetica,sans-serif;'); // No I18N
						contentDiv.innerText = "This is a test demonstration store. No orders will be fulfilled."; // No I18N
						var topBannerDiv = document.createElement("div"); // No I18N
						topBannerDiv.setAttribute("style", 'overflow: hidden; position: absolute; top: 0px; width: 100%; background-color: #0b3b5b; text-align: center;padding:1px; z-index: 100001'); // No I18N
						topBannerDiv.appendChild(contentDiv);
						var html = document.querySelector("html");// No I18N
						html.style.paddingTop = "25px";// No I18N
						var body = document.querySelector("body"); // No I18N
						body.insertBefore(topBannerDiv, body.firstChild);
					}
				}
			}
		})
	}

	function _getRecommendedProducts () {
	    var product = window.zs_product;
        var recommendedDivs = $D.getAll("[data-zs-recommended-products]"); // No I18N
        var length = recommendedDivs.length;
        if (product && length > 0) {
            $X.post({
                url: "/store-user/api/v1/recommended-products?product_id=" + product.product_id, // No I18N
                handler: function () {
                    var response = JSON.parse(this.responseText);
                    if (response.status_code == 0) {
                        for (var i = 0; i < length; i++) {
                            if (response.content && response.content.length > 0) {
                                recommendedDivs[i].innerHTML = response.content;
                                productQuickLookAddToCart(recommendedDivs[i]);
                                product_option.initForElement(recommendedDivs[i]);
                                recommendedDivs[i].style.display = ""; // No I18N
                            }
                        }
                    }
                }
            });
        }
	}

	function _checkForInternetExplorerCustomEvent () {
	    // https://stackoverflow.com/a/26596324
        if ( typeof window.CustomEvent === "function" ) { return false; } // No I18N

        function CustomEvent ( event, params ) {
            params = params || { bubbles: false, cancelable: false, detail: undefined };
            var evt = document.createEvent("CustomEvent"); // No I18N
            evt.initCustomEvent( event, params.bubbles || false, params.cancelable || false, params.detail );
            return evt;
        }

        CustomEvent.prototype = window.Event.prototype;

        window.CustomEvent = CustomEvent;
	}

	var init = function () {
		_checkWhetherOrgIsLiveOrTest();

		_checkForInternetExplorerCustomEvent();

		_getRecommendedProducts();

		//get cart details
		_getCartDetails()
		/*var script = document.createElement('script');
		script.onload = function(){ _getCartDetails()};
		script.src="ht"+"tp://ljraajesh-1000.csez.zohocorpin.com:8080/zs-site/assets/v1/js/lib.js";
		document.body.appendChild(script);
		*/
		// view cart
		var viewCartElem = document.querySelectorAll('[data-zs-view-cart]'); // No I18N
		for (var i = 0; i < viewCartElem.length; i++) {
			setHrefCart(viewCartElem[i]);
		}
		// add to cart
		var addToCartElem = document.querySelectorAll('[data-zs-add-to-cart]'); // No I18N
		for (var i = 0; i < addToCartElem.length; i++) {
			addToCartElem[i].addEventListener('click', _addProductToCart, false);
		}
		// update in cart
		var updateInCartElem = document.querySelectorAll('[data-zs-update]'); // No I18N
		for (var i = 0; i < updateInCartElem.length; i++) {
			updateInCartElem[i].addEventListener('mousedown', _updateProductInCart, false);
		}
		// delete in cart
		var deleteInCartElem = document.querySelectorAll('[data-zs-delete]'); // No I18N
		for (var i = 0; i < deleteInCartElem.length; i++) {
			deleteInCartElem[i].addEventListener('click', _deleteProductInCart, false);
		}
		//continueShopping
		var continueShoppingElem = document.querySelectorAll('[data-zs-continue-shopping]')[0];
		if (continueShoppingElem) {
			continueShoppingElem.addEventListener('click', function () {
			    this.disabled = true;
			    if (window.location.pathname.startsWith("/fb-store")) {
			        window.location.href = "/fb-store"; // No I18N
			    } else {
				    window.location.href = "/"; // No I18N
				}
			}, false);
		}
		// checkout
		var checkoutElem = document.querySelectorAll('[data-zs-checkout]')[0];
		if (checkoutElem) {
			checkoutElem.addEventListener('click', function () {
			    this.disabled = true;
			    if (window.location.pathname.startsWith("/fb-store")) {
			        var win = window.open("/checkout", "_blank"); // No I18N
			        win.focus();
			    } else {
				    window.location.href = "/checkout";
				}
			}, false);
		}
		// Enabled Cancel or Return order
		var cancelElem = document.querySelectorAll('[data-zs-cancel]')[0];
		if (cancelElem) {
			cancelElem.addEventListener('click', _cancelORReturnRequestEnable, false);
		}
		// collect Cancel or Return order details
		var returnElem = document.querySelectorAll('[data-zs-cancel-submit]')[0];
		if (returnElem) {
			returnElem.addEventListener('click', _submitCancelOrReturnData, false);
		}
		// my order
		var orderElem = document.querySelectorAll('[data-zs-order]')[0];
		if (orderElem) {
			orderElem.addEventListener('click', _showOrderDetails, false);
		}

		// Message
		var messageElem = document.querySelectorAll('[data-zs-message]')[0];
		if (messageElem) {
			messageElem.addEventListener('click', _showMessageArea, false);
			document.querySelectorAll('[data-zs-message-submit]')[0].addEventListener('click', _submitMessage, false); // No I18N
		}
		currencyConversion();
	}

	var productQuickLookAddToCart = function (element = document.getElementById('product_quick_look')) { // No I18N
		var addToCartElem = element.querySelectorAll('[data-zs-add-to-cart]')[0]; // No I18N
		if (addToCartElem) {
			addToCartElem.addEventListener('click', _addProductToCart, false);
			if (addToCartElem.getAttribute('data-zs-product-variant-id') === "") {
				// this function call at product_option.js for varaint choose options enabled
				product_option.initForElement(document.getElementById('product_quick_look')); // No I18N
			}

			var currencySelectElem = document.querySelector('[data-zs-currency-list]'); //NO I18N
			if (currencySelectElem) {
				var selectTag = currencySelectElem.getElementsByTagName('select')[0];
				var currency_code = _getCookie(CURRENCY_COOKIE_NAME);
				if (selectTag && currency_code) {
					selectTag.value = currency_code;
					changeEvent(selectTag)
				}
			}
		}
	}



	// multiple currency conversion support
	// var conversion = {
	// 	INR:1,
	// 	USD:0.0154678449,
	// 	EUR:0.0138887896,
	// 	GBP:0.0120571336,
	// 	AUD:0.020815059,
	// 	CAD:0.0208430901,
	// 	SGD:0.0214716559
	// };


	function currencyConversion() {
		var currencySelectElem = document.querySelector('[data-zs-currency-list]'); //NO I18N

		if (currencySelectElem) {
			$X.get({
				url: '/store-user/api/v1/currency/getCurrencies', // No I18N
				handler: function () {
					var response = this.responseText;
					if (response) {
						currencySelectElem.innerHTML = response;
						var selectTag = currencySelectElem.getElementsByTagName('select')[0];

						if (selectTag) {
							selectTag.addEventListener('change', currencyConversionApply, false);

							var currency_code = _getCookie(CURRENCY_COOKIE_NAME)
							if (currency_code) {
								selectTag.value = currency_code;
								changeEvent(selectTag)
							}
						}
					}
				}
			});
		}
	}

	function changeEvent(elem) {
		var evnt;
		if (document.createEvent) { //for IE 9, Frefox, Chrome browser
			evnt = document.createEvent("HTMLEvents"); //No I18N
			evnt.initEvent("change", true, false); //No I18N
			elem.dispatchEvent(evnt);
		} else if (document.createEventObject) { //for IE 7, 8 browser
			evnt = document.createEventObject();
			elem.fireEvent("onchange", evnt); //No I18N
		}
	}

	function _getCookie(cookie_name) {
		var match = document.cookie.match(new RegExp(cookie_name + '=([^;]+)'));
		if (match) {
			return match[1]
		}
	}

	function _setCookie(cookie_name, currency_code) {

		if (_getCookie(cookie_name) == currency_code) {
			return;
		}

		var currencyExpires = new Date();
		currencyExpires.setTime(currencyExpires.getTime() + (currencyExpires * 24 * 60 * 60 * 1000));
		document.cookie = cookie_name + '=' + currency_code + '; expires = ' + currencyExpires.toGMTString() + ';domain=' + window.location.hostname + ';path=/' //NO I18N
	}


	function _attr(elem, attr) {
		return elem.getAttribute(attr)
	}

	function currencyConversionApply() {
		var selectedCurrency = this.value;
		_setCookie(CURRENCY_COOKIE_NAME, selectedCurrency);

		var option = this.options[this.selectedIndex];

		var conversionAmount = _attr(option, 'data-exchange-rate') //NO I18N
		var currencySymbol = _attr(option, 'data-currency-symbol') //NO I18N
		var numberOfdecimal = _attr(option, 'data-price-precision') //NO I18N
		var currencyFormat = _attr(option, 'data-currency-format') //NO I18N

		var allPriceElem = document.querySelectorAll('[data-original-price]'); // No I18N
		allPriceElem.forEach(function (priceElem) {

			var orginalPrice = priceElem.getAttribute('data-original-price');
			if (orginalPrice && conversionAmount) {
				var price = parseFloat(orginalPrice) * conversionAmount;

				if (numberOfdecimal) {
					price = price.toFixed(numberOfdecimal);
				}
				priceElem.innerText = currencySymbol ? currencySymbol + " " + price : price;
			}
		});
	}

	return {
		init: init,
		productQuickLookAddToCart: productQuickLookAddToCart
	}
})();

zsUtils.onDocumentReady(cart.init);

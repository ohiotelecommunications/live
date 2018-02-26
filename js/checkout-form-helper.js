/*$Id$*/
var checkout = function () {

var FORM_VISIBLE_CLASS = "form-visible"; // No I18N
var FORM_IN_VISIBLE_CLASS = "form-invisible"; // No I18N
var CHECKOUT_FORM = "checkout-form"; // No I18N
var CONTINUE_ADDRESS_WITHOUT_FIELDS_ID = "continue-address-without-fields"; // No I18N
var CONTINUE_WITH_SAME_BILLING_ADDRESS = "continue-same-billing-address"; // No I18N

var orderReview = {
	contentId: "order-review", // No I18N
	tabId: "change-order", // No I18N
	next: null,
	bind: function (orderReview) {
		bindButtonClick();
		bindElementIdForClick(orderReview.tabId, orderReview.openTab);
		bindElementIdForClick("terms-and-condition-check", orderReview.toggleMakePayment); // No I18N
		bindElementId("terms-and-condition-check", "change", orderReview.toggleMakePayment); // No I18N
	},
	toggleMakePayment: function (e) {
		if (this.checked) {
			$D.getById("make-payment-button").disabled = false;
		} else {
			$D.getById("make-payment-button").disabled = true;
		}
	},
	openTab: function () {
	    showTabButton(portal.tabId);
	    showTabButton(address.tabId);
		showTabButton(shippingMethods.tabId);
		hideTabButton(orderReview.tabId);
		hideAllContents();
		showContent(orderReview.contentId);
		orderReview.bind(orderReview);
	},
	setContent: function (content) {
		setContentToClass(orderReview.contentId, content);
		orderReview.bind(orderReview);
	},
	onContinue: function () {

	},
	onSuccess: function () {

	},
	onFailure: function () {

	},
	markComplete: function () {
		hideContent(orderReview.contentId);
		showTabButton(orderReview.tabId);
	},
	markInComplete: function () {
		this.openTab();
	}
};

var shippingMethods = {
	api: "/store-user/api/v1/checkout/shipping-methods?format=html", // No I18N
	next: orderReview,
	tabId: "change-shipping-methods", // No I18N
	contentId: "shipping-methods", // No I18N
	bind: function (shippingMethods) {
		bindButtonClick();
		bindElementIdForClick(shippingMethods.tabId, shippingMethods.openTab);
		bindElementsForChange($D.getByClass("shipping-method"), shippingMethods.onChange); // No I18N
		bindElementIdForClick("submit-shipping-method", shippingMethods.onContinue); // No I18N
	},
	openTab: function () {
	    showTabButton(portal.tabId);
	    showTabButton(address.tabId);
		hideTabButton(shippingMethods.tabId);
		hideTabButton(orderReview.tabId);
		hideAllContents();
		showContent(shippingMethods.contentId);
		shippingMethods.bind(shippingMethods);
	},
	setContent: function (content) {
		setContentToClass(shippingMethods.contentId, content);
	},
	onChange: function () {
		var data = formToData($D.getById("shipping-methods-form")); // No I18N
		if (data) {
			$X.post({
				url: shippingMethods.api,
				bodyJSON: data,
				handler: shippingMethods.handler
			})
		}
	},
	onContinue: function () {
	    this.disabled = true;
		shippingMethods.onChange();
	    shippingMethods.markComplete();
	    if (shippingMethods.next) {
	        shippingMethods.next.markInComplete();
	    }
	    this.disabled = false;
	},
	handler: function () {
		var json = JSON.parse(this.responseText);
		if (json.status_code == 0) {
			shippingMethods.onSuccess(json);
		} else {
			shippingMethods.onFailure();
		}
	},
	onSuccess: function (json) {
		//this.markComplete();
		if (this.next) {
			this.next.setContent(json.checkout_shipping_methods.checkout_order_review);
			setContentForOrderSummary(json.checkout_shipping_methods.checkout_order_summary);
			//this.next.markInComplete();
		}
		bindButtonClick();
	},
	onFailure: function () {
		this.markInComplete();
		errorLog("Select valid Shipping method"); // No I18N
	},
	markComplete: function () {
		hideContent(shippingMethods.contentId);
		showTabButton(shippingMethods.tabId);
	},
	markInComplete: function () {
		this.openTab();
	}
};

var address = {
	api: "/store-user/api/v1/checkout/address", // No I18N
	tabId: "change-address", // No I18N
	contentId: "address", // No I18N
	next: shippingMethods,
	bind: function (address) {
		bindButtonClick();
		bindElementIdForClick(address.tabId, address.openTab);
		bindElementsForClick($D.getByClass('edit-address'), address.editAddressForm); // No I18N
		bindElementsForClick($D.getByClass('add-address'), address.addAddressForm); // No I18N
		bindElementsForClick($D.getByClass('delete-address'), address.deleteAddress); // No I18N
		bindElementIdForClick("toggle-billing-shipping", address.toggleShippingAndBillingAddress); // No I18N
		bindElementId("toggle-billing-shipping", "change", address.toggleShippingAndBillingAddress); // No I18N
		bindElementsForClick($D.getByClass("address-submit"), address.onContinue); // No I18N
		bindElementId("shipping-address-country", "change", address.showShippingStates); // No I18N
		bindElementId("billing-address-country", "change", address.showBillingStates); // No I18N
		bindElementsForChange($D.getByClass('select-address'), address.selectAddress); // No I18N
		$E.callOnLoad(address.showShippingStates);
	},
	setContent: function (content) {
		setContentToClass(address.contentId, content);
	},
	openTab: function () {
	    showTabButton(portal.tabId);
	    hideTabButton(address.tabId);
		hideTabButton(shippingMethods.tabId);
		hideTabButton(orderReview.tabId);
		hideAllContents();
		showContent(address.contentId);
		//address.bind();
	},
	selectAddress: function (e) {
		e.preventDefault();
		var addressForm = $D.getById("address-fields"); // No I18N
		hideElement(addressForm);
		address.showContinue();
		address.showAddAddress();
	},
	editAddressForm: function (e) {
		e.preventDefault();
		var addressId = this.getAttribute("data-address-id"); // No I18N
		$X.get({
			url: address.api + "/" + addressId + "?format=html", // No I18N
			handler: function () {
				address.addContentToAddressFields(this.responseText);
				address.hideContinue();
				address.hideAddAddress();
			}
		});
	},
	addAddressForm: function (e) {
		e.preventDefault();

		var address_radio_group = document.getElementsByName("address");
		for(var i=1 ; i<=(address_radio_group.length-2) ; i++ ) {
			var radio_input = document.getElementById("address-selection-"+i);
			radio_input.checked = false;
		}

		$X.get({
			url: address.api + "?format=html", // No I18N
			handler: function () {
				address.addContentToAddressFields(this.responseText);
				address.hideContinue();
				address.hideAddAddress();
			}
		});
	},
	deleteAddress: function (e) {
		e.preventDefault();
		var addressId = this.getAttribute("data-address-id"); // No I18N
		$X.del({
			url: address.api + "/" + addressId + "?format=html", // No I18N
			handler: function () {
				address.addContentToAddressStep(this.responseText);
			}
		})
	},
	addContentToAddressFields: function (content) {
		var addressForm = $D.getById("address-fields"); // No I18N
		var json = JSON.parse(content);
		addressForm.innerHTML = json.checkout_address;
		showElement(addressForm);
		address.bind(address);
	},
	addContentToAddressStep: function (content) {
		var addressStep = $D.getByClass(address.tab)[0];
		var json = JSON.parse(content);
		addressStep.innerHTML = json.checkout_address;
		showElement(addressStep);
		bindToggleBillingShipping();
	},
	toggleShippingAndBillingAddress: function (e) {
		var billingAddressForm = $D.getById("billing-address"); // No I18N
		if (this.checked) {
			hide("billing-address"); // No I18N
			show(CONTINUE_WITH_SAME_BILLING_ADDRESS);
		} else {
			show("billing-address"); // No I18N
			hide(CONTINUE_WITH_SAME_BILLING_ADDRESS);
		}
	},
	hideContinue: function () {
		hide(CONTINUE_ADDRESS_WITHOUT_FIELDS_ID);
	},
	showContinue: function () {
		show(CONTINUE_ADDRESS_WITHOUT_FIELDS_ID);
	},
    hideAddAddress: function () {
        hide("add-new-address"); // No I18N
    },
    showAddAddress: function () {
        show("add-new-address"); // No I18N
    },	
	onContinue: function (e) {
		e.preventDefault();
		this.disabled = true;
		var data = address.getDataFromAddressForm(this.id);
		if (address.validateData(data)) {
			$X.post({
				url: address.api + "?format=html", // No I18N
				bodyJSON: data,
				args: {button : this},
				handler: address.handler
			});
		} else {
		    errorLog("Kindly provide data for all mandatory fields"); // No I18N
		}
		this.disabled = false;
	},
	validateData: function (data) {
	    var shippingAddress = data.shipping_address;
	    var billingAddress = data.billing_address;
	    var addressId = data.address_id;
	    return validateString(addressId)
	        || (address.validateAddress(shippingAddress) && address.validateAddress(billingAddress));
	},
	validateAddress: function (address, type) {
        var hasFirstName = validateString(address.first_name);
        var hasLastName = validateString(address.last_name);
        var hasEmailAddress = validateEmail(address.email_address);
        var hasAddress = validateString(address.address);
		var hasCountry = validateString(address.country);
		var hasState = false;
		if (hasCountry) {
			var option = document.querySelector("select[name=country] > option[value='" + address.country + "']"); // No I18N
			if (option) {
				var states = JSON.parse(option.getAttribute("data-zs-states")); // No I18N
				if (states.length == 0) {
					hasState = true;
				} else {
					hasState = validateString(address.state);
				}
			}
		}
        var hasCity = validateString(address.city);
        var hasTelephone = validateString(address.telephone);
        return hasFirstName && hasLastName && hasEmailAddress && hasAddress && hasCountry && hasState && hasCity
                && hasTelephone;
	},
	_createStateOptions: function (select) {
		var selectedCountry = select.options[select.selectedIndex];
		var states = JSON.parse(selectedCountry.getAttribute("data-zs-states")); // No I18N
		var options = [];
		if (!states) {
			return options;
		}
		if(states.length == 1) {
			var singleState = document.createElement("option"); // No I18N
			singleState.value = states[0].code;
			singleState.innerHTML = states[0].name;
			singleState.selected = true;		
			options.push(singleState);
			return options;		
		}
		for (var i = 0; i < states.length; i++) {
			var state = states[i];
			var singleState = document.createElement("option"); // No I18N
			singleState.value = state.code;
			singleState.innerHTML = state.name;			
			options.push(singleState);
		}
		return options;
	},
	_removeExistingStateOptions: function (stateSelect) {
		var index = 0;
		for (var index=0; index<stateSelect.options.length;) {
			var stateOption = stateSelect.options[index];
			if (stateOption.value != "") {
				stateSelect.remove(index);
			} else {
				index = index+1;
			}
		}
	},
	_addOptionsToStateSelect: function (stateSelect, options) {
		if (options.length == 0) {
			stateSelect.disabled = true;
		} else {
			stateSelect.disabled = false;
		}
		for (var i = 0; i < options.length; i++) {
			var option = options[i];
			stateSelect.appendChild(option);
		}
	},
	showBillingStates: function () {
	    if (!this) {
	        return;
	    }
		var options = address._createStateOptions(this);
		var stateSelect = $D.getById("billing-address-states"); // No I18N
		address._removeExistingStateOptions(stateSelect);
		address._addOptionsToStateSelect(stateSelect, options);
	},
	showShippingStates: function () {
	    if (!this) {
            return;
        }
		var countrySelect = $D.getById("shipping-address-country"); // No I18N
		if(!countrySelect) {
			return;
		}
		var options = address._createStateOptions(countrySelect);
		var stateSelect = $D.getById("shipping-address-states"); // No I18N
		if(!stateSelect) {
			return;
		}
		address._removeExistingStateOptions(stateSelect);
		address._addOptionsToStateSelect(stateSelect, options);
	},
	getDataFromAddressForm: function (buttonId) {
		if (buttonId == CONTINUE_ADDRESS_WITHOUT_FIELDS_ID) {
			var addressBoxForm = $D.getById("address-box-form"); // No I18N
			var addressBoxInputs = addressBoxForm.getElementsByTagName("input"); // No I18N
			var addressId = -1;
			for (var i=0; i<addressBoxInputs.length; i++) {
				var addressBoxInput = addressBoxInputs[i];
				if (addressBoxInput.checked) {
					addressId = addressBoxInput.value;
					break;
				}
			}
			if (addressId == -1) {
				errorLog("Select valid address"); // No I18N
				return;
			}
			data = {
				"address_id" : addressId // No I18N
			}
		} else {
			var shippingForm = $D.getById("shipping-address"); // No I18N
			var fullData = {};
			data = formToData(shippingForm);
			if (data) {
				if (buttonId != CONTINUE_WITH_SAME_BILLING_ADDRESS) {
					var billingForm = $D.getById("billing-address"); // No I18N
					var billingData = formToData(billingForm);
					if (billingData) {
						fullData.shipping_address = data;
						fullData.billing_address = billingData;
					} else {
						fullData = undefined;
					}
				} else {
					fullData.shipping_address = data;
					fullData.billing_address = data;
				}
			    data = fullData;
			}
		}
        return data;
	},
	handler: function (args) {
		var json = JSON.parse(this.responseText);
		if (json.status_code == 0) {
			address.onSuccess(json);
		} else {
			address.onFailure(json);
		}
		args.button.disabled = false;
	},
	onSuccess: function (json) {
		this.markComplete();
		if (this.next) {
			this.next.setContent(json.checkout_address.checkout_shipping_methods);
			setContentForOrderSummary(json.checkout_address.checkout_order_summary);
			this.next.markInComplete();
		}
	},
	onFailure: function (json) {
		var message = json && json.error && json.error.message ? json.error.message : ""; // No I18N
		if (message.length == 0) {
		    errorLog("No shipping method available for provided address"); // No I18N
		} else {
		    errorLog(message);
		}
	},
	markComplete: function () {
		hideContent(this.contentId);
		showTabButton(this.tabId);
	},
	markInComplete: function () {
		this.openTab();
	}
};

var portal = {
	api: "/store-user/api/v1/checkout/portal?format=html", // No I18N
	tabId: "change-portal", // No I18N
	contentId: "login-method", // No I18N
	next: address,
	bind: function (portal) {
		bindButtonClick();
		bindElementIdForClick(portal.tabId, portal.openTab);
		bindElementIdForClick("guest-login", portal.loginAsGuest); // No I18N
	},
	setContent: function (content) {
		setContentToClass(portal.contentId, content);
	},
	openTab: function (e) {
		e.preventDefault();
	    hideTabButton(portal.tabId);
	    hideTabButton(address.tabId);
		hideTabButton(shippingMethods.tabId);
		hideTabButton(orderReview.tabId);
		hideAllContents();
		showContent(portal.contentId);
		portal.bind(portal);
	},
	loginAsGuest: function (e) {
		e.preventDefault();
		this.disabled = true;
		$X.post({
			url: portal.api,
			bodyJSON: {"is_guest": true}, // No I18N
			args: {button: this},
			handler: portal.handler
		})
	},
	onContinue: function () {

	},
	handler: function (button) {
		var response = JSON.parse(this.responseText);
		if (response.status_code == 0) {
			$D.getById("login-content").innerHTML = response.checkout_portal.checkout_portal; // No I18N
			portal.onSuccess();
		} else {
			portal.onFailure();
		}
		button.disabled = false;
	},
	onSuccess: function () {
		this.markComplete();
		if (this.next) {
			this.next.markInComplete();
		}
	},
	onFailure: function () {
		this.markInComplete();
	},
	markComplete: function () {
		hideContent(portal.contentId);
		showTabButton(portal.tabId);
	},
	markInComplete: function () {
		hideAllContents();
		hideTabButton(portal.tabId);
		showContent(portal.contentId);
	}
};

var modules = [
	portal,
	address,
	shippingMethods,
	orderReview
];


/* On load function */
function onLoadFunction() {
	//bindElementByClassForClick($D.getByClass("change-content-button"), changeContent); // No I18N
	hideAllExceptFirstIncompleteForm();

	for (var i = 0; i < modules.length; i++) {
		var module = modules[i];
		module.bind(module);
	}
    bindElementId('applyCouponCode',"click",applyCouponCode); // No I18N
    bindElementId('deleteCouponCode',"click",deleteCouponCode); // No I18N
}
zsUtils.onDocumentReady(onLoadFunction);
//$E.callOnLoad(onLoadFunction);
//window.onload = onLoadFunction;



function applyCouponCode(e){
    e.preventDefault();
    this.disabled = true;
    var couponCode = $D.getById("couponCode").value;
    var errorElem = $D.getById("couponCodeErrorMsg");
    if(couponCode != ''){
        errorElem.style.display="none";
        var params = {};
        params.coupon_code = couponCode;
        $X.post({
            url: "/store-user/api/v1/checkout/applycoupon?format=html",// No I18N
            params: params,
            handler: setOrderReviewandSummary
        });
    }
    else{
        this.removeAttribute('disabled');
        var msg = "Please Enter Coupon Code.";// No I18N
        errorElem.style.display="block";
        errorElem.firstChild.innerText = msg;
        errorLog(msg);
    }
}

function setOrderReviewandSummary(){
    var res = JSON.parse(this.responseText);
    var errorElem = $D.getById("couponCodeErrorMsg");
    $D.getById("applyCouponCode").removeAttribute('disabled');
    if (res.status_code == 0) {
        setContentForOrderSummary(res.coupon_details.checkout_order_summary); 
        setContentForOrderReview(res.coupon_details.checkout_order_review);
        errorElem.style.display="none";
    }
    else{
        errorElem.style.display="block";
        errorElem.firstChild.innerText = res.error.message;
        errorLog(res.error.message);
    }
}

function deleteCouponCode(e){
    e.preventDefault();
    var params = {};
    params.coupon_code = '';
    $X.post({
        url:"/store-user/api/v1/checkout/applycoupon?format=html",// No I18N
        params:params,
        handler : setOrderReviewandSummary
    });
}

function hideAllExceptFirstIncompleteForm () {
	var elements = $D.getByClass(FORM_VISIBLE_CLASS);
    for (var i=1; i<elements.length;) {
        elements[i].classList.add(FORM_IN_VISIBLE_CLASS);
        elements[i].classList.remove(FORM_VISIBLE_CLASS);
    }
}

function validateString (string) {
    return string !== undefined && string.trim().length > 0;
}

function validateEmail (email) {
    var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/; // No I18N
    return validateString(email) && re.test(email);
}

function bindButtonClick () {
	bindElementsForClick($D.getByClass('button-click'), hrefButton); // No I18N
}

function hrefButton (e) {
	e.preventDefault();
	this.disabled = true;
	var href = this.getAttribute("data-href"); // No I18N
    if(href){
	    window.location.href = href;
    }
}

function bindElementsForClick (elements, next) {
	bindElements(elements, "click", next); // No I18N
}

function bindElementsForChange (elements, next) {
	bindElements(elements, "change", next); // No I18N
}

function bindElements (elements, event, next) {
	for (var i=0, len = elements.length; i<len; i++) {
        bindElement(elements[i], event, next);
    }
}

function bindElementIdForClick (id, next) {
	bindElement($D.getById(id), "click", next); // No I18N
}

function bindElementId (id, event, next) {
	bindElement($D.getById(id), event, next);
}


function bindElement (element, event, next) {
	$E.unbind(element, event, next);
	$E.bind(element, event, next);
}

function hide (id) {
	hideElement($D.getById(id));
}

function hideElement (element) {
	element.style.display = "none"; // No I18N
}

function show (id) {
	showElement($D.getById(id));
}

function showElement (element) {
	element.style.display = "block"; // No I18N
}

function showByClass (className) {
	var elements = $D.getByClass(className);
	for (var i=0; i<elements.length; i++) {
		showElement(elements[i]);
	}
}

function checkFormElements (form) {
	var errorElements = [];
	var elements = form.elements;
	for (var i = 0; i < elements.length; i++) {
		var input = elements[i];
		if (input.getAttribute("required") && !validateString(input.value)) { // No I18N
			errorElements.push(input);
		}
	}
	return errorElements;
}

function formToData (form, onError) {
	var errorElements = checkFormElements(form);
	if (errorElements.length > 0) {
	    if (onError) {
	        onError(errorElements);
	    } else {
	        errorLog("Provide values to all required fields"); // No I18N
	    }
		return;
	}
	var elements = form.elements;
	var data = {};
	for (var i=0; i<elements.length; i++) {
		var input = elements[i];
		var name = input.name;
		if (name) {
		    if (input.type != "radio" || (input.type == "radio" && input.checked)) { // No I18N
                if(input.type == "checkbox"){
                    data[name] = input.checked;
                }
                else{
			        data[name] = input.value;
                }
			}


		}
	}
	return data;
}

function hideAllContents () {
	var elements = $D.getByClass(CHECKOUT_FORM);
	for (var i = 0; i < elements.length; i++) {
		var element = elements[i];
		element.classList.remove(FORM_VISIBLE_CLASS);
		element.classList.add(FORM_IN_VISIBLE_CLASS);
	}
}

function showContent (contentId) {
	var contents = $D.getByClass(contentId);
	for (var i = 0; i < contents.length; i++) {
		var content = contents[i];
		content.classList.remove(FORM_IN_VISIBLE_CLASS);
		content.classList.add(FORM_VISIBLE_CLASS);
	}
}

function hideContent (contentId) {
	var contents = $D.getByClass(contentId);
	for (var i = 0; i < contents.length; i++) {
		var content = contents[i];
		content.classList.add(FORM_IN_VISIBLE_CLASS);
		content.classList.remove(FORM_VISIBLE_CLASS);
	}
}

function showTabButton (tabId) {
	var tab = $D.getById(tabId);
	tab.classList.add("change-button-visible"); // No I18N
	tab.classList.remove("change-button-invisible"); // No I18N
}

function hideTabButton (tabId) {
	var tab = $D.getById(tabId);
	tab.classList.remove("change-button-visible"); // No I18N
	tab.classList.add("change-button-invisible"); // No I18N
}

function setContentToClass (classId, content) {
	var contentPlaceHolders = $D.getByClass(classId);
	for (var i = 0; i < contentPlaceHolders.length; i++) {
		var contentPlaceHolder = contentPlaceHolders[i];
		contentPlaceHolder.innerHTML = content;
	}
}

function setContentForOrderSummary (content) {
	$D.getById("order-summary-content").innerHTML = content; // No I18N
    bindElementId('applyCouponCode',"click",applyCouponCode); // No I18N
    bindElementId('deleteCouponCode',"click",deleteCouponCode); // No I18N
}

function setContentForOrderReview ( content){
    $D.getById("order-review-content").innerHTML = content;
    orderReview.bind(orderReview);
}
function errorLog (text) {
	var div = document.createElement("div"); // No I18N
	div.classList.add("site-notification"); // No I18N
	div.setAttribute("style", "margin: 0; position: fixed; bottom: 20px; right: 20px; z-index: 9999; border-radius: 10px; background: #333; padding: 20px; color: white;"); // No I18N
	div.innerHTML = text;
	document.body.appendChild(div);
	setTimeout(function () {
		document.body.removeChild(div);
	}, 3000);
}
}();

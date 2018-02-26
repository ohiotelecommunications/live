function addToCartSuccess (e) {
	bannerAddToCart();
}
function removeClass(element, className) {
	element.className = element.className.replace(className,'');
}
function addClass(element, className) {
	element.classList.add(className);
}
function addToCartSuccess (e) {
	bannerAddToCart();
	var addcartButton = e.detail.target;
	var cartDetailsIconButton = addcartButton.querySelectorAll('[data-theme-cart-button-icon="data-theme-cart-button-icon"]')[0];
	var cartButtonText = addcartButton.querySelectorAll('[data-theme-cart-button-text="theme-cart-button-text"]')[0];
	var cartButtonLoading = addcartButton.querySelectorAll('[data-theme-cart-button-loading="theme-cart-button-loading"]')[0];
	if(cartButtonText){
		cartButtonText.style.display = "block";
		removeClass(addcartButton,'theme-cart-loading-container');
	}
	if(cartDetailsIconButton){
		cartDetailsIconButton.style.display = "block";
	}
	if(cartButtonLoading){
		cartButtonLoading.style.display = "none";
	}
	resetSelect();
}
function bannerAddToCart () {
	var errorContainer = document.querySelectorAll('[data-quantity-error="theme-quantity-error"]')[0];
	if(errorContainer){
		errorContainer.style.display = "none";
	}
	var cartAddSuccess = document.querySelectorAll('[data-cart-add-success="theme-cart-add-success"]')[0];
	var cartAddSuccessDetail = document.querySelectorAll('[data-cart-add-success="theme-cart-add-success-detail"]')[0];
	var quickLookContainer = document.getElementById("product_quick_look");
	if(cartAddSuccess){
		addClass(cartAddSuccess,'theme-cart-success');
		removeClass(cartAddSuccess,'theme-cart-success-remove');
	}
	if(cartAddSuccessDetail){
		addClass(cartAddSuccessDetail,'theme-cart-success');
		removeClass(cartAddSuccessDetail,'theme-cart-success-remove');
		if(cartAddSuccess){
			addClass(cartAddSuccess,'theme-cart-success-remove');
			setTimeout(function() {
				removeClass(cartAddSuccess,'theme-cart-success-remove');
			},3100);
		}
	}
}

function closemessage(){
	var cartAddSuccess = document.querySelectorAll('[data-cart-add-success="theme-cart-add-success"]')[0];
	var cartAddSuccessDetail = document.querySelectorAll('[data-cart-add-success="theme-cart-add-success-detail"]')[0];
	var quickLookContainer = document.getElementById("product_quick_look");
	if(cartAddSuccess){
		addClass(cartAddSuccess,'theme-cart-success-remove');
		removeClass(cartAddSuccess,'theme-cart-success');
	}
	if(cartAddSuccessDetail){
		addClass(cartAddSuccessDetail,'theme-cart-success-remove');
		removeClass(cartAddSuccessDetail,'theme-cart-success');
	}
	if(quickLookContainer){
		closeProductQuickLook();
	}
}

function resetSelect(e){
	var VariantSelect = document.querySelectorAll('[data-zs-attribute-select]');
	var VariantRadio = document.querySelectorAll('[data-zs-attribute-option]');
	var productIds = new Set();
	for(vr=0;vr<VariantRadio.length;vr++){
		VariantRadio[vr].checked = false;
		var productId = VariantRadio[vr].getAttribute("data-zs-product-id");
		productIds.add(productId);
	}
	for(vs=0;vs<VariantSelect.length;vs++){
		VariantSelect[vs].selectedIndex = 0;
		var productId = VariantSelect[vs].getAttribute("data-zs-product-id");
		productIds.add(productId);
	}
	productIds.forEach(product_option.resetAddToCart);
	var allStocks = document.querySelectorAll("[data-variant-id-stock]");
	for(sa=0;sa<allStocks.length;sa++){
		allStocks[sa].style.display = 'none';
	}
	var dataResetQuantity = document.querySelectorAll("[data-theme-quantity]");
	for(qr=0;qr<dataResetQuantity.length;qr++){
		dataResetQuantity[qr].value = 1 ;
	}
}
window.onload = function(){
	resetSelect();
}

function addToCartFailure (e) {
	var cartAddFailure = document.querySelectorAll('[data-cart-add-failure="theme-cart-add-failure"]')[0];
	var cartAddFailureDetail = document.querySelectorAll('[data-cart-add-failure="theme-cart-add-failure-detail"]')[0];

	var addcartButton = e.detail.target;
	var cartDetailsIconButton = addcartButton.querySelectorAll('[data-theme-cart-button-icon="data-theme-cart-button-icon"]')[0];
	var cartButtonText = addcartButton.querySelectorAll('[data-theme-cart-button-text="theme-cart-button-text"]')[0];
	var cartButtonLoading = addcartButton.querySelectorAll('[data-theme-cart-button-loading="theme-cart-button-loading"]')[0];
	if(cartButtonText){
		cartButtonText.style.display = "block";
		removeClass(addcartButton,'theme-cart-loading-container');
	}
	if(cartDetailsIconButton){
		cartDetailsIconButton.style.display = "block";
	}
	if(cartButtonLoading){
		cartButtonLoading.style.display = "none";
	}

	if(cartAddFailure){
		addClass(cartAddFailure,'theme-cart-failure');
		removeClass(cartAddFailure,'theme-cart-failure-remove');
	}
	if(cartAddFailureDetail){
		addClass(cartAddFailureDetail,'theme-cart-failure');
		removeClass(cartAddFailureDetail,'theme-cart-failure-remove');
		if(cartAddFailure){
			addClass(cartAddFailure,'theme-cart-failure-remove');
			setTimeout(function() {
				removeClass(cartAddFailure,'theme-cart-failure-remove');
			},3100);
		}
	}
	setTimeout(function() {
		if(cartAddFailure){
			addClass(cartAddFailure,'theme-cart-failure-remove');
			removeClass(cartAddFailure,'theme-cart-failure');
		}
		if(cartAddFailureDetail){
			addClass(cartAddFailureDetail,'theme-cart-failure-remove');
			removeClass(cartAddFailureDetail,'theme-cart-failure');
		}
	}, 3000);
}

function updateToCartSuccess (e) {
	var cartUpdateSuccess = document.querySelectorAll('[data-cart-update-success="theme-cart-update-success"]')[0];

	var updateCartButton = e.detail.target;
	removeClass(updateCartButton,'theme-cart-updating');

	addClass(cartUpdateSuccess,'theme-cart-success');
	removeClass(cartUpdateSuccess,'theme-cart-success-remove');
	setTimeout(function() {
		addClass(cartUpdateSuccess,'theme-cart-success-remove');
		removeClass(cartUpdateSuccess,'theme-cart-success');
	}, 3000);
}
function showUpdate(cartitem){
	var updateButton =  document.querySelectorAll('[data-theme-update="'+cartitem+'"]')[0];
	updateButton.style.display = 'block';
}
function updateToCartFailure (e) {
	var cartUpdateFailure = document.querySelectorAll('[data-cart-update-failure="theme-cart-update-failure"]')[0];

	var updateCartButton = e.detail.target;
	removeClass(updateCartButton,'theme-cart-updating');

	addClass(cartUpdateFailure,'theme-cart-failure');
	removeClass(cartUpdateFailure,'theme-cart-failure-remove');
	setTimeout(function() {
		addClass(cartUpdateFailure,'theme-cart-failure-remove');
		removeClass(cartUpdateFailure,'theme-cart-failure')
	}, 3000);
	updateCartButton.style.display = 'block';
}

function deleteFromCartSuccess (e) {
	var cartDeleteSuccess = document.querySelectorAll('[data-cart-delete-success="theme-cart-delete-success"]')[0];
	addClass(cartDeleteSuccess,'theme-cart-success');
	removeClass(cartDeleteSuccess,'theme-cart-success-remove');

	var deleteButtonElem = e.detail.target;
	removeClass(deleteButtonElem,'theme-cart-item-removing');

	setTimeout(function() {
		addClass(cartDeleteSuccess,'theme-cart-success-remove');
		removeClass(cartDeleteSuccess,'theme-cart-success');
	}, 3000);
	var lineItemCount = parseInt(document.querySelectorAll('[data-zs-view-cart-count]')[0].textContent);
	var cartTableHead = document.querySelectorAll('[data-cart-table]');
	var cartNotEmptyMessage = document.querySelectorAll('[data-cart-empty-message]');
	var cartEmptyShoppingButton = document.querySelectorAll('[data-cart-empty-shopping-button]');
	var cartEmptyCheckoutButton = document.querySelectorAll('[data-cart-empty-checkout-button]');

	if (lineItemCount == 0) {
		addClass(cartTableHead[0],'theme-cart-empty')
		removeClass(cartNotEmptyMessage[0],'theme-cart-error-message-not-empty');
		addClass(cartNotEmptyMessage[0],'theme-cart-error-empty-message');
		addClass(cartEmptyShoppingButton[0],'theme-cart-empty-shopping-button');
		addClass(cartEmptyCheckoutButton[0],'theme-cart-empty-checkout-buton');
	}
}

function deleteFromCartFailure (e) {
	var cartDeleteFailure = document.querySelectorAll('[data-cart-delete-failure="theme-cart-delete-failure"]')[0];
	addClass(cartDeleteFailure,'theme-cart-failure');
	removeClass(cartDeleteFailure,'theme-cart-failure-remove');

	var deleteButtonElem = e.detail.target;
	removeClass(deleteButtonElem,'theme-cart-item-removing');

	setTimeout(function() {
		addClass(cartDeleteFailure,'theme-cart-failure-remove');
		removeClass(cartDeleteFailure,'theme-cart-failure');
	}, 3000);
}

function addToCartWithInvalidVariant (e) {
	var attributes = document.querySelectorAll("[data-zs-attribute-select]");
	attributesLength = attributes.length;
	for (atr=0;atr<attributesLength;atr++) {
		var attributeName = attributes[atr].getAttribute("data-zs-attribute-name");
		var errorContainer = document.querySelectorAll('[data-variant-error="theme-data-error-'+attributeName+'"]')[0];
		var attributeTagName = attributes[atr].tagName;
		errorContainer.style.display = "none";
		if (attributes[atr].selectedIndex === 0 && attributeTagName == 'SELECT') {
			errorContainer.style.display = "block";
		}
		if(attributeTagName != 'SELECT'){
			var radioSelect = attributes[atr].querySelectorAll('[data-zs-attribute-option]');
			radioSelectLength = radioSelect.length;
			for(rs=0;rs<radioSelectLength;rs++){
				radioSelected = radioSelect[rs].checked;
				if(radioSelected){
					errorContainer.style.display = "none";
					break;
				}
			}
			if(!radioSelected){
				errorContainer.style.display = "block";
			}
		}
	}
	var errorContainer = document.querySelectorAll('[data-variant-error="theme-variant-error"]')[0];
	errorContainer.className = ' theme-variant-select-error';
	errorContainer.style.display = 'inline-block';
}

function invalidProductQuantity (e) {
	var errorContainer = document.querySelectorAll('[data-quantity-error="theme-quantity-error"]')[0];
	errorContainer.style.display = 'block';
	errorContainer.className = ' theme-variant-select-error';

	var cartDetailsIconButton = document.querySelectorAll('[data-theme-cart-button-icon="data-theme-cart-button-icon"]');
	cartDetailsIconButtonLength = cartDetailsIconButton.length;
	var cartButtonText = document.querySelectorAll('[data-theme-cart-button-text="theme-cart-button-text"]');
	cartButtonTextLength = cartButtonText.length;
	var cartButtonLoading = document.querySelectorAll('[data-theme-cart-button-loading="theme-cart-button-loading"]');
	cartButtonLoadingLength = cartButtonLoading.length;
  for(ct=0;ct<cartButtonTextLength;ct++){
		if(cartButtonText[ct]){
			cartButtonText[ct].style.display = "block";
		}
	}
	for(cdl=0;cdl<cartDetailsIconButtonLength;cdl++){
		if(cartDetailsIconButton[cdl]){
			cartDetailsIconButton[cdl].style.display = "block";
		}
	}
	for(cl=0;cl<cartButtonLoadingLength;cl++){
		if(cartButtonLoading[cl]){
			cartButtonLoading[cl].style.display = "none";
		}
	}

}

function selectAttribute (e) {
	var errorContainer = document.querySelectorAll('[data-variant-error="theme-variant-error"]')[0];
	var errorInvalidContainer = document.querySelectorAll('[data-invalid-variant-group-error="theme-invalid-variant-group-error"]')[0]
	errorContainer.style.display = 'none';
	errorInvalidContainer.style.display = 'none';
	var attributes = document.querySelectorAll("[data-zs-attribute-select]");
	attributesLength = attributes.length;
	for (atr=0;atr<attributesLength;atr++) {
		var attributeName = attributes[atr].getAttribute("data-zs-attribute-name");
		var attributeTagName = attributes[atr].tagName;
		var errorVariantContainer = document.querySelectorAll('[data-variant-error="theme-data-error-'+attributeName+'"]')[0];
		if (attributes[atr].selectedIndex != 0 && attributeTagName == 'SELECT') {
			errorVariantContainer.style.display = "none";
		}
		if(attributeTagName != 'SELECT'){
			var radioSelect = attributes[atr].querySelectorAll('[data-zs-attribute-option]');
			radioSelectLength = radioSelect.length;
			for(rs=0;rs<radioSelectLength;rs++){
				radioSelected = radioSelect[rs].checked;
				if(radioSelected){
					errorVariantContainer.style.display = "none";
				}
			}
		}

		// SHOW ADD CART BUTTON IF NO STOCK INFO

		var stockCartAttribute = document.querySelectorAll('[data-nostock-cart-add="theme-nostock-cart-add"]');
		if (attributes[atr].selectedIndex == 0 && attributeTagName == 'SELECT') {
			for (sa=0;sa<stockCartAttribute.length;sa++){
				stockCartAttribute[sa].style.display = 'flex';
			}
		}

		// SHOW ADD CART BUTTON IF NO STOCK INFO END

	}
}

function invalidAttributeGroup (e) {
	var errorContainer = document.querySelectorAll('[data-invalid-variant-group-error="theme-invalid-variant-group-error"]')[0];
	errorContainer.className = ' theme-variant-select-error';
	errorContainer.style.display = 'inline-block';
}

function addToCartLoading (e) {
	var addcartButton = e.detail.target;
	var cartDetailsIconButton = addcartButton.querySelectorAll('[data-theme-cart-button-icon="data-theme-cart-button-icon"]')[0];
	var cartButtonText = addcartButton.querySelectorAll('[data-theme-cart-button-text="theme-cart-button-text"]')[0];
	var cartButtonLoading = addcartButton.querySelectorAll('[data-theme-cart-button-loading="theme-cart-button-loading"]')[0];
	if(cartButtonText){
		cartButtonText.style.display = "none";
		addClass(addcartButton,'theme-cart-loading-container');
	}
	if(cartDetailsIconButton){
		cartDetailsIconButton.style.display = "none";
	}
	if(cartButtonLoading){
		cartButtonLoading.style.display = "block";
	}
}
function updateToCartLoading (e) {
	var updateCartButton = e.detail.target;
	addClass(updateCartButton,'theme-cart-updating');
	updateCartButton.style.display = 'none';
}

function deleteFromCartLoading (e) {
	var deleteButtonElem = e.detail.target;
	addClass(deleteButtonElem,'theme-cart-item-removing');
}

function imageOrder(e){
	var imageIds = e.detail.image_ids;
	var allImages = document.querySelectorAll("[data-zs-image-id]");
	var first = true;
	for (var i = 0; i < allImages.length; i++) {
			var image = allImages[i];
			var imageId = image.getAttribute("data-zs-image-id");
			var previousDisplay = image.style.display;
			if (previousDisplay !== "none") {
					image.setAttribute("data-show-display", image.style.display);
			}
			image.style.display = "none";
			if (imageIds.indexOf(imageId) > -1) {
					image.style.display = image.getAttribute("data-show-display");
					if (first) {
							image.querySelector("img").click();
							first = false;
					}
			}
			if(imageIds.length == 0 || (imageIds.length == 1 && imageIds[0] == "-1")){
				image.style.display = "flex";
			}
	}
}

function selectedVariant(e){
	var currentStock = e.detail.variant_id;
	var allStocks = document.querySelectorAll("[data-variant-id-stock]");
	var stockCartAttribute = document.querySelectorAll('[data-nostock-cart-add="theme-nostock-cart-add"]');
	for(var i=0; i < allStocks.length; i++){
		stocks = allStocks[i];
		stock = stocks.getAttribute("data-variant-id-stock");
		stocks.style.display = 'none';
		if(stock == currentStock){
			stocks.style.display = 'inline-block';
			var stockAvail = stocks.getAttribute('data-stock-avail');
			if(stockAvail == 'true'){
				for (sa=0;sa<stockCartAttribute.length;sa++){
					stockCartAttribute[sa].style.display = 'none';
				}
				addClass(stocks,'theme-out-of-stock');
			}
			else{
				for (sa=0;sa<stockCartAttribute.length;sa++){
					stockCartAttribute[sa].style.display = 'flex';
				}
				removeClass(stocks,'theme-out-of-stock');
			}
		}
	}
}

document.addEventListener("zp-event-add-to-cart-success", addToCartSuccess, false);
document.addEventListener("zp-event-add-to-cart-failure", addToCartFailure, false);
document.addEventListener("zp-event-update-to-cart-success", updateToCartSuccess, false);
document.addEventListener("zp-event-update-to-cart-failure", updateToCartFailure, false);
document.addEventListener("zp-event-delete-from-cart-success", deleteFromCartSuccess, false);
document.addEventListener("zp-event-delete-from-cart-failure", deleteFromCartFailure, false);
document.addEventListener("zp-event-add-to-cart-invalid-variant", addToCartWithInvalidVariant, false);
document.addEventListener("zp-event-invalid-product-quantity", invalidProductQuantity, false);
document.addEventListener("zp-event-attribute-selected", selectAttribute, false);
document.addEventListener("zp-event-attribute-group-invalid", invalidAttributeGroup, false);

document.addEventListener("zp-event-add-to-cart-loading", addToCartLoading, false);
document.addEventListener("zp-event-update-to-cart-loading", updateToCartLoading, false);
document.addEventListener("zp-event-delete-from-cart-loading", deleteFromCartLoading, false);

document.addEventListener("zp-event-image-ordered", imageOrder, false);
document.addEventListener("zp-event-selected-variant", selectedVariant, false);

function removeClass(element, className) {
	element.className = element.className.replace(className,'');
}
function addClass(element, className) {
	element.classList.add(className);
}
function detailtab(detailTabParam,detailTabButtonParam){
  if(document.querySelectorAll('[data-detail="theme-product-details"]')[0]){
    document.querySelectorAll('[data-detail="theme-product-details"]')[0].style.display = 'none';
  }
  if(document.querySelectorAll('[data-detail="theme-product-specification"]')[0]){
    document.querySelectorAll('[data-detail="theme-product-specification"]')[0].style.display = 'none';
  }
  var detailTabParam = document.querySelectorAll('[data-detail="'+detailTabParam+'"]')[0];
  detailTabParam.style.display = 'block';
  if(document.querySelectorAll('[data-detail-tab-button="theme-product-detail-tab-button"]')[0]){
    document.querySelectorAll('[data-detail-tab-button="theme-product-detail-tab-button"]')[0].className = document.querySelectorAll('[data-detail-tab-button="theme-product-detail-tab-button"]')[0].className.replace('theme-prod-detail-tab-active','');
  }
  if(document.querySelectorAll('[data-detail-tab-button="theme-product-specification-tab-button"]')[0]){
    document.querySelectorAll('[data-detail-tab-button="theme-product-specification-tab-button"]')[0].className = document.querySelectorAll('[data-detail-tab-button="theme-product-specification-tab-button"]')[0].className.replace('theme-prod-detail-tab-active','');
  }
  var detailTabButtonParam = document.querySelectorAll('[data-detail-tab-button="'+detailTabButtonParam+'"]')[0];
  detailTabButtonParam.className = detailTabButtonParam.className.replace('theme-prod-detail-tab-active','');
  addClass(detailTabButtonParam,'theme-prod-detail-tab-active');
}

function showDetailImage(imageUrl){
  var detailImage = document.querySelectorAll('[data-detail-image="theme-detail-image"]')[0];
  var activeImage = document.querySelectorAll('[data-thumbnail-active="'+imageUrl+'"]')[0];
  var thumbNails = document.querySelectorAll('[data-thumbnail]');
  detailImage.setAttribute('src',imageUrl);
  for (i=0;i<thumbNails.length;i++){
    thumbNails[i].className = thumbNails[i].className.replace('theme-active-thumbnail','');
  }
  addClass(activeImage,'theme-active-thumbnail');
}
function activeThumbnail(){
  var thumbNails = document.querySelectorAll('[data-thumbnail]');
  if(thumbNails[0]){
    addClass(thumbNails[0],'theme-active-thumbnail');
  }
}
document.addEventListener("DOMContentLoaded", function(event) {
	activeThumbnail();
});
function productQuantity(event) {
  var key = event.which || event.keyCode;
  var result;
  if (key == 8 || key == 46 || key == 37 || key == 39 || ( key > 47 && key < 58 )) {
    result = true;
  }
  else {
    result = false;
  }
  return result;
	function decreaseCount(){
	  var quantity_input = document.querySelectorAll('[data-quantity="theme-quantity"]')[0];
	  var quantity = quantity_input.value;
	  if( !isNaN( quantity ) && quantity > 1 ) {
	    quantity_input.value--;
	  }
	  return false;
	}
}
function increaseCount(){
  var quantity_input = document.querySelectorAll('[data-quantity="theme-quantity"]')[0];
  var quantity = quantity_input.value;
  if( !isNaN( quantity )){
    quantity_input.value++;
  }
  return false;
}
function decreaseCount(){
  var quantity_input = document.querySelectorAll('[data-quantity="theme-quantity"]')[0];
  var quantity = quantity_input.value;
  if( !isNaN( quantity ) && quantity > 1 ) {
    quantity_input.value--;
  }
  return false;
}

function viewProductQuickLook (span) {
  var productLookUpUrl = span.getAttribute("data-zs-product-url");
  var xhttp = new XMLHttpRequest();
  xhttp.onreadystatechange = function() {
    if (this.readyState == 4 && this.status == 200) {
      document.getElementById("product_quick_look").innerHTML = this.responseText;
      cart.productQuickLookAddToCart();
      var thumbNails = document.querySelectorAll('[data-thumbnail]');
      if(thumbNails[0]){
        addClass(thumbNails[0],'theme-active-thumbnail');
      }
    }
  };
  xhttp.open("GET", productLookUpUrl, true);
  xhttp.send();
}

function closeProductQuickLook (e) {
  document.getElementById("product_quick_look").innerHTML = "";
}

document.onkeydown = function(e) {
    e = e || window.event;
    if (e.keyCode == 27) {
        closeProductQuickLook();
    }
};

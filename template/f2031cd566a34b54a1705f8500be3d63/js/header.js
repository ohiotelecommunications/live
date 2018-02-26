var t = 0;
var h = 0;
var ct = 0;
var b = 0;
var header, headerContainer, headerSearchCart, topBar, body, headerHeight, LastScrollVal, headerVal, contactInfo, socialIconInnerParent, socialIconParent, headerSearchCartPositionResponsive, headerSearchCartPositionNonResponsive, topbBarInfoPosition, menuParent, portal, brandingInfo, portalResponsive, portalNonResponsive;
var scrollTopVal, headercontainerHeight, bannerLi, bannerBaseHeader, bannerArrowClass,darkHeader;

function removeClass(element, className) {
    element && (element.className = element.className.replace(new RegExp(className, 'g'), ''));
}

function addClass(element, className) {
    element && element.classList.add(className);
}

function VariableInit() {
    headerSearchCartPositionResponsive = document.querySelectorAll('[data-search-cart-position-responsive="zptheme-search-cart-position-responsive"]')[0];
    headerSearchCart = document.querySelectorAll('[data-theme-search-cart-group="zptheme-search-cart-group"]')[0];
    headerSearchCartPositionNonResponsive = document.querySelectorAll('[data-search-cart-position-non-responsive="zptheme-search-cart-position-non-responsive"]')[0];
    topbBarInfoPosition = document.querySelectorAll('[data-topbarinfo-position="zptheme-topbarinfo-position"]')[0];
    contactInfo = document.querySelectorAll('[data-contact-info="zptheme-contact-info"]')[0];
    menuParent = document.querySelectorAll('[data-non-res-menu="zptheme-menu-non-res"]')[0];
    socialIconParent = document.querySelectorAll('[data-socialicon-parent="zptheme-socialicon-parent"]')[0];
    socialIconInnerParent = document.querySelectorAll('[data-socialicon-inner-parent="zptheme-socialicon-inner-parent"]')[0];
    portal = document.querySelectorAll('[data-theme-portal="zptheme-portal"]')[0];
    topBar = document.querySelectorAll('[data-theme-topbar="zptheme-topbar"]')[0];
    brandingInfo = document.querySelectorAll('[data-theme-branding-info="zptheme-branding-info"]')[0];
    header = document.querySelectorAll('[data-header="zptheme-data-header"]')[0] || document.querySelectorAll('[data-header="zptheme-data-header-transparent"]')[0] || document.querySelectorAll('[data-header="none"]')[0];
    headerContainer = document.querySelectorAll('[data-headercontainer="zptheme-data-headercontainer"]')[0];
    portal = document.querySelectorAll('[data-theme-portal="zptheme-portal"]')[0];
    portalResponsive = document.querySelectorAll('[data-theme-portal-responsive="zptheme-portal-responsive"]')[0];
    portalNonResponsive = document.querySelectorAll('[data-theme-portal-non-responsive="zptheme-portal-non-responsive"]')[0];
    verticalMmenu = document.querySelectorAll('[data-theme-vertical-menu="zptheme-vertical-menu"]')[0];

    body = document.getElementsByTagName("body")[0];
    header = document.querySelectorAll('[data-header="zptheme-data-header"]')[0] || document.querySelectorAll('[data-header="zptheme-data-header-transparent"]')[0] || document.querySelectorAll('[data-header="none"]')[0];
    headerVal = header.getAttribute("data-header").trim();
    headerContainer = document.querySelectorAll('[data-headercontainer="zptheme-data-headercontainer"]')[0];
    headerHeight = header.clientHeight;
    headercontainerHeight = headerContainer.clientHeight;
    scrollTopVal = headercontainerHeight - headerHeight;

    // VARIABLE FOR BANNER BASE HEADER TEXT COLOR

    bannerBaseHeader = document.querySelectorAll('[data-banner-base-header="theme-banner-base-header"]');
    bannerLi = document.querySelectorAll('[data-element-type="heroslide"]');

    // VARIABLE FOR BANNER BASE HEADER TEXT COLOR END

}

// 	ONSCROLL HEADER EFFECT
function responsivechanges() {
    if (!body) {
        VariableInit();
    }
    if (window.innerWidth > 992) {
        if (headerSearchCartPositionResponsive) {
            headerSearchCartPositionResponsive.innerHTML = '';
        }
        if (menuParent && menuParent.parentNode == contactInfo) {
            menuParent.removeChild(contactInfo);
        }
        if (contactInfo && contactInfo.parentNode == socialIconInnerParent) {
            contactInfo.removeChild(socialIconInnerParent);
        }
        if (socialIconParent) {
            socialIconParent.appendChild(socialIconInnerParent);
        }
        if (headerSearchCart) {
            headerSearchCartPositionNonResponsive.appendChild(headerSearchCart);
        }
        if (contactInfo || contactInfo && !menuParent) {
            topbBarInfoPosition.appendChild(contactInfo);
        }
        if (topBar && headerContainer.className.indexOf('zpheader-style-05') == -1) {
            addClass(topBar, 'theme-topbar-not-in-header-05');
        }
        if (portal && portalResponsive) {
            portalResponsive.innerHTML = '';
        }
        if (portalNonResponsive) {
            portalNonResponsive.appendChild(portal);
        }
        if (!menuParent && !brandingInfo && headerSearchCart) {
            header.setAttribute('style', 'display:flex');
        }
    } else {
        if ((topBar && headerSearchCart) || (headerSearchCart && verticalMmenu)) {
            headerSearchCartPositionResponsive.appendChild(headerSearchCart);
        }
        if (contactInfo && menuParent) {
            menuParent.appendChild(contactInfo);
        }
        if ((contactInfo && socialIconInnerParent) && menuParent) {
            contactInfo.appendChild(socialIconInnerParent);

        } else if ((!contactInfo && socialIconInnerParent) && menuParent) {
            menuParent.appendChild(socialIconInnerParent);

        }
        if (headerSearchCartPositionNonResponsive && topBar || headerSearchCartPositionNonResponsive && verticalMmenu) {
            headerSearchCartPositionNonResponsive.innerHTML = '';
        }
        if (topBar && (!headerSearchCart && !portal)) {
            topBar.setAttribute('style', 'display:none');
        }
        if (!menuParent && !brandingInfo && headerSearchCart) {
            header.setAttribute('style', 'display:none');
        }
        if (portal && portalResponsive) {
            portalResponsive.appendChild(portal);
        }
    }
}

document.addEventListener("DOMContentLoaded", function(event) {
    responsivechanges();
    bannerBaseHeaderLength = bannerBaseHeader.length;
    bannerLiLength = bannerLi.length;
    var hasHeaderSix = headerContainer.classList.contains('zpheader-style-06');
    var hasHeaderTwo = headerContainer.classList.contains('zpheader-style-02');
    if (headerContainer.className.indexOf('theme-header-fixed') > 0 && hasHeaderSix == false && window.innerWidth > 992) {
        for (bl = 0; bl < bannerLiLength; bl++) {
            if (bannerLi[bl].className.indexOf('zpdark-section') > -1 && bannerLi[bl].className.indexOf('curslide') > -1) {
                for (bh = 0; bh < bannerBaseHeaderLength; bh++) {
                    addClass(bannerBaseHeader[bh], 'zpdark-header-portion');
                }
                if (topBar) {
                    addClass(topBar, 'zpdark-header-portion');
                }
            } else if ((bannerLi[bl].className.indexOf('zpdefault-section') > -1 && bannerLi[bl].className.indexOf('curslide') > -1) || (bannerLi[bl].className.indexOf('zplight-section') > -1 && bannerLi[bl].className.indexOf('curslide') > -1)) {
                for (bh = 0; bh < bannerBaseHeaderLength; bh++) {
                    removeClass(bannerBaseHeader[bh], 'zpdark-header-portion');
                }
                if (topBar && topBar.className.indexOf('zpdark-header-portion') > -1) {
                    removeClass(topBar, 'zpdark-header-portion');
                }
            }
        }
    }

    // BANNER BASED HEADER TEXT COLOR STARTS

    var hero = document.querySelector('.zphero')
    if (hero) {
        hero.addEventListener('sliderActive:changed', function(e) {
            var data = e.detail;
            var slide = data.slide;
            var bannerLi = hero.querySelectorAll('[data-element-type="heroslide"]');
            var bannerBaseHeader = document.querySelectorAll('[data-banner-base-header="theme-banner-base-header"]');
            bannerBaseHeaderLength = bannerBaseHeader.length;
            bannerLiLength = bannerLi.length;
            var hasHeaderSix = headerContainer.classList.contains('zpheader-style-06');
            headercontainerHeight = headerContainer.clientHeight;
            offsetVal = window.pageYOffset;
            if (headerContainer.className.indexOf('theme-header-fixed') > 0 && hasHeaderSix == false && offsetVal <= headercontainerHeight && window.innerWidth > 992) {
                for (bhl = 0; bhl < bannerBaseHeaderLength; bhl++) {
                    if (bannerBaseHeader[bhl].className.indexOf('zpdark-header-portion') > -1) {
                        removeClass(bannerBaseHeader[bhl], 'zpdark-header-portion');
                    }
                }
                if (topBar && topBar.className.indexOf('zpdark-header-portion') > -1) {
                    removeClass(topBar, 'zpdark-header-portion');
                }
                if (slide.className.indexOf('zpdark-section') > -1) {
                    for (bhl = 0; bhl < bannerBaseHeaderLength; bhl++) {
                        addClass(bannerBaseHeader[bhl], 'zpdark-header-portion');
                    }
                    if (topBar) {
                        addClass(topBar, 'zpdark-header-portion');
                    }
                }
            }
        });
    }

    // BANNER BASED HEADER TEXT COLOR END

});

window.onresize = function() {
    responsivechanges();

    bannerLiScroll = document.querySelectorAll('[data-element-type="heroslide"]');
    bannerLiScrollLength = bannerLiScroll.length;
    bannerBaseHeaderScrl = document.querySelectorAll('[data-banner-base-header="theme-banner-base-header"]');
    bannerBaseHeaderScrlLength = bannerBaseHeaderScrl.length;
    headerContainer = document.querySelectorAll('[data-headercontainer="zptheme-data-headercontainer"]')[0];
    if (topBar) {
      var darkTopbar = topBar.getAttribute('data-dark-part-applied').trim();
    }
    for (bhscrl = 0; bhscrl < bannerBaseHeaderScrlLength; bhscrl++) {
			var darkHeader = bannerBaseHeaderScrl[bhscrl].getAttribute('data-dark-part-applied').trim();
    }
    headerContainerChildren = headerContainer.children;
    if(window.innerWidth < 992){
    	headerContainer.style.top = '0px';
      if(headerContainerChildren[1]){
        headerContainerChildren[1].style.opacity = '1';
      }
      if(headerContainerChildren[0]){
        headerContainerChildren[0].style.opacity = '1';
      }
    }
    for (bnrScrl = 0; bnrScrl < bannerLiScrollLength; bnrScrl++) {
        var bannerDark = bannerLiScroll[bnrScrl].classList.contains('zpdark-section');
        var hasHeaderSix = headerContainer.classList.contains('zpheader-style-06');
        if (headerContainer.className.indexOf('theme-header-fixed') > 0 && bannerLiScroll[bnrScrl].className.indexOf('zpdark-section') > -1 && bannerLiScroll[bnrScrl].className.indexOf('curslide') > -1 && hasHeaderSix == false && window.innerWidth > 768 && window.innerWidth < 1028) {
            for (bhscrl = 0; bhscrl < bannerBaseHeaderScrlLength; bhscrl++) {
                addClass(bannerBaseHeaderScrl[bhscrl], 'zpdark-header-portion');
            }
            if (topBar) {
                addClass(topBar, 'zpdark-header-portion');
            }
        }
        if (headerContainer.className.indexOf('theme-header-fixed') > 0 && hasHeaderSix == false && bannerDark == false && bannerLiScroll[bnrScrl].className.indexOf('curslide') > -1 && window.innerWidth > 768 && window.innerWidth < 1028) {
            for (bhscrl = 0; bhscrl < bannerBaseHeaderScrlLength; bhscrl++) {
                removeClass(bannerBaseHeaderScrl[bhscrl], 'zpdark-header-portion');
            }
            if (topBar && topBar.className.indexOf('zpdark-header-portion') > -1) {
                removeClass(topBar, 'zpdark-header-portion');
            }
        }
        if (headerContainer.className.indexOf('theme-header-fixed') > 0 && window.innerWidth < 992) {
            for (bhscrl = 0; bhscrl < bannerBaseHeaderScrlLength; bhscrl++) {
                var darkHeader = bannerBaseHeaderScrl[bhscrl].getAttribute('data-dark-part-applied').trim();
                if (darkHeader == 'true') {
                    addClass(bannerBaseHeaderScrl[bhscrl], 'zpdark-header-portion');
                }
                if (darkHeader == 'false' && bannerBaseHeaderScrl[bhscrl].className.indexOf('zpdark-header-portion') > -1) {
                    removeClass(bannerBaseHeaderScrl[bhscrl], 'zpdark-header-portion');
                }
            }
            if (topBar && darkTopbar == 'true') {
                addClass(topBar, 'zpdark-header-portion');
            }
            if (topBar && darkTopbar == 'false' && topBar.className.indexOf('zpdark-header-portion') > -1) {
                removeClass(topBar, 'zpdark-header-portion');
            }
        }
    }

}

window.onscroll = function() {
    if (!body) {
        VariableInit();
    }
    headerHeight = header.clientHeight;
    headercontainerHeight = headerContainer.clientHeight;
    offsetVal = window.pageYOffset;

    bannerLiScroll = document.querySelectorAll('[data-element-type="heroslide"]');
    bannerLiScrollLength = bannerLiScroll.length;
    bannerBaseHeaderScrl = document.querySelectorAll('[data-banner-base-header="theme-banner-base-header"]');
    bannerBaseHeaderScrlLength = bannerBaseHeaderScrl.length;
    for (bhscrl = 0; bhscrl < bannerBaseHeaderScrlLength; bhscrl++) {
        var darkHeader = bannerBaseHeaderScrl[bhscrl].getAttribute('data-dark-part-applied').trim();
    }

    var hasHeaderSix = headerContainer.classList.contains('zpheader-style-06');

    // HEADER STATIC TO FIXED ANIMATION STARTS

    headerContainerChildren = headerContainer.children;
    headerContainerChildrenLength = headerContainerChildren.length;

    if (offsetVal > headercontainerHeight) {
        if (headerContainer.className.indexOf('theme-header-fixed') == -1) {
            if (headerVal == 'zptheme-data-header') {
                if (header.className.indexOf('theme-header-animate') == -1) {
                    header.className += ' theme-header-animate';
                }
            }
            if (headerVal == 'zptheme-data-header-transparent') {
                if (header.className.indexOf('theme-header-animate') == -1) {
                    header.className += ' theme-header-animate';
                }
                if (header.className.indexOf('theme-header-transparent') == -1) {
                    header.className += ' theme-header-transparent';
                }
            }
            header.setAttribute('style', 'animation:headerStart 0.8s linear 1 alternate');
            if (headerVal == 'zptheme-data-header' && window.innerWidth > 992 || headerVal == 'zptheme-data-header-transparent' && window.innerWidth > 992) {
                // body.setAttribute('style','padding-top:'+headerHeight+'px');
                body.style.paddingTop = headerHeight + 'px';
            }
        }
        if(headerContainerChildrenLength == 2 && window.innerWidth > 992){
					headerContainerChildren[0].setAttribute('style','opacity:0;');
				}
      	if(topBar && headerContainerChildrenLength == 3 && window.innerWidth > 992){
          headerContainerChildren[0].setAttribute('style','opacity:0;');
          headerContainerChildren[1].setAttribute('style','opacity:0;');
      	}
    }
    else{
      if (headerVal == 'zptheme-data-header') {
          header.className = header.className.replace('theme-header-animate', '');
      }
      if (headerVal == 'zptheme-data-header-transparent') {
          header.className = header.className.replace('theme-header-animate', '');
          header.className = header.className.replace('theme-header-transparent', '');
      }
      header.setAttribute('style', 'animation:noTopBarAni 0.8s linear 1 alternate;');
      // body.setAttribute('style','padding-top:0px');
      body.style.paddingTop = '0px';
      if(headerContainerChildrenLength == 2 && window.innerWidth > 992){
				headerContainerChildren[0].setAttribute('style','opacity:1;');
			}
			if(topBar && headerContainerChildrenLength == 3 && window.innerWidth > 992){
				headerContainerChildren[0].setAttribute('style','opacity:1;');
				headerContainerChildren[1].setAttribute('style','opacity:1;');
			}
    }

    // HEADER STATIC TO FIXED ANIMATION END

    // FULL WIDTH BANNER HEADER FIXED START

    if (headerContainer.className.indexOf('theme-header-fixed') > 0) {
        scrollTopVal = headercontainerHeight-headerHeight;
        if (window.innerWidth > 992) {
            headerContainer.setAttribute('style', 'top:' + (-offsetVal) + 'px;transition:none;');
        }
        if (offsetVal >= headercontainerHeight) {

            headerContainer.className = headerContainer.className.replace('theme-header-animate', '');
            if (headerVal == 'zptheme-data-header') {
                headerContainer.className += ' theme-header-animate';
                for (bnrScrl = 0; bnrScrl < bannerLiScrollLength; bnrScrl++) {
                    if (window.innerWidth > 992 && darkHeader == 'true') {
                        for (bhscrl = 0; bhscrl < bannerBaseHeaderScrlLength; bhscrl++) {
                            addClass(bannerBaseHeaderScrl[bhscrl], 'zpdark-header-portion');
                        }
                        if (topBar && topBar.className.indexOf('zpdark-header-portion') > -1) {
                            topBar.className = topBar.className.replace('zpdark-header-portion', '');
                        }
                    }
                    if (window.innerWidth > 992 && darkHeader == 'false' && hasHeaderSix == false) {
                        for (bhscrl = 0; bhscrl < bannerBaseHeaderScrlLength; bhscrl++) {
                            removeClass(bannerBaseHeaderScrl[bhscrl], 'zpdark-header-portion');
                        }
                    }
                }
                if (window.innerWidth > 992) {
                    headerContainer.setAttribute('style', 'top:' + (-scrollTopVal) + 'px;transition:0.3s linear;');
                }
            }
            header.className = header.className.replace('theme-header-transparent', '');
            if (headerVal == 'zptheme-data-header-transparent') {

                headerContainer.className += ' theme-header-animate';
                header.className += ' theme-header-transparent';

                for (bnrScrl = 0; bnrScrl < bannerLiScrollLength; bnrScrl++) {
                    if (window.innerWidth > 992 && darkHeader == 'true') {
                        for (bhscrl = 0; bhscrl < bannerBaseHeaderScrlLength; bhscrl++) {
                            addClass(bannerBaseHeaderScrl[bhscrl], 'zpdark-header-portion');
                        }
                        if (topBar && topBar.className.indexOf('zpdark-header-portion') > -1) {
                            topBar.className = topBar.className.replace('zpdark-header-portion', '');
                        }
                    }
                    if (window.innerWidth > 992 && darkHeader == 'false' && hasHeaderSix == false) {
                        for (bhscrl = 0; bhscrl < bannerBaseHeaderScrlLength; bhscrl++) {
                            removeClass(bannerBaseHeaderScrl[bhscrl], 'zpdark-header-portion');
                        }
                    }
                }
                if (window.innerWidth > 992) {
                    headerContainer.setAttribute('style', 'top:' + (-scrollTopVal) + 'px;transition:0.3s linear;');
                }
            }
            if (headerVal == '') {
                if (window.innerWidth > 992) {
                    headerContainer.setAttribute('style', 'top:' + (-offsetVal) + 'px;');
                }
            }
        }
        if (offsetVal < LastScrollVal) {

            if (offsetVal < headercontainerHeight) {
                if (headerVal == '') {
                    if (window.innerWidth > 992) {
                        headerContainer.setAttribute('style', 'top:' + (-offsetVal) + 'px;transition:0s linear;');
                    }
                } else {
                    if (window.innerWidth > 992) {
                        headerContainer.setAttribute('style', 'top:' + (-offsetVal) + 'px;transition:0.3s linear;');
                    }
                }
                headerContainer.className = headerContainer.className.replace('theme-header-animate', '');
                headerContainer.className = headerContainer.className.replace('theme-header-transparent', '');
                for (bnrScrl = 0; bnrScrl < bannerLiScrollLength; bnrScrl++) {
                    var bannerDark = bannerLiScroll[bnrScrl].classList.contains('zpdark-section');
                    if (bannerLiScroll[bnrScrl].className.indexOf('zpdark-section') > -1 && bannerLiScroll[bnrScrl].className.indexOf('curslide') > -1 && window.innerWidth > 992) {
                        for (bhscrl = 0; bhscrl < bannerBaseHeaderScrlLength; bhscrl++) {
                            addClass(bannerBaseHeaderScrl[bhscrl], 'zpdark-header-portion');
                        }
                        if (topBar) {
                            addClass(topBar, 'zpdark-header-portion');
                        }
                    } else if (bannerDark == false && bannerLiScroll[bnrScrl].className.indexOf('curslide') > -1 && window.innerWidth > 992) {
                        for (bhscrl = 0; bhscrl < bannerBaseHeaderScrlLength; bhscrl++) {
                            removeClass(bannerBaseHeaderScrl[bhscrl], 'zpdark-header-portion');
                        }
                        if (topBar && topBar.className.indexOf('zpdark-header-portion') > -1) {
                            removeClass(topBar, 'zpdark-header-portion');
                        }

                    }

                }
            }
        }
    }

    // FULL WIDTH BANNER HEADER FIXED END

    LastScrollVal = offsetVal;
}

// 	ONSCROLL HEADER EFFECT END

var s = 0;

function toggleSearch() {
    var searchcont = document.querySelectorAll('[data-search="zptheme-search-container"]')[0];
    if (s == 0) {
        s = 1;
        searchcont.style.display = 'block';
    } else if (s == 1) {
        s = 0;
        searchcont.style.display = 'none';
    }
}

/*$Id$*/

var product_option = (function () {
    var DEFAULT_VARIANT_ID = "-1"; // No I18N
    var INVALID_VARIANT_ID = "-2"; // No I18N
    var backOrderAvailable = false;

    function hideElement (element) {
        element.style.display = "none"; // No I18N
    }

    function hideElements (elements) {
        Array.prototype.slice.call(elements).forEach(hideElement);
    }

    function showElement (element) {
        element.style.display = "block"; // No I18N
    }

    function showElements (elements) {
        Array.prototype.slice.call(elements).forEach(showElement);
    }

    function compareArray (a, b) {
        if (a === b) {
            return true;
        }
        if (a == null || b == null) {
            return false;
        }
        if (a.length != b.length) {
            return false;
        }
        for (var i = 0; i < a.length; i++) {
            if (a[i] != b[i]) {
                return false;
            }
        }
        return true;
    }

    function checkInArray (array, value) {
        for (var i=0; i<array.length; i++) {
            if (array[i] == value) {
                return true;
            }
        }
        return false;
    }

    function checkArrayInArray (bigArray, subSetArray) {
        var check = true;
        for (var i=0; i<subSetArray.length; i++) {
            check &= checkInArray(bigArray, subSetArray[i]);
        }
        return check;
    }

    function showPricingsForVariantId (variantId) {
        if (variantId == INVALID_VARIANT_ID && !backOrderAvailable) {
            variantId = DEFAULT_VARIANT_ID;
        }
        var pricings = document.querySelectorAll("[data-zs-pricings]"); // No I18N
        for (var i = 0; i < pricings.length; i++) {
            var pricing = pricings[i];
            var attributeVariantId = pricing.getAttribute("data-zs-variant-id") // No I18N
            pricing.style.display = "none"; // No I18N
            if (variantId == attributeVariantId) {
                pricing.style.display = "block"; // No I18N
            }
        }
    }

	function showSKUForVariantId (variantId) {
		if (variantId == INVALID_VARIANT_ID) {
			variantId = DEFAULT_VARIANT_ID;
		}
        var skus = document.querySelectorAll("[data-zs-skus]"); // No I18N
        for (var i = 0; i < skus.length; i++) {
            var sku = skus[i];
			var attributeVariantId = sku.getAttribute("data-zs-variant-id"); // No I18N
			sku.style.display = "none"; // No I18N
			if (variantId == attributeVariantId) {
                sku.style.display = "block"; // No I18N
            }
		}
	}

    function getAllVariants () {
        var variant = document.querySelectorAll("[data-zs-variants]")[0]; // No I18N
        var options = variant.options;
        var variants = {};
        for (var i = 0; i < options.length; i++) {
            var option = options[i];
            variants[option.value] = JSON.parse(option.getAttribute("data-zs-attributes")); // No I18N
        }
        return variants;
    }

    function getVariantIdFromAttributeIds (productId, attributeIds) {
        attributeIds.sort();
        var variant = document.querySelectorAll("[data-zs-variants][data-zs-product-id='" + productId + "']")[0]; // No I18N
        var options = variant.options;
        var numberOfAttributes = 0;
        for (var i = 0; i < options.length; i++) {
            var option = options[i]
            var value = JSON.parse(option.getAttribute("data-zs-attributes")); // No I18N
            value.sort();
            numberOfAttributes = value.length;
            if (compareArray(attributeIds, value)) {
                return option.value;
            }
        }
        if (numberOfAttributes != attributeIds.length) {
            return DEFAULT_VARIANT_ID;
        } else {
            return INVALID_VARIANT_ID;
        }
    }

    function getSelectedOptions (productId) {
        var selectedOptions = [];
        var attributeSelects = document.querySelectorAll("[data-zs-attribute-select][data-zs-product-id='" + productId + "']"); // No I18N
        for (var i = 0; i < attributeSelects.length; i++) {
            var attributeSelect = attributeSelects[i];
            var selectedOption = getSelectedOption(attributeSelect);
            if (selectedOption && selectedOption.value != DEFAULT_VARIANT_ID) {
                selectedOptions.push(selectedOption.value);
            }
        }
        return selectedOptions;
    }

    function getSelectedOptionsAsMap () {
        var selectedOptions = {};
        var attributeSelects = document.querySelectorAll("[data-zs-attribute-select]"); // No I18N
        for (var i = 0; i < attributeSelects.length; i++) {
            var attributeSelect = attributeSelects[i];
            var selectedOption = getSelectedOption(attributeSelect);
            if (selectedOption && selectedOption.value != DEFAULT_VARIANT_ID) {
                if (selectedOption.text) {
                    selectedOptions[attributeSelect.getAttribute("data-zs-attribute-name")] = selectedOption.text; // No I18N
                } else {
                    selectedOptions[attributeSelect.getAttribute("data-zs-attribute-name")] = selectedOption.getAttribute("data-text"); // No I18N
                }
            }
        }
        return selectedOptions;
    }

    function getSelectedOption (element) {
        if (element.options) {
            return element.options[element.selectedIndex];
        } else {
            var inputs = element.querySelectorAll("input"); // No I18N
            for (var i = 0; i < inputs.length; i++) {
                if (inputs[i].checked) {
                    return inputs[i];
                }
            }
        }
    }

    function changeAttributeWithSelect (select) {
        var selectedOption = getSelectedOption(select);
        if (!selectedOption) {
          return;
        }
        var productId = selectedOption.getAttribute("data-zs-product-id"); // No I18N
        var isBlurredOption = selectedOption.classList.contains("blur-option"); // No I18N
        var optionIds = getSelectedOptions(productId);
        showOnlyValidAttributes(productId, optionIds);
        reOrderImageByAttributes(optionIds);
        var variantId = getVariantBasedOnChangedAttribute(productId, optionIds);

        var attributeSelectEvent = new CustomEvent("zp-event-attribute-selected", { // No I18N
            detail: {
                currentOption: selectedOption,
                selectedOptions: optionIds,
                variantId: variantId,
                variants: getAllVariants(),
                target: select,
                view: window.zs_view || "store_page" // No I18N
            }
        });
        document.dispatchEvent(attributeSelectEvent);

        if (variantId == INVALID_VARIANT_ID && isBlurredOption && !backOrderAvailable) {
            // optionIds = [selectedOption.value];
            // var removedOptions = removeOtherSelectedOptions(optionIds);
            selectedOption.selected = false;
            selectedOption.checked = false;
            var removedOptions = getSelectedOptionsAsMap();
            showOnlyValidAttributes(productId, optionIds);
            variantId = getVariantBasedOnChangedAttribute(productId, optionIds);
            var attributeName = select.getAttribute("data-zs-attribute-name"); // No I18N
            // alertAboutInvalidVariant(attributeName, selectedOption.value, selectedOption.text, removedOptions);
            var attributeGroupInvalidEvent = new CustomEvent("zp-event-attribute-group-invalid", { // No I18N
                detail: {
                    attributeName: attributeName,
                    selectedOption: selectedOption,
                    optionId: selectedOption.value,
                    optionName: selectedOption.text,
                    removedOptions: removedOptions,
                    variants: getAllVariants(),
                    target: select,
                    view: window.zs_view || "store_page" // No I18N
                }
            });
            document.dispatchEvent(attributeGroupInvalidEvent);
        } else {
            hideElements(document.querySelectorAll("[data-zs-error-attribute]")); // No I18N
        }
        setVariantIdToAddToCart(productId, variantId);
    }

    function changeAttribute () {
        changeAttributeWithSelect(this);
    }

    function setVariantIdToAddToCart (productId, variantId) {
        if (variantId == DEFAULT_VARIANT_ID || variantId == INVALID_VARIANT_ID) {
            variantId = "";
        }
        var addToCartHolders = document.querySelectorAll(" [data-zs-product-variant-id][data-zs-product-id='" + productId + "']"); // No I18N
        for (var i = 0; i < addToCartHolders.length; i++) {
            var holder = addToCartHolders[i];
            holder.setAttribute("data-zs-product-variant-id", variantId); // No I18N
        }
    }

    function alertAboutInvalidVariant (attributeName, optionId, optionName, removedOptions) {
        var combination = "";
        for (var removedOption in removedOptions) {
            combination += removedOptions[removedOption] + " " + removedOption + " "; // No I18N
        }
        var result = optionName + "  " + attributeName + " is not available for the " + combination; // No I18N
        var errorAttributes = document.querySelectorAll("[data-zs-error-attribute]"); // No I18N
        for (var i = 0; i < errorAttributes.length; i++) {
            var element = errorAttributes[i];
            element.innerHTML = result;
        }
        showElements(errorAttributes);
    }

    function showOnlyValidAttributes (productId, optionIds) {
        var attributeOptions = getAttributeOptionBasedOnExisting(productId, optionIds);
        var elements = document.querySelectorAll("[data-zs-attribute-option][data-zs-product-id='" + productId + "']") // No I18N
        for (var i = 0; i < elements.length; i++) {
            var element = elements[i];
            if (checkInArray(attributeOptions, element.value)) {
                // element.disabled = false;
                element.classList.remove("blur-option"); // No I18N
            } else {
                // element.disabled = true;
                element.classList.add("blur-option"); // No I18N
            }
        }
    }

    function reOrderImageByAttributes (optionIds) {
        var variants = document.querySelector("[data-zs-variants]"); // No I18N
        var options = variants.options;
        var imageIds = [];
        for (var i=0; i<options.length; i++) {
            var option = options[i];
            var attributes = JSON.parse(option.getAttribute("data-zs-attributes")); // No I18N
            if (checkArrayInArray(attributes, optionIds)) {
                var jsonImagesAttribute = option.getAttribute("data-zs-images"); // No I18N
                if (jsonImagesAttribute) {
                    var variantImageIds = JSON.parse(jsonImagesAttribute);
                    imageIds = imageIds.concat(variantImageIds);
                }
            }
        }
        imageIds = Array.from(new Set(imageIds));
        var imageReorderEvent = new CustomEvent("zp-event-image-ordered", { // No I18N
            detail: {
                image_ids: imageIds,
                view: window.zs_view || "store_page" // No I18N
            }
        });
        document.dispatchEvent(imageReorderEvent);
    }

    function getAttributeOptionBasedOnExisting (productId, optionIds) {
        var attributeOptions = new Set();
        var variants = document.querySelectorAll("[data-zs-variants][data-zs-product-id='" + productId +"']")[0]; // No I18N
        var options = variants.options;
        for (var i=0; i<options.length; i++) {
            var option = options[i];
            var value = JSON.parse(option.getAttribute("data-zs-attributes")); // No I18N
            if (checkArrayInArray(value, optionIds)) {
                for (var j=0; j<value.length; j++) {
                    attributeOptions.add(value[j].toString());
                }
            }
        }
        attributeOptions = Array.from(attributeOptions);
        return attributeOptions;
    }

    function removeOtherSelectedOptions (optionIds) {
        var removedOptions = {};
        var attributeSelects = document.querySelectorAll("[data-zs-attribute-select]"); // No I18N
        for (var i = 0; i < attributeSelects.length; i++) {
            var attributeSelect = attributeSelects[i];
            var selectedOption = getSelectedOption(attributeSelect);
            if (selectedOption && !checkInArray(optionIds, selectedOption.value)) {
                selectedOption.selected = false;
                selectedOption.checked = false;
                if (selectedOption.text) {
                    selectedOptions[attributeSelect.getAttribute("data-zs-attribute-name")] = selectedOption.text; // No I18N
                } else {
                    selectedOptions[attributeSelect.getAttribute("data-zs-attribute-name")] = selectedOption.getAttribute("data-text"); // No I18N
                }
            }
        }
        return removedOptions;
    }

    function getVariantBasedOnChangedAttribute (productId, selectedOptions) {
        var variantId = getVariantIdFromAttributeIds(productId, selectedOptions);
        showPricingsForVariantId(variantId);
        showSKUForVariantId(variantId);
        var selectedVariantEvent = new CustomEvent("zp-event-selected-variant", { // No I18N
            detail: {
                variant_id: variantId,
                view: window.zs_view || "store_page" // No I18N
            }
        });
        document.dispatchEvent(selectedVariantEvent);
        return variantId;
    }

    function initOnLoad () {
        initForElement(document);
    }

    function initForElement (element) {
        var attributeSelects = element.querySelectorAll("[data-zs-attribute-select]"); // No I18N
        for (var i = 0; i < attributeSelects.length; i++) {
            var attributeSelect = attributeSelects[i];
            attributeSelect.addEventListener("change", changeAttribute, false); // No I18N
            changeAttributeWithSelect(attributeSelect);
        }
        var elements = element.querySelectorAll("[data-zs-entity-commentbox-id]"); // No I18N
        if (elements && elements.length > 0) {
            var div = document.createElement("div"); // No I18N
            div.setAttribute("data-zs-app", "server_entities"); // No I18N
            div.style.display = "none"; // No I18N
            element.appendChild(div);
            zsApp.init(false, div);
        }
    }

    function resetAddToCart (productId) {
        setVariantIdToAddToCart(productId, DEFAULT_VARIANT_ID);
        showPricingsForVariantId(DEFAULT_VARIANT_ID);
    }

    return {
        init : initOnLoad,
        initForElement : initForElement,
        resetAddToCart: resetAddToCart
    };
})();

//$E.callOnLoad(product_option.init)
zsUtils.onDocumentReady(product_option.init);
//document.addEventListener('DOMContentLoaded', product_option.init, false); // No I18N

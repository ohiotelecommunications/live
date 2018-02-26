/*$Id$*/
/**
 * NOTE:
 * assets path will be resolved from the following base path
 * for builder: zs-site/assets/v1/js/apps/
 * for site   : ??
 */

/*$Id$*/
'use strict';
(function(global) {
    var cms_ref

    //decides wether it is loaded in builder or published site
    global.cms_i18n = cms_ref = (window.zs_rendering_mode && window.zs_rendering_mode !== 'live' && typeof parent.define === 'function' && parent.define.amd ) ? parent.cms_i18n : cms_i18n;//NO I18N

    //returns an empty key for  the cms i18n if it is loaded inthe published site
    function cms_i18n(key) {
        return ''
    }
})(this)


var zsUtils = (function zsUtils() {

    var contentWindowInitted = false

    function callOnDocumentReady(callback) {
        
        if(window.zs_rendering_mode==='canvas' && !contentWindowInitted){//NO I18N
            $E.bind(document, 'contentWindow:initted', onInit)
        } else {
            $E.callOnLoad(callback)
        }

        function onInit() {
            contentWindowInitted = true
            $E.unbind(document, 'contentWindow:initted', onInit)
            callback()
        }
    }

    callOnDocumentReady(function () {
        return true
    });

    function isIE() {
        return /MSIE|Trident/.test(navigator.userAgent);
    }

    /**
     * Ensures all the images inside the dom element are loaded before the callback is invoked
     * @param  {[type]}   context  Element to look for iamges
     * @param  {Function} callback Function to invoked after the images are loaded.
     * @return {[type]}            [description]
     */
    function callOnImagesLoad(context, callback) {

        if( !(context && callback) ){
            throw new TypeError('Element and callback both are necessary')//NO I18N
        }

        var remainingImages = 0, iterationCompleted, timeOutValue, finished;

        if(context && context.tagName == 'IMG'){
            loadIfNotLoaded(context)
        }

        var images = context.getElementsByTagName('IMG')

        for(var i =0 ; i < images.length; i++){
            loadIfNotLoaded(images[i])
        }

        iterationCompleted = true;

        afterLoad();

        function loadIfNotLoaded(img) {
            remainingImages++;
            if(img.complete){
                imageLoaded()
            } else {
                $E.bind(img, 'load', imageLoaded)//NO I18N
                $E.bind(img, 'error', imageLoaded)//NO I18N
                if(isIE()){
                    img.src = img.src
                }
            }
        }

        function imageLoaded() {

            remainingImages--;
            $E.unbind(this, 'load', imageLoaded)//NO I18N
            $E.unbind(this, 'error', imageLoaded)//NO I18N
            afterLoad()
        }

        function afterLoad() {
            if(finished){
                return;
            }
            
            if(iterationCompleted && remainingImages === 0){
                finished = true;
                callback();
            }
        }
    }

    return {
        onDocumentReady : callOnDocumentReady,
        onImageLoad : callOnImagesLoad
    }
})()

 

var app_manifest = {
    "commentbox": { //NO I18N
        label  : "Comment Box", //NO I18N
        version: "1.0.0",
        module : "CommentBox", //NO I18N
        options: {
            multiple_instance: false,
            allowed_placeHolders: ['page'], // default all //NO I18N             
            multiple_sub_type: {"allowed":false}    //NO I18N
        },
        assets : {
            js  : {
                builder: "commentbox/commentbox_builder.js", //NO I18N
                site: "commentbox/commentbox_site.js" //NO I18N
            }
        },
        model : {
            "elementId" : {//NO I18N
                "type" : "data-element-id" //NO I18N
            },
            "element" : {//No I18N
                "showratingtoggle" : {//NO I18N
                    "def_val" : true,//NO I18N
                    "data_type" : "boolean",//NO I18N
                    "prop" : {//NO I18N
                        "label" : "Rating Visible",//NO I18N
                        "option_type" : "toggle"//NO I18N
                    }
                },
                "ratingtype" : {//NO I18N
                    "attr" : "data-ratingtype", //No I18N
                    "def_val" : "star", //NO I18N
                    "prop" : {//NO I18N
                        "values" : [{//NO I18N
                            "value" : "star", //NO I18N
                            "label" : "Stars" //NO I18N
                        },{
                            "value" : "thumb", //NO I18N
                            "label" : "Thumb" //NO I18N
                        }],
                        "label" : "Rating Type",//NO I18N
                        "option_type" : "radiotxt" //NO I18N
                    },
                    "message" : "Existing Comments ratings will be deleted if the rating type is changed!"//NO I18N
                },
                "commentingtoggle" : {//NO I18N
                    "def_val" : false,//NO I18N
                    "data_type" : "boolean",//NO I18N
                    "prop" : {//NO I18N
                        "label" : "Turn off commenting",//NO I18N
                        "option_type" : "toggle"//NO I18N
                    }
                }
            }
        },
        settings : {
            "actions" : {//NO I18N
                "cbAppState" : {//NO I18N
                    "values" : [{//NO I18N
                        "id" : "cbState",//NO I18N
                        "methods" : {//NO I18N
                            "cbSettings" : {//NO I18N
                                "label" : "Save",//NO I18N
                                "method": "saveCBAppSettings",//NO I18N
                                "type": "primary"//NO I18N
                            }
                        }
                    }]
                }
            }
        }
    },
    "creator_form" : { //NO I18N
        label   : "Form", //NO I18N
        version : "1.0.0",
        module  : "CreatorForms", //NO I18N
        options: {
            multiple_sub_type: {
                allowed : false,
                message : cms_i18n("ui.forms.add.formexists") //NO I18N
            }
        },
        assets  : {
            js  : {
                builder: "forms/form_drop.js", //NO I18N
                site: "forms/form_render.js" //NO I18N
            }
        },
        settings : {
            "actions" : { //NO I18N
                "formSettings" : { //NO I18N
                    "values" : [{ //NO I18N
                        "id" : "formDataSettings", //NO I18N
                        "methods" : { //NO I18N
                            "form" : { //NO I18N
                                "label" : cms_i18n("ui.settings.forms"), //NO I18N
                                "method" : "openFormSettings", //NO I18N
                                "type" : "primary" //NO I18N
                            }
                        }
                    }],
                    "message" : cms_i18n("ui.forms.message") //NO I18N
                }
            }
        },
        model : {
            "elementId" : {//NO I18N
                "type" : "data-element-id" //NO I18N
            },
            "element" : {}//No I18N
        }
    },

    "crm_form" : { //NO I18N
        label   : "CRM Form", //NO I18N
        version : "1.0.0",
        module  : "CrmForms", //NO I18N
        assets  : {
            js  : {
                builder: "crmforms/crmFormCreation.js", //NO I18N
                site: "crmforms/crmform_render.js" //NO I18N
            }
        },
        settings : {
            "actions" : { //NO I18N
                "crmReload" : { //NO I18N
                    "values" : [{ //NO I18N
                        "id" : "formReload", //NO I18N
                        "methods" : { //NO I18N
                            "reloadFn" : { //NO I18N
                                "label" : cms_i18n("ui.elementsettings.crm.reloadform.label"), //NO I18N
                                "method" : "reloadForm", //NO I18N
                                "type" : "primary" //NO I18N
                            }
                        }
                    }],
                    "message" : cms_i18n("ui.crm.reload.message") //NO I18N
                },
                "crmThankYouPage" : { //NO I18N
                    "values" : [{ //NO I18N
                        "id" : "thankYouPage", //NO I18N
                        "methods" : { //NO I18N
                            "setThankYouFn" : { //NO I18N
                                "label" : cms_i18n("ui.elementsettings.crm.setthankyou.label"), //NO I18N
                                "method" : "openSetThankYouDialog", //NO I18N
                                "type" : "primary" //NO I18N
                            }
                        }
                    }],
                    "message" : cms_i18n("ui.crm.setthankyou.message") //NO I18N
                }
            }
        },
        model : {
            "elementId" : {//NO I18N
                "type" : "data-element-id" //NO I18N
            },
            "element" : {}//No I18N
        }
    },

    "disqus": { //NO I18N
        label   : "Disqus", //NO I18N
        version : "1.0.0",
        module  : "Disqus", //NO I18N
        options: {
            multiple_instance: false,
            allowed_placeholders: ['page'] //NO I18N // default all
        },
        assets  : {
            js  : {
                builder: "disqus/disqusAppB.js", //NO I18N
                site: "disqus/disqusApp.js" //NO I18N
            },
            // NOTE:
            // not yet implemented
            // let me know if needed
            css : {
                builder: "",
                site   : ""
            }
        }
    },

    "recommendationengine": { //NO I18N
        label   : "Recommendation Engine", //NO I18N
        version : "1.0.0",
        module  : "Recommendationengine", //NO I18N
        assets  : {
            js  : {
                builder: "recommendationengine/recommendationengine.js", //NO I18N
                site: "recommendationengine/recommendationengine.js" //NO I18N
            },
            // NOTE:
            // not yet implemented
            // let me know if needed
            css : {
                builder: "",
                site   : ""
            }
        }
    },

    "social_share": {//No I18N
        label: cms_i18n('ui.common.social_share'),//NO I18N
        version: "1.0.0",//No I18N
        module : "socialShare",//No I18N
        assets : {
            js : {
                builder : "socialShare/socialShareBuilder.js",//No I18N
                site : "socialShare/socialShareSite.js" //No I18N
            }
        },
        settings : {
            "actions" : {//NO I18N
                "globalSettings" : {//NO I18N
                    "values" : [{//NO I18N
                        "id" : "socialShareSettings",//NO I18N
                        "methods" : {//NO I18N
                            "global" : {//NO I18N
                                "label" : cms_i18n("ui.elementsettings.socialshare.settings.label"),//NO I18N
                                "method": "openSettings",//NO I18N
                                "type" : "primary"//NO I18N
                            }
                        }
                    }],
                    //"group" : "footer",//NO I18N
                    "message" : cms_i18n("ui.elementsettings.socialshare.settings.message")//NO I18N
                }
            }
        },
        model : {
            "elementId" : {//NO I18N
                "type" : "data-element-id" //NO I18N
            },
            "element" : {//No I18N
                "count" : {//NO I18N
                    "def_val" : true,//NO I18N
                    "data_type" : "boolean",//NO I18N
                    "prop" : {//NO I18N
                        "label" : cms_i18n("ui.elementsettings.socialshare.count.label"),//NO I18N
                        "option_type" : "toggle"//NO I18N
                    }
                },
                "align" : {//NO I18N
                    "attr" : "data-align", //No I18N
                    "depends": "element.count",//NO I18n
                    // "prefix" : "zpsocial-share-align-",//No I18N
                    "def_val" : "top", //NO I18N
                    "prop" : {//NO I18N
                        "values" : [{//NO I18N
                            "value" : "top", //NO I18N
                            "label" : cms_i18n("ui.common.top")//NO I18N
                        },{
                            "value" : "right", //NO I18N
                            "label" : cms_i18n("ui.common.right")//NO I18N
                        },{
                            "value" : "bottom", //NO I18N
                            "label" : cms_i18n("ui.common.bottom")//NO I18N
                        }],
                        "label" : cms_i18n("ui.element.property.align"),//NO I18N
                        "option_type" : "select" //NO I18N
                    }
                },
                "style" : {//No I18N
                    "attr" : "data-style", //No I18N
                    "def_val" : "01", //No I18N
                    "depends" : "element.count", //NO I18N
                    "prop" : {//No I18N
                        "values" : [{//No I18N
                            "value" : "01", //No I18N
                            "label" : cms_i18n("ui.common.fill")//NO I18N
                        },{
                            "value" : "02", //NO I18N
                            "label" : cms_i18n("ui.elementsettings.socialshare.style.two")//NO I18N
                        },{
                            "value" : "03", //NO I18N
                            "label" : cms_i18n("ui.elementsettings.socialshare.style.three")//NO I18N
                        },{
                            "value" : "04", //NO I18N
                            "label" : cms_i18n("ui.elementsettings.socialshare.style.four")//NO I18N
                        },{
                            "value" : "05", //NO I18N
                            "label" : cms_i18n("ui.elementsettings.socialshare.style.five")//NO I18N
                        },{
                            "value" : "06", //NO I18N
                            "label" : cms_i18n("ui.elementsettings.socialshare.style.six")//NO I18N
                        },{
                            "value" : "07", //NO I18N
                            "label" : cms_i18n("ui.elementsettings.socialshare.style.seven")//NO I18N
                        }],
                        "datasource" : true,//NO I18N
                        "label" : cms_i18n("ui.element.property.style"),//NO I18N
                        "option_type" : "select" //NO I18N
                    }
                }//,
                // "time_date" : {//NO I18N
                //     "data_type" : "datetime",//NO I18N
                //     "prop" : {//NO I18N
                //         "label" : "Schedule Post",//NO I18N
                //         "option_type" : "datetime"//NO I18N
                //     }
                // },
                // "mytags" : {//NO I18N
                //     "values" : [{//NO I18N
                //         "value" : "mk",//NO I18N
                //         "label" : "marketing"//NO I18N
                //     },{
                //         "value" : "sl",//NO I18N
                //         "label" : "sales"//NO I18N
                //     },{
                //         "value" : "pr",//NO I18N
                //         "label" : "product"//NO I18N
                //     },{
                //         "value" : "pc",//NO I18N
                //         "label" : "purchase"//NO I18N
                //     }],
                //     "prop" : {//NO I18N
                //         "label" : "Tags", //NO I18N
                //         "option_type" : "tags"//NO I18N
                //     },
                //     "message" : "This is just help message to displau in elem and app preperty bar"//NO I18N
                // }
                
            }
        }
    },

    "testimonial" : { //NO I18N
        label   : "Testimonial", //NO I18N
        version : "1.0.0", //NO I18N
        module  : "Testimonial", //NO I18N
        assets  : {
            js : {
                builder : "testimonial/testimonialBuilder.js", //NO I18N
                site    : "testimonial/testimonialSite.js" //NO I18N
            }
        }
    },

    "dynamiccontent" : { //NO I18N
        label   : "Dynamic Content", //NO I18N
        version : "1.0.0",
        module  : "DynamicContent", //NO I18N
        assets  : {
            js  : {
                builder : "dynamiccontent/dc_drop.js", //NO I18N
                site    : "dynamiccontent/dc_render.js" //NO I18N
            }
        }
    },

    "blogs" : {//NO I18N
        label   : cms_i18n("ui.common.blogs"),//NO I18N
        version : "1.0.0",//NO I18N
        module  : "blogs",//NO I18N
        containerApp : true,
        assets  : {
            js  : {
                builder: "blogs/blogs.js" //NO I18N
            }
        },settings : {
            "actions" : { //NO I18N
                "Blog_new_post" : { //NO I18N
                    "values" : [{ //NO I18N
                        "id" : "addNewPost", //NO I18N
                        "methods" : { //NO I18N
                            "addNewPost" : { //NO I18N
                                "label" : cms_i18n('ui.app.property.blog.add'), //NO I18N
                                "method": "addNewPost", //NO I18N
                                "type"  : "primary" //NO I18N
                            }
                        }
                    }],
                    "message" : cms_i18n('ui.app.property.blog.add.helpmessage')//NO I18N
                },
                "Blog_Settings"  : { //NO 18N
                    "values" : [{ //NO I18N
                        "id" : "blogSettings", //NO I18N
                        "methods" : { //NO I18N
                            "blogSettings"   : { //NO I18N
                                "label" : cms_i18n('ui.app.property.blog.settings'), //NO I18N
                                "method": "blogSettings", //NO I18N
                                "type"  : "primary" //NO I18N
                            }
                        }
                    }],
                    "message" : cms_i18n('ui.app.property.blog.settings.helpmessage')//NO I18N
                }
            }
        },
        model : {
            "elementId" : {//NO I18N
                "type"  : "data-element-id" //NO I18N
            },
            "element"   : {//No I18N 
            }
        }
    },

    "blogpost" : {//NO I18N
        label   : cms_i18n('ui.app.post.title'),//NO I18N
        version : "1.0.0",//NO I18N
        module  : "blogpost",//NO I18N
        containerApp : true,
        assets  : {
            js  : {
                builder: "blogPost/blogpost.js" //NO I18N
            }
        },settings : {
            "actions" : { //NO I18N
                "BlogPost" : { //NO I18N
                    "values" : [{ //NO I18N
                        "id" : "publishPost", //NO I18N
                        "methods" : { //NO I18N
                            "publishPost" : { //NO I18N
                                "label" : cms_i18n('ui.cms.publish'), //NO I18N
                                "method": "publishPost", //NO I18N
                                "type"  : "primary" //NO I18N
                            },
                            "updatePost" : {//NO I18N
                                "label" : cms_i18n('ui.common.update'),//NO I18N
                                 "method": "publishPost",//NO I18N
                                 "type": "primary"//NO I18N
                            },
                            "schedulePost" : {//NO I18N
                                "label" : cms_i18n('ui.app.property.post.schedule'),//NO I18N
                                 "method": "publishPost",//NO I18N
                                 "type": "primary"//NO I18N
                            }
                        }
                    },{ //NO I18N
                        "id" : "saveDraft", //NO I18N
                        "methods" : { //NO I18N
                            "saveDraft"   : { //NO I18N
                                "label" : cms_i18n('ui.app.property.post.save'), //NO I18N
                                "method": "saveDraft", //NO I18N
                                "type"  : "primary" //NO I18N
                            }
                        }
                    }],
                    "group" : "footer"//NO I18N
                }
            }
        },
        model : {
            "elementId" : {//NO I18N
                "type"  : "data-element-id" //NO I18N
            },
            "element"   : {//No I18N
                "url"  : {//NO I18N
                    "type"   : "innerHTML", //NO I18N
                    "sel"    : ".zpPost_Url", //NO I18N
                    "prop"   : {//NO I18N
                        "option_type": "input", //NO I18N
                        "label"      : cms_i18n('ui.app.property.post.url'), //NO I18N
                        "placeholder": cms_i18n('ui.app.property.post.defurl'), //NO I18N
                        "error"      : true //NO I18N
                    }
                },
                "category": {//NO I18N
                    "type"   : "Category", //NO I18N
                    "sel"    : ".zpCategory", //NO I18N
                    "def_val": "", //NO I18N
                    "prop"   : {//NO I18N
                        "values": [], //No I18N
                        "label"      : cms_i18n("ui.common.category"), //NO I18N
                        "option_type": "select", //NO I18N
                        "add_option" : cms_i18n('ui.app.property.post.category.add')//NO I18N
                    }
                },
                "tags"  : {//NO I18N
                    "type"   : "innerHTML", //NO I18N
                    "sel"    : ".zpTag", //NO I18N
                    "prop" : {//NO I18N
                        "values": [],//NO I18N
                        "label" : cms_i18n('ui.common.tags'), //NO I18N
                        "option_type" : "tags"//NO I18N
                     }
                    // "message" : "Type and press enter to add new tag"//NO I18N
                },
                "closeComments" : {//NO I18N
                    "def_val"   : false,//NO I18N
                    "data_type" : "boolean",//NO I18N
                    "sel"       : ".zpClose-comments", //NO I18N
                    "prop" : {//NO I18N
                        "label" : cms_i18n('ui.app.property.post.comment'),//NO I18N
                        "option_type" : "toggle"//NO I18N
                    }
                    // "message" : "Manage your post comments"//NO I18N
                },
                "user_summary"  : {//NO I18N
                    "type"   : "innerHTML", //NO I18N
                    "sel"    : ".zpPost_summary", //NO I18N
                    "prop"   : {//NO I18N
                        "option_type": "textarea", //NO I18N
                        "label"      : cms_i18n('ui.app.property.post.summary'), //NO I18N
                        "placeholder": cms_i18n('ui.app.property.post.summary.defaulttext'),  //NO I18N
                        "error"      : true //NO I18N
                    }
                },
                "ScheduledPost"  : {//NO I18N
                    "def_val"   : false,//NO I18N
                    "data_type" : "boolean",//NO I18N
                    "sel"       : ".zpscheduled-post", //NO I18N
                    "prop" : {//NO I18N
                        "label" : cms_i18n('ui.app.property.post.schedule'),//NO I18N
                        "option_type" : "toggle"//NO I18N
                    }
                },
                "scheduleDate" : {//NO I18N
                    "data_type" : "datetime",//NO I18N
                    "depends": "element.ScheduledPost",//NO I18n
                    "prop" : {//NO I18N
                        "label" : cms_i18n('ui.app.property.post.datetime'),//NO I18N
                        "option_type" : "datetime"//NO I18N
                    }
                },
                "coverimage"  : {//NO I18N
                    "type"   : "image", //NO I18N
                    "sel"    : ".zpimage", //NO I18N
                    "prop"   : {//NO I18N
                        "label"   : cms_i18n('ui.app.property.post.changeimage'), //NO I18N
                        "preview" : true,//NO I18N
                        "empty_msg" : cms_i18n('ui.app.property.post.coverimage'), //NO I18N
                        "remove"  : true, //NO I18N
                        "option_type": "image" //NO I18N
                    }
                }
            }
        }
    },

    "blog_comments": {//No I18N
        label: cms_i18n('ui.content.element.blog_comments'),//NO I18N
        version: "1.0.0",//No I18N
        module : "blog_comments",//No I18N
        assets : {
            js : {
                site : "blogComments/blogCommentsSite.js" //No I18N
            }
        }
    },

    server_entities_comments: {
        label: cms_i18n("ui.content.element.server_entities_comments"), // No I18N
        version: "1.0.0", // No I18N
        module: "server_entities_comments", // No I18N
        assets: {
            js: {
                site: "serverEntitiesComments/serverEntitiesComments.js" // No I18N
            }
        }
    }
};

function getAppManifest(appName){
    if(app_manifest[appName]){
        return app_manifest[appName];
    }
    else {
        throw Error('Manifest for app '+ appName +' not found ');//No I18N
    }
}

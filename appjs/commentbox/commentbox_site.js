/*$Id$*/
var CommentBox = (function(){

    function init(node, data) {
        var params = {};
        params.status = "all";  // No I18N
        params.pageNo = 1;
        params.pageId = zs_resource_id;

        var argsArr = {};
        argsArr.node = node;
        argsArr.data = data;

        var types = getRatingViewTypes();
        if(types.length > 0) {
//        var types= ["button","icon"];
            params.types = types;
            argsArr.holder=types;
        }

        $X.get({
            url: "/siteapps/commentbox/commentboxComments",// No I18N
            params:params,
            handler: renderModerateCBComments,
            args	: argsArr
        });
    }

    function getRatingViewTypes() {
        var types = [];
        var dataElmTypeNodes = $D.getAll("[data-comments-summary]", document);
        for(var i = 0; i<dataElmTypeNodes.length;i++) {
            var typeArr = dataElmTypeNodes[i];
            types[i] = typeArr.dataset.commentsSummary;
        }
//        types= ["button","icon"];
        return types;
    }
    
    function renderModerateCBComments(args) {
        var respTxt = this.responseText;
        var resp = JSON.parse(respTxt);
        var affterAppLoad = args.data.loaded;
        args.node.innerHTML = resp.cb_data;

        var respKeys = Object.keys(resp);
        var respValues = Object.values(resp);
        if(args.holder) {
            var dataElmTypeNodes = $D.getAll("[data-comments-summary]", document);
//            var dataElmTypeNodes = $D.getAll("[data-element-type]", document);
            for(var i=0; i<respKeys.length;i++) {
                var key = respKeys[i];
                var value = respValues[i];
                for(var j = 0; j<dataElmTypeNodes.length;j++) {
                   var node = dataElmTypeNodes[j];
                    var typeVal = node.dataset.commentsSummary;
                    if(typeVal+"_data" == key) {
                       node.innerHTML=value;
                    }
                }
            }
        }
        bindUnbindEvents(args);
        affterAppLoad();
    }

    function bindAddReplyComment(elm, args) {
        bindEvent(elm, 'click', function(e){    // No I18N
            addReplyComment(args, e, this);
        });    
    }
    
    function addReplyComment(args, e, thisElm) {
        
        var par = thisElm.parentNode;
        var rep_id = thisElm.getAttribute("data-cbform-repcmt");
        
        var oForm = $D.get("[data-cbform-elmtype=cb_main_form]", args.node);
        var cont = $D.get("[data-cbform-elmtype=cb_comments_list_cont]", args.node);
        
        var formCl = oForm.cloneNode(true);
        formCl.setAttribute("data-cbform-commenttype", "reply");
        formCl.id="replyform-"+rep_id;
        formCl.style.display="";
        formCl.setAttribute("data-cbform-rootcmtid", thisElm.getAttribute("data-cbform-rootcmt"));
        
        var prevRepId;
        if(!cont.hasAttribute("data-cbform-replyid")) {
            cont.setAttribute("data-cbform-replyid", rep_id);
        }
        else {
            prevRepId = cont.getAttribute("data-cbform-replyid");
            var prevForm = $D.get('#replyform-'+prevRepId, args.node);
            var reply_link = prevForm.previousElementSibling;
            reply_link.style.display="inline-block";
            prevForm.parentNode.removeChild(prevForm);
            cont.setAttribute("data-cbform-replyid", rep_id);
        }
        
        var dataActArrNodes = $D.getAll("[data-cbform-elmaction]", formCl);   // No I18N
        var gpElm;
        for(var i = 0; i<dataActArrNodes.length;i++) {
            var dataAtt = dataActArrNodes[i];
            gpElm = dataAtt;
            var dataAttName = dataAtt.dataset.cbformElmaction;
             
            if(dataAttName === "changeid") {
                gpElm.setAttribute("data-cbform_id", gpElm.getAttribute("data-cbform-elmtype")+"-"+rep_id);
            }
        }

        var dataAttArrNodes = $D.getAll("[data-cbform-elmtype]", formCl);   // No I18N
        for(var i = 0; i<dataAttArrNodes.length;i++) {
            var nodeElm = dataAttArrNodes[i];
            var dataAttName = nodeElm.dataset.cbformElmtype;
            var dataAttAction;
            if(nodeElm.hasAttribute("data-cbform-elmaction")) {
                dataAttAction = nodeElm.getAttribute("data-cbform-elmaction")
            }
            
            if(dataAttName === 'rating_form') {
                nodeElm.parentNode.removeChild(nodeElm);
                }
            if(dataAttName === 'submit_button') {
                bindAddCBComments(nodeElm, args);
                }
            if(dataAttName === 'reset_button') {
                bindHideCommentsForm(nodeElm, args);
            }
            if(dataAttName === 'rating_info_dialog_close') {
                bindHideRatingResult(nodeElm, args, dataAttArrNodes);
            }
        }
        
        constructCBCaptcha(formCl, args, bindCbCaptcha, true);
        clearFields(formCl);
        
        var repl_id_s= "-"+rep_id;
        var gpId = $D.get("[data-cbform_id=guestpost_confirm"+repl_id_s+"]", formCl);
        if(gpId) {
            bindGuestPostConfirmation(gpId, formCl, args);
            setMemberGuestLoginDefaultValue(formCl, rep_id);
        }
        par.appendChild(formCl);
        
        var ta = $D.get("[data-cbform-elmtype=cb_comment_field]", formCl);
        if(ta) {
            ta.value="";
            ta.focus();
        }
        thisElm.style.display="none";
        hideCommentsForm("reply", args);  // No I18N
    }

    function constructCBCaptcha(elm, args, execFunc, delImgCont) {
        var captchaCont = $D.get("[data-cbform-elmtype=cb_spamprotect]", elm);
        if(captchaCont) {
            if(delImgCont) {
                var prevImgCont = captchaCont.childNodes[2];
                prevImgCont.parentNode.removeChild(prevImgCont);
            }
            args.captchanode = captchaCont;
            if(execFunc) {
                execFunc(captchaCont, args);
            }
        }
    }
    
    function bindAddCBComments(inpElm, args) {
        bindEvent(inpElm, 'click', function(e){ // No I18N
            addCBComments(args, e)
        });    
    }
    
    function bindHideCommentsForm(elm, args) {
        bindEvent(elm, 'click', function(e){    // No I18N
            hideCommentsForm("cancel", args, e) // No I18N
        });    
    }
    
    function hideCommentsForm(action, args, e) {
        var mainForm = getCBMainForm(args);
        if(action === "reply") {
            mainForm.style.display="none";
        }
        else if(action === "cancel" || action === "navigate") {
            var cont = $D.get("[data-cbform-elmtype=cb_comments_list_cont]", args.node);
            if(cont && cont.hasAttribute("data-cbform-replyid")) {
                cont.removeAttribute("data-cbform-replyid");
            }
            
            var frm = getReplyCommentFrm();    
            if(frm) {    
                var reply_link = frm.previousElementSibling;
                reply_link.style.display="inline-block";
                frm.parentNode.removeChild(frm);
            }
            mainForm.style.display="";
            constructCBCaptcha(mainForm, args, bindCbCaptcha, true);
            clearFields(mainForm);
            resetRating(args.node);
            setMemberGuestLoginDefaultValue(mainForm);
        }
    }
    
    function getCBMainForm(args) {
        var mainFormArr = $D.getAll("[data-cbform-elmtype=cb_main_form]", args.node);
        for(var i = 0; i<mainFormArr.length;i++) {
            var nodeElm = mainFormArr[i];
            if(!nodeElm.hasAttribute("data-cbform-commenttype")) {
                return nodeElm;
            }
        }
    }
    
    function bindShowHideRatingResult(inpElm, args) {
        bindEvent(inpElm, 'click', function(e){ // No I18N
            showHideRatingResult(args, e, this)
        });    
    }
    
    function showHideRatingResult(args, e, thisElm) {
        var x;
        if(window.innerWidth < 768) {
            x = 0;
        }
        else {
            x = thisElm.offsetLeft + thisElm.offsetWidth - 4;
        }
        var y = thisElm.offsetTop + thisElm.offsetHeight - 4;
        
        var resCont = $D.get("[data-cbform-elmtype=zpcomment_rating_infobox]", args.node);
        resCont.style.display="";
        resCont.style.position="absolute";
        resCont.style.zIndex="1";
        resCont.style.top=y + 'px'; 
        resCont.style.left=x + 'px';
        if(window.innerWidth < 768) {
            x = (window.innerWidth - resCont.offsetWidth) / 2;
            resCont.style.left=x + 'px';
        }
    }

    function bindHideRatingResult(inpElm, args) {
        bindEvent(inpElm, 'click', function(e){ // No I18N
            hideRatingResult(args, e, this)
        });    
    }
    
    function hideRatingResult(args, e, thisElm) {
        var resCont = $D.get("[data-cbform-elmtype=zpcomment_rating_infobox]", args.node);
        resCont.style.display="none";
    }

    function getTopContainer(em, tag) {
        while (em.parentNode) {
            em = em.parentNode;
            if (em.tagName === tag) {
                return em;
            }
        }
        return null;
    }   

    function addCBComments(args, e) {
        var tar = e.target;
        args.targ = tar;
        var dList = getTopContainer(tar, "FORM");   // No I18N
        
        var repl_id="";
        var repl_id_s="";
        var param={};
        if(isReplyCommentType(dList)) {
            repl_id = dList.id.replace("replyform-","");
            repl_id_s="-"+repl_id;
            param.root_cmt_id = dList.getAttribute("data-cbform-rootcmtid");
            param.in_reply_to = repl_id;
        }
        var currPgNo = 1;
        var msg,nameElm,emailElm, isGuest;
        nameElm = emailElm = "";
        var commentElm = dList.elements.cbcomment.value;
        commentElm = commentElm.trim();
        if(dList.elements.cbname) {
            nameElm = dList.elements.cbname.value;
            nameElm = nameElm.trim();

            if(nameElm && nameElm.length > 100) {
                msg=i18n.get('commentbox.formvalidate.nametoolong');
                showMessage("cmt_name_errormsg", msg, args); // No I18N
                return false;
            }
        }
        if(dList.elements.cbemail) {
            emailElm = dList.elements.cbemail.value;
            emailElm = emailElm.trim();
            
            if(emailElm != "") {
                var mailPattern = new RegExp("^[a-zA-Z0-9]([\\w\\-\\.\\+\']*)@([\\w\\-\\.]*)(\\.[a-zA-Z]{2,8}(\\.[a-zA-Z]{2}){0,2})$","mig");
                var reg_mail = mailPattern.exec(emailElm);
                if(!reg_mail){
                    msg=i18n.get('commentbox.formvalidate.emailcorrectformat');
                    showMessage("cmt_email_errormsg", msg, args); // No I18N
                    return false;
                }
            }
        
            if(emailElm && emailElm.length > 100) {
                msg=i18n.get('commentbox.formvalidate.emailtoolong');
                showMessage("cmt_email_errormsg", msg, args); // No I18N
                return false;
            }
        }
        
        var rating = 0;
        if(dList.elements.rating) {
            rating = dList.elements.rating.value;
        }
        
        if(isReplyCommentType(dList)) {
            var pgnoCont = $D.get("[data-cbform-pgno]", args.node);
            if(pgnoCont) {
                currPgNo = pgnoCont.dataset.cbformPgno;
            }
        }
        
        var rV = args.data.util.getData('showratingtoggle');    // No I18N
        if((commentElm == "") && (rV == 'false' || isReplyCommentType(dList))) {
            msg=i18n.get('commentbox.formvalidate.require_comment');
            showMessage("common_error_msg", msg, args); // No I18N
            return false;
        }
        else {
            if(commentElm == "" && rating == 0) {
                msg=i18n.get('commentbox.formvalidate.require_rate_comment');
                showMessage("common_error_msg", msg, args); // No I18N
                return false;
            }
        }
        
        param.cb_comments_content=commentElm;
        param.cb_comments_added_by_name=nameElm;
        param.cb_comments_added_by_emailid=emailElm;
        param.acquired_rating=rating;
        param.page_id=zs_resource_id;
        param.pg_no=currPgNo;
        param.csrfp=getCookie('csrfc'); // No I18N

        var gp = dList.elements.cb_guestpost_confirm;
        if(gp && gp.checked) {
            param.is_guest=1;
        }
        
        var cptchaElm = dList.elements.cbcaptcha;
        if(cptchaElm) {
            var cpt = dList.elements.cbcaptcha.value;
            cpt = cpt.trim();
            if(cpt == "") {
                msg = i18n.get('commentbox.formvalidate.require_captcha');
                showMessage("captcha-errormsg", msg, args); // No I18N
                cptchaElm.focus();
                return false;
            }
            if(cpt.length > 10) {
                msg = i18n.get('commentbox.formvalidate.captcha_incorrect');
                showMessage("captcha-errormsg", msg, args); // No I18N
                cptchaElm.value = '';
                cptchaElm.focus();
                return false;
            }
            
            var digest = dList.elements.digest.value;
            param.cpt = cpt;
            param.digest = digest;
        }

        $X.post({
            url:"/siteapps/commentbox/addComments",    // No I18N
            params:param,
            handler:addCBCommentsRes,
            args:args
        });
    }
    
    function showMessage(srchElm, msg, args) {
        var cbMsgCont = $D.get("[data-cbform-elmtype="+srchElm+"]", args.node);
        if(cbMsgCont) {
            cbMsgCont.innerHTML=msg;
            setTimeout(function() {
                cbMsgCont.innerHTML = "";
            },4000);
        }
    }

    function addCBCommentsRes(args) {
        var respTxt = this.responseText;
        var res = JSON.parse(respTxt);
        var tar = args.targ;
        var dList = getTopContainer(tar, "FORM");   // No I18N
        var repl_id="";
        var repl_id_s="";
        if(isReplyCommentType(dList)) {
            repl_id = dList.id.replace("replyform-","");
            repl_id_s="-"+repl_id;
        }
        
        if(res.CODE == 0) {
            args.node.innerHTML = res.CONTENT;
            if(!isReplyCommentType(dList)) {
                $D.get("[data-cbform-elmtype=cb_top_element]", args.node).scrollIntoView();
            }
            bindUnbindEvents(args);
        }
        else if(res.CODE == 1) {
            alert(res.CONTENT);
            clearFields(dList);
            resetRating(args.node);
            constructCBCaptcha(dList, args, bindCbCaptcha, true);
            setMemberGuestLoginDefaultValue(dList, repl_id);
        }
        else if(res.CODE == 2) {
            var respJo = JSON.parse(res.CONTENT);
            var errMsg = respJo.ERROR;

            var cbMsgCont = $D.get("[data-cbform-elmtype=captcha-errormsg]", args.node);
            cbMsgCont.innerHTML=errMsg;//No I18N
            setTimeout(function() {
                cbMsgCont.innerHTML = "";
            },4000)
            
            var captchanode = $D.get("[data-cbform-elmtype=cb_spamprotect]", dList);
            var prevImgCont = captchanode.childNodes[2];
            prevImgCont.parentNode.removeChild(prevImgCont);

            appendCaptcha(captchanode, respJo, args);
            var nef = $D.get("[data-cbform-elmtype=cb_captcha]", dList);
            nef.value = "";
            nef.focus();
            return false;
        }
    }

    function clearFields(elm) {
        var elms = elm.elements;
        for(var i=0; i<elms.length; i++) { 
            if(elms[i].type == "text" || elms[i].type == "textarea") { 
                elms[i].value = "" 
            }
        }
    }

    function resetRating(elm) {
        var r_arr = elm.getElementsByTagName("input");
        if(r_arr) {
            for(var i=0; i<r_arr.length;i++) {
                var inpElm = r_arr[i];
                if(inpElm.type == "radio" && inpElm.name== "rating") {
                    inpElm.checked = false;
                }
            }
        }
    }

    function paginateCBComments(args, e) {
        var target = e.target;
        
        var frm = getReplyCommentFrm();
        if(frm) {
             hideCommentsForm("navigate", args);  // No I18N
        }
        
        var action = target.id.replace("cbComm","").toLowerCase();
        var pageNo = target.getAttribute("data-cbform-"+action);
        var params = {};
        params.status = "all";  // No I18N
        params.pageId = zs_resource_id;
        args.event = e;
        $X.get({
            url: "/siteapps/commentbox/commentboxComments/page/"+pageNo ,// No I18N
            params:params,
            handler: renderPaginateCBComments,
            args	: args
        });
    }

    function renderPaginateCBComments(args) {
        var respTxt = this.responseText;
        var cont = $D.get("[data-cbform-elmtype=cb_comments_list_cont]", args.node);
        cont.innerHTML = respTxt;
        bindAllReplyComments(args);
        var oForm = getCBMainForm(args);
        setMemberGuestLoginDefaultValue(oForm);
    }

    function bindPaginateComments(d, args) {
        bindEvent(d, 'click', function(e){paginateCBComments(args, e)});    // No I18N
    }
    
    function unbindPaginateComments(d, args) {
        unBindEvent(d, 'click', function(e){paginateCBComments(args, e)});    // No I18N
    }

    bindEvent=function(el,type,func){
        if(el.addEventListener){
            el.addEventListener(type,func,false);
        }else if(el.attachEvent){
            el.attachEvent('on'+type,func);
        }
    }

    unBindEvent=function(el,type,func){
        if(el.removeEventListener){
            el.removeEventListener(type,func,false);
        }else if(el.detachEvent){
            el.detachEvent('on'+type,func);
        }
    }
    
    function bindUnbindEvents(args) { 
        var mainForm;
        var dataAttArrNodes = $D.getAll("[data-cbform-elmtype]", args.node)
        for(var i = 0; i<dataAttArrNodes.length;i++) {
            var nodeElm = dataAttArrNodes[i];
            var dataAttName = nodeElm.dataset.cbformElmtype;
            var dataAttAction;
            if(nodeElm.hasAttribute("data-cbform-elmaction")) {
                dataAttAction = nodeElm.getAttribute("data-cbform-elmaction")
                }
            
            if(dataAttName === 'cb_main_form') {
                mainForm = nodeElm;
            }
            if(dataAttName === 'submit_button') {
                bindAddCBComments(nodeElm, args);
        }
            if(dataAttName === 'reset_button') {
                bindHideCommentsForm(nodeElm, args);
        }
            if(dataAttName === 'rating_info_icon') {
                bindShowHideRatingResult(nodeElm, args);
        }
            if(dataAttName === 'rating_info_dialog_close') {
                bindHideRatingResult(nodeElm, args, dataAttArrNodes);
        }
            if(dataAttName === 'guestpost_confirm') {
                bindGuestPostConfirmation(nodeElm, args.node, args);
                setMemberGuestLoginDefaultValue(mainForm);
            }
            if(dataAttName === 'cb_spamprotect') {
                args.captchanode = nodeElm;
                bindCbCaptcha(nodeElm, args);
        }
    }
        bindAllReplyComments(args);
    }

    function bindGuestPostConfirmation(bindElm, cont, args) {
        bindEvent(bindElm, 'click', function(e){    // No I18N
            guestPostConfirmation(cont, e, this);
        });    
    }
    
    function guestPostConfirmation(cont, e, thisElm) {
        var repl_id_s= "";
        var chkBox = false;
        if(thisElm) {
            var el = thisElm;
            if(el.hasAttribute("data-cbform-elmtype")) {
                var dataAttName = el.getAttribute("data-cbform-elmtype");
                
                if(dataAttName === 'guestpost_confirm') {
                    var repl_id;
                    var neCont = $D.get("[data-cbform-elmtype=name_email_fields]", cont);
                    if(el.hasAttribute("data-cbform_id")) {
                        var repl_idAtt = el.getAttribute("data-cbform_id");
                        var repl_idArr = repl_idAtt.split("-");
                        repl_id = repl_idArr[1];
                        repl_id_s= "-"+repl_id;
                        neCont = $D.get("[data-cbform_id=name_email_fields"+repl_id_s+"]", cont);
                    }
                    var inpArr = $D.getAll("input", neCont);
                    chkBox = thisElm.checked;
                    for(var j = 0; j<inpArr.length;j++) {
                        var d = inpArr[j];
                        if(d.type == "text" ) {
                            d.value = d.dataset.cbformUdetails;
                            d.disabled = !chkBox;
                            if(chkBox) {
                                d.value = "";
                            }
                        }
                    }
                }
            }
        }
    }
        
    function setMemberGuestLoginDefaultValue(cont, repl_id) {
        var repl_id_s= "";
        var gpId = $D.get("[data-cbform-elmtype=guestpost_confirm]", cont);
        var nef = $D.get("[data-cbform-elmtype=name_email_fields]", cont);
        if(repl_id) {
            repl_id_s= "-"+repl_id;
            gpId = $D.get("[data-cbform_id=guestpost_confirm"+repl_id_s+"]", cont);
            nef = $D.get("[data-cbform_id=name_email_fields"+repl_id_s+"]", cont);
        }
        gpId.checked = false;
        var inpArr = $D.getAll("input", nef);
        for(var j = 0; j<inpArr.length;j++) {
            var d = inpArr[j];
            if(d.type == "text" ) {
                d.value = "";
                d.value = d.dataset.cbformUdetails;
                d.disabled = true;
            }
        }
    }

    function bindAllReplyComments(args) {
        var navigArr = $D.getAll("[data-cbform-elmtype=page_navigation]", args.node);
        for(var i=0;i<navigArr.length;i++) {
            var d = navigArr[i];
            bindPaginateComments(d, args);
        }
        var replyLinkArr = $D.getAll("[data-cbform-elmtype=reply_link]", args.node);
        for(var j=0;j<replyLinkArr.length;j++) {
            var r = replyLinkArr[j];
            bindAddReplyComment(r, args);
        }
    }

    function bindCbCaptcha(elm, args) {
        var scr = document.createElement("script");
        scr.onload = generateCbCaptcha(args, elm);
        elm.appendChild(scr);
    }
    
    function generateCbCaptcha(args, elm) {
        var params = {};
        params.resource_id = zs_resource_id;

        $X.get({
            url: "/siteapps/commentbox/commentCaptcha" ,// No I18N
            params:params,
            handler: generateCbCaptchaRes,
            args	: args
        });
    }
    
    function generateCbCaptchaRes(args) {
        var respTxt = this.responseText;
        var res = JSON.parse(respTxt);
        if(res) {
            var cptchaNode = args.captchanode;
            appendCaptcha(cptchaNode, res, args);
        }
    }
    
    function appendCaptcha(node, obj, args) {
        var img = document.createElement("IMG");
        img.className="captchaImg";
        img.src=obj.CAPTCHAURL;
        node.insertBefore(img, node.childNodes[2]);
        var digestNode = $D.get("[data-cbform-elmtype=cb_captcha_digest]", args.node);
        digestNode.value = obj.DIGEST;
        node.appendChild(digestNode);
    }

    function getReplyCommentFrm() {
        var rFrm;
        var frm = document.forms;
        for(var i = 0; i < frm.length;i++) {
            if(frm[i].hasAttribute("data-cbform-commenttype") && frm[i].getAttribute("data-cbform-commenttype") == "reply") {
                rFrm = frm[i];
            }
        }
        return rFrm;
    }
    
    function isReplyCommentType(el) {
        if(el.hasAttribute("data-cbform-commenttype") && el.getAttribute("data-cbform-commenttype") == "reply") {
            return true;
        }
        return false;
    }

    function getCookie(cname) {
        var rexPat = new RegExp(cname+"=[^;]*");
        var allCookie = document.cookie;
        var myCookie = rexPat.exec(allCookie);
        if(myCookie){
            var cookie=myCookie[0].split("=");
            return unescape(cookie[1]);
        }
        else{
            return null;
        }
    }
    
    return {
        init             : init,
        addCBComments : addCBComments,
        paginateCBComments :paginateCBComments,
        bindEvent : bindEvent
    };
}());

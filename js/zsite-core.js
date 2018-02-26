var hbMessageFormat = (function () {
    'use strict' // NO I18N

    // ^dev
    function tokenizer (input) {

        function isExist(char) {
            for (var i = 0, len = grammars.length; i < len; i++) {
                if (char === grammars[i].char) {
                    return grammars[i]
                }
            }

            return false
        }

        var iter     = 0
        var ipLength = input.length
        var tokens   = []

        var grammars = [{
                type: 'codeOpen', //No I18N
                char: '{'
            }, {
                type: 'codeClose', //No I18N
                char: '}'
            }, {
                type: 'string', //No I18N
                char: '\''
            }]

        var tokenChars = grammars.map(function (g) {
            return g.char
        })

        var char
        var data
        var grammar

        while (true) {
            if (!input[iter]) {
                break
            }
            data    = ''
            char    = input[ iter ]
            grammar = isExist( char )

            if (grammar) {
                tokens.push({
                    char: char,
                    type: grammar.type
                })
            } else {

                if (char) {
                    data = char
                }

                while ( tokenChars.indexOf( input[ iter + 1 ] ) === -1 && iter + 1 < ipLength ) {
                    data += input[ ++iter ]
                }

                tokens.push({
                    data: data
                })

            }

            iter++
        }

        return tokens

    }

    function Parser(tokens) {
        this.index       = 0
        this.tokens      = tokens
        this.nodes       = []
        this.openString  = false
        this.openCode    = false
        this.isSubformat = false
    }

    Parser.prototype.codeOpen = function (tokens, token, index) {

        var prev = tokens[ index - 1 ]

        if (this.openString) {
            this.nodes.push({ data: '{' })

        } else {

            if (this.openCode) {
                // this.nodes.push({
                //     code: '{',
                //     sub : true
                // })
                this.isSubformat = true

            } else {
                this.openCode = true
            }

        }
    }

    Parser.prototype.codeClose = function (tokens, token, index) {
        var prev = tokens[ index - 1 ]

        if (prev.char === '\'' || this.openString) {
            this.nodes.push({ data: '}' })

        } else {
            if (this.openCode ) {
                if (this.isSubformat) {
                    // this.nodes.push({ code: '}' })
                    // this.openCode = false
                    this.isSubformat = false
                } else {
                    this.openCode = false

                }

            }

            this.openString = false
        }
    }

    Parser.prototype.string = function (tokens, token, index) {
        var prev = tokens[ index - 1 ]
        var next = tokens[ index + 1 ]

        if (this.openString) {
            if (next && next.char === '\'') {
                this.index++
                this.nodes.push({ data: '\'' })
                this.openString = false

            } else {
                this.openString = false

            }

        } else {
            if (next && next.char === '\'') {
                this.index++
                this.nodes.push({
                    data: '\''
                })
            } else {
                this.openString = true

            }

        }
    }

    Parser.prototype.data = function (tokens, token, index) {
        var node

        if (this.openCode) {

            node = {code: token.data}

            if (this.isSubformat) {
                node.sub = true
            }

            this.nodes.push(node)

        } else {
            this.nodes.push({
                data: token.data
            })

        }
    }

    function parser(tokens) {
        var instance = new Parser( tokens )

        var tokensLength = tokens.length
        var token

        while (instance.index < tokensLength) {
            token = tokens[ instance.index ]

            if (token.hasOwnProperty( 'type' )) {
                instance[ token.type ]( tokens, token, instance.index )

            } else {
                instance.data( tokens, token, instance.index )
            }

            instance.index++
        }

        return instance.nodes

    }
    // $dev

    function Formatter( nodes, input ) {
        this.input      = input
        this.str        = []
        this.nodes      = nodes
        this.formatters = {}
    }

    var FormatterProto = Formatter.prototype

    FormatterProto.add = function (name, obj) {
        this.formatters[ name ] = obj

    }


    FormatterProto.getFormatter = function ( node, index ) {
        var formatter
        var currNodes = []
        var match
        var subInstance
        var subNodes

        while(true) {

            if (node.sub) {
                // reset
                subNodes = []
                while (true) {
                    subNodes.push(node)
                    node.sub = false
                    node = this.nodes[ ++this.index ]

                    if (!(typeof node !== 'undefined' && node.hasOwnProperty('sub') && node.sub === true)) {
                        break
                    }
                }
                subInstance = new Formatter(subNodes, this.input)
                currNodes.push({
                    code: subInstance.get()
                })
            }

            currNodes.push( node )
            node = this.nodes[ ++this.index ]

            if (!(typeof node !== 'undefined' && node.hasOwnProperty('code'))) {
                --this.index
                break;
            }
        }

        if (currNodes.length === 0) {
            return false
        }

        if (/^[\d]+$/.test( currNodes[0].code )) {
            formatter = defaultFormatters.placeholder

        } else if (match = currNodes[0].code.match( /^\s*[\d]+\s*,\s*([\w]+).*$/)) {
            // console.log('type:: ', match[ 1 ]);
            formatter = defaultFormatters[ match[ 1 ] ]

        } else {
            return false
        }

        // console.log(formatter);
        var nodes = currNodes.map(function(node) {
            return node.code
        }).join('')

        return {
            method   : formatter.method,
            currNodes: nodes
        }

    }

    FormatterProto.get = function() {
        this.walk()
        return this.str.join( '' )
    }

    FormatterProto.walk = function () {
        var nodes = this.nodes
        var node
        var formatter
        var match
        this.index = 0
        var len = nodes.length
        while (this.index < len) {
            node = nodes[ this.index ]

            if (node.hasOwnProperty( 'code' )) {
                // console.log('--------', node.code);
                formatter = this.getFormatter( node, this.index )

                if (formatter) {
                    this.str.push( formatter.method( formatter.currNodes, this.input ) )

                } else {
                    // console.log('!! No formatter found');
                    return this.input
                }

            } else {
                this.str.push( node.data )

            }
            this.index++
        }

    }

    var defaultFormatters = {
        placeholder: {
            method: function (code, data) {
                return data[ code ]
            }
        },
        choice: {
            method: function (code, data) {
                var test = /^\s*([\d]+)\s*,\s*([\w]+)\s*,\s*([\s\S]*?)$/
                var choice
                var match
                var operator
                var reg     = /^([\d]+)([#<>=]{1})([\s\S]+?)$/
                var args    = code.match( test )
                var choices = args[ 3 ]
                    choices = choices.split( '|' )
                var dataIndex = args[1]

                for (var i = 0, len = choices.length; i < len; i++) {
                    choice   = choices[ i ]
                    // recursive needed here
                    match    = choice.match( reg )
                    operator = match[ 2 ]

                    switch (operator) {
                        case '#':
                            if (data[ dataIndex ] == match[1]) {
                                return match[ 3 ]
                            }
                            break

                        case '<':
                            return match[3].replace('{0,number,integer}', data[ dataIndex ])
                            break

                        case '>':
                            return match[3].replace('{0,number,integer}', data[ dataIndex ])
                    }
                }
            }
        },
        time: {
            method: function (code, data) {
                var testRe = /(\d+)\s*,\s*(time|date)\s*,?\s*[\w]*/
                var args = code.match( testRe )

                if (args[2] === 'time') {
                    return data[1].getHours() + ':' + data[1].getMinutes()
                } else {
                    return data[1].getDate() + '/' + data[1].getMonth() + 1 +'/' + data[1].getFullYear()
                }

            }
        },
        date: {
            method: function (code, data) {
                var testRe = /(\d+)\s*,\s*(time|date)\s*,?\s*[\w]*/
                var args = code.match( this.test )

                if (args[2] === 'time') {
                    return data[1].getHours() + ':' + data[1].getMinutes()
                } else {
                    return data[1].getDate() + '/' + data[1].getMonth() + 1 +'/' + data[1].getFullYear()
                }

            }
        },
        number: {
            method: function (code, data) {
                var numberRe = /([\d]+)/
                var match = code.match( numberRe )
                return data[ match[1] ]
            }
        }
    }

    return (function fn() {
        var formatters = {}

        // add the default formatters
        add('choice', defaultFormatters.choice) //No I18N
        add('placeholder', defaultFormatters.placeholder) //No I18N
        add('dateTime', defaultFormatters.dateTime) //No I18N

        function format(format) {
            var nodes  = parser( tokenizer( format ) );
            var inputs = Array.prototype.slice.call(arguments)
            inputs = inputs.splice( 1 )
            var instance = new Formatter( nodes, inputs )

            return instance.get()
        }

        function add(name, obj) {
            formatters[ name ] = obj

        }

        return {
            formatters: formatters,
            add       : add,
            format    : format
        }
    })()
})();

/*$Id$*/
var i18n = {}
i18n.get = function () {
    var args = Array.prototype.slice.call(arguments)
    if (args.length === 0) {
        return ''
    }
    // if (args.length === 1) {
    //     return langObj[ args[0] ]
    // }

    var msgFormat = langObj[ args[0] ]
    if (!msgFormat) {
        return ''
    }
    args.splice(0, 1)
    args.splice(0, 0, msgFormat)
    return hbMessageFormat.format.apply(hbMessageFormat.format, args)
}

var cms_i18n = i18n.get;

/*$Id$*/

(function() {
    'use strict';//No I18N

    var inBrowser     = typeof window !== 'undefined' && Object.prototype.toString.call(window) !== '[object Object]', //NO I18N
        undef         = undefined,
        isIE          = inBrowser && (navigator.userAgent.indexOf("MSIE") > -1);//No i18N

    function noop() {};

    var doc = inBrowser ? document : null,
        win = inBrowser ? window : global,
        docBody,
        toString = Object.prototype.toString;

    if (inBrowser) {
        docBody  = doc.body;
        toString = Object.prototype.toString;
    }

    function isIE10() {
        return isIE && ((navigator.userAgent.indexOf("MSIE 10") != -1))//NO i18N
    }


    var LIB  = {};

    LIB.core = {};

    var RE_TAG = /^[a-z-_]$/i;

    // below can also be done... but not required
    // Object.prototype.toString.call('');              // [object String]
    // Object.prototype.toString.call(1);               // [object Number]
    // Object.prototype.toString.call(true);            // [object Boolean]
    // Object.prototype.toString.call(null);            // [object Null]
    // Object.prototype.toString.call();                // [object Undefined]
    LIB.is = {
        array : function( val ) {
            return toString.call( val ) === '[object Array]';
        },

        date : function( val ) {
            return toString.call( val ) === '[object Date]';
        },

        function: function( val ) {
            return toString.call( val ) === '[object Function]';
        },

        regex : function( val ) {
            return toString.call( val ) === '[object RegExp]';
        },

        object : function( val ) {
            return toString.call( val ) === '[object Object]';
        },

        url : function( url ) {
            return /^https?:\/\/[\-A-Za-z0-9+&@#\/%?=~_|!:,.;]*[\-A-Za-z0-9+&@#\/%=~_|]/.test( url );
        }
    };//end of LIB.is

    LIB.dom = {
        /**
         * Checks if given parameter is a DOMNode
         * @param  {Node}      node     Node to be checked
         * @return {Boolean}
         */
        isNode : function(node) {
            if (typeof Node === 'object') {
                return node instanceof Node;
            }
            return node && typeof node === 'object' && typeof node.nodeType === 'number' && typeof node.nodeName === 'string'; //No I18N
        },
        selector : function stringSelector(selector, ctx) {
            var char0 = selector[0];

            if (selector.indexOf(' ') !== -1 || selector.indexOf(':') !== -1) {
                return this.getAll(selector, ctx);

            } else if (char0 === '#' && selector.lastIndexOf( '#' ) === 0) {
                return this.getById( selector.substr(1), ctx );

            } else if (char0 === '.' && selector.lastIndexOf( '.' ) === 0) {
                return this.getByClass( selector.substr(1), ctx );

            } else if (RE_TAG.test( selector )) {
                return this.getByTag(selector, ctx);
            }

            return this.getAll(selector, ctx);
        },
        get : function( selector, ctx ) {
            ctx || (ctx = doc);
            return ctx.querySelector( selector );
        },
        getAll : function( selector, ctx ) {
            ctx || (ctx = doc);
            return ctx.querySelectorAll( selector );
        },
        getByClass : function( cName, ctx ) {
            ctx || (ctx = doc);
            return ctx.getElementsByClassName( cName );
        },
        getByTag : function( tName, ctx ) {
            ctx || (ctx = doc);
            return ctx.getElementsByTagName( tName );
        },
        getById : function( id, ctx ) {
            ctx || (ctx = doc);
            return ctx.getElementById( id );
        },
        getByDataId : function(id, ctx){
            ctx || (ctx = doc);
            return ctx.querySelector('[data-element-id="'+id+'"]');//No I18N
        },
        getClasses : function( el ) {
            var m = el.className.match( /[\w-]+/g ),
                classes = [];
            if (m === null) {
                return [];
            }
            for (var i = m.length - 1; i >= 0; i--) {
                classes.push( m[i] );
            };

            return classes;
        },
        hasClass: function(el, cls) {
            var re = new RegExp('(\\s|^)' + cls + '(\\s|$)');

            return re.test(el.className);
        },
        addClass: function(el, cls) {
            if (!this.hasClass(el, cls)) {
                el.className += " " + cls;
            }
        },
        removeClass: function(el, cls) {
            var re = new RegExp('(\\s|^)' + cls + '(\\s|$)');
            if (re.test(el.className)) {
                el.className = el.className.replace(re, ' ');
            }
        },
        innerDimension: function(el) {
            return this._getBox(el, 'client'); //No I18N
        },
        outerDimension: function(el) {
            return this._getBox(el, 'offset'); //No I18N
        },
        scrollDimension: function(el) {
            return this._getBox(el, 'scroll'); //No I18N
        },
        offset: function(el) {
            var curleft = 0,
                curtop = 0;
            if (el.offsetParent) {
                curleft = el.offsetLeft;
                curtop = el.offsetTop;
                while (el = el.offsetParent) {
                    curleft += el.offsetLeft;
                    curtop += el.offsetTop;
                }
            }
            var n = {
                left: curleft,
                top: curtop
            };
            return n;
        },
        css: (function() {
            var _toUpper = function(s, l) {
                return l.toUpperCase();
            };
            var _camelCasing = function(p) {
                return p.replace(/\-(\w)/g, _toUpper);
            };
            return function(el, prop, value) {
                if (typeof value == 'undefined' && typeof prop == 'string') {
                    value = '';
                    if (doc.defaultView && doc.defaultView.getComputedStyle) {
                        value = doc.defaultView.getComputedStyle(el, '').getPropertyValue(prop);
                    } else if (el.currentStyle) {
                        if (prop == 'float') {
                            prop = 'styleFloat'; //No I18N
                        }
                        value = el.currentStyle[ _camelCasing(prop) ];
                    }
                    return value;
                }
                if (typeof prop == 'object') {
                    for (var p in prop) {
                        var v = prop[p];
                        if (p == 'float') {
                            p = el.currentStyle ? "styleFloat" : "cssFloat"; //No I18N
                        }
                        el.style[_camelCasing(p)] = v;
                    }
                } else {
                    if (prop == 'float') {
                        prop = el.currentStyle ? "styleFloat" : "cssFloat"; //No I18N
                    }
                    el.style[_camelCasing(prop)] = value;
                }
            };
        })(),
        parents: function(el) {
            var arr = [];
            el = el.parentNode;
            while (el) {
                arr.push(el);
                el = el.parentNode;
            }
            return arr;
        },
        isAncestor: function(parentNode, childNode) {
            // childNode = childNode.parentNode;
            // while (childNode) {
            //     if (parentNode === childNode) {
            //         return true;
            //     }
            //     childNode = childNode.parentNode;
            // }
            // return false;

            if (!LIB.dom.isNode( parentNode ) || !LIB.dom.isNode( childNode )) {
                return false;
            }

            if ('contains' in parentNode) {
                return parentNode.contains(childNode);
            } else {
                return parentNode.compareDocumentPosition(childNode) % 16;
            }
            return false;
        },
        findParent: function(el2, cls) {
            el2 = el2.parentNode;
            while (el2) {
                if (this.hasClass(el2, cls)) {
                    return el2;
                }
                el2 = el2.parentNode;
            }
            return false;
        },

        findParentByTag: function(el2, tag) {
            el2 = el2.parentNode;
            while (el2) {
                if (el2.tagName && (el2.tagName.toUpperCase() === tag.toUpperCase())) {
                    return el2;
                }
                el2 = el2.parentNode;
            }
            return false;
        },
        append: function(p, c) {
            p.appendChild(c);
        },
        prepend: function(p, c) {
            if (p.firstChild) {
                p.insertBefore(c, p.firstChild);
            } else {
                p.appendChild(c);
            }
        },
        insertAfter: function(newNode, referenceNode) {
            referenceNode.parentNode.insertBefore(newNode, referenceNode.nextSibling);
        },
        insertBefore: function(e1, e2) {
            var p = e1.parentNode;
            p.insertBefore(e2, e1);
        },
        // after: function(e1, e2) {
        //     var p = e1.parentNode;
        //     if (e1.nextSibling) {
        //         p.insertBefore(e2, e1.nextSibling);
        //     } else {
        //         p.appendChild(e2);
        //     }
        // },
        remove: function(e1) {
            return e1.parentNode.removeChild(e1);
        },
        text: function(el, txt) {
            el.appendChild(el.ownerDocument.createTextNode(txt));
        },
        _getBox: function(el, type) {
            var box = {
                width: el[type + 'Width'], //NO I18N
                height: el[type + 'Height'] //NO I18N
            };
            if (box.width === 0 && box.height === 0) {
                var parents = this.parents(el);
                var hiddens = [];
                var i, l;
                for (i = 0, l = parents.length; i < l; i++) {
                    var ip = parents[i];
                    if (ip.style && ip.style.display == 'none') {
                        hiddens.push(ip);
                    }
                }
                hiddens.push(el);
                var backup = [];
                for (i = 0, l = hiddens.length; i < l; i++) {
                    var h = hiddens[i];
                    backup.push({
                        position: h.style.position,
                        display: h.style.display
                    });
                    h.style.display = 'block';
                    //h.style.position='absolute';
                }
                box.width = el[type + 'Width'];
                box.height = el[type + 'Height'];
                for (i = 0, l = hiddens.length; i < l; i++) {
                    var h = hiddens[i];
                    h.style.display = backup[i].display;
                    //h.style.position=backup[i].position;
                }
            }
            return box;
        },
        getChildConts: function(contSel, el){
            var containers = [].slice.call( this.getAll(contSel, el) ), topConts = [];
            while(containers.length != topConts.length){
                var curEl = containers.pop(), len = containers.length, redundant = false;
                for(var i=len-1; i >=0; i-- ){
                    var loopEl = containers[i];
                    if(this.isAncestor(loopEl, curEl)){
                        redundant = true;
                        break;
                    }
                }
                if(!redundant){
                    topConts.push(curEl);
                    containers.unshift(curEl);
                }
            }
            return topConts;
        },
        childrenByCont: function(contSel, childSel, el){
            var conts = this.getChildConts(contSel, el), result = [], loopCont;
            for(var i=0; i < conts.length;i++){
                loopCont = conts[i];
                loopCont.childNodes.forEach(filtered);
            }
            function filtered(loopEl){
                if(loopEl.matches && loopEl.matches(childSel)){
                    result.push(loopEl);
                }
            }
            return result;
        }
    };//end of LIB.dom

    if (inBrowser) {
        

        LIB.event = {
            listeners: [],
            unloadListeners: [],
            domreadyListeners: [],
            bind: function(element, type, handler, options) {
                if (!element || !type || !handler) {
                    return;
                }
                options = options || {};
                var listener = {
                    element: element,
                    type: type,
                    etype: type,
                    handler: handler,
                    options: options
                };
                var scope = options.scope || element;
                var args = options.args;
                listener.fn = function(e) {
                    handler.call(scope, e, args);
                };
                var dot = type.indexOf('.');
                if (dot != -1) {
                    listener.etype = type = type.substring(dot + 1);
                }
                if (type === "unload" && this.unloadListener) {
                    this.unloadListeners.push(listener);
                    return;
                }
                if (element.addEventListener) {
                    element.addEventListener(type, listener.fn, false);
                } else if (element.attachEvent) {
                    element.attachEvent("on" + type, listener.fn);
                }
                this.listeners.push(listener);
                if (type === "unload" && options.scope == this) {
                    this.unloadListener = listener;
                }
            },
            unbind: function(element, type, handler) {
                if (!(element && typeof type === 'string')) {
                    return;
                }
                if (!handler) {
                    this._removeListeners(element, type);
                } else {
                    var list = (type === 'unload') ? this.unloadListeners : this.listeners; //NO I18N
                    var i = this._getListenerIndex(list, element, type, handler);
                    if (i > -1) {
                        this._removeListener(i, list);
                    }
                }
            },
            purge: function(element) {
                for (var i = this.listeners.length; i--;) {
                    var listener = this.listeners[i];
                    if (listener && (listener.element === element || LIB.dom.isAncestor(element, listener.element))) {
                        this._removeListener(i, this.listeners);
                    }
                }

            },
            target: function(e) {
                return this._getHTMLNode(e.target || e.srcElement);
            },
            relatedTarget: function(e) {
                var t = e.relatedTarget;
                if (!t) {
                    if (e.type == 'mouseout') {
                        t = e.toElement;
                    } else if (e.type == 'mouseover') {
                        t = e.fromElement;
                    }
                }
                return this._getHTMLNode(t);
            },
            _getHTMLNode: function(node) {
                while (node && node.nodeType == 3) {
                    node = node.parentNode;
                }
                return node;
            },
            dispatch : function dispatchEvent( ctx, customEventType, details, capture ) {

                function createCustomEvent( details ) {

                    var ev = null;

                    if (typeof CustomEvent === 'function') {
                        ev = new CustomEvent( customEventType, {
                                detail : details,
                                bubbles: true,
                                capture : !!capture
                            });
                    } else {
                        ev = doc.createEvent( 'CustomEvent' ); //No I18N

                        // Reference : https://msdn.microsoft.com/en-us/library/ie/ff975299%28v=vs.85%29.aspx
                        ev.initCustomEvent( customEventType, true, true, details );
                    }

                    return ev;
                }

                if (typeof ctx === 'string') {
                    capture = details;
                    details = customEventType;
                    customEventType = ctx;
                    ctx     = docBody;
                }

                var evt = createCustomEvent( details );

                // Dispatch in body if context is not specified

                ctx.dispatchEvent( evt );

            },

            fireEvent : function (element, event) {
                if (document.createEventObject) {
                    // dispatch for IE
                    var evt = document.createEventObject();
                    return element.fireEvent('on' + event, evt);      //No I18N
                } else {
                    // dispatch for firefox + others
                    var evt = document.createEvent("HTMLEvents");     //No I18N
                    evt.initEvent(event, true, true); // event type,bubbling,cancelable
                    return element.dispatchEvent( evt );
                }
            },

            pageOffset: (function() {
                if (!doc) {
                    return;
                }

                //TODO IE needs 2px cursor position.
                var standardMode = !doc.compatMode || doc.compatMode == 'CSS1Compat'; //NO I18N
                var d = standardMode ? doc.documentElement : docBody;
                return function(e) {
                    var type = e.type;
                    if (type.match(/(click|mouse|menu|drag)/i)) {
                        return {
                            x: e.pageX || e.clientX + d.scrollLeft,
                            y: e.pageY || e.clientY + d.scrollTop
                        };
                    }
                    return null;
                };

            })(),
            clientOffset: (function() {
                if (!doc) {
                    return;
                }
                var standardMode = !doc.compatMode || doc.compatMode == 'CSS1Compat'; //NO I18N
                var d = standardMode ? doc.documentElement : docBody;
                return function(e) {
                    var type = e.type;
                    if (type.match(/(click|mouse|menu)/i)) {
                        return {
                            x: (e.pageX) ? e.pageX - win.pageXOffset : e.clientX,
                            y: (e.pageY) ? e.pageY - win.pageYOffset : e.clientY
                        };
                    }
                    return null;
                };

            })(),
            isRightClick: function(e) {
                return (e.button && e.button == 2) || (e.which && e.which == 3);
            },
            mousescroll: function(handler) {
                //TODO attach single listener and call all handlers, much like unload handlers
            },
            wheelDelta: function() {
                if (type.match(/(dommousescroll|mousewheel)/i)) {
                    return (e.wheelDelta) ? e.wheelDelta / 120 : -(e.detail || 0) / 3;
                }
                return null;
            },
            isDOMLoaded : function(ctx) {//returns whether the html is parsed
                ctx || (ctx = doc);
                //IE10 fires interactive event too early, use only complete state for IE10
                var readyStateRegex = isIE10() ? /complete/ : /interactive|loaded|complete/;
               return readyStateRegex.test(ctx.readyState);
            },
            callOnLoad: function(fn, ctx) {
                ctx || (ctx = doc);
                if(this.isDOMLoaded(ctx)){//if loaded call the function
                    fn();
                } else {
                    this.bind(ctx, 'DOMContentLoaded', fn);//NO I18N
                }
            },
            checkDOMReady: function() {
                var loaded, dtimer;
                var checker = function(e) {
                    if (e && (e.type == "DOMContentLoaded" || e.type == "load")) {
                        fireDOMReady();
                    } else if (doc.readyState) {
                        if ((/loaded|complete/).test(doc.readyState)) {
                            fireDOMReady();
                        } else if (typeof doc.documentElement.doScroll == 'function') { //No I18N
                            try {
                                loaded || doc.documentElement.doScroll('left'); //No I18N
                            } catch (e) {
                                return;
                            }
                            fireDOMReady();
                        }
                    }
                };
                var fireDOMReady = function() {
                    if (!loaded) {
                        loaded = true;
                        if (doc.removeEventListener) {
                            doc.removeEventListener("DOMContentLoaded", checker, false);
                        }
                        doc.onreadystatechange = null;
                        //win.onload = null;
                        if (dtimer !== 'undefined') {
                            clearInterval(dtimer);
                        }
                        dtimer = null;
                        LIB.event._domready();
                    }
                };
                if (doc) {
                    if (doc.addEventListener) {
                        doc.addEventListener("DOMContentLoaded", checker, false);
                    } else {
                        doc.onreadystatechange = checker;
                        win.onload = checker;
                        dtimer = setInterval(checker, 5);
                    }
                }

            },
            ready: function(handler, scope) {
                var fn = function() {
                    handler.call(scope || d);
                };
                this.domreadyListeners.push(fn);
            },
            _domready: function() {
                for (var i = 0, l = this.domreadyListeners.length; i < l; i++) {
                    try {
                        this.domreadyListeners[i]();
                    } catch (e) {}
                }
            },
            _getListenerIndex: function(list, element, type, handler) {
                for (var i = list.length; i--;) {
                    var listener = list[i];
                    if (listener && listener.element === element && type === listener.type && listener.handler === handler) {
                        return i;
                    }
                }
                return -1;
            },
            _removeListeners: function(element, type) {
                for (var i = this.listeners.length; i--;) {
                    var listener = this.listeners[i];
                    if (listener && listener.element === element && ((typeof type === 'function' && listener.handler === type) || (typeof type == 'string' && type === listener.type))) {
                        this._removeListener(i, this.listeners);
                    }
                }
            },
            _removeListener: function(index, list) {
                var listener = list[index];
                list.splice(index, 1);
                if (listener.etype != 'unload') {
                    var el = listener.element;
                    if (el.removeEventListener) {
                        el.removeEventListener(listener.etype, listener.fn, false);
                    } else if (el.detachEvent) {
                        el.detachEvent("on" + listener.etype, listener.fn);
                    }
                }
                listener.fn = null;
                listener.handler = null;
                listener = null;
            },
            _unload: function(e) {
                e = e || win.event;
                var i, l;
                for (i = 0, l = this.unloadListeners.length; i < l; i++) {
                    var listener = this.unloadListeners[i];
                    if (listener) {
                        try {
                            listener.fn(e);
                        } catch (e) {}
                    }
                    listener.fn = null;
                    listener.handler = null;
                }
                for (i = this.listeners.length; i--;) {
                    this._removeListener(i, this.listeners);
                }
            }
        };

        function hasErrors (data, condition) {
            var errorOptions = LIB.ajax.errorOptions
            if (!condition) {
                condition = errorOptions && errorOptions.condition && errorOptions.condition
            }

            if (condition) {
                if (condition.call( data )) {
                    return true
                }
            }

            return false
        }

        LIB.ajax = {
            error: function (options) {
                LIB.ajax.errorOptions = options
            },
            errorTest: null,
            post: function(props) {
                props.method = 'POST'; //NO I18N
                this.request(props);
            },
            get: function(props) {
                props.method = 'GET'; //NO I18N
                this.request(props);
            },
            put: function(props) {
                props.method = 'PUT'; //NO I18N
                this.request(props);
            },
            del: function(props) {
                props.method = 'DELETE'; //NO I18N
                this.request(props);
            },
            request: function(props) {
                var url = props.url;
                if (!url) {
                    return;
                }
                var method   = props.method || "GET"; //NO I18N
                var sync     = props.sync || false;
                var params   = props.params || {};
                var headers  = props.headers || {};
                var handler  = props.handler;
                var errorOptions = props.error
                var errorHandler = errorOptions && errorOptions.handler
                var errorCondition = errorOptions && errorOptions.condition
                var args     = props.args;
                var listener = this.listener;
                var rq       = this._getTransport();

                if (!sync) {
                    rq.onreadystatechange = function() {
                        if (rq.readyState == 4) {
                            var process = true;
                            if (listener) {
                                process = listener.call(rq);
                            }
                            if (process && handler) {
                                try {
                                    if (hasErrors(rq, errorCondition)) {
                                        if (errorHandler) {
                                            errorHandler.call(rq, args)
                                        } else if (LIB.ajax.errorOptions && LIB.ajax.errorOptions.handler) {
                                            LIB.ajax.errorOptions.handler.call(rq, args)
                                        } else {
                                            handler.call(rq, args);
                                        }
                                        
                                    } else {
                                        handler.call(rq, args);    
                                    }
                                    
                                } catch (e) {}
                            }
                            rq = null;
                        }
                    };
                }

                var data;
                if (typeof params == 'object') {
                    var v = [];
                    for (var p in params) {
                        v.push(encodeURIComponent(p) + '=' + encodeURIComponent(params[p]));
                    }
                    if (v.length > 0) {
                        data = v.join('&');
                    }
                } else if (typeof params === 'string') { //No I18N
                    data = params;
                }
                if (method === "GET" && data) {
                    url += ((url.indexOf('?') + 1) ? '&' : '?') + data;
                }
                rq.open(method, url, !sync);
                // set headers
                for (var h in headers) {
                    rq.setRequestHeader(h, headers[h]);
                }
                if (method !== 'GET') {
                    if (props.bodyJSON) {
                        rq.setRequestHeader('Content-Type', 'application/json;charset=UTF-8');
                        data = JSON.stringify(props.bodyJSON);
                    } else {
                        rq.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded;charset=UTF-8');
                        //rq.setRequestHeader("Content-length", params.length);
                        //rq.setRequestHeader("Connection", "close");
                    }
                }
                if (props.credential) {
                    rq.withCredentials = true;
                }

                rq.send(data);

            },
            _getTransport: function() {
                if (win.XMLHttpRequest) {
                    return new XMLHttpRequest();
                }
                if (win.ActiveXObject) {
                    try {
                        return new ActiveXObject('Microsoft.XMLHTTP');
                    } catch (e) {
                        try {
                            return new ActiveXObject('Msxml2.XMLHTTP');
                        } catch (e) {
                            throw new Exception('Browser not supported'); //No I18N
                        }
                    }
                }
            }
        };

        LIB.event.bind(win, 'unload', LIB.event._unload, {
            scope: LIB.event
        });

        LIB.event.checkDOMReady();

        LIB.CX = (function( win, doc ) {
            var initialisedTargets = [],
                channels           = [];

            (function() {

                // onload send message to parent of iframes
                win.addEventListener( 'load', function init() {
                    var frames = doc.getElementsByTagName( 'iframe' );

                    // dispatch to parent that it has been loaded
                    parent && parent !== win && parent.postMessage( 'CX_load__' + this.location.origin, '*' ); //NO I18N

                    // dispatch to all iframes that it has been loaded
                    for (var i = frames.length - 1; i >= 0; i--) {
                        frames[i].contentWindow.postMessage( 'CX_load__' + this.location.origin, '*' ); //NO I18N
                    }

                    doc.removeEventListener( 'DOMContentLoaded', init);
                });

                // listen to load messages from parent or iframes
                win.addEventListener( 'message', function _handlePostMsgReady( event ) {

                    if (!CX.defaultHandlers) {
                        return;
                    }

                    // for default handlers
                    var data = unserialize( event.data );
                    if ( $IS.object( data ) ) {

                        if (!CX.defaultHandlers[ data.requestId ]) {
                            return;
                        }

                        if (!CX.defaultHandlers[ data.requestId ].handler) {
                            return;
                        }

                        if (!hasErrors(data, CX.defaultHandlers[ data.requestId ].error)) {
                            // if no error, call the request handler
                            CX.defaultHandlers[ data.requestId ].handler.call( data, CX.defaultHandlers[ data.requestId ].args );    
                        } else {
                            // has error
                            // if errorHandler present, call it
                            if (CX.defaultHandlers[ data.requestId ].errorHandler) {
                                CX.defaultHandlers[ data.requestId ].errorHandler.call( data, CX.defaultHandlers[ data.requestId ].args)
                            
                            } else {

                                if (CX.errorOptions && CX.errorOptions.handler) {
                                    CX.errorOptions.handler.call( data, CX.defaultHandlers[ data.requestId ].args)
                                } else {
                                    // dispatch an event
                                    $E.dispatch(document, 'lib:xhrError', {//NO i18n
                                        responseText: data.responseText
                                    })    
                                }
                                
                            }
                        }
                        
                        return;
                    }

                    if (/^CX_load__/.test( event.data )) {
                        initialisedTargets.push( event.origin );

                        // console.log( 'CX READY : ', event.origin );
                        for (var i = channels.length - 1; i >= 0; i--) {
                            if (channels[i].origin === event.origin) {
                                // console.log('DISPATCHING QUEUED messages on >>> ' , event.origin);
                                channels[i].targetReady = true;
                                channels[i].dispatchQueuedMsg();
                                channels.splice(i, 1);
                            }
                        }
                    }
                });

            })();

            function hasErrors (data, errorOptions) {
                var condition
                if (errorOptions && errorOptions.condition) {
                    condition = errorOptions.condition
                } else {
                    condition = CX.errorOptions && CX.errorOptions.condition   
                }

                if (condition && condition.call( data )) {
                    return true
                }

                return false

            }

            function guid() {
                function s4() {
                    return Math.floor((1 + Math.random()) * 0x10000)
                        .toString(16)
                        .substring(1);
                }

                return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
                    s4() + '-' + s4() + s4() + s4();
            }

            function serialize( obj ) {
                // Already serialized
                if (getType( obj ) === 'String') {
                    return obj;
                }

                return JSON.stringify( obj );
            }

            function unserialize( value ) {
                var parsed = null;
                try {
                    parsed = JSON.parse( value );
                } catch (e) {
                    return value;
                }

                return parsed;
            }

            function getTargetWindow( target ) {
                var type = getType( target );
                if (type === 'HTMLIFrameElement') {
                    return target.contentWindow;

                } else if (type === 'global' || type === 'Window' || type === 'Object') { //NO I18N
                    return target;

                }

                throw new Error( 'Provide a valid target !!' ); //NO I18N

            };

            function _postDelegation(event) {
                var data     = null,
                    handlers = null;

                if (this.origin === event.origin) {

                    data = this._.unserialize( event.data );
                    this.winHandler && this.winHandler.call( this, event, data.data );

                    if ( this._.getType( data ) === 'Object' && data.msgType && this.handlers[ data.msgType ]) {
                        handlers = this.handlers[ data.msgType ];
                        handlers.forEach(function( fn ) {
                            fn.call( this, event, data.data );
                        });
                    }
                }
            }

            function getType( variable ) {
                return Object.prototype.toString.call( variable ).match( /^\[object (\w+)\]$/ )[1];
            };


            function CX( config ) {

                this.ctx           = config.ctx || win;
                this.origin        = config.targetOrigin;
                this.target        = config.target;
                this.winHandler = config.winHandler; // One function that will intercept all messages from the targetFrame
                this.handlers      = {};
                this.targetReady   = initialisedTargets.indexOf( config.targetOrigin ) !== -1;
                this.queuedMsgs    = [];
                this.initialise();

                channels.push( this );
            }

            CX.prototype._ = {};

            CX.prototype.initialise = function() {
                this.ctx.addEventListener('message', _postDelegation.bind( this ));
            };

            CX.prototype._.getType = getType;

            CX.prototype._.serialize = serialize;

            CX.prototype._.unserialize = unserialize;

            CX.prototype._.getTargetWindow = function( target ) {
                var type = this.getType( target );
                if (type === 'HTMLIFrameElement') {
                    return target.contentWindow;

                } else if (type === 'global') { //NO I18N
                    return target;

                }

                throw new Error( 'Provide a valid target !!' ); //NO I18N

            };

            CX.prototype.dispatchQueuedMsg = function() {
                for (var i = 0, len = this.queuedMsgs.length; i < len; i++) {
                    this.dispatchMessage( this.queuedMsgs[i].msgType, this.queuedMsgs[i].data );
                }

                this.queuedMsgs = null;
            };

            CX.prototype.dispatchMessage = function( msgType, message ) {
                // need to serialize object, since IE9 doesnot support Object

                var data = {
                    msgType : msgType,
                    data    : message
                };

                if ( !this.targetReady ) {
                    this.queuedMsgs.push(data);
                    return;
                }

                this._.getTargetWindow( this.target ).postMessage( this._.serialize( data ), this.origin );
            };

            CX.prototype.bind = function(messageType, handlerFunction) {

                // If messageType is new, create an array
                if (!this.handlers[ messageType ]) {
                    this.handlers[ messageType ] = [];
                }

                // push the handler to its messageType array
                this.handlers[ messageType ].push( handlerFunction );

            };

            CX.prototype.unbind = function( messageType, handlerFunction ) {
                if ( !this.handlers[ messageType ] ) {
                    // nothing to unbind
                    return;
                }


                for (var i = this.handlers[ messageType ].length - 1; i >= 0; i--) {
                    if (this.handlers[ messageType ][i] === handlerFunction) {
                        // remove that function
                        this.handlers[ messageType ].splice( i, 1 );
                    }
                }

                if (this.handlers.messageType.length === 0) {
                    // no handler function associated with this messageType,
                    // so remove this key
                    delete this.handlers.messageType;
                }
            }

            CX.initDefaultChannel = function(target, targetOrigin, defaultHandler) {

                CX.defaultChannel = {
                    target        : target,
                    targetOrigin  : targetOrigin,
                    defaultHandler: defaultHandler
                };

                CX.defaultHandlers = {};

                win.addEventListener('message', _postDelegationDefault.bind( CX.defaultChannel ));
            };

            CX.error = function (options) {
                CX.errorOptions = options
            }


            function _postDelegationDefault(event) {
                var data = unserialize( event.data ),
                    handlers = null;

                if (CX.defaultChannel.targetOrigin.indexOf( event.origin ) === -1) {
                    return;
                }

                if (data.msgType === 'default-channel') {
                    CX.defaultChannel.defaultHandler({
                        method   : data.cxType,
                        data     : data.data,
                        requestId: data.requestId
                    });
                }

                // CX.defaultChannel.defaultHandler && CX.defaultChannel.defaultHandler.call(null, data);

            }

            CX.post = function _post(options) {
                this.request(options, 'post');//NO I18N
            };

            CX.get = function _post(options) {
                this.request(options, 'get');//NO I18N
            };

            CX.put = function _post(options) {
                this.request(options, 'put');//NO I18N
            };

            CX.delete = function _post(options) {
                this.request(options, 'delete');//NO I18N
            };

            CX.request = function _post(options, method) {
                var uuid = guid();
                CX.defaultHandlers[ uuid ] = {
                    handler: options.handler,
                    error  : options.error,
                    args   : options.args
                };


                // need to serialize object, since IE9 doesnot support Object

                var data = {
                    cxType    : method,
                    requestId : uuid,
                    msgType   : 'default-channel',  //NO I18N
                    data      : options
                };

                // if ( !this.targetReady ) {
                //     this.queuedMsgs.push(data);
                //     return;
                // }
                getTargetWindow( CX.defaultChannel.target ).postMessage( serialize( data ), CX.defaultChannel.targetOrigin );
            };

            CX.dispatch = function( data ) {
                getTargetWindow( CX.defaultChannel.target ).postMessage( serialize( data ), CX.defaultChannel.targetOrigin );
            };


            return CX;

        })( win, document );


        if (win.$ === null || win.$ === undefined) {
            win.$ = LIB.dom.selector.bind( LIB.dom );

        } else {
            LIB.dollar = win.$;

        }
        //add the polyfills here
        (function PolyFills(argument) {
            //NodeList.forEach
            if (window.NodeList && !NodeList.prototype.forEach) {
                NodeList.prototype.forEach = function (callback, argument) {
                    argument = argument || window;
                    for (var i = 0; i < this.length; i++) {
                        callback.call(argument, this[i], i, this);
                    }
                };
            }
        })()

        LIB.noConflict = function() {
            win.$ = LIB.dollar;
        };

        // Shortcut aliases
        win.$U = LIB.util;
        win.$D = LIB.dom;
        win.$E = LIB.event;
        win.$X = LIB.ajax;
        win.$CX = LIB.CX;
        win.$IS = LIB.is;
    } else {
        win.$IS = LIB.is
        win.$D = LIB.dom
    }

})();


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


/*$Id$*/
var zsApp = (function() {
    'use strict';

    var APP_SELECTOR = '[data-zs-app]'; //NO I18N
    var APPS_JS_PATH = "/appjs/";//No I18N
    var domLoaded = false;
    var boundFnRef = {};
    var containerApps = [];
    var hash;
    var app_count = 0;
    var window_scrolled = false;

    // observe dom loaded
    function _domLoad() {
        document.removeEventListener('DOMContentLoaded', _domLoad, true);
        domLoaded = true;
        initAppEnv(false);
    }

    function  freeze(obj) {
        Object.freeze(obj)
    }

    if (/interactive|complete/.test(document.readyState)) {
        _domLoad();

    } else {
        document.addEventListener('DOMContentLoaded', _domLoad, true);

    }


    function initAppEnv(reinit, ctx ) {
        ctx = ctx || document;
        var appNodes = ctx.querySelectorAll( APP_SELECTOR );
        appNodes = Array.prototype.slice.call(appNodes)
        if(ctx.matches && ctx.matches(APP_SELECTOR)){
            appNodes.push(ctx)
        }
        var app_name,
            manifest,
            curAppNode,
            module,
            scriptEl,
            boundFn;

        /* Fix for proper page anchor navigation when page has apps */
        if(window.zs_rendering_mode === 'canvas' || window.zs_rendering_mode === 'live') {
            app_count = appNodes.length;

            if(app_count > 0 && location.hash) {
                hash = location.hash;
                location.hash = "";
                window.addEventListener("scroll", setScroll);
            }
        }

        for (var i = appNodes.length - 1; i >= 0; i--) {

            curAppNode = appNodes[i]
            app_name = curAppNode.getAttribute( 'data-zs-app' );
            manifest = app_manifest[ app_name ];

            if (!manifest) {
                throw "Module not defined in manifest!"; //NO I18N
            }
            
            module = manifest.module;
            if(!reinit){
                if(manifest.containerApp){
                    var container_app_data = {
                        name : app_name,
                        app : curAppNode,
                        info : {
                            el : curAppNode,
                            type : {
                              category : '',
                              label : 'App',//NO I18N
                              subType : app_name,
                              type : 'app',//NO I18N
                              containerApp : true
                            }
                        }
                    }
                    freeze(container_app_data.info)
                    freeze(container_app_data)
                    containerApps.push(container_app_data)
                }
            }

            if (window[ module ]) {
                //setTimeout(function() {
                    window[ module ].init( curAppNode , setAppProxy({}, curAppNode));
                //}, 0);
                
            } else {
                // load and then init
                if(manifest.assets.js.site){
                    scriptEl = document.createElement( 'script' );
                    boundFn = onScriptLoad.bind( scriptEl, curAppNode, module );
                    scriptEl.addEventListener('load', boundFn);
                    boundFnRef[ module ] = boundFn;
                    scriptEl.src = APPS_JS_PATH + manifest.assets.js.site;
                    document.head.appendChild( scriptEl );
                }
            }
        }
    }

    function onScriptLoad(node, module) {
        window[ module ].init( node , setAppProxy({}, node));
        this.removeEventListener('load', boundFnRef[ module ]);
    }

    function setAppProxy(data , el){
        data.util = {
            hasClass : appHasClass.bind(el),
            getData : getAppDataAttr.bind(el)
        };
        data.el = el;
        data.loaded = afterAppLoad.bind(null, data)
        return data;
    }

    function afterAppLoad (data, cb) {
        var hero = data.el.closest('.hero-container') //NO I18N
        /** If app is in hero, hero rezised and then callback is executed after app load **/
         if(hero) {
            zsSlider.resize(hero, cb)
         } else {
            cb && cb(); //If app is in page content callback executed after app load
         }
        /** Navigates to anchor set once the apps in the page are loaded (if user has not scrolled) **/
        if(window.zs_rendering_mode === 'canvas' || window.zs_rendering_mode === 'live') {
            app_count--;
            if(app_count == 0) {
                if(typeof(hash) != 'undefined' && !window_scrolled) {
                    window.location.hash = hash;
                }
            }
        }
        $E.dispatch(data.el, 'app:loaded') //NO I18N
    }

    /** Scroll set when user scrolls the page **/
    function setScroll() {
        window_scrolled = true;
        window.removeEventListener("scroll", setScroll);
    }

    function getAppDataAttr(name) {
        return this.getAttribute('data-'+name)//No I18N
    }

    function appHasClass (className) {
        return $D.hasClass(className, this)
    }

    return {
        init: initAppEnv.bind(null, false),
        reinit : initAppEnv.bind(null, true),
        afterLoad : afterAppLoad,
        containerApps : containerApps
    };

})();


/*$Id$*/
var CreatorForms = (function(){

    "use strict"; //NO I18N
    var form_submitted,
        form_access_type,
        scriptLoaded = false,
        scriptLoading = false,
        form_divs = [],
        form_data = [],
        jquerySrc = (/Trident\/|MSIE/.test(window.navigator.userAgent)) ? "/siteforms/appcreator/live/common/js/jqueryie.js":"/siteforms/appcreator/live/common/js/jquery.js", //NO I18N
        scriptSrc = [jquerySrc,"/siteforms/appcreator/live/common/js/form.js","/siteforms/appcreator/live/common/js/generatejs.js","/siteforms/appcreator/live/common/js/searchableInput.js","/siteforms/appcreator/live/common/js/app.js","/siteforms/appcreator/live/common/js/securityutil.js"]; //NO I18N

    function loadScript(src){
        scriptLoading = true;
        var script =document.createElement('script');
        document.head.appendChild( script );
        script.src = src;
        script.onload = function(){
            if(scriptSrc.length >0){
                loadScript(scriptSrc.shift());
            }
            else{
                scriptLoaded = true;
                for(var i=0; i<form_divs.length; i++){
                    renderForm(form_divs[i],form_data[i]);
                }
                setFormSubmitRes();
            }
        }
    }

    function checkIfScriptLoaded(node, data){
        node.innerHTML = "<h4 align='center'>" + i18n.get('forms.common.loading') + "</h4>";
        data.next && data.next();
        if(window.zs_rendering_mode == "live"){
            if(!scriptLoaded){
                form_divs.push(node);
                form_data.push(data);
                !scriptLoading && loadScript(scriptSrc.shift());
            }else{
                renderForm(node, data);
            }
        }else{
            renderForm(node, data);
        }
    }

    function renderForm(node, data){
        var params = {};
        params.formId = node.getAttribute("data-app-sub-type");
        $X.get({
            url     : '/siteapps/forms', //NO I18N
            params  : params,
            handler : renderFormRes,
            args    : {node: node, data: data}
        });
    }

    function renderFormRes(args){
        var node = args.node;
        var response = this.responseText;
        node.innerHTML = response;
        var formEle = node.getElementsByTagName("form")[0];
        loadCaptcha(formEle, args.data);
        if(window.zs_rendering_mode == "live"){
            if(response != ""){
                i18n.selectOption = i18n.get("forms.common.optionselect");
                i18n.invalidmsg = i18n.get("forms.error.msg");
                i18n.pleasewait = i18n.get("forms.wait.msg");
                bindFormEvents(formEle);
                ZCForm.inZohoCreator = false;
                var onLoadExist = formEle.getAttribute("onLoadExist");
                var appLinkName = node.querySelector("input[name=appLinkName]").getAttribute("value"); //NO I18N
                var formLinkName = node.querySelector("input[name=formLinkName]").getAttribute("value"); //NO I18N
                var formDispName = formEle.getAttribute("dispname");
                var formAccessType = node.querySelector("input[name=recType]").getAttribute("value"); //NO I18N
                var formID = node.querySelector("input[name=formid]").getAttribute("value"); //NO I18N
                ZCForm.zcFormAttributes.genScriptURL = "/siteforms/generateJS.do"; //NO I18N
                ZCForm.zcFormAttributes.formParentDiv = false;
                ZCForm.zcFormAttributes.customCalendar = true;
                ZCForm.zcFormAttributes.browseralert = false;
                ZCForm.zcFormAttributes.ajaxreload = true;
                ZCForm.zcFormAttributes.fieldContainer = "div"; //NO I18N
                ZCForm.zcFormAttributes.eleErrTemplate = "<div class=\"zpform-errormsg\" tag=\"eleErr\"> insertMessage </div>";
                relodCurrentForm = false;
                var paramsMapString = "formID=" + formID + ",appLinkName=" + appLinkName + ",formDispName="+ formDispName + ",formAccessType=1,formLinkName="+formLinkName; //NO I18N
                ZCForm.addToFormArr(paramsMapString, formLinkName);
                if(onLoadExist === "true"){
                    doActionOnLoad(formID, ZCForm.getForm(formLinkName, formAccessType));
                }else{
                    ZCForm.enableForm(formLinkName,formAccessType);
                }
                ZCForm.regFormEvents(formLinkName,formAccessType);
            }
        }
        else{
            var formEle = node.getElementsByTagName("form")[0];
            cancelEvent(formEle,"submit"); //NO I18N
            var elname = formEle.getAttribute("elname")+"_fileUpload"; //NO I18N
            var fileElements = document.querySelectorAll("[data-element-id="+elname+"]"); //NO I18N
            for(var i=0;i<fileElements.length;i++){
                cancelEvent(fileElements[i],"click"); //NO I18N
            }
        }
    }

    function cancelEvent(element,event){
        element.addEventListener(event,function(e){
            e.preventDefault();
        });
    }

    function loadCaptcha(formEle, data){
        if(formEle){
            var afterAppLoad = data.loaded;
            var time = new Date().getTime();
            var formid = formEle.querySelector("input[name=formid]").getAttribute("value"); //NO I18N
            var captchaElName = formEle.getAttribute("elname")+"_captcha"; //NO I18N
            var captchaEl = formEle.querySelector("[elname='zc-captcha']"); //NO I18N
            if(captchaEl){
                captchaEl.src = "/siteforms/getcaptcha.do?time="+time+"&formid="+formid; //NO I18N
                zsUtils.onImageLoad(captchaEl.parentNode, afterAppLoad);
            } else {
                afterAppLoad();
            }
        }
    }

    function bindFormEvents(formEle){
        formEle.addEventListener("submit",function(e){
            form_submitted = formEle.getAttribute("elname");
            form_access_type = formEle.querySelector("input[name=recType]").getAttribute("value"); //NO I18N
        });
        //Datepicker events
        var dateTimeElName = formEle.getAttribute("elname")+"_datetime"; //NO I18N
        var dateTimeElements = formEle.querySelectorAll("[data-element-id="+dateTimeElName+"]"); //NO I18N
        for(var i=0;i<dateTimeElements.length;i++){
            bindEvents(dateTimeElements[i],"datetime"); //NO I18N
        }
        var dateElName = formEle.getAttribute("elname")+"_date"; //NO I18N
        var dateElements = formEle.querySelectorAll("[data-element-id="+dateElName+"]"); //NO I18N
        for(var i=0;i<dateElements.length;i++){
            bindEvents(dateElements[i],"date"); //NO I18N
        }
        //File upload events
        bindFileUpload(formEle.getAttribute("elname")+"_fileUpload",false); //NO I18N
        var fileRemoveElName = formEle.getAttribute("elname")+"_fileRemove"; //NO I18N
        var fileRemoveElements = formEle.querySelectorAll("[data-element-id="+fileRemoveElName+"]"); //NO I18N
        for(var i=0;i<fileRemoveElements.length;i++){
            bindEvents(fileRemoveElements[i],"fileremove"); //NO I18N
        }
    }

    function bindEvents(element,type){
        switch(type){
                case "date" : //NO I18N
                    element.addEventListener("click",function(event){
                        datepickerJS.init(event.currentTarget,'date'); //NO I18N
                    });
                   break;
                case "datetime" : //NO I18N
                    element.addEventListener("click",function(event){
                        datepickerJS.init(event.currentTarget,'datetime'); //NO I18N
                    });
                   break;
                case "fileupload" : //NO I18N
                    element.addEventListener("change",function(event){
                        ZCForm.browseAttachEvent(event.target);
                    });               
                   break;
                case "fileremove" : //NO I18N
                    element.addEventListener("click",function(event){
                        ZCForm.removeUploadedFile(event.currentTarget);
                    });
                   break;
        }
    }

    function bindFileUpload(elname,clear_file_input){
        var fileElements = document.querySelectorAll("[data-element-id="+elname+"]"); //NO I18N
        for(var i=0;i<fileElements.length;i++){
            if(clear_file_input){
                fileElements[i].previousElementSibling.value = ""; //NO I18N
                fileElements[i].setAttribute("zc-Attached-Type","browse");
                fileElements[i].setAttribute("zc-DocId","");
                fileElements[i].setAttribute("isAttached","false");
                fileElements[i].setAttribute("changed","false");
                fileElements[i].value = ""; //NO I18N
            }
            bindEvents(fileElements[i],"fileupload"); //NO I18N
        }
    }

    function setFormSubmitRes(){
        if(window.ZCApp){
            window.ZCApp.contextPath = "/siteforms";// No I18N
            if(window.ZCForm){
                ZCForm.callbackFunc = function(formLinkName, formAccessType, paramsMap, infoMsg, errorMsg, succMsg, succMsgDuration){
                    if(!formLinkName){
                        return;
                    }
                    var msgElId = "formMsg_"+formLinkName; //NO I18N
                    var formMsgEle = document.querySelector("[data-element-id="+msgElId+"]"); //NO I18N
                    formMsgEle.style.color = "green";
                    var successMsg = (succMsg==="zc_success")?"":succMsg;//NO I18N
                    formMsgEle.innerText = successMsg;
                    formMsgEle.parentNode.style.display = "";
                    setTimeout(function(){formMsgEle.parentNode.style.display="none"}, 5000);
                    var formElem = fnGetElementByAttribute("elname", formLinkName, "form");//NO I18N
                    formElem.reset();
                    relodCurrentForm = false;
                    bindFileUpload(formLinkName+"_fileUpload",true); //NO I18N
                    loadCaptcha(formElem);
                    ZCForm.regFormEvents(formLinkName,form_access_type);
                }
                ZCApp.showErrorDialog = function(headerMsg, message){
                    var msgElId = "formMsg_"+form_submitted; //NO I18N
                    var formMsgEle = document.querySelector("[data-element-id="+msgElId+"]"); //NO I18N
                    formMsgEle.style.color = "red";
                    formMsgEle.innerText = message;
                    formMsgEle.parentNode.style.display = "";
                    setTimeout(function(){formMsgEle.parentNode.style.display="none"}, 5000);
                    bindFileUpload(form_submitted + "_fileUpload",false); //NO I18N
                }
                ZCForm.showFieldErr = function(fieldEl, errMsg){
                    var errEl = ZCForm.zcFormAttributes.eleErrTemplate;
                    errEl = errEl.replace("insertMessage", errMsg);
                    var parentEl = ZCUtil.getParent(fieldEl, this.zcFormAttributes.fieldContainer);
                    parentEl[0].innerHTML += errEl;
                    var field_type = fieldEl.attr("fieldtype"); //NO I18N
                    switch(field_type){
                        case "10" :
                            var date_element = parentEl[0].querySelector("[data-element-id="+form_submitted+"_date"+"]"); //NO I18N
                            bindEvents(date_element,"date"); //NO I18N
                            break;
                        case "18" : 
                            var file_element = parentEl[0].querySelector("[data-element-id="+form_submitted+"_fileUpload"+"]"); //NO I18N
                            file_element.addEventListener("change",function(e){
                                ZCForm.browseAttachEvent(file_element);
                            });
                            var file_remove_element = parentEl[0].querySelector("[data-element-id="+form_submitted+"_fileRemove"+"]"); //NO I18N
                            file_remove_element.addEventListener("click",function(event){
                                ZCForm.removeUploadedFile(file_remove_element);
                            });
                            ZCForm.regFormEvents(form_submitted,form_access_type);
                            break;
                        case "22" :
                            var date_element = parentEl[0].querySelector("[data-element-id="+form_submitted+"_datetime"+"]"); //NO I18N
                            bindEvents(date_element,"datetime"); //NO I18N
                    }
                }
                ZCForm.removeUploadedFile = function(fileEl){
                    if(fileEl instanceof jQuery){
                        fileEl = fileEl.context;
                    }
                    var parent = fileEl.parentNode,
                        fileInputEl = parent.querySelector("input[type=file]"); //NO I18N
                    fileInputEl.setAttribute("zc-Attached-Type","browse");
                    fileInputEl.setAttribute("zc-DocId","");
                    fileInputEl.setAttribute("isAttached","false");
                    fileInputEl.value = ""; //NO I18N
                    var fileInputElClone = fileInputEl.cloneNode(false);
                    parent.replaceChild(fileInputElClone,fileInputEl);
                    var fileRemoveElement = fileInputElClone.nextElementSibling;
                    $D.css(fileRemoveElement,"display","none");
                    parent.querySelector("input[subtype=file]").value = ""; //NO I18N  
                    fileInputElClone.addEventListener("change",function(e){
                        fileInputElClone.setAttribute("changed","changed");
                        ZCForm.browseAttachEvent(fileInputElClone);
                    });
                }
            }
        }
        window.openWindowTask = function(urlString, windowType, windowSpecificArgument){
            if(windowType == "New window"){
                window.open(urlString, "_blank");
            }
            else if(windowType == "Parent window"){
                window.open(urlString, "_parent");
            }
            else if(windowType == "Same window"){
                window.location.href = urlString;
            }
        }
        window.clearComponent = function(formName, fieldName, recType){
            var el = ZCForm.clearField(formName, fieldName, recType);
            if(!el){
                var divElName = formName+"-"+fieldName+"div"; //NO I18N
                var divEl=document.querySelector("[data-element-id="+divElName+"]") //NO I18N
                if(divEl && ((divEl.getAttribute("fieldtype")=="radio") || (divEl.getAttribute("fieldtype")=="checkbox"))){
                    divEl.innerHTML="";
                }
            }
            if($(el).attr("type") == "picklist" || $(el).attr("type") == "select-one")
            {
                $(el).append(ZCUtil.createElem("option", "value=-Select-", "-"+i18n.selectOption+"-"));
            }
            if(!form_element[el])
            {
                form_element[el]=el;
            }
        }
        window.addValueToTheFieldElem = function(formName, fieldName, value, recType, combinedValue, isAppend){
            var fieldElem = document.getElementById( formName + ":" + fieldName + "_recType_comp" );
            var divElName = formName+"-"+fieldName+"div"; //NO I18N
            var divEl=document.querySelector("[data-element-id="+divElName+"]"); //NO I18N
            if(divEl){
                if((divEl.getAttribute("fieldtype")=="radio") || (divEl.getAttribute("fieldtype")=="checkbox")){
                    sitesadd(formName, fieldName, value, divEl.getAttribute("fieldtype"), recType, divEl);
                }
                else{
                    addValue(formName, fieldName, fieldElem, value, recType, combinedValue, null,null,isAppend);
                }
            }
        }
        var sitesadd = function(formName, fieldName, value, type, recType, e){
            var id=type+"El_"+fieldName+"_"+value+"_"+recType;//NO I18N
            var inputEl = $("<input id=\""+id+"\" name=\""+fieldName+"\" formcompid=\""+$(e).attr("formcompid")+"\"delugetype=\""+$(e).attr("delugetype")+"\" onchangeexists=\""+$(e).attr("onchangeexists")+"\"  fieldtype=\""+$(e).attr("fieldtypeno")+"\" value=\""+value+"\" isformulaexist=\""+$(e).attr("isformulaexist")+"\" type=\""+type+"\"/><label>"+value+"</label>"); //NO I18N
            var choiceDiv = document.createElement("div");
            choiceDiv.className = "zpform-choice-container"; //NO I18N
            choiceDiv.appendChild(inputEl[0]);
            choiceDiv.appendChild(inputEl[1]);
            $(e).append(choiceDiv);
        }
        window.docid = function(A){
            return document.getElementById(A);
        }
    }

    var fnGetElementByAttribute = function(attrName, attrValue, tagName){
        var attrElem;
        var elems;
        var elemArr = document.getElementsByTagName(tagName);
        for(var j=0; j<elemArr.length; j++){
            elems = elemArr[j];
            var eleAttr = elems.getAttribute(attrName);
            if(eleAttr && eleAttr==attrValue){
                attrElem = elems;
                break;
            }
        }
        return attrElem;
    }

    return {
        init  : checkIfScriptLoaded
    };
})();


/*$Id$*/
//MODULE: carousel
//Filename: carousel.js

var carousel= (function(){


	function bindAllCarouselElement(){
		var carouselElements = document.body.querySelectorAll(".zpelem-carousel"); //NO I18N
		for(var i=0; i<carouselElements.length; i++){
			var carouselElement=carouselElements[i];
			bindCarousel(carouselElement);
		}		
	}

	function bindCarousel(carouselElement){
		var arrowLeft= $D.getByClass("zpcarousel-arrow-left",carouselElement)[0];
		var arrowRight= $D.getByClass("zpcarousel-arrow-right",carouselElement)[0];
		$E.bind(arrowLeft,"click", carouselPrevious);
		$E.bind(arrowRight,"click", carouselNext);
		var carouselControllers = $D.getByClass("zpcarousel-controller",carouselElement);
		bindCarouselControllers(carouselControllers);
		setSlideActive(carouselElement, 0);
	}

	function bindCarouselControllers(carouselControllers){
		for(var i = 0; i < carouselControllers.length; i++){
			$E.bind(carouselControllers[i],"click", controllerClick);
		}
	}

	var controllerClick = function(){
		var newIndex = this.getAttribute("data-slide-index");
		var carouselElement = $D.findParent(this,"zpelem-carousel");
		setSlideActive(carouselElement, newIndex);
	}

	var carouselNext = function(){
		//set the next element as active
		var carouselElement = $D.findParent(this,"zpelem-carousel");
		var curIndex = carouselElement.getAttribute("data-currentslide-index");
		var carouselContents = $D.getByClass("zpcarousel-content",carouselElement);
		var contentLength = carouselContents.length;
		var newIndex = 0;
		if( curIndex < contentLength - 1){
			newIndex = parseInt(curIndex) + 1;
		}else if( curIndex == contentLength - 1){
			newIndex = 0;
		}
		setSlideActive(carouselElement, newIndex);
	}

	var carouselPrevious = function () {
		var carouselElement = $D.findParent(this,"zpelem-carousel");
		var curIndex = carouselElement.getAttribute("data-currentslide-index");
		var carouselContents = $D.getByClass("zpcarousel-content",carouselElement);
		var contentLength = carouselContents.length;
		var newIndex = 0;
		if( curIndex > 0 ){
			newIndex = parseInt(curIndex) - 1;
		}else if(curIndex == 0){
			newIndex = contentLength - 1;
		}
		setSlideActive(carouselElement, newIndex);
	}

	function setSlideActive(carouselElement,newIndex){
		var carouselControllers = getCarouselControllers(carouselElement);
		var carouselContents = getCarouselContents(carouselElement);
		unSelectAllSlide(carouselContents, carouselControllers);
		selectSlide(carouselElement, carouselContents, carouselControllers, newIndex);
	}

	function unSelectAllSlide(carouselContents, carouselControllers){
		for(var i=0; i<carouselControllers.length; i++ ){
			var carouselController=carouselControllers[i];
			if($D.hasClass(carouselController, "zpcarousel-controller-active")){
				$D.removeClass(carouselController, "zpcarousel-controller-active");
			}
		}
		for(var i=0; i<carouselContents.length; i++ ){
			var carouselContent=carouselContents[i];
			carouselContent.style.display="none";
			if($D.hasClass(carouselContent, "zpcarousel-content-active")){
				$D.removeClass(carouselContent, "zpcarousel-content-active");
			}
		}
	}

	function selectSlide(carouselElement, carouselContents, carouselControllers, newIndex){
        if(!$D.hasClass(carouselControllers[newIndex], "zpcarousel-controller-active")){
            $D.addClass(carouselControllers[newIndex], "zpcarousel-controller-active");
		}
        if(!$D.hasClass(carouselContents[newIndex], "zpcarousel-content-active")){
            $D.addClass(carouselContents[newIndex], "zpcarousel-content-active");
		}					
		carouselContents[newIndex].style.display="block";
		carouselElement.setAttribute("data-currentslide-index", newIndex);
	}

	function getCarouselControllerCont(carouselElement){
		return $D.getByClass("zpcarousel-controller-container",carouselElement);
	}

	function getCarouselControllers(carouselElement){
		return $D.getByClass("zpcarousel-controller",carouselElement);
	}

	function getCarouselContents(carouselElement){
		return $D.getByClass("zpcarousel-content",carouselElement);
	}

	function bindInitialElms(){
		bindAllCarouselElement();
		$E.unbind(window,'DOMContentLoaded', bindInitialElms);
	}

	$E.callOnLoad(bindInitialElms);
	

return {
	bindCarousel 				: bindCarousel,
	bindCarouselControllers 	: bindCarouselControllers,
	setSlideActive 				: setSlideActive,
	getCarouselContents 		: getCarouselContents,
	getCarouselControllers  	: getCarouselControllers,
	getCarouselControllerCont 	: getCarouselControllerCont
};

})();



/*$Id$*/

var tabs = (function(){
	const tabActiveCls = "zptab-active", tabsContCls = "zptabs-container", tabsContCont = "zptabs-content-container", tabsActContCls = "zptab-active-content";//No I18N
	function bindAllTabElements(){
		var tabs = document.body.querySelectorAll(".zpelement.zpelem-tabs");		//NO I18N
		for( var i = 0; i < tabs.length ; i++){
			var tab_container = $D.getByClass("zptabelem-inner-container", tabs[i]);
			bindTabs(tab_container[0]);			
		}
	}

	function bindTabs(tab_container){
		var tab_headers = $D.getByClass("zptab",tab_container);
		bindTabHeaders(tab_headers);
	}

	function bindTabHeaders(tab_headers){
		for (var i = 0; i < tab_headers.length; i++) {
			$E.bind(tab_headers[i], "click", changeTab);
		}
		if(tab_headers.length > 0){
			// setTabActive has to targetted correctly
			setTabActive(tab_headers[0]);
		}
	}


	function changeTab(e){
		setTabActive(this);
	}

	function setTabActive(tab_elem){
		unselectAllTab(tab_elem);
		selectTab(tab_elem);
	}

	function selectTab(tab_elem){

    // if(!$D.hasClass(tab_elem, tabActiveCls)){
    //     $D.addClass(tab_elem, tabActiveCls);
		// }
		var selected_id = tab_elem.getAttribute("data-content-id");
		var selected_content = $D.getByDataId(selected_id, document);
    if(!$D.hasClass(selected_content,"zptab-active-content")){
      	$D.addClass(selected_content,"zptab-active-content");
		}
	}

	function unselectAllTab(tab_elem){
		var container = $D.findParent(tab_elem,"zptabelem-inner-container");
		
		/************* removing active class from all tab headers *********/
		var tab_headers = $D.getByClass("zptab",container);
		for (var i = 0; i < tab_headers.length; i++) {
			var tab_header = tab_headers[i];
      if(getDataId(tab_elem) == getDataId(tab_header) && !$D.hasClass(tab_header, tabActiveCls)){
				$D.addClass(tab_header, tabActiveCls);
			}else if(getDataId(tab_elem) != getDataId(tab_header) && $D.hasClass(tab_header,"zptab-active")){
          $D.removeClass(tab_header,"zptab-active");
			}
		}

		/************* removing active class from all tab content *********/
		var tab_contents = $D.getByClass("zptab-content",container);
		for (var i = 0; i < tab_contents.length; i++) {
			var tab_content = tab_contents[i];
      if($D.hasClass(tab_content,"zptab-active-content")){
          $D.removeClass(tab_content,"zptab-active-content");
			}			
		}
	}	

	function getDataId(el){
		return el.getAttribute('data-element-id')
	}

	function bindAllAccordionElements(){
		var tabs = document.body.querySelectorAll(".zpelement.zpelem-accordion");		//NO I18N
		for( var i = 0; i < tabs.length ; i++){
			var tab_container = $D.getByClass("zpaccordion-container", tabs[i]);
			bindAccordion(tab_container[0]);			
		}
	}

	function bindAccordion(tab_container){
		var acc_headers = $D.getByClass("zpaccordion",tab_container);
		bindAccordionHeaders(acc_headers);
	}

	function bindAccordionHeaders(accordion_headers){
		for (var i = 0; i < accordion_headers.length; i++) {
			$E.bind(accordion_headers[i], "click", changeAccordion);
		}
		if(accordion_headers.length > 0){
			setAccordionActive(accordion_headers[0]);	
		}
	}	

	function changeAccordion(e){
		setAccordionActive(this);
	}

	function setAccordionActive(tab_elem){
		// unselectAllAccordion(tab_elem);
		selectAccordion(tab_elem);
	}

	function selectAccordion(tab_elem) {
		var container = $D.findParent(tab_elem, "zpaccordion-container");
		var children  = container.children
		var currentEl
		for(var i =0 ; i < children.length; i=i+2) {
			currentEl = children[i]
			if(currentEl.isSameNode(tab_elem)){
				$D.addClass(currentEl, "zpaccordion-active")
				$D.addClass(currentEl.nextElementSibling, "zpaccordion-active-content")
			} else {
				$D.removeClass(currentEl, "zpaccordion-active")
				$D.removeClass(currentEl.nextElementSibling, "zpaccordion-active-content")
			}
		}
	}

	function bindInitialElms() {
		bindAllTabElements();	
		bindAllAccordionElements();
		$E.unbind(window,'DOMContentLoaded', bindInitialElms);
	}

	$E.callOnLoad(bindInitialElms);

	return {
		changeTab 			: changeTab,
		changeAccordion		: changeAccordion,
		bindTabs  			: bindTabs,
		bindTabHeaders 		: bindTabHeaders,
		setTabActive		: setTabActive,
		setAccordionActive 	: setAccordionActive,
		bindAccordion 		: bindAccordion,
		bindAccordionHeaders: bindAccordionHeaders
	}
})();


/*$Id$*/

var audio = (function(){

    function bindAllAudioElements(){

        var audios = $D.getAll(".zpelement.zpelem-audioplayer");            //NO I18N

        for( var i = 0; i < audios.length ; i++){
            var aud_elem = $D.getByClass("zpaudio-container",audios[i])[0];
            var auto_play = false;
            var loop = false;

            if(aud_elem.getAttribute("data-autoplay") == "true" || aud_elem.getAttribute("data-autoplay") == true){
                auto_play = true;
            }
            if(aud_elem.getAttribute("data-loop") == "true" || aud_elem.getAttribute("data-loop") == true){
                loop = true;
            }

          initAudio(aud_elem,auto_play,loop);
      }
  }


  function bindInitialAudioElms() {
      bindAllAudioElements();
      $E.unbind(window,'DOMContentLoaded', bindInitialAudioElms);
  }

  $E.callOnLoad(bindInitialAudioElms);

  function playpause(){
      	var audio = $D.findParent(this,"zpaudio-container");

		if(this.className == "zpaudio-play"){
			this.className = "zpaudio-pause"
			audio.audio.play();

			if(!audio.native){
                audio.timer = setInterval(function(){
				    var move = audio.audio.getCurrentTime()/1000;
                    var duration = audio.audio.getDuration()/1000;
                    var mins = Math.floor(move/60);
                    var secs = Math.round(move%60);
				    $D.getByClass("zpaudio-timer",audio)[0].innerHTML=(mins>9?mins:"0"+mins)+":"+(secs>9?secs:"0"+secs);//NO I18N
                    var seekWidth = $D.getByClass("zpaudio-progress-base-bar",audio)[0].clientWidth - 8;
                    //$D.css($D.getByClass("zpaudio-progress-bar-button",audio)[0],"left",(seekWidth/duration*move)+"px");
                    $D.css($D.getByClass("zpaudio-progress-bar-button",audio)[0],"left",(seekWidth/duration*move) * 100 / (seekWidth+8)+"%");
                    //$D.css($D.getByClass("zpaudio-progress-play-bar",audio)[0],"width",(seekWidth/duration*move)+"px");
                    $D.css($D.getByClass("zpaudio-progress-play-bar",audio)[0],"width",(move/duration*100)+"%");
                },100);
			}

		} else {
			this.className = "zpaudio-play"
			audio.audio.pause();

			if(!audio.native){
				clearInterval(audio.timer);
			}

		}
	}

	function fnChangeAudioPos(e){
        if((e.srcElement?e.srcElement:e.target).className == "zpaudio-progress-bar-button"){
            return;
        }

        var left = e.layerX;//e.clientX-(this.offsetLeft);
        var audio = $D.findParent(this,"zpaudio-container")
        var seekWidth = $D.getByClass("zpaudio-progress-base-bar",audio)[0].clientWidth - 8

        if(audio.native){
            try{
                audio.audio.currentTime=audio.audio.duration/seekWidth*left;
            }catch(e){
                playpause.call($D.getByClass("zpaudio-play",audio)[0]);//NO I18N
                setTimeout(function(){
                    audio.audio.currentTime=audio.audio.duration/seekWidth*left;
                },300);
            }
        }else{
            if(audio.audio.isPlaying()){
                audio.audio.play(audio.audio.getDuration()/seekWidth*left);
            }else{
                var move = audio.audio.getDuration()/seekWidth*left;
                audio.audio.setSeekTime(move);
                $D.getByClass("zpaudio-timer",audio)[0].innerHTML=(Math.floor((move/1000)/60)<9?"0"+Math.floor((move/1000)/60):Math.floor((move/1000)/60))+":"+(Math.floor((move/1000)%60)<9?"0"+Math.floor((move/1000)%60):Math.floor((move/1000)%60));//NO I18N
                //$D.css($D.getByClass("zpaudio-progress-bar-button",audio)[0],"left",((seekWidth/audio.audio.getDuration()*move)-7)+"px");
                $D.css($D.getByClass("zpaudio-progress-bar-button",audio)[0],"left",((left * 100 /(seekWidth+8)))+"%");
                //$D.css($D.getByClass("zpaudio-progress-play-bar",audio)[0],"width",((seekWidth/audio.audio.getDuration()*move)-7)+"px");
                //$D.css($D.getByClass("zpaudio-progress-play-bar",audio)[0],"width",((move/audio.audio.getDuration()*100))+"%");
                $D.css($D.getByClass("zpaudio-progress-play-bar",audio)[0],"width",((left/seekWidth*100))+"%");
            }
        }
	}

	function fnAudioSeekDown(e){
        var audio = $D.findParent(this,"zpaudio-container");
        fnAudioSeekDown.left = this.parentNode.offsetLeft;
        fnAudioSeekDown.currentLeft = e.clientX;
        fnAudioSeekDown.seekBar = this;
        fnAudioSeekDown.duration = audio.native?audio.audio.duration:audio.audio.getDuration()/1000;
        fnAudioSeekDown.paused = audio.native?audio.audio.paused:!audio.audio.isPlaying();
        audio.audio.pause();

        if(!audio.native){
            clearInterval(audio.timer)
        }

        $D.addClass(document.body, 'no-select');
        $E.bind(window, 'mousemove', fnMoveSeekBar);
		$E.bind(window, 'mouseup', fnReleaseSeekBar);
    }

	function fnMoveSeekBar(e){
        e.preventDefault();
        e.stopPropagation();
	    var left = e.clientX,
            diffX = fnAudioSeekDown.currentLeft-left,
            elemLeft = fnAudioSeekDown.seekBar.offsetLeft,
            audio = $D.findParent(fnAudioSeekDown.seekBar,"zpaudio-container");

        if(audio.audio.duration || audio.audio.getDuration()){
            var dur = audio.audio.duration || audio.audio.getDuration();
            var seekWidth = $D.getByClass("zpaudio-progress-base-bar",audio)[0].clientWidth - 8;

            if(elemLeft-diffX >= 0 && elemLeft-diffX <= seekWidth){

                var toMove = elemLeft-diffX,
                    move = fnAudioSeekDown.duration/seekWidth*toMove,
                    mins = Math.floor(move/60),
                    secs = Math.round(move%60);
                $D.getByClass("zpaudio-timer",audio)[0].innerHTML=(mins<10?("0"+mins):mins)+":"+(secs<10?("0"+secs):secs);//NO I18N
                //$D.css(fnAudioSeekDown.seekBar,"left",(seekWidth/fnAudioSeekDown.duration*move)+"px");
                $D.css(fnAudioSeekDown.seekBar,"left",(seekWidth/fnAudioSeekDown.duration*move)*100/(seekWidth+8)+"%");
                //$D.css($D.getByClass("zpaudio-progress-play-bar",audio)[0],"width",(seekWidth/fnAudioSeekDown.duration*move)+"px");
                $D.css($D.getByClass("zpaudio-progress-play-bar",audio)[0],"width",(move/fnAudioSeekDown.duration*100)+"%");
                fnAudioSeekDown.curTime = move;
            }
        }
        fnAudioSeekDown.currentLeft=left;
	}

	function fnReleaseSeekBar(e){
		var audio = $D.findParent(fnAudioSeekDown.seekBar,"zpaudio-container");

        if(audio.native){
            try{
                audio.audio.currentTime=fnAudioSeekDown.curTime;
            }catch(exp){
            }

            if(!fnAudioSeekDown.paused){audio.audio.play();}
        }else{
            if(!fnAudioSeekDown.paused){
                audio.audio.play(Math.floor(fnAudioSeekDown.curTime)*1000);
                audio.timer = setInterval(function(){
                    var move = audio.audio.getCurrentTime()/1000,
                        duration = audio.audio.getDuration()/1000,
                        mins = Math.floor(move/60),
                        secs = Math.round(move%60);
                        seekWidth = $D.getByClass("zpaudio-progress-base-bar",audio)[0].clientWidth - 8;

                    $D.getByClass("zpaudio-timer",audio)[0].innerHTML=(mins>9?mins:"0"+mins)+":"+(secs>9?secs:"0"+secs);//NO I18N
                    //$D.css($D.getByClass("zpaudio-progress-bar-button",audio)[0],"left",(seekWidth/duration*move)+"px");
                    $D.css($D.getByClass("zpaudio-progress-bar-button",audio)[0],"left",((seekWidth/duration*move) * 100 / (seekWidth+8))+"%");
                    //$D.css($D.getByClass("zpaudio-progress-play-bar",audio)[0],"width",(seekWidth/duration*move)+"px");
                    $D.css($D.getByClass("zpaudio-progress-play-bar",audio)[0],"width",(move/duration*100)+"%");
                },100);

            }else{
                playpause.call($D.getByClass("playBtn",audio)[0]);//NO I18N
                $D.findParent(fnAudioSeekDown.seekBar,"zpaudio-container").audio.setSeekTime(fnAudioSeekDown.curTime*1000);
            }
        }

		$E.unbind(window, 'mousemove', fnMoveSeekBar);
		$E.unbind(window, 'mouseup', fnReleaseSeekBar);
        $D.removeClass(document.body, 'no-select');
    }

	function fnVolBtnDown(e){
        fnVolBtnDown.left        = this.parentNode.offsetLeft;
        fnVolBtnDown.leftTot     = fnVolBtnDown.left+this.parentNode.clientWidth - 8;
        fnVolBtnDown.seeklength  = this.parentNode.clientWidth - 8;
        fnVolBtnDown.currentLeft = e.clientX;
        fnVolBtnDown.volBtn      = this;

        $D.addClass(document.body, 'no-select');
        $E.bind(window, "mousemove",fnMoveVolBtn);
        $E.bind(window, "mouseup",fnReleaseVolBtn);
	}

	fnMoveVolBtn = function(e){
        e.preventDefault();
        e.stopPropagation();

        var left     = e.clientX,
            elemLeft = fnVolBtnDown.volBtn.offsetLeft,
            diffX    = left-fnVolBtnDown.currentLeft;

        if(elemLeft+diffX >= 0 && elemLeft+diffX <= fnVolBtnDown.seeklength){
            var audio  = $D.findParent(fnVolBtnDown.volBtn,"zpaudio-container")
			    toMove = elemLeft+diffX,
                vol    = (toMove/fnVolBtnDown.seeklength*100)/100;
                //iconbtn = $D.getByClass("zpaudio-volume",audio)[0],

            if(audio.native){
                audio.audio.volume=vol;
            }else{
                audio.audio.setVolume(vol);
            }

            setVolBar(audio,vol);

        }
        fnVolBtnDown.currentLeft=left;
	}

	fnReleaseVolBtn = function(){
        $D.removeClass(document.body, 'no-select');
        $E.unbind(window, "mousemove",fnMoveVolBtn);
        $E.unbind(window, "mouseup",fnReleaseVolBtn);
	}

	function fnChgVolume(e){
        if((e.srcElement?e.srcElement:e.target).className == "zpaudio-volume-progress-bar-button"){
            return;
        }

        var audio = $D.findParent(this,"zpaudio-container"),
            volSeekWidth = $D.getByClass("zpaudio-volume-bar",audio)[0].clientWidth - 8,
            left = e.layerX,
            vol = (left/(volSeekWidth+8)*100)/100;
            //iconbtn = $D.getByClass("zpaudio-volume",audio)[0],

        if(audio.native){
            audio.audio.volume=vol;
            if(vol>0.1){
                audio.audio.muted = false;
            }
        }else{
            audio.audio.setVolume(vol.toFixed(1));
        }

        setVolBar(audio,vol)
    }

    function setVolBar(audio, vol){
        var vol_icon      = $D.getByClass("zpaudio-volume",audio)[0] || $D.getByClass("zpaudio-volume-mute",audio)[0] || $D.getByClass("zpaudio-volume-down",audio)[0],
            volSeekWidth = $D.getByClass("zpaudio-volume-bar",audio)[0].clientWidth - 8;
            /*if(volSeekWidth == -8 ){
                var volume_bar = $D.getByClass("zpaudio-volume-bar",audio)[0];
                var def_style = volume_bar.style.display;
                $D.css(volume_bar,"display","block");
                volSeekWidth = volume_bar.clientWidth - 8;
                //$D.css(volume_bar,"display",def_style);

            }*/

        if(vol>0.1 && vol < .6){
            vol_icon.className = "zpaudio-volume-down";//NO I18N
            //vol_icon.className = "zpaudio-volume";//NO I18N	
        }else if(vol >= 0.6){
            vol_icon.className = "zpaudio-volume";//NO I18N
        }else{
            vol_icon.className = "zpaudio-volume-mute";//NO I18N
        }

		if (volSeekWidth < 1){
            $D.css($D.getByClass("zpaudio-volume-progress-bar-button",audio)[0],"left","0%");
            $D.css($D.getByClass("zpaudio-volume-progress-base-bar",audio)[0],"width","0%");
        }else{
            $D.css($D.getByClass("zpaudio-volume-progress-bar-button",audio)[0],"left",((volSeekWidth/1*vol)*100/(volSeekWidth+8))+"%");
            $D.css($D.getByClass("zpaudio-volume-progress-base-bar",audio)[0],"width",(vol/1*100)+"%");
        }
        //$D.css($D.getByClass("zpaudio-volume-progress-bar-button",audio)[0],"left",(volSeekWidth/1*vol)+"px");
        //$D.css($D.getByClass("zpaudio-volume-progress-base-bar",audio)[0],"width",(volSeekWidth/1*vol)+"px");

    }

    function fnMuteUnmute(){
        var vol;
        var audio        = $D.findParent(this,"zpaudio-container"),
            volSeekWidth = $D.getByClass("zpaudio-volume-bar",audio)[0].clientWidth - 8;

		if(audio.native){
            if(audio.audio.muted){
                vol=audio.audio.volume;
                audio.audio.muted = false;
			}else{
                vol=0;
                audio.audio.muted = true;
			}
        }else{
            var vol = this.parentNode.audio.getVolume();

            if(vol != 0){
                audio.volume = vol;
                    vol=0
			}else{
                vol=audio.volume;
			}
            audio.audio.setVolume(vol);
        }

        if(vol>0.1 && vol < .6){
            //this.className = "zpaudio-volume";//NO I18N
            this.className = "zpaudio-volume-down";//NO I18N
        }else if(vol >= 0.6){
            this.className = "zpaudio-volume";//NO I18N
        }else{
            this.className = "zpaudio-volume-mute";//NO I18N
        }

        //$D.css($D.getByClass("zpaudio-volume-progress-bar-button",audio)[0],"left",(volSeekWidth/1*vol)+"px");
        $D.css($D.getByClass("zpaudio-volume-progress-bar-button",audio)[0],"left",((volSeekWidth/1*vol)*100/(volSeekWidth+8))+"%");
		//$D.css($D.getByClass("zpaudio-volume-progress-base-bar",audio)[0],"width",(volSeekWidth/1*vol)+"px");
        $D.css($D.getByClass("zpaudio-volume-progress-base-bar",audio)[0],"width",(vol/1*100)+"%");
	}

	function fnRepeatPlayList(){

        var audio = $D.findParent(this,"zpaudio-container");
        var repeat_state = audio.repeat;
        var player_elem = $D.getByClass("zpaudio-player",audio)[0];
        var repeat_butt = $D.getByClass("zpaudio-repeat",player_elem)[0] || $D.getByClass("zpaudio-repeat-one",player_elem)[0] || null;
        var more_elem = $D.getByClass("zpaudio-more-options",audio)[0];
        var repeat_butt2 = $D.getByClass("zpaudio-repeat",more_elem)[0] || $D.getByClass("zpaudio-repeat-one",more_elem)[0] || null;
        var repeat_class = '';
        if(repeat_state == "none" || repeat_state==""){
            audio.setAttribute("data-loop","true");

            audio.repeat = "all";//NO I18N
            if(!audio.isPlayList){

                if(audio.native){
                    audio.audio.setAttribute("loop", "true");
                }else{
                    audio.loop = true;
                }
            }
            repeat_class = "zpaudio-repeat zpaudio-select";//NO I18N
        }else{
            audio.setAttribute("data-loop","false");
            if(repeat_state == "all"){
                if(!audio.isPlayList){
                    if(audio.native){
                        audio.audio.removeAttribute("loop");
                    }else{
                        audio.loop = false;
                    }
                    audio.repeat = "none";//NO I18N
                    repeat_class = "zpaudio-repeat";//NO I18N
                    //$D.removeClass(this,"zpaudio-select");
                }else{
                    audio.repeat = "one";//NO I18N
                    repeat_class = "zpaudio-repeat-one zpaudio-select";//NO I18N
                    //$D.addClass(this,"zpaudio-repeat-one");
                    //$D.removeClass(this,"zpaudio-repeat");
                }
            }else if(repeat_state == "one"){
                audio.repeat = "none";//NO I18N
                repeat_class = "zpaudio-repeat";//NO I18N
               // $D.removeClass(this,"zpaudio-select");
                //$D.addClass(this,"zpaudio-repeat");
                //$D.removeClass(this,"zpaudio-repeat-one");
    	    }
		}
        if(repeat_butt){
            repeat_butt.className = repeat_class;
        }
        if(repeat_butt2){
            repeat_butt2.className = repeat_class;
        }
	}

    function fnPlayPrev(){
        var audio = $D.findParent(this,"zpaudio-container");
        fnEndAudio(audio, true, false);
    }

    function fnPlayNext(){
        var audio = $D.findParent(this,"zpaudio-container");
        fnEndAudio(audio, false, true);
    }

    function fnShowHidePL(){
        var audio       = $D.findParent(this,"zpaudio-container"),
            listContain = $D.getByClass("zpaudio-playlist",audio)[0],
            player_elem = $D.getByClass("zpaudio-player",audio)[0],
            pl_icon_butt = $D.getByClass("zpaudio-playlist-icon",player_elem)[0] || null,
            more_elem = $D.getByClass("zpaudio-more-options",audio)[0],
            pl_icon_butt2 = $D.getByClass("zpaudio-playlist-icon",more_elem)[0] || null,
            pl_state    = listContain.getAttribute("data-show");

        if(!$D.hasClass(audio,"zpaudio-player-playlist")){//always hide playlist for player
            pl_state ="true";
        }
        
        if(pl_state === "false"){
            $D.css(listContain,"display","block");
            listContain.setAttribute("data-show","true");
            $D.addClass(pl_icon_butt,"zpaudio-select");
            if(pl_icon_butt2){
                $D.addClass(pl_icon_butt2,"zpaudio-select");
            }
        }else{
            $D.css(listContain,"display","none");
            listContain.setAttribute("data-show","false");
            $D.removeClass(pl_icon_butt,"zpaudio-select");
            if(pl_icon_butt2){
                $D.removeClass(pl_icon_butt2,"zpaudio-select");
            }
        }
    }

    function fnShowHideOptions(){
        var audio       = $D.findParent(this,"zpaudio-container"),
            optionContain = $D.getByClass("zpaudio-more-options",audio)[0],
            optionState     = optionContain.getAttribute("data-show");

        if(optionState === "false"){
            $D.css(optionContain,"display","inline-flex");
            optionContain.setAttribute("data-show","true");
            $D.addClass(this,"zpaudio-select");
        }else{
            $D.css(optionContain,"display","none");
            optionContain.setAttribute("data-show","false");
            $D.removeClass(this,"zpaudio-select");
        }
    }

    function fnEndAudio(aud,prev,nxt){
        var stop_state = false;
        var tt = $D.getByClass("zpaudio-pause",aud)[0];
        if($D.getByClass("zpaudio-pause",aud)[0]){
            playpause.call($D.getByClass("zpaudio-pause",aud)[0]);//NO I18N
        }

        if(aud.isPlayList){

            list_count = getPlayList(aud);
            //var repeat = $D.getByClass("zpaudio-repeat",aud)[0];
            //var repeat = $D.getByClass("zpaudio-repeat",aud)[0] || $D.getByClass("zpaudio-repeat-one",aud)[0];
            var repeat_state = aud.repeat || "none";//NO I18N
            //if(!$D.hasClass(repeat,"zpaudio-select")){
            if(repeat_state == "none" || repeat_state == ""){
                if(aud.shuffle){
                    if(prev && aud.stack.length > 1){
                        aud.curPlayItem = aud.stack.pop();
                        aud.curPlayItem = aud.stack.pop();
                    }else if(!prev && aud.stack.length !== list_count.length){

                        var rand = Math.floor(Math.random()*list_count.length);
                        var t = -1;

                        while(t < 0){
                            if(aud.stack.indexOf(rand) == -1){
                                t = 0;
                                aud.stack.push(rand);
                            }else{
                                rand = Math.floor(Math.random()*list_count.length);
                                t = -1;
                            }
                        }
                        aud.curPlayItem = rand;
                    }else{
                        aud.curPlayItem = 0;
                        aud.stack = [];
                        stop_state = true;
                    }
                }else{
                    if(nxt || (aud.curPlayItem<list_count.length && !prev)){
                    //if((aud.curPlayItem<list_count.length-1 && !prev)){
                        aud.curPlayItem+=1;
                        //aud.curPlayItem = (aud.curPlayItem + 1) % (list_count.length);
                    }else if(prev){//} && aud.curPlayItem > 0){
                        aud.curPlayItem-=1;
                        //if(aud.curPlayItem < 0){
                            //aud.curPlayItem=list_count.length-1;
                        //}
                    }
                    if(aud.curPlayItem < 0 || !(aud.curPlayItem<list_count.length)){
                        aud.curPlayItem = 0;
                        stop_state = true;
                    }
                }
                initAudio(aud,false,false,stop_state);
            }else{
                if(repeat_state == "all"){
                    if(aud.stack.length === list_count.length){
                        aud.stack = [];
                    }

                    if(aud.shuffle){
                        if(prev && aud.stack.length > 1){
                            aud.curPlayItem = aud.stack.pop();
                            aud.curPlayItem = aud.stack.pop();
                        }else{
                            if(prev){
                                aud.stack=[];
                            }
                            var rand = Math.floor(Math.random()*list_count.length);
                            var t = -1;

                            while(t < 0){
                                if(aud.stack.indexOf(rand) == -1){
                                    t = 0;
                                    aud.stack.push(rand);
                                }else{
                                    rand = Math.floor(Math.random()*list_count.length);
                                    t = -1;
                                }
                            }
                            aud.curPlayItem = rand;
                        }
                    }else{
                        if(!prev){
                            if(aud.curPlayItem<list_count.length-1){
                                aud.curPlayItem+=1;
                            }else{
                                aud.curPlayItem=0;
                            }
                        }else{
                            if(aud.curPlayItem>0){
                                aud.curPlayItem-=1;
                            }else{
                                aud.curPlayItem=list_count.length-1;
                            }
                        }
                    }
                    initAudio(aud,false,false);
                }else if(repeat_state == "one"){
                    if(!aud.native){
                        aud.audio.setSeekTime(0);
                    }else{
                        aud.audio.currentTime = 0;
                    }
                    setTimeout(function(){playpause.call($D.getByClass("zpaudio-play",aud)[0])},600);
                }
            }
        }else{
            if(!aud.native){
                if(aud.loop == true){
                    aud.audio.setSeekTime(0);
                    setTimeout(function(){playpause.call($D.getByClass("zpaudio-play",aud)[0])},600);
                }
            }
        }
    }

    function fnShufflePlaylist(){
        var aud             = $D.findParent(this,"zpaudio-container");
            player_elem     = $D.getByClass("zpaudio-player",aud)[0],
            shuffle_butt    = $D.getByClass("zpaudio-suffle",player_elem)[0] || null,
            more_elem       = $D.getByClass("zpaudio-more-options",aud)[0],
            shuffle_butt2   = $D.getByClass("zpaudio-suffle",more_elem)[0] || null;

        //if($D.hasClass(this,"zpaudio-select")){
        if(aud.shuffle){
            $D.removeClass(shuffle_butt,"zpaudio-select");
            if(shuffle_butt2){
                $D.removeClass(shuffle_butt2,"zpaudio-select");
            }
            aud.shuffle = false;
        } else {
            $D.addClass(shuffle_butt,"zpaudio-select");
            if(shuffle_butt2){
                $D.addClass(shuffle_butt2,"zpaudio-select");
            }
            aud.shuffle = true;
        }
    }

    function fnPlayThis(){
        var audio = $D.findParent(this,"zpaudio-container"),
            item  = this.getAttribute("data-item");

        audio.curPlayItem = parseInt(item);
        initAudio(audio,false,false);
    }

    function getPlayList(d_elem){
        var src_list = [],
            playlist_cont = $D.getByClass("zpaudio-playlist",d_elem)[0],
            list_elems = $D.getByTag("li",playlist_cont);

        for(var i=0,item;item = list_elems[i];i++){
            var li_el = list_elems[i];
            src_list.push(li_el.getAttribute("data-src"))
        }
        return src_list;
    }

    function getAudioSrc(d_elem,index){
        var playlist_cont = $D.getByClass("zpaudio-playlist",d_elem)[0],
            list_elems = $D.getByTag("li",playlist_cont),
            src = null;

        if(list_elems.length > index){
            src = list_elems[index].getAttribute("data-src");
        }else if(list_elems[0]){
            src = list_elems[0].getAttribute("data-src");
        }else{
            src = "";
        }
        return src;
    }

    function resetAudio(d_elem){
        if(d_elem){
            var player_elem = $D.getByClass("zpaudio-player",d_elem)[0],
                more_elem = $D.getByClass("zpaudio-more-options",d_elem)[0],
                repeatBtn  = $D.getByClass("zpaudio-repeat",player_elem)[0] || $D.getByClass("zpaudio-repeat-one",player_elem)[0],
                repeatBtn2  = $D.getByClass("zpaudio-repeat",more_elem)[0] || $D.getByClass("zpaudio-repeat-one",more_elem)[0];

            d_elem.audio.pause();
            d_elem.shuffle = false;

            if(d_elem.getAttribute("data-loop") == "true"){
                d_elem.repeat = "all";//NO I18N

                if(!d_elem.isPlayList){
                    if(audio.native){
                        d_elem.audio.setAttribute("loop", "true");
                    }else{
                        d_elem.loop = true;
                    }
                }

                repeatBtn.className = "zpaudio-repeat zpaudio-select";//NO I18N
                repeatBtn2.className = "zpaudio-repeat zpaudio-select";//NO I18N
                //$D.addClass(repeatBtn,"zpaudio-select");
                //$D.addClass(repeatBtn2,"zpaudio-select");
            }else{
                audio.repeat = "none";//NO I18N
                d_elem.repeat = "none";//NO I18N

                if(d_elem.native){
                    d_elem.audio.removeAttribute("loop");
                }else{
                    d_elem.loop = false;
                }

                repeatBtn.className = "zpaudio-repeat";//NO I18N
                repeatBtn2.className = "zpaudio-repeat";//NO I18N
                //$D.addClass(repeatBtn,"zpaudio-select");
                //$D.addClass(repeatBtn2,"zpaudio-select");
            }

            if(d_elem.native){
                d_elem.audio.setAttribute("autoplay",d_elem.getAttribute("data-autoplay"));
                d_elem.audio.currentTime = 0;
            }else{
                clearInterval(audio.timer);
                audio.setSeekTime(0);
            }
            setVolBar(d_elem,d_elem.audio.volume || 1);
        }
    }


    function bindNewChild(d_elem,child_list){
        var playlist_cont = $D.getByClass("zpaudio-playlist",d_elem)[0],
            playlist_icon = $D.getByClass("zpaudio-playlist-icon",d_elem)[0],
            list_elems = $D.getByTag("li",playlist_cont),
            //existing_list = d_elem.getAttribute("data-srclist").split(","),
            existing_list = getPlayList(d_elem),
            index = existing_list.length,
            toPlayList = false;

        if(existing_list.length>1 && !d_elem.isPlayList){
            // playlist_icon.click();
            toPlayList = true;
        }

        if(existing_list.length>1){
            index = 0;
            d_elem.isPlayList = true;
            d_elem.curPlayItem = d_elem.curPlayItem || 0;
            d_elem.stack        = d_elem.stack || [];
            //d_elem.playList     = [];
            $D.addClass(d_elem,"zpaudio-player-playlist");
            if(toPlayList){
                // playlist_icon.click();
                fnShowHidePL.call(playlist_icon);
            }
            
        }else{
            $D.removeClass(d_elem,"zpaudio-player-playlist");
        }


        var funcAud = function(){
            var mins = Math.floor(this.duration / 60),
                secs = Math.round(this.duration % 60);
            this.durationCont.innerHTML=(mins>9?mins:"0"+mins)+":"+(secs>9?secs:"0"+9)
        }

        for(var child_elem; child_elem=list_elems[index];index++){
            var meta = document.createElement("audio");
            meta.setAttribute("preload","metadata");
            meta.setAttribute("src",child_elem.getAttribute("data-src"));

            child_elem.setAttribute("data-item",(index));
            if(index == d_elem.curPlayItem){
                $D.addClass(child_elem,"zpaudio-playing");
            }else{
                $D.removeClass(child_elem,"zpaudio-playing");
            }
            //$D.addClass(child_elem,(index == 0?"zpaudio-playing":""));

            //existing_list.push(child_elem.getAttribute("data-src"));
            //d_elem.playList.push(child_elem.getAttribute("data-src"))

            var songDuration = $D.getByTag("SPAN",child_elem)[0];
            if(songDuration.innerHTML == "00:00"){
                if(meta.canPlayType && (meta.canPlayType("audio/mpeg") == "maybe" || meta.canPlayType("audio/mpeg") == "probably")){
                    meta.durationCont=songDuration;
                    $E.bind(meta,'loadedmetadata', funcAud,meta);
                }
            }
            $E.unbind(child_elem,"click",fnPlayThis);
            $E.bind(child_elem,"click",fnPlayThis);
        }

        //d_elem.setAttribute("data-srclist",d_elem.playList);
        //d_elem.playList = existing_list
    }

	function deleteChild(child_elem){
        if(child_elem){
            var del_index = parseInt(child_elem.getAttribute("data-item")) || 0,
                listContain = $D.findParent(child_elem, "zpaudio-playlist"),
                d_elem = $D.findParent(child_elem, "zpaudio-container"),
                playlist_icon = $D.getByClass("zpaudio-playlist-icon",d_elem)[0],
                cur_playing = $D.getByClass("zpaudio-playing",listContain)[0],
                index =0;

            if(cur_playing == child_elem){
                fnEndAudio(d_elem,false,true);
                cur_playing = $D.getByClass("zpaudio-playing",listContain)[0];
            }
            $E.purge(child_elem);
            $D.remove(child_elem)

            var list_elems = $D.getByTag("li",listContain),
                toPlayer = list_elems.length == 1?true:false;

            for(var child_elem; child_elem=list_elems[index];index++){
                child_elem.setAttribute("data-item",(index));
            }

            d_elem.curPlayItem = parseInt(cur_playing.getAttribute("data-item")) || 0;
            if(toPlayer){
                index = 0;
                $D.removeClass(d_elem,"zpaudio-player-playlist");
                fnShowHidePL.call(playlist_icon);
                //playlist_icon.click();
                d_elem.isPlayList = false;
                d_elem.curPlayItem = null;
                d_elem.stack        = null;
            }
        }
    }

	function deletePlayer(d_elem){
        if(d_elem){
            playListEventUnbinding(d_elem);
            if(d_elem.audio){
                var pause_btn = $D.getByClass("zpaudio-pause",d_elem)[0];
                if(pause_btn){
                    playpause.call(pause_btn);
                }
            }
        }
    }

    function reInitAudio(d_elem,aud_list){
        if(!aud_list){
            aud_list = getPlayList(d_elem)
        }

        var playlist_cont = $D.getByClass("zpaudio-playlist",d_elem)[0],
            bwd_icon = $D.getByClass("zpaudio-backward",d_elem)[0],
            fwd_icon = $D.getByClass("zpaudio-forward",d_elem)[0],
            suffle_icon = $D.getByClass("zpaudio-suffle",d_elem)[0],
            playlist_icon = $D.getByClass("zpaudio-playlist-icon",d_elem)[0];

        d_elem.audio.pause();
        if(!d_elem.native){
            clearInterval(d_elem.timer);
        }

        d_elem.isPlayList=false; // for audio pl list
        d_elem.removeAttribute("data-srclist");

        if(aud_list.length == 1){
            //change play list to player

            //d_elem.setAttribute("data-srclist",aud_list);

            $D.removeClass(d_elem,"zpaudio-player-playlist");
            d_elem.audio = null;

        }else if(aud_list.length > 1){
            //change player to play list
            $D.addClass(d_elem,"zpaudio-player-playlist");
            //d_elem.setAttribute("data-srclist",aud_list);

            //d_elem.playList = null;
            d_elem.audio = null;
            d_elem.curPlayItem = null;
        }
        var auto_play = false;
        var loop = false;

        if(d_elem.getAttribute("data-autoplay") == "true" || d_elem.getAttribute("data-autoplay") == true){
            auto_play = true;
        }
        if(d_elem.getAttribute("data-loop") == "true" || d_elem.getAttribute("data-loop") == true){
            loop = true;
        }
        initAudio(d_elem,auto_play,loop);
    }

	function initAudio(d_elem,autoplay,loop,stop_state){
        var playlist;
    	var audio_tag  =  document.createElement("audio");
        //var audio_tag  =  d_elem.audio || document.createElement("audio");
        var volume = d_elem.audio?d_elem.audio.volume:1;
        var player_elem = $D.getByClass("zpaudio-player",d_elem)[0];
        var repeatBtn  = $D.getByClass("zpaudio-repeat",player_elem)[0] || $D.getByClass("zpaudio-repeat-one",player_elem)[0];

        /*if(!d_elem.getAttribute('data-srclist')){
            d_elem.setAttribute('data-srclist',getPlayList(d_elem))
        }*/

        var audio_count = [];//getPlayList(d_elem);

        //var src_list = d_elem.getAttribute('data-srclist').split(",");

        if(d_elem.isPlayList || getPlayList(d_elem).length >1){
            /*if(!d_elem.playList){
                d_elem.playList = audio_count;
			}*/

			if(!d_elem.curPlayItem){
				d_elem.curPlayItem = 0;
			}

            audio_tag.setAttribute("src",getAudioSrc(d_elem,d_elem.curPlayItem));
            var listContain = $D.getByClass("zpaudio-playlist",d_elem)[0];
                listContain_ul = $D.getByTag("ul",listContain)[0];
                li_elms = $D.getByTag("li",listContain_ul);

            if(!d_elem.isPlayList){
                playListEventBinding(d_elem);
                d_elem.isPlayList   = true;
                playlist = true;
                var more_elem = $D.getByClass("zpaudio-more-options",d_elem)[0];
                //$D.addClass(d_elem,"zpaudio-player-playlist");

                //$D.addClass(playlist_icon,"zpaudio-select");
                //listContain.setAttribute("data-show","true")
                if(loop){
                    //$D.addClass(repeatBtn,"zpaudio-select");
                    //$D.addClass(repeatBtn2,"zpaudio-select");
                    d_elem.repeat = "all";//NO I18N
                }else{
                    d_elem.repeat = "none";//NO I18N
                }
                d_elem.shuffle      = false;
                d_elem.stack        = [];

                var funcAud = function(){
                    var mins = Math.floor(this.duration / 60),
                        secs = Math.round(this.duration % 60);
                    this.durationCont.innerHTML=(mins>9?mins:"0"+mins)+":"+(secs>9?secs:"0"+9)
                }

                for(var i = 0,item;item = li_elms[i];i++){
                    var meta = document.createElement("audio");
                    meta.setAttribute("preload","metadata");
                    meta.setAttribute("src",item.getAttribute("data-src"));

                    item.setAttribute("data-item",i);
                    $D.addClass(item,(i == 0?"zpaudio-playing":""));

                    var songDuration = $D.getByTag("SPAN",item)[0];

                    if(meta.canPlayType && (audio_tag.canPlayType("audio/mpeg") == "maybe" || audio_tag.canPlayType("audio/mpeg") == "probably")){
                        meta.durationCont=songDuration;
                        $E.bind(meta,'loadedmetadata', funcAud);
                    }
                    $E.unbind(item,"click",fnPlayThis);
                    $E.bind(item,"click",fnPlayThis);
                }
            }else{
                var now_playing = $D.getByClass("zpaudio-playing",listContain_ul)[0];

                if(now_playing){
                    $D.removeClass(now_playing,"zpaudio-playing")
                }

                $D.addClass(li_elms[d_elem.curPlayItem],"zpaudio-playing");
            }
		}else {//if(getPlayList(d_elem).length == 1){
            playListEventBinding(d_elem);
            audio_tag.setAttribute("src",getAudioSrc(d_elem,0));
            if(loop){
                d_elem.repeat = "all";//NO I18N
            }else{
                d_elem.repeat = "none";//NO I18N
            }
		}

        //if(d_elem.playList){
        if(d_elem.isPlayList){
            if(d_elem.stack.indexOf(d_elem.curPlayItem)==-1){
                d_elem.stack.push(d_elem.curPlayItem);
            }
        }

		d_elem.native = false;

        var seekbar     = $D.getByClass("zpaudio-progress-bar-button",d_elem)[0],//NO I18N
            basebar     = $D.getByClass("zpaudio-progress-base-bar",d_elem)[0],//NO I18N
		    slideBar    = $D.getByClass("zpaudio-progress-play-bar",d_elem)[0],//NO I18N
		    playBtn     = $D.getByClass("zpaudio-play",d_elem)[0]||$D.getByClass("zpaudio-pause",d_elem)[0];//NO I18N

		if(d_elem.audio){
            if(d_elem.audio.pause){
                d_elem.audio.pause();
            }

            if($D.hasClass(playBtn,"zpaudio-pause")){
                playBtn.className="zpaudio-play";
            }

            if(d_elem.native){
                d_elem.audio.currentTime=0;
            }else{
                clearInterval(d_elem.timer);
                $D.getByClass("zpaudio-timer",d_elem)[0].innerHTML="00:00";//NO I18N
                //$D.css(seekbar,"left","0px");
                //$D.css(slideBar,"width","0px");
                $D.css(seekbar,"left","0%");
                $D.css(slideBar,"width","0%");
            }
        }
		//playBtn = $D.getByClass("zpaudio-play",d_elem)[0]||$D.getByClass("zpaudio-pause",d_elem)[0];//NO I18N
        if(!playBtn){
            return;
        }
        $D.getByClass("zpaudio-timer",d_elem)[0].innerHTML="00:00";//NO I18N

		if(audio_tag.canPlayType && (audio_tag.canPlayType("audio/mpeg") == "maybe" || audio_tag.canPlayType("audio/mpeg") == "probably")){
		    d_elem.native = true;
            d_elem.audio  = audio_tag;
            if(autoplay){
                playBtn.className="zpaudio-pause";
                audio_tag.setAttribute("autoplay","true");
            }
            if(loop && !d_elem.isPlayList){
                audio_tag.setAttribute("loop","true");
            }
            if(d_elem.isPlayList && !playlist && !stop_state){
                playpause.call(playBtn);
            }
            var seekBuffer        = $D.getByClass("zpaudio-progress-seek-bar",d_elem)[0];
            //var seekWidth = basebar.clientWidth-8;

            $D.css(seekBuffer,"width","0px");

            var progressBuffer = function(){
                var bufLen   = audio_tag.buffered.length,
                    bufStart = 0,
                    bufEnd   = 0;

                if(!bufLen>0){
                    return;
                }
                bufStart = audio_tag.buffered.start(bufLen-1);
                bufEnd   = audio_tag.buffered.end(bufLen-1);
                //var secs = Math.floor(bufEnd%60);
                //var sb   = $D.getByClass("zpaudio-progress-seek-bar",d_elem)[0];
                var seekWidth = basebar.clientWidth;
                //var sbWidth = ((seekWidth)/audio_tag.duration*bufEnd)
                //$D.css(sb,"width",sbWidth+"px");
                var sbWidth = ((bufEnd)/audio_tag.duration*100)
                $D.css(seekBuffer,"width",sbWidth+"%");
            }
            //$E.bind(audio_tag,"progress",progressBuffer)
            audio_tag.addEventListener("progress",progressBuffer,false);
            audio_tag.addEventListener("timeupdate",function(){
                if(slideBar.clientWidth > seekBuffer.clientWidth){
                    progressBuffer();
                }
                var seekWidth = basebar.clientWidth-8;
                var secs = Math.floor(this.currentTime%60);
                $D.getByClass("zpaudio-timer",d_elem)[0].innerHTML=(Math.floor(this.currentTime/60)<9?"0"+Math.floor(this.currentTime/60):Math.floor(this.currentTime/60))+":"+(secs>9?secs:"0"+secs);
                //$D.css(seekbar,"left",(seekWidth/this.duration*this.currentTime)+"px");
                $D.css(seekbar,"left",(seekWidth/this.duration*this.currentTime) * 100 / (seekWidth+8)+"%");
                //$D.css(slideBar,"width",(seekWidth/this.duration*this.currentTime)+"px");
                $D.css(slideBar,"width",(this.currentTime/this.duration*100)+"%");
            },false);
            var callEnd = function(){fnEndAudio(d_elem)};
            //$E.unbind(audio_tag,"ended",callEnd)
            //audio_tag.onended = callEnd;
            $E.bind(audio_tag,"ended",callEnd)
            //audio_tag.addEventListener('ended',function(){fnEndAudio(d_elem)},false);
        }else{
            var flObj = FlashAudio.init(d_elem,getAudioSrc(d_elem,d_elem.curPlayItem));// || src_list[0] || "");
            d_elem.audio =flObj;

            addEvent(flObj,"ended",function(){//NO I18N
                var aud = this.parentNode;
                clearInterval(aud.timer);
                fnEndAudio(aud);
            });

            if(autoplay == "true"){
                setTimeout(function(){playpause.call(playBtn)},600);
            }

            if(d_elem.isPlayList && !playlist){
                setTimeout(function(){playpause.call(playBtn)},600);
            }
            audio.loop = loop;
		}
        setVolBar(d_elem,volume ||d_elem.audio.volume || 1);
	}

    function playListEventBinding(d_elem){
        var player_elem = $D.getByClass("zpaudio-player",d_elem)[0],
            more_elem = $D.getByClass("zpaudio-more-options",d_elem)[0],
            prevBtn     = $D.getByClass("zpaudio-backward",d_elem)[0],//NO I18N
            nextBtn     = $D.getByClass("zpaudio-forward",d_elem)[0],//NO I18N
            shuffleBtn  = $D.getByClass("zpaudio-suffle",player_elem)[0],//NO I18N
            repeatBtn  = $D.getByClass("zpaudio-repeat",player_elem)[0] || $D.getByClass("zpaudio-repeat-one",player_elem)[0],
            shuffleBtn2  = $D.getByClass("zpaudio-suffle",more_elem)[0] || null,//NO I18N
            repeatBtn2  = $D.getByClass("zpaudio-repeat",more_elem)[0] || $D.getByClass("zpaudio-repeat-one",more_elem)[0],
            playlist_icon  = $D.getByClass("zpaudio-playlist-icon",d_elem)[0],
            playlist_icon2  = $D.getByClass("zpaudio-playlist-icon ",more_elem)[0];

        var seekbar     = $D.getByClass("zpaudio-progress-bar-button",d_elem)[0],//NO I18N
    	    seeker      = $D.getByClass("zpaudio-progressbar",d_elem)[0],//NO I18N
    	    volbutton   = $D.getByClass("zpaudio-volume",d_elem)[0] || $D.getByClass("zpaudio-volume-down",d_elem)[0] || $D.getByClass("zpaudio-volume-mute",d_elem)[0],//NO I18N
    	    playBtn     = $D.getByClass("zpaudio-play",d_elem)[0]||$D.getByClass("zpaudio-pause",d_elem)[0];//NO I18N
            volCont = $D.getByClass("zpaudio-volume-bar",d_elem)[0],//NO I18N
        	vol_bar = $D.getByClass("zpaudio-volume-progress-bar-button",d_elem)[0];

        $E.bind(seekbar,"mousedown",fnAudioSeekDown);
        $E.bind(seeker,"click",fnChangeAudioPos);
        $E.bind(volbutton,"click",fnMuteUnmute);
        $E.bind(playBtn,"click",playpause);
        $E.bind(volCont,"click",fnChgVolume);
        $E.bind(vol_bar,"mousedown",fnVolBtnDown);

        $E.bind(prevBtn,"click",fnPlayPrev);
        $E.bind(nextBtn,"click",fnPlayNext);
        $E.bind(shuffleBtn,"click",fnShufflePlaylist);
        $E.bind(shuffleBtn2,"click",fnShufflePlaylist);
        $E.bind(repeatBtn,"click",fnRepeatPlayList);
        $E.bind(repeatBtn2,"click",fnRepeatPlayList);
        $E.bind(playlist_icon,"click",fnShowHidePL);
        $E.bind(playlist_icon2,"click",fnShowHidePL);

        $E.bind($D.getByClass("zpaudio-options",d_elem)[0],"click",fnShowHideOptions);
        $E.bind(more_elem,"mouseleave",fnShowHideOptions);
    }

    function playListEventUnbinding(d_elem){
        var player_elem = $D.getByClass("zpaudio-player",d_elem)[0],
            more_elem = $D.getByClass("zpaudio-more-options",d_elem)[0],
            prevBtn     = $D.getByClass("zpaudio-backward",d_elem)[0],//NO I18N
            nextBtn     = $D.getByClass("zpaudio-forward",d_elem)[0],//NO I18N
            shuffleBtn  = $D.getByClass("zpaudio-suffle",player_elem)[0],//NO I18N
            repeatBtn  = $D.getByClass("zpaudio-repeat",player_elem)[0] || $D.getByClass("zpaudio-repeat-one",player_elem)[0],
            shuffleBtn2  = $D.getByClass("zpaudio-suffle",more_elem)[0] || null,//NO I18N
            repeatBtn2  = $D.getByClass("zpaudio-repeat",more_elem)[0] || $D.getByClass("zpaudio-repeat-one",more_elem)[0],
            playlist_icon  = $D.getByClass("zpaudio-playlist-icon",d_elem)[0],
            playlist_icon2  = $D.getByClass("zpaudio-playlist-icon ",more_elem)[0];


        var seekbar     = $D.getByClass("zpaudio-progress-bar-button",d_elem)[0],//NO I18N
            seeker      = $D.getByClass("zpaudio-progressbar",d_elem)[0],//NO I18N
            volbutton   = $D.getByClass("zpaudio-volume",d_elem)[0] || $D.getByClass("zpaudio-volume-down",d_elem)[0] || $D.getByClass("zpaudio-volume-mute",d_elem)[0],//NO I18N
            playBtn     = $D.getByClass("zpaudio-play",d_elem)[0]||$D.getByClass("zpaudio-pause",d_elem)[0];//NO I18N
            volCont = $D.getByClass("zpaudio-volume-bar",d_elem)[0],//NO I18N
            vol_bar = $D.getByClass("zpaudio-volume-progress-bar-button",d_elem)[0];

        $E.unbind(seekbar,"mousedown",fnAudioSeekDown);
        $E.unbind(seeker,"click",fnChangeAudioPos);
        $E.unbind(volbutton,"click",fnMuteUnmute);
        $E.unbind(playBtn,"click",playpause);
        $E.unbind(volCont,"click",fnChgVolume);
        $E.unbind(vol_bar,"mousedown",fnVolBtnDown);

        $E.unbind(prevBtn,"click",fnPlayPrev);
        $E.unbind(nextBtn,"click",fnPlayNext);
        $E.unbind(shuffleBtn,"click",fnShufflePlaylist);
        $E.unbind(shuffleBtn2,"click",fnShufflePlaylist);
        $E.unbind(repeatBtn,"click",fnRepeatPlayList);
        $E.unbind(repeatBtn2,"click",fnRepeatPlayList);
        $E.unbind(playlist_icon,"click",fnShowHidePL);
        $E.unbind(playlist_icon2,"click",fnShowHidePL);

        $E.unbind($D.getByClass("zpaudio-options",d_elem)[0],"click",fnShowHideOptions);
        $E.unbind(more_elem,"mouseleave",fnShowHideOptions);
    }

    FlashAudio = {}
    FlashAudio.init = function (domelement,src) {
        var faid = "fa"+(Math.ceil(Math.random()*11111111111111)),//NO I18N
            html = '<object id="'+faid+'" data="/swf/mp3player.swf" type="application/x-shockwave-flash" allowscriptaccess="sameDomain" allowfullscreen="true" width="1" height="1" ><param name="movie" value="mp3player.swf"></param><param name="flashvars" value="src='+src+'&faid='+faid+'"></param><param name="menu" value="false"></param><param name="align" value="middle"></param><param name="allowScriptAccess" value="sameDomain"></param><param name="quality" value="high"></param><param name="wmode" value="opaque"></param></object>',
            docfrag = document.createElement('div');

        docfrag.innerHTML = html;
        $D.append(domelement,docfrag);
        var flashobject = docfrag.firstChild;
        domelement.insertBefore(flashobject,docfrag);
        domelement.removeChild(docfrag);
        domelement.setAttribute("data-faid",faid);
        return flashobject;
    }

    FlashAudio.postMessage = function(arg_message) {
        var message = JSON.parse(arg_message);
        switch (message.cmd) {
            case "event"://NO I18N
                var flashobject = $D.getById(message.faid);
                fireEvent.call(flashobject, message.type);
                break;
            case "log"://NO I18N
                break;
        }
    }

    return {
        initAudio     : initAudio,
        bindNewChild  : bindNewChild,
        deleteChild   : deleteChild,
        deletePlayer  : deletePlayer,

        resetAudio    : resetAudio,
        getPlayList   : getPlayList
    }

})();


/*$Id$*/
// ht tp://stackoverflow.com/questions/18564942/clean-way-to-programmatically-use-css-transitions-from-js
// ht tp://www.sitepoint.com/incredibly-fast-ui-animation-using-velocity-js/
function _getVendorPropertyName(prop) {
// todo: need to correct this
    var prefixes = ['Moz', 'Webkit', 'O', 'ms'],  //NO I18N
                vendorProp, i,
                div = document.createElement( 'div' ),
                prop_ = prop.charAt(0).toUpperCase() + prop.substr(1);

    if (prop in div.style) {
        return prop;
    }

    for (i = 0; i < prefixes.length; ++i) {

        vendorProp = prefixes[i] + prop_;

        if (vendorProp in div.style) {
            return vendorProp;
        }

    }

    // Avoid memory leak in IE.
    this.div = null;
};


var transitionEnd = (function transitionEndEventName () {
    var i,
        undefined,
        el = document.createElement('div'),
        transitions = {
			'transition'      :'transitionend',       //NO I18N
			'OTransition'     :'otransitionend',      //NO I18N
			'MozTransition'   :'transitionend',       //NO I18N
			'WebkitTransition':'webkitTransitionEnd'  //NO I18N
        };

    for (i in transitions) {
        if (transitions.hasOwnProperty(i) && el.style[i] !== undefined) {
            return transitions[i];
        }
    }

    //TODO: throw 'TransitionEnd event is not supported in this browser';
})();


var animationEnd = (function transitionEndEventName () {
    var i,
        undefined,
        el = document.createElement('div'),
        animations = {
		    "animation"      : "animationend",       //NO I18N
		    "OAnimation"     : "oAnimationEnd",       //NO I18N
		    "MozAnimation"   : "animationend",       //NO I18N
		    "WebkitAnimation": "webkitAnimationEnd"       //NO I18N
		 };

    for (i in animations) {
        if (animations.hasOwnProperty(i) && el.style[i] !== undefined) {
            return animations[i];
        }
    }

    //TODO: throw 'TransitionEnd event is not supported in this browser';
})();

/**
 * Set css properties of elements
 * @param  {HTMLElement} 	el
 * @param  {Object} 		styles css properties and their values
 */
function _css( el, styles ) {
	for (prop in styles) {
		if (styles.hasOwnProperty( prop )) {
			el.style[ _getVendorPropertyName( prop ) ] = styles[ prop ];
		}

	}
}

function _toVacuum( el ) {

}

var defaults = {
	remove: true,
	callback: function(){}
};

function _merge(child) {
	for (var prop in defaults) {
		if (!child.hasOwnProperty( prop )) {
			child[ prop ] = defaults[ prop ];
		}
	}
}

var distType = {
	short : 100,
	medium: 200,
	long  : 350
};

var animation = {
	do: function(layer, props, options) {
		// todo: verify for memory leaks
		function _removeStyles(el, props, o, e) {
			for (var prop in props) {
				if (props.hasOwnProperty( prop )) {
					el.style.removeProperty( _getVendorPropertyName( prop ) );
				}
			}

			o.callback && o.callback( layer, props, options, e );
		}

		layer.style.removeProperty( 'transition' ); //NO I18N
		options = options || {};
		_merge( options );
		_css(layer, props);

		if (options.remove) {
			layer.addEventListener( transitionEnd, _removeStyles.bind( null, layer, props, options ));
		}

	},

	animateUsingName : function(layer, props, options) {
		// todo: verify for memory leaks
		var fnRef;
		function _removeStyles(el, props, o, e) {
			for (var prop in props) {
				if (props.hasOwnProperty( prop )) {
					el.style.removeProperty( _getVendorPropertyName( prop ) );
				}
			}

			o.callback && o.callback( layer, props, options, e );
			el.removeEventListener(animationEnd, fnRef)
		}

		layer.style.removeProperty( 'animation' ); //NO I18N
		options = options || {};
		_merge( options );
		_css(layer, props);

		if (options.remove) {
			fnRef = _removeStyles.bind( null, layer, props, options );
			layer.addEventListener( animationEnd, fnRef);
		}

	},
	// this is specific to this animation
	setFadeFinal: function(layer, transitionDuration) {
		this.forceRepaint( layer );
		this.do(layer, {
			transition : 'transform '+ transitionDuration, //NO I18N
			opacity    : 1
		}, {
			remove  : true,
			callback: function _afterAni( layer, props, opts) {
				layer.style.opacity = 1;
			}
		});
	},

	fadeIn: function(layer, transitionDuration) {
		this.do(layer, {
			opacity:0
		});

		this.setFadeFinal( layer, transitionDuration );
	},
	
	fade_in: function(layer, transitionDuration) {
		this.fadeIn(layer, transitionDuration);
	},


	forceRepaint: function(layer) {
		layer.offsetHeight;
	},

	// this is specific to this animation
	setFinalState: function(layer, transitionDuration) {
		this.forceRepaint( layer );
		this.do(layer, {
			transition : 'all '+ transitionDuration, //NO I18N
			opacity    : 1, //NO I18N
			transform  : 'translate3d(0, 0, 0)' //NO I18N
		}, {
			remove  : true,
			callback: function _afterAni( layer, props, opts) {
				layer.style.opacity = 1;
			}
		});
	},

	slide_from_top: function(layer, type, transitionDuration) {
		this.do(layer, {
			transform : 'translate3d(0, -'+ distType[ type ] +'px, 0)' //NO I18N
		});

		this.setFinalState( layer, transitionDuration );

	},

	slide_from_bottom: function(layer, type, transitionDuration) {
		this.do(layer, {
			transform : 'translate3d(0, '+ distType[ type ] +'px, 0)' //NO I18N
		});

		this.setFinalState( layer, transitionDuration );

	},

	slide_from_right: function(layer, type, transitionDuration) {
		this.do(layer, {
			transform : 'translate3d('+ distType[ type ] +'px, 0, 0)' //NO I18N
		});

		this.setFinalState( layer, transitionDuration );

	},

	slide_from_left: function(layer, type, transitionDuration) {
		this.do(layer, {
			transform : 'translate3d(-'+ distType[ type ] +'px, 0, 0)' //NO I18N
		});

		this.setFinalState( layer, transitionDuration );

	},

	appear_from_top: function(layer, transitionDuration) {
		this.do(layer, {
			transform : 'translate3d(0, -'+ layer.clientHeight +'px, 0)' //NO I18N
		});

		this.setFinalState( layer, transitionDuration );

	},

	appear_from_bottom: function(layer, transitionDuration) {
		this.do(layer, {
			transform : 'translate3d(0, '+ layer.clientHeight +'px, 0)' //NO I18N
		});

		this.setFinalState( layer, transitionDuration );

	},

	appear_from_right: function(layer, transitionDuration) {
		this.do(layer, {
			transform : 'translate3d('+ layer.clientWidth +'px, 0, 0)' //NO I18N
		});

		this.setFinalState( layer, transitionDuration );

	},

	appear_from_left: function(layer, transitionDuration) {
		this.do(layer, {
			transform : 'translate3d(-'+ layer.clientWidth +'px, 0, 0)' //NO I18N
		});

		this.setFinalState( layer, transitionDuration );

	},

	// this is specific to this animation
	setExpandFinal: function(layer, transitionDuration) {
		this.forceRepaint( layer );
		this.do(layer, {
			transition : 'transform '+ transitionDuration, //NO I18N
			opacity    : 1,
			transform : 'scale3d(1, 1, 1)' //NO I18N
		}, {
			remove  : true,
			callback: function _afterAni( layer, props, opts) {
				layer.style.opacity = 1;
			}
		});
	},

	expandOut: function(layer, transitionDuration) {
		this.forceRepaint( layer );
		this.do(layer, {
			transition : 'transform '+ transitionDuration,//No I18N
			opacity    : 1,
			transform : 'scale3d(1, 1, 1)'//No I18N
		}, {
			remove  : true,
			callback: function _afterAni( layer, props, opts) {
				layer.style.opacity = 1;
			}
		});
	},

	expandOutDown: function(layer, transitionDuration) {
		this.forceRepaint( layer );
		this.do(layer, {
			transition : 'transform '+ transitionDuration + ' ' + ' ease',//No I18N
			transform  : 'scale3d(1, 1, 1) translate3d(0, 0, 0)'//No I18N
		}, {
			remove  : true,
			callback: function _afterAni( layer, props, opts) {
				layer.style.opacity = 1;
			}
		});
	},

	setFinalPerspective: function(layer) {
		this.forceRepaint( layer );
		this.do(layer, {
			transform: 'rotateX(0deg)' //NO I18N
		});
	},

	perspective: function(layer, transitionDuration) {

		layer.style.perspective = '600px'; //NO I18N
		this.do(layer.querySelector( 'img' ), { //NO I18N
			transform: 'rotateX(90deg)', //NO I18N
			'transform-origin': 'bottom' //NO I18N
		});

		this.setFinalPerspective( layer.querySelector( 'img' ), transitionDuration ); //NO I18N

	}

};


/*$Id$*/
/**
 * Slider
 * During slider initialisation all settings needs to be read from the DOM
 * DOM is the single source of truth
 *
 */
(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define('zsSlider', factory); //NO I18N
    } else {
        root.zsSlider = factory(root, document);
    }
})(this, function() {
	'use strict';

	// ht tps://greensock.com/roughease
       var NAV_CLASS = 'zsslider-controller-container',//No I18N
               NAV_CONTROLLER_CLASS = 'zsslider-controller',//No I18N
               NAV_CONTROLLER_ACTIVE_CLASS = 'zsslider-controller-active',//No I18N
               NAV_ARROW_CONTAINER = 'zsslider-arrows-container',//NO I18N
               slidesContainerClass = "zphero-slides",//No I18N
               SLIDER_HEIGHT_CLASS = 'zpapply-height',//NO I18N
               sliderActiverClass = "curslide";//No I18N

	var self   			= {},
		global 			= window,
		sliderInstances = [],
		doc 			= document,
		undef 			= undefined,
		resizeDelay 	= 0,
		transitions 	= {
			slide_right: {
				in    : 'slideInLeft',   //NO I18N
				out   : 'slideOutRight',   //NO I18N
				revIn : 'slideInRight',   //NO I18N
				revOut: 'slideOutLeft'   //NO I18N
			},
			slide_left: {
				in    : 'slideInRight',   //NO I18N
				out   : 'slideOutLeft',   //NO I18N
				revIn : 'slideInLeft',   //NO I18N
				revOut: 'slideOutRight'   //NO I18N
			},
			slide_down: {
				in    : 'slideInDown',    //NO I18N
				out   : 'slideOutDown',    //NO I18N
				revIn : 'slideInUp',    //NO I18N
				revOut: 'slideOutUp'    //NO I18N
			},
			slide_up: {
				in    : 'slideInUp',    //NO I18N
				out   : 'slideOutUp',    //NO I18N
				revIn : 'slideInDown',    //NO I18N
				revOut: 'slideOutDown'    //NO I18N
			},
			diffuse: {
				in    : 'fadeIn',   //NO I18N
				out   : 'fadeOut',   //NO I18N
				revIn : 'fadeIn',   //NO I18N
				revOut: 'fadeOut'   //NO I18N
			},
			diffuse_left: {
				in    : 'fadeIn',   //NO I18N
				out   : 'fadeOut',   //NO I18N
				revIn : 'fadeIn',   //NO I18N
				revOut: 'fadeOut'   //NO I18N
			},

			diffuse_right: {
				in    : 'fadeIn', //NO I18N
				out   : 'fadeOut', //NO I18N
				revIn : 'fadeIn', //NO I18N
				revOut: 'fadeOut' //NO I18N
			}

		},

		// ht tp://matthewlein.com/ceaser/
		easings = {
			easeInQuad    : 'cubic-bezier(.55, .085, .68, .53)',    //NO I18N
			easeInCubic   : 'cubic-bezier(0.55, 0.055, 0.675, 0.19)',    //NO I18N
			easeInQuart   : 'cubic-bezier(.895, .03, .685, .22)',    //NO I18N
			easeInQuint   : 'cubic-bezier(.755, .05, .855, .06)',    //NO I18N
			easeInSine    : 'cubic-bezier(.47,0, .745, .715)',    //NO I18N
			easeInExpo    : 'cubic-bezier(.95, .05, .795, .035)',    //NO I18N
			easeInCirc    : 'cubic-bezier(.6, .04, .98, .335)',    //NO I18N
			easeInBack    : 'cubic-bezier(.6, -.28, .735, .045)',    //NO I18N

			easeOutQuad   : 'cubic-bezier(.25, .46, .45, .94)',         //NO I18N
			easeOutCubic  : 'cubic-bezier(.215, .61, .355, 1)',         //NO I18N
			easeOutQuart  : 'cubic-bezier(.165, .84, .44, 1)',         //NO I18N
			easeOutQuint  : 'cubic-bezier(.23, 1, .32, 1)',         //NO I18N
			easeOutSine   : 'cubic-bezier(.39, .575, .565, 1)',         //NO I18N
			easeOutExpo   : 'cubic-bezier(.19, 1, .22, 1)',         //NO I18N
			easeOutCirc   : 'cubic-bezier(.075, .82, .165, 1)',         //NO I18N
			easeOutBack   : 'cubic-bezier(.175, .885, .32, 1.275)',         //NO I18N

			easeInOutQuad : 'cubic-bezier(.455, .03, .515, .955)',          //NO I18N
			easeInOutCubic: 'cubic-bezier(.645, .045, .355, 1)',          //NO I18N
			easeInOutQuart: 'cubic-bezier(.77, 0, .175, 1)',          //NO I18N
			easeInOutQuint: 'cubic-bezier(.86, 0, .07, 1)',          //NO I18N
			easeInOutSine : 'cubic-bezier(.445, .05, .55, .95)',          //NO I18N
			easeInOutExpo : 'cubic-bezier(1, 0, 0, 1)',          //NO I18N
			easeInOutCirc : 'cubic-bezier(.785, .135, .15, .86)',          //NO I18N
			easeInOutBack : 'cubic-bezier(.68, -.55, .265, 1.55)'          //NO I18N
		};

	// DOM Utils start
	function _get( selector, ctx ) {
        ctx || (ctx = doc);
        return ctx.querySelector( selector );
    }

    function _getAll( selector, ctx ) {
        ctx || (ctx = doc);
        return ctx.querySelectorAll( selector );
    }

    function _getByClass( cName, ctx ) {
        ctx || (ctx = doc);
        return ctx.getElementsByClassName( cName );
    }

    function _hasClass(el, cls) {
        var re = new RegExp('(\\s|^)' + cls + '(\\s|$)');
        return re.test(el.className);
    }

    function _addClass(el, cls) {
        if (!_hasClass(el, cls)) {
            el.className += " " + cls;
        }
    }

    function _removeClass(el, cls) {
        var re = new RegExp('(\\s|^)' + cls + '(\\s|$)');
        if (re.test(el.className)) {
            el.className = el.className.replace(re, ' ');
        }
    }

    function _attr(el, attrName, value) {
    	if (value === undef) {
    		return el.getAttribute( attrName );

    	} else {
    		return el.setAttribute( attrName, value );

    	}
    }

    function _on(type, el, fn) {
    	el.addEventListener( type, fn );
    }

    function _off(type, el, fn) {
    	el.removeEventListener( type, fn );
    }

    // DOM Utils end


    function _hasOwn( obj, prop ) {
    	return obj.hasOwnProperty( prop );
    }

	/**
	 * requestAnimationFrame polyfill
	 */
	var requestAnimationFrame = global.requestAnimationFrame || (function() {
	    var timeLast = 0;

	    return global.webkitRequestAnimationFrame || global.mozRequestAnimationFrame || function(callback) {
	        var timeCurrent = (new Date()).getTime(),
	            timeDelta;

	        /* Dynamically set the delay on a per-tick basis to more closely match 60fps. */
	        timeDelta = Math.max(0, 16 - (timeCurrent - timeLast));
	        timeLast = timeCurrent + timeDelta;

	        return setTimeout(function() {
	        	callback(timeCurrent + timeDelta);
	        }, timeDelta);
	    };

	})();

	/**
	 * Test if requestAnimationFrame is Available or not
	 * @return {boolean}
	 */
	var isRafTrue = (function() {
		if (!global.requestAnimationFrame
			&& !global.webkitRequestAnimationFrame
			&& !(global.mozRequestAnimationFrame && global.mozCancelRequestAnimationFrame)  // Firefox 5 ships without cancel support
			&& !global.oRequestAnimationFrame
			&& !global.msRequestAnimationFrame) {
				return false
		}

		return true
	})();

	/**
	 * setInterval pollyfill, except uses requestAnimationFrame() where possible for better performance
	 *
	 * @param {function} 	fn 		The callback function
	 * @param {int}			delay 	The delay in milliseconds
	 */
	var _requestInterval = function(fn, delay) {

		if (!isRafTrue) {
			return global.setInterval(fn, delay);
		}

		var start  = new Date().getTime(),
			handle = {};

		function loop() {
			if(typeof zs !== "undefined" && !zs.state.animation){
				return;
			}
			var current = new Date().getTime(),
				delta = current - start;

			if(delta >= delay) {
				fn.call();
				start = new Date().getTime();
			}

			handle.value = requestAnimationFrame( loop );
		}

		handle.value = requestAnimationFrame( loop );
		return handle;
	}

	/**
	 * Behaves the same as clearInterval except uses cancelRequestAnimationFrame() where possible for better performance
	 * @param {int|object} 		fn 		The callback function
	 */
	var _clearRequestInterval = function(handle) {
		if (handle === null || handle.value === undefined) {
			return;
		}

	    global.cancelAnimationFrame ? global.cancelAnimationFrame(handle.value) :
	    global.webkitCancelAnimationFrame ? global.webkitCancelAnimationFrame(handle.value) :
	    global.webkitCancelRequestAnimationFrame ? global.webkitCancelRequestAnimationFrame(handle.value) : /* Support for legacy API */
	    global.mozCancelRequestAnimationFrame ? global.mozCancelRequestAnimationFrame(handle.value) :
	    global.oCancelRequestAnimationFrame	? global.oCancelRequestAnimationFrame(handle.value) :
	    global.msCancelRequestAnimationFrame ? global.msCancelRequestAnimationFrame(handle.value) :
	    clearInterval(handle);
	};

	var transitionEnd = (function transitionEndEventName () {
	    var prop,
	        el = document.createElement('div'),
	        transitions = {
				'transition'      :'transitionend',   //NO I18N
				'OTransition'     :'otransitionend',  //NO I18N
				'MozTransition'   :'transitionend',   //NO I18N
				'WebkitTransition':'webkitTransitionEnd' //NO I18N
	        };

	    for (prop in transitions) {
	        if ( _hasOwn( transitions, prop ) && el.style[ prop ] !== undef) {
	            return transitions[ prop ];
	        }
	    }
	})();

	var animationEnd = (function whichAnimationEvent() {
	    var t,
	        el 		   = document.createElement('div'),
	        animations = {
				'animation'      : 'animationend',    //NO I18N
				'OAnimation'     : 'oAnimationEnd',    //NO I18N
				'MozAnimation'   : 'animationend',    //NO I18N
				'WebkitAnimation': 'webkitAnimationEnd'    //NO I18N
	    }

	    for (t in animations) {
	        if ( _hasOwn(animations, t) && el.style[t] !== undef) {
	            return animations[t];
	        }
	    }

	})();

	// used for slide, fade transition
	function _removeClasses(arr, classes) {
		for (var i = arr.length - 1; i >= 0; i--) {
			for (var prop in classes) {
				if (_hasOwn( classes, prop )) {
					_removeClass( arr[ i ], classes[ prop ] );

				}
			}
		}
	}

	function _handleSlideTransitionEnd( ctx, slide, e ) {
		var animatedLayers, entryAnimation, i, len;
		// if (transitions[ this.transitionName ].in === e.animationName) {
		if (_hasClass( slide, e.animationName )) {
			animatedLayers = _getAll( '[data-animation]', slide ); //NO I18N

			for (i = 0, len = animatedLayers.length; i < len; i++) {
				entryAnimation = _attr( animatedLayers[i], 'data-animation' ).trim();

				if (entryAnimation === '') {
					continue;
				}

				entryAnimation = entryAnimation.split( '-' );
				if (entryAnimation[1]) {
					animation[ entryAnimation[0] ]( animatedLayers[i], entryAnimation[1], '2s' );
				} else {
					animation[ entryAnimation[0] ]( animatedLayers[i], '2s' ); // todo
				}

			}

		}

	}

	/**
	 * For each slide transition to work, slides need to have an inital style
	 * different for different transition type
	 */
	function _makeReadyForTransition( slide ) {
		var i, len,
			animatedLayers = _getAll( '[data-animation]', slide ); //NO I18N

		for (i = 0, len = animatedLayers.length; i < len; i++) {
			animatedLayers[i].style.opacity = 0;
		}
	}

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

	function getNumber(string, defaultValue){
		return Number(string) || defaultValue
	}

	/**
	 * Represents a slider
	 *
	 * @constructor
	 * @param {object} options
	 */
	function Slider( options ) {
		var cont = options.container
		this.sliderCont        = cont;
		var hero = this.hero   = _getByClass('zphero', cont)[0];
		this.slides            = null;
		this.animateId         = null;
		this.curSlideIndex     = 0;
		this.nextSlideIndex    = 1;
		this.transitionName    = null;
		this.transitionCounter = 0;
		this.slidesCount       = null;
		this.sliderInterval    = getNumber(_attr(hero, 'data-slider-interval'), 5000);//mentioned in ms//NO I18N
		this.transitionDuration= getNumber(_attr(hero, 'data-transition-time'), 1);// mentioned in seconds //NO I18N
		this.fnRefs = {anim: [], links: [], tabs: [], trans: undef};

		// this.sliderCont.style.fontSize = fontSize;
		// document.documentElement.style.fontSize = toVw( toNum( _cs(this.sliderCont, 'fontSize') ) );//NO I18N
		// document.documentElement.style.lineHeight = toVw( toNum( _cs(this.sliderCont, 'lineHeight') ) );//NO I18N
	}

	Slider.prototype = {
		start: function(options) {
			var slides, nextBtn, prevBtn, i, _this = this, ref, options = options || {};

			try {
				this.transitionName = _attr( this.hero, 'data-transition' ); //NO I18N
				this.slides         = Array.prototype.slice.call( _getAll( '.zphero-slide', this.sliderCont ) ); //NO I18N
				this.slidesCount    = this.slides.length;

				// nextBtn             = _getByClass( 'slider-next', this.sliderCont )[0];
				// prevBtn             = _getByClass( 'slider-prev', this.sliderCont )[0];
				if(typeof options.slideIndex !== 'undefined' ){//NO I18N
					this.curSlideIndex = options.slideIndex
				}
				
				if(this.curSlideIndex >= this.slidesCount){
					this.curSlideIndex = this.slidesCount - 1;
				}

				var slideIndex = this.curSlideIndex

				this.initiateSliderNav();

				for (i = 0; i < this.slidesCount; i++) {
					this.hookAnimation(this.slides[i ], i);
				}

				// this.animateId = this.slide();

				// _on('click', nextBtn, this.nextSlide.bind( this ));
				// _on('click', prevBtn, this.prevSlide.bind( this ));
				if (this.slidesCount > 1) {
					this.animateId = this.slide();
					nextBtn        = _getByClass( 'zsslider-arrow-right', this.sliderCont )[0];
					prevBtn        = _getByClass( 'zsslider-arrow-left', this.sliderCont )[0];
					ref = this.nextSlide.bind( this );
					this.fnRefs.next = ref;
					nextBtn && _on('click', nextBtn, ref); //NO I18N
					ref = this.prevSlide.bind( this );
					this.fnRefs.prev = ref;
					prevBtn && _on('click', prevBtn, ref ); //NO I18N
				}

				// set intial slide to higher z-index than others
				this.slides && this.slides.forEach(function(slide, index){
					// $D.addClass(slide, index == slideIndex ? sliderActiverClass : transitions[_this.transitionName].out)
					if(index == slideIndex){
						$D.addClass(slide, sliderActiverClass)
					} else {
						$D.removeClass(slide, sliderActiverClass)
						$D.addClass(slide, transitions[_this.transitionName].out)
					}
				})

				this.setCurSlideNav()

				$E.dispatch(this.hero, 'sliderActive:changed', {//NO I18N
					index : this.curSlideIndex,
					slide : this.slides[this.curSlideIndex],
					hero : this.hero
				});

			} catch(e) {
				// bypass code check
				var a;
			}
		},

		pause: function( sliderInstance ) {
			_clearRequestInterval( this.animateId );
		},

		hookAnimation: function( slide, index ) {
			var fn = _handleSlideTransitionEnd.bind( this, index, slide );
			this.fnRefs.anim[index] = fn;
			_on( animationEnd, slide, fn);
		},

		unHookAnimation : function(slide , index) {
			_off( animationEnd, slide, this.fnRefs.anim[index] );
			this.fnRefs.anim[index] = undef;
		},

		changeTransition: function( newTransitionName ) {
			// remove classnames of old transition
			var classNames    = transitions[ this.transitionName ],
				newClassNames = transitions[ newTransitionName ],
				slides        = this.slides;

			for (var i = slides.length - 1; i >= 0; i--) {
				for (var prop in classNames) {
					if (_hasOwn( classNames, prop )) {
						if (this.curSlideIndex === i) {
							_removeClass( slides[i], classNames.in );
							_removeClass( slides[i], classNames.out );
							_removeClass( slides[i], classNames.revIn );
							_removeClass( slides[i], classNames.revOut );

							// add this after removing previous, incase classnames conflict
							_addClass( slides[i], newClassNames.in );

						} else {
							_removeClass( slides[i], classNames[ prop ] );

						}
					}
				}
			}

			this.transitionName = newTransitionName;
			_attr(this.hero, 'data-transition', newTransitionName ); //NO I18N
		},

		restart: function() {
			_clearRequestInterval( this.animateId );
			this.animateId = this.slide();
		},

		nextSlide: function() {
			_clearRequestInterval( this.animateId );
			this.animateId = null;
			this.transitionSlide();
		},

		prevSlide: function() {
			_clearRequestInterval( this.animateId );
			this.animateId = null;
			this.transitionSlide( true );  // reverse direction is true i.e. previous btn clicked

		},

		goToSlide: function( slideIndex, startSlide ) {
			_clearRequestInterval( this.animateId );
			this.animateId = null;
			this.transitionSlide( false, slideIndex, startSlide );  // reverse direction is true i.e. previous btn clicked
		},

		slide: function() {
			var fn = this.transitionSlide.bind( this );
			this.fnRefs.trans = fn;
			return _requestInterval( fn, this.sliderInterval );
		},

		curIndex: function() {
			return this.curSlideIndex;
		},

		getNextIndex: function( index ) {
			var curIndex = index || this.curSlideIndex;
			return  curIndex === this.slidesCount - 1 ? 0 : curIndex + 1;
		},

		prevIndex: function() {
 			return this.curSlideIndex === 0 ? this.slidesCount - 1 : this.curSlideIndex - 1;
		},

		hookSliderLink: function( bulletEl, index ) {
			var fn = this.showSlide.bind( this, index );
			this.fnRefs.links[index] = fn;
			_on('click', bulletEl, fn); //NO I18N
		},

		hookSliderTab: function( tabEl, index ) {
			var fn = this.showSlide.bind( this, index );
			this.fnRefs.tabs[index] = fn;
			_on('click', tabEl, fn);  //NO I18N
		},
		unHookSliderLink: function( bulletEl, index ) {
			_off('click', bulletEl, this.fnRefs.links[index] ); //NO I18N
			this.fnRefs.links[index] = undef;
		},

		unHookSliderTab: function( tabEl, index ) {
			_off('click', tabEl, this.fnRefs.tabs[index]);  //NO I18N
			this.fnRefs.tabs[index] = undef;
		},
		initiateSliderNav: function() {

			// var links = $D.getAll( '.zsslider-controller', this.sliderCont ),
			// 	tabs  = $D.getAll( '.zs-slider-tab', this.sliderCont );

			// for (var i = 0, len = links.length; i < len; i++) {
			var links = _getAll( '.' + NAV_CONTROLLER_CLASS, this.sliderCont ), //NO I18N
				tabs  = _getAll( '.zs-slider-tab', this.sliderCont ), //NO I18N
				i, len;

			for (i = 0, len = links.length; i < len; i++) {
 				// _on('click', links[i], this.showSlide.bind( this, i ));
 				this.hookSliderLink( links[i], i );
			}

			for (i = 0, len = tabs.length; i < len; i++) {
 				// _on('click', tabs[i], this.showSlide.bind( this, i ));
 				this.hookSliderTab( tabs[i], i );
 			}
		},
		unbindSliderNav: function(){
			var links = _getAll( '.' + NAV_CONTROLLER_CLASS, this.sliderCont ), //NO I18N
				tabs  = _getAll( '.zs-slider-tab', this.sliderCont ); //NO I18N
				links.forEach(this.unHookSliderLink.bind(this));
				tabs.forEach(this.unHookSliderTab.bind(this));
		},

		/**
		 * Highlight currentSlide in slider nav, slider tabs
		 * eg: bullets, thumb, etc.
		 */
		setCurSlideNav: function() {
			var links = _getAll( '.' + NAV_CONTROLLER_CLASS, this.sliderCont ),//NO I18N
				slidercont = _get('.'+NAV_CLASS, this.sliderCont),
				arrowcont = _get('.'+NAV_ARROW_CONTAINER, this.sliderCont),
				tabs  = _getAll( '.zs-slider-tab', this.sliderCont );//NO I18N

			for (var i = links.length - 1; i >= 0; i--) {
				if (i === this.curSlideIndex) {
					_addClass( links[i], NAV_CONTROLLER_ACTIVE_CLASS);
					tabs[i] && _addClass( tabs[i], NAV_CONTROLLER_ACTIVE_CLASS);
					_attr( this.hero, 'data-currentslide-index', i ); //NO I18N

				} else {
					_removeClass( links[i], NAV_CONTROLLER_ACTIVE_CLASS);
					tabs[i] && _removeClass( tabs[i], NAV_CONTROLLER_ACTIVE_CLASS);

				}
			}
			// hide the navigation scrollers

			if(links.length < 2){
				slidercont.style.display = 'none'//NO I18N
				arrowcont.style.display = 'none'//NO I18N
			} else {
				slidercont.style.display = null
				arrowcont.style.display = null
			}
		},

		/**
		 * Navigate to a particular slide number
		 *
		 * @param  {Number} slideIndex
		 */
		showSlide: function( slideIndex ) {
			// if asked to navigate on the same slide
			if (this.curSlideIndex === slideIndex) {
				return;
			}

			// todo: change logic here
			var isRev = this.curSlideIndex > slideIndex;

			_clearRequestInterval( this.animateId );
			this.animateId = null;
			this.transitionSlide( isRev, slideIndex);
		},

		/**
		 * For
		 * Transition effect: slide from top, right, bottom, left, fade
		 * In CSS,  except first slide all slides need to be out of view,
		 * 			eg: for slide : translate3d(100%, 0, 0)
		 * 			first slide needs to be in default position, i.e. within view
		 *
		 * @param  {boolean} 	isReverse  		whether to show previous slide
		 * @param  {number} 	nextSlideIndex  index of next slide, used for nav
		 * @param  {boolean}    startSlide      whether to start slider after jumping | default = true
		 */
		transitionSlide: function( isReverse, jumpSlideIndex, startSlide ) {
			var prevSlideIndex,
				slidesInCtx   = [ this.slides[ this.curSlideIndex ] ],
				curTransition = transitions[ this.transitionName ];

			try {
				startSlide === undef && ( startSlide = true );

				if (isReverse) {
					prevSlideIndex = jumpSlideIndex !== undef ? jumpSlideIndex : this.prevIndex();
					slidesInCtx.push( this.slides[ prevSlideIndex ] );

				} else {
					this.nextSlideIndex = jumpSlideIndex !== undef ? jumpSlideIndex : this.getNextIndex( this.curSlideIndex );
					slidesInCtx.push( this.slides[ this.nextSlideIndex ] );
				}

				_removeClasses( slidesInCtx, curTransition );
				// take the current slide behind
				$D.removeClass(this.slides[ this.curSlideIndex ], sliderActiverClass);

				if (isReverse) {
					_addClass( this.slides[ this.curSlideIndex ], curTransition.revOut );
					_addClass( this.slides[ prevSlideIndex ], curTransition.revIn );
					// update current slide index to previous slide index
					this.curSlideIndex = prevSlideIndex;
					$D.addClass(this.slides[ prevSlideIndex ], sliderActiverClass);

				} else {
					_addClass( this.slides[ this.curSlideIndex ], curTransition.out );
					_addClass( this.slides[ this.nextSlideIndex ], curTransition.in );
					// update current slide index to next slide index
					this.curSlideIndex = this.nextSlideIndex;
					$D.addClass(this.slides[ this.nextSlideIndex ], sliderActiverClass);

				}

				// hide animated overlays
				// make it ready for the animation
				_makeReadyForTransition( this.slides[ this.curSlideIndex ] );

				if ( !this.animateId && startSlide) {
					this.animateId = this.slide();
				}

				this.setCurSlideNav();

				$E.dispatch(this.hero, 'sliderActive:changed', {//NO I18N
					index : this.curSlideIndex,
					slide: this.slides[this.curSlideIndex],
					hero : this.hero
				});

			} catch(e) {
				// console.log('Error: ', e);
				var a;
			}

		},

		changeTransitionDuration: function( time ) {
			// -webkit-animation-duration: 0.6s;
			// animation-duration: 0.6s;
			for (var i = this.slides.length - 1; i >= 0; i--) {
				this.slides[i].style.animationDuration = time;
			}

			this.transitionDuration = Number(time.replace('s', ''), 10);

		},

		changeTimingFn: function( timingFn ) {
			// animation-timing-function:ease-out;
			// -webkit-animation-timing-function:ease-out;
			for (var i = this.slides.length - 1; i >= 0; i--) {
				this.slides[i].style.animationTimingFunction = timingFn;
			}
		},

		changeSlideInterval: function( time ) {
			this.sliderInterval = 1000 * (parseInt(time, 10) + this.transitionDuration);
			this.restart();
		},

		refresh : function(options){
			this.unbindEvents();			
			this.start(options);
		},
		unbindEvents : function(){
			//check whther unbinding has to be done
			// no need to bind the left and right buttons as they are always there
			var nextBtn    = _getByClass( 'zsslider-arrow-right', this.sliderCont )[0],
			prevBtn        = _getByClass( 'zsslider-arrow-left', this.sliderCont )[0];
			nextBtn && _off('click', nextBtn, this.fnRefs.next)//No I18N
			this.fnRefs.next = undef;
			prevBtn && _off('click', prevBtn, this.fnRefs.prev)//No I18N
			this.fnRefs.prev = undef;
			// unbind the animations 
			this.slides.forEach(this.unHookAnimation.bind(this));
			
			// remove the events binded
			this.unbindSliderNav();
			// remove the classes that were added previosuly
			_removeClasses(this.slides, transitions[this.transitionName]);
		}

		// addNew: function(i) {
		// 	// temporary
		// 	i = i ? i : 2;
		// 	var content = {
		// 		1 : '<div class="zs-slide slideOutLeft" style="z-index: 100;"><img src="ht tp://revcdn1.themepunch.com/wp-content/uploads/2015/08/bigbold_1.jpg"> <div class="zs-sliderMask" data-animation="slide_from_left-long" style="color:#FFF; position:absolute; top: 20px; left: 100px; color: rgb(255, 255, 255); width: 500px; height: auto; opacity: 1;"> <div> <div> <h2 style="color:#FFF;"><span>TRAVEL AND EXPLORING</span></h2> </div> </div> </div> <div class="zs-sliderMask" data-animation="slide_from_left-long" style="color:#FFF; top: 25%; opacity: 1; left: 100px;"> <div> <h2 style="color:#FFF;">For All Workout Types.</h2> </div> </div> <div class="zs-sliderMask" style="top:35%; left: 100px;"> <div> <p data-animation="slide_from_top-short" style="opacity: 1; color:#FFF;">When you take a flower in your hand and really look at it, it\'s your world for the moment. I want to give that world to someone else..</p> </div> </div></div>',
		// 		2 : '<div class="zs-slide slideOutLeft" style="z-index: 100;"><img src="ht tp://revcdn1.themepunch.com/wp-content/uploads/revslider/notgeneric/notgeneric_bg1.jpg"> <div class="zs-sliderMask" data-animation="slide_from_left-long" style="color:#FFF; position:absolute; top: 20px; left: 100px; color: rgb(255, 255, 255); width: 500px; height: auto; opacity: 1;"> <div> <div> <h2 style="color:#FFF;"><span>TRAVEL AND EXPLORING</span></h2> </div> </div> </div> <div class="zs-sliderMask" data-animation="slide_from_left-long" style="color:#FFF; top: 25%; opacity: 1; left: 100px;"> <div> <h2 style="color:#FFF;">For All Workout Types.</h2> </div> </div> <div class="zs-sliderMask" style="top:35%; left: 100px;"> <div> <p data-animation="slide_from_top-short" style="opacity: 1; color:#FFF;">When you take a flower in your hand and really look at it, it\'s your world for the moment. I want to give that world to someone else..</p> </div> </div></div>'
		// 	};

		// 	var ul        = this.hero,
		// 		newSlide  = document.createElement( 'li' ),
		// 		tabsCont  = _getByClass( 'zs-slider-tabs', this.sliderCont )[0],
		// 		sliderNav = _getByClass( '.' + NAV_CLASS, this.sliderCont )[0],
		// 		newTab    = document.createElement( 'span' ),
		// 		newLink   = document.createElement( 'span' );

		// 	newSlide.innerHTML = content[i];
		// 	ul.appendChild( newSlide );

		// 	newTab.innerHTML   = 'TRAVEL'; // title goes here //NO I18N
		// 	newTab.className   = 'zs-slider-tab';
		// 	newTab.style       = _get('.zs-slider-tab').style.cssText;
		// 	newTab.style.width = 'auto';
		// 	tabsCont.appendChild( newTab );
		// 	makeTabResponsive( newTab );

		// 	newLink.className = 'zsslider-controller';
		// 	newLink.style     = _get( '.' + NAV_CONTROLLER_CLASS ).style.cssText;
		// 	sliderNav.appendChild( newLink );

		// 	this.hookSliderTab( newTab, this.slidesCount );
		// 	this.hookSliderLink( newLink, this.slidesCount );
		// 	this.hookAnimation( _get('.zs-slide', newSlide ), this.slidesCount ); //NO I18N

		// 	// this logic might change, when the editor is ready
		// 	var overlays = newSlide.querySelectorAll( '.zs-sliderMask' ); //NO I18N
		// 	for (var i = overlays.length - 1; i >= 0; i--) {
		// 		makeOverlayResponsive( overlays[i] );
		// 	}

		// 	this.slidesCount++;
		// 	this.slides.push( _get('.zs-slide', newSlide )); //NO I18N
		// },

		// save: function() {
		// 	var type = _attr( this.hero, 'data-transition' ), //NO I18N
		// 		transition, transitionTiming, transitionDuration, slideInterval, repeat, style, type,
		// 		hasTabs, hasThumbs, hasBullets, controls;

		// 	var banner = {}, settings = null, images = [];

		// 	type = type === null ? 'image' : 'slide'; //NO I18N

		// 	if (type === 'slide') {
		// 		transition         = _attr( this.hero, 'data-transition' ); //NO I18N
		// 		transitionTiming   = _attr( this.hero, 'data-transition-timing'); //NO I18N
		// 		transitionDuration = _attr( this.hero, 'data-transition-duration'); //NO I18N
		// 		slideInterval      = _attr( this.hero, 'data-interval'); //NO I18N
		// 		repeat             = _attr( this.hero, 'data-repeat'); //NO I18N
		// 		style              = _attr( this.hero, 'style' );//NO I18N
		// 		hasTabs            = !! _getByClass( 'zs-slider-tabs', this.sliderCont ).length;//NO I18N
		// 		hasThumbs          = !! _getByClass( 'zs-slider-thumbs', this.sliderCont ).length;//NO I18N
		// 		hasBullets         = !! _getByClass( 'zsslider-controller', this.sliderCont ).length;//NO I18N
		// 		controls           = !! _getByClass( 'slider-prev' ).length;//NO I18N

		// 		settings = {
		// 			type : type,
		// 			style: style,
		// 			navigation: {
		// 				tabs   : hasTabs,
		// 				bullets: hasBullets,
		// 				thumbs : hasThumbs
		// 			},
		// 			controls          : controls,
		// 			transition        : transition,
		// 			transitionTimingFn: transitionTiming,
		// 			transitionDuration: transitionDuration,
		// 			slideInterval     : slideInterval,
		// 			repeat            : repeat
		// 		};

		// 		Array.prototype.slice.call( this.slides ).forEach(function( slide ) {
		// 			var image    = {},
		// 				imageDiv = _get('div', slide), //NO I18N
		// 				imgEl    = _get('img', imageDiv),//NO I18N
		// 				overlaysList = [], overlayObj = null, content = '',
		// 				buttonEl, buttonProp, i, overlays, len, imgExists;

		// 			image.url             = imgEl.src;
		// 			image.title           = imgEl.tile;
		// 			image.alt             = imgEl.alt;
		// 			image.style           = _attr(imgEl, 'style');
		// 			image.backgroundColor = imageDiv.style.backgroundColor;

		// 			overlays = _getByClass( 'zs-sliderMask', slide ); //NO I18N

		// 			for (i = 0, len = overlays.length; i < len; i++) {

		// 				overlayObj = {};
		// 				buttonProp = null;

		// 				if (overlays[i].children[0].nodeName === 'BUTTON' ) {
		// 					buttonEl = overlays[i].children[0];

		// 					type = 'button'; //NO I18N
		// 					buttonProp = {
		// 						style : _attr(buttonEl, 'style'), //NO I18N
		// 						link  : _attr(buttonEl, 'data-link'), //NO I18N
		// 						target: _attr(buttonEl, 'data-target') //NO I18N
		// 					};

		// 					overlayObj.buttonProp = buttonProp;

		// 				} else {
		// 					// for image and text overlays
		// 					imgExists = !! _get( 'img', overlays[i] );

		// 					if (imgExists) {
		// 						type = 'image'; //NO I18N

		// 					} else {
		// 						type = 'text'; //NO I18N
		// 					}

		// 					// common for image and text overlays
		// 					overlayObj.content = overlays[i].children[0].innerHTML;
		// 				}

		// 				// common for all overlay types
		// 				overlayObj.type    = type;
		// 				overlayObj.style   = _attr(overlays[i], 'style');

		// 				overlaysList.push( overlayObj );
		// 			} // end for

		// 			image.overlays = overlaysList;

		// 			images.push( image )
		// 		});

		// 	}

		// 	banner.images   = images;
		// 	banner.settings = settings;

		// 	// todo: check if correct info
		// 	// console.log('BANNER DATA::');
		// 	// console.log(JSON.stringify( banner ));

		// 	banner = null;

		// }

	};

	_on('orientationchange', global, onResize)//No I18N

	function onResize() {
	    // return;
	    //console.log('onResize')
	    for(var i =0; i < sliderInstances.length; i++){
	    	resizeSlider(sliderInstances[i])
	    }
	}

	function resizeSlider(instance, callback, ctx){
		//console.log('%c resize the slider', 'color:red')
		// var instance = slider
		var hero = instance.hero
		callOnImagesLoad( hero, function () {
			var args = ctx && {ctx: ctx, top: ctx.scrollTop}
		    hero.style.minHeight = null
		    $D.removeClass( hero, SLIDER_HEIGHT_CLASS )
		    if(resizeDelay == 0){
				tryToResize(instance, 0, 0, callback, args)
		    } else {
				setTimeout(tryToResize.bind(null, instance, 0, 0, callback), resizeDelay, args);
		    }
		})
	}

	function makeSliderContain(slides, contain) {
		for (var i = slides.length - 1; i >= 0; i--) {
			slides[i].style.backgroundSize = contain? 'contain': '';//NO I18N
		}
	}

	 function getViewportW(ctx) {
	    ctx = ctx || global
	    var client = ctx.document.documentElement.clientWidth
	    var inner = ctx.innerWidth
	    return client < inner ? inner : client
	  }


	self.init = function( slideshowCtx ) {

		try {
			var newSlider = new Slider({
				container     : slideshowCtx
			});

			// for testing
			// to be removed later
			parent.newSlider = newSlider;
			var myInstance = {
				container: slideshowCtx,
				instance : newSlider
			}
			sliderInstances.push(myInstance);

			newSlider.start();

			resizeSlider(newSlider)

			return newSlider;

		} catch(e) {
			// console.log('ERROR while slider initialisation: ', e);
			// var a;
		}
	};

	function getSliderInstance(cont){
		for(var i=0; i < sliderInstances.length ;i++){
			if(sliderInstances[i].container == cont){
				return sliderInstances[i].instance;
			}
		}
	}

	self.pauseSlider = function( sliderInstance ) {
		_clearRequestInterval( sliderInstance.animateId );
	};

	self.clearRequestInterval = _clearRequestInterval;

//$$$$ dev
	self.logHeights = function(selector){
		// for (var i = sliderInstances.length - 1; i >= 0; i--) {
		// 	console.log(getOptiomalHeights(sliderInstances[i].instance.slides, selector))
		// }
	}

	function getOptiomalHeights(slides, selector) {
		return slides.map(function(li) {
			var zpcontainer = $D.getAll(selector, li)
      var totalHeight = 0
      // console.log(zpcontainer);
			zpcontainer.forEach(function(row){
        // console.log(row.scrollHeight);
        totalHeight += row.scrollHeight
      })
      // console.log('totalHeight',totalHeight)
			return totalHeight
		})
	}
//$$$$ dev
	self.reInitSlider = function(cont, options){
		
		var ins = getSliderInstance(cont);
		ins.refresh(options);
		//get the slider Instance of that Object
		// here we have to unbind the un necessary events and then bind them together
		// the data-* vlaues may have changed
		// possible that a new slide has been added
		
	};
  
  self.resize = function (heroElement, callback, ctx) {
  		var sliderInstance  = getSliderInstance(heroElement)
  		if(sliderInstance){
  			resizeSlider(sliderInstance, callback, ctx)
  		}
  };

  // self.try = function () {
  // 	tryToResize(sliderInstances[0].instance, 0, 1)
  // }

  
  
  
  function getGreaterHeight(slides) {
    var maxValue = null
    for (var i = 0; i < slides.length; i++) {
      if(maxValue < slides[i].scrollHeight){
        maxValue = slides[i].scrollHeight
      }
    }
    return maxValue
  }
  
  function tryToResize(instance, tryNumber, maxTry, callback, args) {
  	// return;
    tryNumber = tryNumber || 0
    maxTry = maxTry > 0 ? maxTry: 15;
    // console.log('trying to resize , tryNumber = ', tryNumber + 1)
    var hero = instance.hero;
    var computedHeroStyle = window.getComputedStyle(hero)
    var computedMinHeight = computedHeroStyle.minHeight ? parseFloat(computedHeroStyle.minHeight): 0;
    if(tryNumber > maxTry){
      // console.log('exceeded the number of tries , tryNumber = ', tryNumber + 1)
      $D.addClass( instance.hero, SLIDER_HEIGHT_CLASS )
      return
    }
    var optimalHeight = getGreaterHeight(instance.slides)
    if(hero.style.minHeight == "" || parseFloat(hero.style.minHeight) < optimalHeight ){
      // console.log('minHeight', hero.style.minHeight, 'scrollHeight', hero.scrollHeight)
      var calculatedMinHeight = optimalHeight + 1;
      hero.style.minHeight = ( computedMinHeight > calculatedMinHeight ? computedMinHeight: calculatedMinHeight ) + 'px'//NO I18N
      if(resizeDelay == 0){
    	tryToResize(instance, tryNumber+1, maxTry, callback, args)
      } else {
    	setTimeout( tryToResize.bind(this, instance, tryNumber+1, maxTry, callback, args), resizeDelay);
      }
      
    } else {
      // console.log('no overflow detected , tryNumber = ', tryNumber + 1)
      $D.addClass( instance.hero, SLIDER_HEIGHT_CLASS )
      // console.log('resize done','\n hasCallBack -> ' ,!!callback)
      // console.log('%c==============', 'color:red')
      callback && callback()
    }
    function onEnd() {
    	if(args && args.ctx && args.scrollTop){
    		args.ctx.scrollTop = args.scrollTop
    	}
    }
    return false
  }

  self.dispatchActive = function (container) {
  	var instance = getSliderInstance(container)
  	$E.dispatch(instance.hero, 'sliderActive:changed', {//NO I18N
		index : instance.curSlideIndex,
		slide : instance.slides[instance.curSlideIndex],
		hero : instance.hero
	});

  }

	self.showSlide = function(cont, index) {
		getSliderInstance(cont).showSlide(index)
	};

	return self;
});

function startSliders(slider) {
	var conts 		  = $D.getAll('.hero-container', document.body),
		heroInstances = [];

	conts.forEach(function(cont) {
		//console.log(JSON.stringify(zs.state));
		heroInstances.push(slider.init( cont ));
	});
	// the following should be commented discuss with boro

	console.log(heroInstances);
	window.heroInstances = heroInstances;
}

function initiateSliders() {
	// debugger;
    if (typeof define === 'function' && define.amd) {
    	require(['zsSlider'], startSliders);
	} else {
    	startSliders(window.zsSlider);
	}

	window.removeEventListener('DOMContentLoaded', initiateSliders);
}

zsUtils.onDocumentReady(initiateSliders)

function _cs( el, cssProp ) {
	return window.getComputedStyle( el )[ cssProp ];
}

function round(num) {
	// todo: check
	return num;
	return (Math.round(num * 100) / 100);
}

function toNum(px) {
	return parseFloat( px.replace('px', '') );
}

function toVw(px) {
	return (100/ document.documentElement.clientWidth) * px + 'vw'; //NO I18N
}

function _hasClass(el, cls) {
    var re = new RegExp('(\\s|^)' + cls + '(\\s|$)');
    return re.test(el.className);
}

// to refresh the slider whenever some change has been made
function refreshZSSlider(cont, options){
    if (typeof define === 'function' && define.amd) {
    	require(['zsSlider'], function(slider){
    		slider.reInitSlider(cont, options);
    	});
	} else {
//    	console.log('how the refresh came on a published site ????');
    	//debugger;
    	zsSlider.reInitSlider(cont, options);
	}
}

// testing code for sliderActive:changed
// (function () {
// 	var hero = $D.get('.zphero')
// 	$E.bind(hero, 'sliderActive:changed', function (e) {
// 		console.log('active slide', e.detail)
// 	})
// })()



// window.addEventListener('DOMContentLoaded', handleSlideShowResponsiveNess);

// function handleSlideShowResponsiveNess () {
// 	var themeBannerArea = document.querySelectorAll( '.slider-cont' ); //NO I18N
// 	Array.prototype.slice.call( themeBannerArea ).forEach( responsiveBanner );
// }

// function responsiveBanner( themeBannerArea ) {

// 	var bannerAreaWidthPx  = parseFloat(window.getComputedStyle( themeBannerArea ).width.replace('px', ''));
// 	var bannerAreaHeightPx = parseFloat(window.getComputedStyle( themeBannerArea ).height.replace('px', ''));
// 	var cont = themeBannerArea.querySelector( '.slider-cont' ); //NO I18N

// 	if (!cont) {
// 		if (_hasClass(themeBannerArea, 'slider-cont')) {
// 			cont = themeBannerArea;
// 		} else {
// 			return;
// 		}

// 	}

// 	if (typeof define === 'function' && define.amd) {
// 		require(['zsSlider'], function( slider ) {
// 				slider.init( cont );

// 		});
// 	} else {
// 		slider.init();
// 	}


// 	var bannerAreaWidthVw  = toVw( bannerAreaWidthPx ),
// 		bannerAreaHeightVw = toVw( bannerAreaHeightPx );

// 	if (cont) {
// 		cont.style.width = 'calc( 100% - (100% - '+ bannerAreaWidthVw +'))';
// 		cont.style.height = bannerAreaHeightVw;
// 		cont.style.fontSize = '16px'; //NO I18N

// 	}

// 	makeResponsive( cont );

// 	function makeResponsive( bannerCont ) {
// 		// tabs responsiveness
// 		var sliderTabs = bannerCont.querySelectorAll( '.zs-slider-tab' ); //NO I18N
// 		for (var i = sliderTabs.length - 1; i >= 0; i--) {
// 			makeTabResponsive( sliderTabs[i] );
// 		}

// 		var overlays = bannerCont.querySelectorAll( '.zs-sliderMask' ); //NO I18N
// 		for (var i = overlays.length - 1; i >= 0; i--) {
// 			makeOverlayResponsive( overlays[i] );
// 		}

// 		var links = bannerCont.querySelectorAll( '.zsslider-controller' ); //NO I18N
// 		for (var i = links.length - 1; i >= 0; i--) {
// 			makeLinksResponsive( links[i] );
// 		}

// 	}

// 	function setReponsiveValues(el, props) {
// 		var computedStyle = window.getComputedStyle( el );
// 		props.forEach(function( prop ) {
// 			el.style[ prop ] = toVw( toNum(computedStyle[ prop ]) );
// 		});
// 	}

// 	function makeTabResponsive(tab) {

// 		var parentComputedStyle = window.getComputedStyle( tab.parentNode ),
// 			props               = ['width', 'height', 'fontSize', 'paddingTop', 'paddingLeft', 'paddingRight', //NO I18N
// 								'paddingBottom', 'marginTop', 'marginRight', 'marginBottom', 'marginLeft']; //NO I18N

// 		setReponsiveValues(tab, props);

// 		var fontSize    = toNum( _cs( tab, 'fontSize' ) ), //NO I18N
// 			parFontSize = toNum(_cs( document.documentElement, 'fontSize' )), //NO I18N
// 			fontSizeRem = round(fontSize / parFontSize);

// 		// tab.style.fontSize = fontSizeEm + 'em';
// 		tab.style.fontSize = fontSize;

// 	}

// 	function makeOverlayResponsive( overlay ) {
// 		var fontSize, parFontSize;
// 		var props = ['width', 'height', 'fontSize', 'paddingTop', 'paddingLeft', 'paddingRight', 'paddingBottom', 'marginTop', 'marginLeft', 'top', 'left']; //NO I18N

// 		// change logic later
// 		var heading = overlay.querySelector( 'h2' ),//NO I18N
// 			text    = overlay.querySelector( 'p' );//NO I18N

// 		if (heading || text) {
// 			el = heading ? heading : text;

// 			fontSize    = toNum(_cs( el, 'fontSize' ));//NO I18N
// 			parFontSize = toNum(_cs( document.documentElement, 'fontSize' ));//NO I18N

// 			el.style.fontSize   = round(fontSize / parFontSize) + 'rem';//NO I18N
// 			el.style.lineHeight = (round(fontSize / parFontSize) * 1.5) + 'rem';//NO I18N

// 		}

// 		setReponsiveValues(overlay, props);


// 	}

// 	function makeLinksResponsive( link ) {
// 		link.style.width = toVw( toNum( _cs( link, 'width') ) );
// 		link.style.height = toVw( toNum( _cs( link, 'height') ) );
// 		link.style.marginLeft = toVw( toNum( _cs( link, 'marginLeft') ) );

// 	}

// }



	/*$Id$*/ // zs-menu.js navigation for the menu


	var zsTools = (function () {
		'use strict';
		var semi_colon = ';'
		var colon = ':'
		var singlequote = "'"
		var doublequote = '"'
		var space = /\s/

		function getParsedData(input){
			if(!input){
				return null
			}
		    var arrays = input.split(';')
		    var data = {}
		    arrays.forEach(splitKeySet, data)
		    return data
		}

		function splitKeySet(input){
		    var splitted = input.split(':')
		//     input && console.log(input,splitted)
		    var keyName = trimmedVal(splitted[0])
		    if(input && keyName ){
		        this[keyName] = splitted.length > 2 ? multipleJoin(splitted)  : trimmedVal(splitted[1]) ;
		    }
		}
		function multipleJoin(splitted){
		   return splitted.splice(1).join(':').trim()
		}

		function trimmedVal (input){
		    return input && input.trim() || ''
		}


		// while the input is not completely consumed
		//			get the first non-space character
		// 			if it is quote, consume until the next quote to get the key value,
		// 			else consume until : ( colon ) and skip the spaced charcters to get the key
		// 			
		// 			get the first non spaced character
		// 			if it is quote, consume until the next quote to get the key value,
		// 			else consume until ; ( colon ) and skip the spaced charcters to get the key

		function SinglePassParser(input) {
			if(typeof input != 'string'){//NO I18n
				return null
			}
			try{
				var map = {}
				var cursor = {p : -1};
				var key
				var val
				while(cursor.p < (input.length - 1)){
					key  =  consume(input, cursor, colon)
					if(key == "") {
						break
					}
					// console.log(cursor, key)
					val = consume(input, cursor, semi_colon)

					// console.log(cursor, val)
					// console.log(key, val)
					map[key] = val
				}
				return map
			}catch(e){
				Logger('Syntax Error while parsing input : ', e)//NO I18N
			}
			
		}
		/**
		 * consumes the input string from the given cursor point and returns the ending cursor point, the consumes value is 
		 * @param  {String} input     [description]
		 * @param  {Object} cursor    [description]
		 * @param  {char} separator [description]
		 * @return {String}           [description]
		 */
		function consume(input, cursor, separator) {
			// the cursor.p value after consumption denotes the index consumed
			// Ex:- key : value  with cursor.p = -1 , separtor = : would end the process with cursor.p at 2
			var string = []
			var context = string
			var list = [string]
			var first_char
			var quoted = false
			var quote_char
			var char
			var spacedIteration = false
			var consumed = false
			for(++cursor.p; isEnd(); cursor.p++){
				// debugger;
				
				escapeChar()
				char = input[cursor.p]
				// if the character is the seperator, return the consumed string
				if(char === separator ){
					return getString()
				}
				// if the string is not yet consumed for the separator
				if(!consumed){
					// inputCheck(cursor, input)
					if( isSpace(char)){
						if( !(first_char || quoted)){
							continue
						}
						if(!spacedIteration){
							context = []
							list.push(context)
						}
						spacedIteration = true
					} else {
						// if non space character

						// if first char is not set
						if(!first_char){
							// console.log('first non space character found to be', char)
							// if it is quote character, set the quote character and contnue, it is possible for the next character to be an escape sequence
							if(!quoted && (char === singlequote || char === doublequote)){
								quoted = true
								quote_char = char
								continue
							} else {
								first_char = char
							}
						} else if(quoted && char === quote_char){
							// console.log('at the end of the consumption')//NO I18N
							consumed = true
							continue
						}
						spacedIteration = false
					}
					// if there is no first non space character found make it the first character and place it in the array
					context.push(char)
				} else {
					// if the non space character is not the separator, throw and error
					if(char != separator && !isSpace(char)){
						throw 'Character(s) after string consumption'//NO I18N
					}
				}
			}

			// if(cursor.p === input.length){
				// console.log('it should have ended')
				return getString();
			// }

			function isSpace(character){
				return space.test(character)
			}

			function escapeChar() {
				if(char == '\\' && !isEnd(1)){
					// console.log('escapeChar found')
					cursor.p++
				}
			}

			function getString() {
				var result 
				if(list.length == 1){
					result = string
				} else{
					if(spacedIteration){
						list.pop()
					}
					result = Array.prototype.concat.apply([], list)
				}
				return result.join('')
			}

			function isEnd(offset) {
				return  (cursor.p + (offset || 0)) < input.length
			}
		}

		// function inputCheck(c, i) {
		// 	console.log('input [c.p]' , i[c.p], c.p)
		// }

		function Logger() {
			var scope = window['con'+'sole']//NO I18N
			scope.log.apply(scope, arguments)
		}
		// start of the ZSHashSet
		// Performance :-> Insertion , deletion, lookup => O(1)
		function ZSHashSet() {
			this.map = {}
			this.key = {}
			this.rev = {}
		}

		ZSHashSet.prototype = {
			get length(){
				return Object.keys(this.map).length
			},
			add : function ( item, key ) {
				
				if(typeof item != 'object'){
					throw new TypeError('Only Objects Supported')//NO I18N
				}
				var itemId = _getId(item)
				var keyId = key && _getId(key)
				this.map[itemId] = item
				if(key){
					this.key[keyId] = itemId
					this.rev[itemId] = keyId
				}
 			},
 			remove: function (item) {
 				if(!item){
 					return
 				}
 				var itemId = _getId(item)
 				var keyId = this.rev[itemId]
 				delete this.map[itemId]
 				if(keyId){
 					delete this.key[keyId]
 					delete this.rev[itemId]
 				}
 				// console.log('removed an item', this.map, this.length, this.dispatch)
 				if(this.dispatch && this.length == 0){
 					this.dispatch()
 				}
 			},
 			get: function (key) {
 				var itemId = this.key[_getId(key)]
 				return itemId && this.map[itemId]
 			},
 			removeByKey: function (key) {
 				this.remove(this.get(key))
 			},
 			has : function (item) {
 				return this.map.hasOwnProperty(_getId(item))
 			},
 			clear : function () {
 				var _this = this
 				Object.keys( this.map ).forEach(function (id) {
 					_this.remove( _this.map[id])
 				})
 			},
 			onEmpty : function (fn, thisArg) {
 				this.dispatch = fn.bind(thisArg)
 			},
 			isEmpty: function () {
 				return this.length === 0
 			},
 			forEach: function (fn, thisArg) {
 				var _this = this
 				Object.keys(this.map).forEach(function (uid) {
 					 fn.call( thisArg||null,_this.map[uid])
 				})
 			}
		};

		//ZPSet utils
		//polyfill for the ZPSet zpid
		(function () {
			if(typeof Object.prototype.__zsUniqueId == 'undefined'){
				var zpuid = 0;
				Object.defineProperty(Object.prototype, '__zsUniqueId', {
				    get : function(){
				        var _this = this
		                if(typeof _this.__zsuid == 'undefined'){
						Object.defineProperty(_this, "__zsuid", {
		                      value: ++zpuid
		                });
			        }
					return _this.__zsuid;
				    }
				})
			}
		})()

		function _getId(obj){
			return obj.__zsuid || obj.__zsUniqueId
		}

		// end of the ZSHashSet
		
		// polyfill for closest
		if (window.Element && !Element.prototype.closest) {
		    Element.prototype.closest = 
		    function(s) {
		        var matches = (this.document || this.ownerDocument).querySelectorAll(s),
		            i,
		            z,// this z is added to bypass the empty block statement code check
		            el = this;
		        do {
		            i = matches.length;
		            while (--i >= 0 && matches.item(i) !== el) {z};
		        } while ((i < 0) && (el = el.parentElement)); 
		        return el;
		    };
		}


		var _this = {
			oldParser : {
				parse : getParsedData
			},
			attrParser : {
				parse : SinglePassParser
			},
			ZSHashSet : ZSHashSet,
			log : Logger
		};
		return _this;
	})()

	/**
	 * Globals used -> $E, $D, zpTools.oldParser
	 * Utils -> throttle, debounce
	 * @return {[type]} [description]
	 */
	var zpThemeMenu = (function (){
		'use strict'

		// parse data for the below values from the options

		var MENU_SELECTED_CLASS = 'active'//'data-zp-selected-menu-class'//No I18N
		var MAX_MENU_ITEM = 'maxitem'//'data-zp-max-menu-item'//No I18N
		var SUBMENU_POSTION = 'position'//'data-zp-submenu-position'//No I18N
		var MENU_ORIENTATION = 'orientation'//'data-zp-menu-orientation'//No I18N
		var SUBMENU_UL_CLASS = 'submenu'//'data-zp-submenu-class'//No I18N
		var MENU_MORE_TEXT = 'moretext'//'data-zp-menu-more-text'//No I18N
		var SUBMENU_NON_RESP_CLASS = 'nonresponsive-icon-el'//'data-zp-non-responsive-class'//No I18N
		var RESP_SPAN_CLASS = 'responsive-icon-el'//'data-zp-responsive-clickable-area'//NO I18N
		var MENU_NAME = 'id'//'data-zp-menu-name'//No I18N
		var BURGER_CLOSE_CLASS = 'burger-close-icon'//'data-zp-close-icon'//NO I18N
		var ANIMATE_OPEN_CLASS = 'animate-open'//'data-zp-animate-open'//NO I18N
		var ANIMATE_CLOSE_CLASS = 'animate-close'//'data-zp-animate-close'//NO I18N
		var MOBILE_SUBMENU_TO_OPEN_STATE = 'open-icon'//'data-zp-responsive-submenu-open-class'//NO I18N
		var MOBILE_SUBMENU_TO_CLOSE_STATE = 'close-icon'//data-zp-responsive-submenu-close-class'//NO I18N
		var NON_RESP_ROOT_ICON_CLASS = 'root-icon'//'data-zp-non-responsive-root-icon'//NO I18N
		var NON_RESP_SUBTREE_ICON_CLASS = 'subtree-icon'//'data-zp-non-responsive-subtree-icon'//No I18N
		var TRANSITION_TIME = 'transition-time'//NO I18N

		// data-attributes that are identifiers for the Menu Group Nodes
		var RESP_CLICKABLE_AREA = 'data-zp-burger-clickable-area'//NO I18N
		var SUBMENU_ICON_DIV = 'data-zp-submenu-icon'//No i18n
		var MORE_MENU_ATTR = 'data-zp-more-menu'//NO I18N
		var RESP_MENU_CONT = 'data-zp-responsive-container'//No I18N
		var NON_RESP_MENU_CONT = 'data-zp-nonresponsive-container'//NO I18N
		var RESP_BURGER_ICON = 'data-zp-theme-burger-icon'//No I18N
		var MENU_SELECTOR_ATTR = 'data-zp-theme-menu' //NO I18N
		var CURRENT_URL_KEYNAME = 'zs_resource_url'//NO I18N
		var MENU_ANCHOR_SELECTOR = 'zpsection'//NO I18N
		// var MENU_SELECTOR_VAL = 'true' //No I18N


		// regex to parse the css time 
		// /^([+-]?\d+(\.\d*)?)(s|ms)$/

		var IE_SUBMENU_OVERFLOW_MARGIN = 15
		var default_values = [{
			key : MENU_MORE_TEXT,
			val : 'More'//NO I18N
		}]

		var doc = document
		var win = window
		// var windowHeight = getViewportH(win)
		var windowWidth = getViewportW(win)
		var menu_selector = getAttrSel( MENU_SELECTOR_ATTR )
		var MIN_DESKTOP_WIDTH
		var ORIENTATION = Object.freeze({
			HOR : 'horizontal',//No I18N
			VER : 'vertical'//NO I18N
		})
		var DEVICE = Object.freeze({
			mobile : 'mobile',//NO I18N
			desktop : 'desktop'//N oI18N
		})
		var SCREEN_CHANGE = Object.freeze({
			d2m : 'd2m',//NO I18N
			m2d : 'm2d',//No I18N
			m2m : 'm2m',//NO I18N
			d2d : 'd2d'//NO I18N
		})

		// when changing from mobile to desktop, waits for this much time so that animation ends
		var MOBILE_TO_DESKTOP_TIMEOUT = 300
		//time to wait once the mouse leaves the whole menu
		var MENU_HIDE_TIMEOUT_DELAY = 0//3000
		//time to throttling the mousemove event
		var MOUSE_MOVE_TRIANGLE_DELAY = 0//100
		//wait time for the debounce inside the triangle 
		var DEBOUNCE_TRIANGLE_DELAY_TIME = 0//3000

		var TIMEOUTS
		var triangle;
		var inViewPort = [];
		var inViewPortIds = [];
		var anchorTimer;

		//^dev
		var debug = false
		//$dev

		// utils start here
		
		/**
		 * A modified version of debounce with cancel and execute debounced function
		 * @param  {[type]} func      [description]
		 * @param  {[type]} wait      [description]
		 * @param  {[type]} immediate [description]
		 * @return {Object}           Debounce Control Object
		 */
		function debounce (func, wait, immediate) {
		    var timeout
		    var executed = false
		    return function () {

		      var context = this
		      var args = arguments

		      var later = function () {
		        timeout = null
		        if (!immediate) {
		          now()
		        }
		      }

		      var callNow = immediate && !timeout
		      cancel()

		      timeout = setTimeout(later, wait)

		      if (callNow) {
		        now()
		      }

		      function cancel(){
		      	// console.log('cleared the timeout')
		    	clearTimeout(timeout)
		   	  }

		      function now(){
		      	if(!executed){
		      		executed = true
		      		cancel()
			   		func.apply(context, args)
		      	}
		      	
		      }

		      return {
		      	cancel : cancel,
		      	now : now
		      }
		    }
		  } // end of debounce

		  function isSameNode(node1, node2) {
		  	return node1.isSameNode(node2)
		  }
		  
		  // start of Triangle Utils
		  /**
		   * [Triangle description]
		   * @param {[type]} point1X [description]
		   * @param {[type]} point1Y [description]
		   * @param {[type]} point2X [description]
		   * @param {[type]} point2Y [description]
		   * @param {[type]} point3X [description]
		   * @param {[type]} point3Y [description]
		   */
		  function Triangle(point1X, point1Y, point2X, point2Y, point3X, point3Y) {
		  		this.p1x = point1X
		  		this.p1y = point1Y
		  		this.p2x = point2X
		  		this.p2y = point2Y
		  		this.p3x = point3X
		  		this.p3y = point3Y
		  		this.ul = null
		  		this.over = null
		  		this.watching = null
		  }
		  
		  Triangle.prototype = {
			  init : function function_name(ul_top) {
			  		var _this = this
			  		if(!isSameNode(ul_top, _this.ul )){
				  		// ulLeave()
				  		clearTimeout(_this.ulClear)
				  		$E.bind(ul_top, 'mouseleave', ulLeave)
				  		// console.log('%c Inside', 'color: #274227')
				  		_this.ul = ul_top
			  		}
			  		function ulLeave() {
			  			// console.log('%c unbinded', 'color: red')
				  		$E.unbind(_this.ul, 'mouseleave', ulLeave)
				  		_this.ul = null
				  		_this.ulClear = setTimeout(function() {
				  			TIMEOUTS.forEach(hideSubmenu)
				  		}, MENU_HIDE_TIMEOUT_DELAY)
			  		}
			  },
			  /**
			   * Returns whether the given point is inside the triangle
			   * @param  {PointX}  testPointX [description]
			   * @param  {PointY}  testPointY [description]
			   * @return {Boolean}            [description]
			   */
			  has :function(testPointX, testPointY){
			  		var _this = this
			  		return isInsideTriangle(testPointX, testPointY, _this.p1x, _this.p1y, _this.p2x, _this.p2y, _this.p3x, _this.p3y)
			  },
			  /**
			   * Returns wether the new point x ,y is a movement inside the triangle
			   * @param  {[type]} testPointX [description]
			   * @param  {[type]} testPointY [description]
			   * @return {[type]}            [description]
			   */
			  mouseMoved : function(e){
			  		//console.log('moved')
			  		var closest = !e.target.matches('[data-zp-theme-menu] > ul') && e.target.closest('li')//NO I18N
			  		var newBound = false
			  		// closest would be false for e.target being ul_top
			  		if(!this.bounce && closest && !isSameNode(closest, this.over)){
			  			// console.log('The node has changed')
			  			var tData = TIMEOUTS.get(this.over)
			  			tData && hideSubmenu.call(hideSubmenu, tData)
			  			this.bound($D.get('ul', closest), this.pos, closest)
			  			newBound = true
			  		}
			  		
			  		var inside = false
			  		// crossing element to element needs adjustment
			  		if(newBound || this.has(e.clientX, e.clientY)){
			  			inside =  true
			  		}
			  		this.p1x = e.clientX
			  		this.p1y = e.clientY
			  		//^dev
			  		if(debug){
				  		var attr = this.p1x +','+ this.p1y + ' '+ this.p2x+ ','+ this.p2y+ ' '+ this.p3x+','+ this.p3y
				  		$D.getById('svg-polygon').setAttribute('points', attr);//NO I18N
			  		}
			  		//$dev

			  		if(!inside ){
			  			// console.log('Out', this.bounce)
			  			if(this.bounce){
			  				// console.log('calling now')
			  				this.bounce.ctrl.now()
			  				this.bounce = null
			  			}
			  			
			  		}
			  			
			  		// console.log(inside? 'inside': 'out')
			  		return inside
			  },
			  /**
			   * sets the mouse point vertex of the triangle
			   * @param  {[type]} x [description]
			   * @param  {[type]} y [description]
			   * @return {[type]}   [description]
			   */
			  vertex: function (e) {
			  		// this.p1x = x
			  		// this.p1y = y
			  		this.mouseMoved(e)
			  },
			  /**
			   * sets top and bottom points of the triangle, top = submenu top, bottom = submenu bottom
			   * @param  {[type]}  topRect        [description]
			   * @param  {[type]}  bottomRect     [description]
			   * @param  {Boolean} isSubMenuRight [description]
			   * @return {[type]}                 [description]
			   */
			  bound : function(submenu, posClass, elBound){
			  		if(!submenu){
			  		// 	console.log('changing the course')
					// this.unwatch()
			  			return
			  		}
			  		var topRect = getRect(submenu.firstElementChild), bottomRect = getRect(submenu.lastElementChild),isSubMenuRight = !$D.hasClass(submenu, posClass);
				  	// printTriangle(this)
			  		this.p2x = isSubMenuRight ? topRect.left: topRect.right;
			  		this.p2y = topRect.top
			  		this.p3x = isSubMenuRight ? topRect.left: topRect.right;
			  		this.p3y = bottomRect.bottom
			  		// printTriangle(this)
			  		this.over = elBound
			  		this.pos = posClass
			  },

			  watch: function (elToWatch) {
				  	var _this = this
				  	// console.log('watching', _this.watching, 'elToWatch', elToWatch)
				  	if(isSameNode(elToWatch, _this.watching)){
				  		return
				  	}
			  		_this.unwatch()
			  		_this.watching = elToWatch
			  		// throttling the mousemove event is necessary as multiple identical x,y co-ordinated are bound to be dispatched
			  		_this.boundFn = throttle(MOUSE_MOVE_TRIANGLE_DELAY, _this.mouseMoved, _this)
			  		$E.bind(elToWatch, 'mousemove', _this.boundFn)//NO I18N
			  		// console.log('going to watch for the for triangle movement', elToWatch)
			  		//^dev
			  		debug && ($D.getById('SVG-DEBUG').style.display = null)//NO I18N
			  		//$dev
			  },

			  unwatch: function () {
			  		var watching = this.watching
			  		$E.unbind(watching, 'mousemove', this.boundFn)//NO I18N
			  		this.watching = null; this.boundFn = null;
			  		// console.log('unwatching')
			  		//^dev
			  		debug && ($D.getById('SVG-DEBUG').style.display = 'none')//NO I18N
			  		//$dev
			  },

			  entered : function (li) {
			  		if(this.watching && !(isSameNode( li.closest('ul'), this.over) && $D.get('ul', li))){
			  			// console.log('entered some other node so unwatching')
			  			this.unwatch()
			  		}
			  }
			  //^dev
			  ,
			  trace: function(){
			  		if(!debug){
			  			return;
			  		}
				  	var svgNS = "ht"+"tp://www.w3.org/2000/svg"//NO I18N
				  	var id = 'SVG-DEBUG'//NO I18N
			  		if(!$D.getById(id)){
			  			// console.log('creating svg')
			  			var svgEl = svg('svg')//NO I18N
			  			svgEl.id = id
			  			svgEl.setAttribute('class', 'svgelement')//NO I18N
			  			var polygon = svg('polygon')//NO I18N
			  			polygon.id = 'svg-polygon'//NO I18N
			  			polygon.setAttribute('points', '200,10 250,190 160,210')//NO I18N
			  			svgEl.append(polygon)
			  			$D.getById('svg-placeholder').append(svgEl)//NO I18N
			  		}

			  		function svg(tag) {
			  			return doc.createElementNS( svgNS, tag)
			  		}
			  }
			  //$dev
		  }

		  // htt ps://koozdra.wordpress.com/2012/06/27/javascript-is-point-in-triangle/
		  // ht tp://blackpawn.com/texts/pointinpoly/default.html

		  /**
		   * Tests whether a given coordionate is inside a triangle
		   * @param  {Number}  px The X Co-ordinate of the Point to test
		   * @param  {Number}  py The Y Co-ordinate of the Point to test
		   * @param  {Number}  ax [description]
		   * @param  {Number}  ay [description]
		   * @param  {Number}  bx [description]
		   * @param  {Number}  by [description]
		   * @param  {Number}  cx [description]
		   * @param  {Number}  cy [description]
		   * @return {Boolean}    true if the point is inside the triangle, false otherwise
		   */
		  function isInsideTriangle (px,py,ax,ay,bx,by,cx,cy){
		  		// console.log(Array.prototype.slice.call(arguments).join(','))
				var v0 = [cx-ax,cy-ay];
				var v1 = [bx-ax,by-ay];
				var v2 = [px-ax,py-ay];

				var dot00 = (v0[0]*v0[0]) + (v0[1]*v0[1]);
				var dot01 = (v0[0]*v1[0]) + (v0[1]*v1[1]);
				var dot02 = (v0[0]*v2[0]) + (v0[1]*v2[1]);
				var dot11 = (v1[0]*v1[0]) + (v1[1]*v1[1]);
				var dot12 = (v1[0]*v2[0]) + (v1[1]*v2[1]);

				var invDenom = 1/ (dot00 * dot11 - dot01 * dot01);

				var u = (dot11 * dot02 - dot01 * dot12) * invDenom;
				var v = (dot00 * dot12 - dot01 * dot02) * invDenom;

				return ((u >= 0) && (v >= 0) && (u + v < 1));
			}

			// function printTriangle(tri) {
			// 	console.log(tri.p1x, tri.p1y, tri.p2x, tri.p2y, tri.p3x, tri.p3y)
			// }

			//end of triangle utils

		 // end of utils



		function isMobile(width) {
			return width < MIN_DESKTOP_WIDTH
		}

		// uses only width of the screen to detect the resize trigger

		function getScreenChange(oldWidth, newWidth) {

			if(oldWidth == newWidth){
				return null
			}

			return SCREEN_CHANGE[ (oldWidth >= MIN_DESKTOP_WIDTH ? (newWidth < MIN_DESKTOP_WIDTH? 'd2m' : 'd2d' ): 
									(newWidth >= MIN_DESKTOP_WIDTH ? 'm2d' : 'm2m')) ]
		}

		function getMenuOptions(element) {
			return  zsTools.oldParser.parse( _attr(element, MENU_SELECTOR_ATTR))
		}

		function  getAttrSel(attr, value) {
			var sel = '[' + attr
			if(value){
				sel += '=\"'+ value +"\""
			}
			sel += ']'
			return  sel
		}

		function addClasses(el , classes) {
			classes.split('/\s+/').forEach(function(classname){
				classname && $D.addClass(el, classname)
			})
		}

		function removeClasses(el , classes) {
			classes.split('/\s+/').forEach(function(classname){
				classname && $D.removeClass(el, classname)
			})
		}

		function _bindThemeMenus(e, ctx) {
			// var body = doc.body
			// console.log('doc', doc, 'body', body, 'readyState', doc.readyState)

			MIN_DESKTOP_WIDTH = Number(_attr( doc.body, 'data-zp-theme-responive-width')) || 992
			ctx = ctx || doc
			var menus = $D.getAll( menu_selector , ctx)
			if(menus.length > 0){
				TIMEOUTS = new zsTools.ZSHashSet()
				triangle = new Triangle()
				// this will cause issue as the timeouts would be empty even when list gets emptied via onHover
				// TIMEOUTS.onEmpty(function () {
				// 	if(!triangle.watching){
				// 		console.log('TIMEOUTS emptied and watching is not there')
				// 		triangle.unwatch()
				// 	}
				// })
				//^dev
				debug && triangle.trace()
				//$dev
			}
			// console.log('menus', menus)
			menus.forEach(init)
			if(window.IntersectionObserver){
				bindIntersectionObserver();
			}else{
				$E.bind(win, 'scroll', onCanvasScroll)
			}
			var dataHeaderHeight = 0;
			if($D.getAll('[data-header]') && $D.getAll('[data-header]').length > 0 &&	 $D.getAll('[data-header]')[0].getAttribute("data-header") != "none"  ){
				dataHeaderHeight = $D.getAll('[data-header]')[0].clientHeight;
			}
			if(window.location.hash){
				var target = document.getElementById(win.location.hash.replace(/^#/,''));
				if(target){
					win.scrollTo(0,$D.offset(target).top  -  dataHeaderHeight);
				}
			}
			document.scrollingElement.style.scrollBehavior = 'smooth'; //NO I18N
			$E.bind(win, 'hashchange', function(e){
				var target = document.getElementById(win.location.hash.replace(/^#/,''));				
				if(target){
					win.scrollTo(0,$D.offset(target).top  -  dataHeaderHeight);
				}				
			})			
		}

		function onHover(e, wrapper){
			// console.log('entering the onOhover')
			
			var hoveredElement = this
			var submenu = $D.get('ul', hoveredElement)
			var data
			// console.log(TIMEOUTS)
			var submenuFirstLi = submenu && submenu.firstElementChild
			var submenuLastLi  = submenu && submenu.lastElementChild
			var watchEl = $D.get('ul', wrapper)//NO I18N

			var debounceControl
			triangle.init(watchEl)

			var immediate = true;//!(triangle.watching && !triangle.over.contains(hoveredElement) && triangle.has(e.clientX, e.clientY))
			//^dev
			// console.log('immediate', hoveredElement.firstElementChild.textContent.trim(),immediate)
			//$dev
			var invoked = false

			// get the data mentioned in the menu wrapper
			// if(immediate){
			// 	console.log('immediate enter')
			// invoke the entered protocol if it is not immeditate
			// }
			// triangle.entered(hoveredElement)
			var debounced = debounce(function(){

			

			invoked = true

			TIMEOUTS.forEach(function (timeoutData) {
				clearTimeout(timeoutData.val)
				var el = timeoutData.el
				if(!(el.contains(hoveredElement) || isSameNode(el, hoveredElement))){
					hideSubmenu.call(el, timeoutData)
				}
			})

			// TIMEOUTS.length = 0
			TIMEOUTS.clear()

			

			if(submenuFirstLi){

				// console.log('has submenu')
				data = getMenuData(wrapper)
				
				// $D.addClass(submenu, 'menu-active-class')
				
				var vWidth = getViewportW()
				var submenu_rect = getRect(submenuFirstLi)
				var vHeight = getViewportH()
				// if the submenu is out of viewport
				var currentMenu = $D.findParentByTag(hoveredElement, 'ul')//NO I18n
				if( currentMenu && $D.hasClass(currentMenu, data[SUBMENU_POSTION]) || (submenu_rect.right + IE_SUBMENU_OVERFLOW_MARGIN) > vWidth ){//1191.5 1273
					// console.log('out of viewport')
					$D.addClass(submenu, data[SUBMENU_POSTION])
				}
				// console.log('submenu_rect.right > vWidth', submenu, submenu_rect.right , vWidth)
				// console.log('isInRightSide',$D.hasClass(submenu, data[SUBMENU_POSTION]))
				triangle.bound(submenu, data[SUBMENU_POSTION], hoveredElement)
				triangle.vertex(e)
				
				triangle.watch(watchEl)
				// console.log(triangle)
				// end of triangle bindings
			}// else {
				// triangle && triangle.unwatch()
			// }

			}, DEBOUNCE_TRIANGLE_DELAY_TIME, immediate)


			debounceControl = debounced()
			// console.log('settings the bounce')
			triangle.bounce = immediate ? null: {ctrl: debounceControl};

			


			if(submenuFirstLi){
				// console.log('binding the mouseleave')
				$E.bind(hoveredElement, 'mouseleave', function leaveLiMenu(e) {
					// when the mouse leaved the particular li element , push that into the list of TIMEOUTS by settings a timout
					// console.log('mouse leaves', hoveredElement)
					if(!(immediate && invoked)){
						data = getMenuData(wrapper)
						debounceControl.cancel()
						// console.log('canceled the debounce')
					} //else {
						var toAddData = {
							el : hoveredElement,
							ul: submenu,
							watch: watchEl,
							data: data
						}
						toAddData.val = setTimeout(hideSubmenu.bind(hoveredElement, toAddData), MENU_HIDE_TIMEOUT_DELAY)
						TIMEOUTS.add(toAddData, hoveredElement)
					// }
					$E.unbind(hoveredElement, 'mouseleave', leaveLiMenu)
				})
			}
		}

		/**
		 * Hides the submenu in the desktop view, only to be used in the desktop view
		 * @param  {Node} 	submenu 	submenu ul
		 * @param  {Object} data    	wrapper data options
		 * @return {[type]}         	[description]
		 */
		function hideSubmenu(timeoutData) {
			// console.log(arguments)
			// data.pos class removal
			clearTimeout(timeoutData.val)
			var submenu = timeoutData.ul
			$D.removeClass(submenu, timeoutData.data[SUBMENU_POSTION])
			// $D.removeClass(submenu, 'menu-active-class')
			// this would be called only when timeout is set, hence triangle would already been created
			// triangle.unwatch(watchEl)
			TIMEOUTS.remove(timeoutData)
			// console.log(TIMEOUTS)
		}

		/*
		*	@param	{Object}	data						
		*	@param	{Boolean}	[isMoreMenu=false]	
		*/
		function createThemeLi(data, isMoreMenu) {

			var aEl = createEl('a')
			var liEl = createEl('li')
			var ulEl = createEl('ul')
			if(data[SUBMENU_UL_CLASS]){
				$D.addClass(ulEl, data[SUBMENU_UL_CLASS])
			}
			aEl.innerHTML = data[MENU_MORE_TEXT]
			
			var children = getTargetByMenuId(SUBMENU_ICON_DIV, data).children
			for(var j = 0 ; children && j < children.length ; j++){
				$D.append(aEl, children[j].cloneNode())
			}
			
			$D.append(liEl, aEl)
			$D.append(liEl, ulEl)

			isMoreMenu && liEl.setAttribute(MORE_MENU_ATTR, data[MENU_NAME])
			return liEl
		}

		function createEl(tag) {
			return document.createElement(tag)
		}

		function getRect(el){
			return el.getBoundingClientRect()
		}


		function init(wrapper) {
			// console.log('initiating the menu for wrapper', wrapper)
			var data
			try{
				data = getMenuData(wrapper)
			}catch(e){
				// console.log(e)
				return
			}

			// console.log('data', data)

			// wrap the more menu

			var ul_top = $D.get('ul', wrapper)
			// if there is no ul in the menu just exit the bind Process
			if(!ul_top){
				return
			}
			var currentWidth = getViewportW(win)

			if(! isMobile(currentWidth)){ // Desktop View

				// ----- start of more button construction ----
				restructureMenu(ul_top, data)

				// ---- end of more button construction ------

				bindDesktopEvents(wrapper, ul_top, data)

			} else { // Mobile view

				placeMenuInResponsive(wrapper, data)
				bindMobileEvents(wrapper, ul_top, data)

			}

			// this can be used if the menu js handles the current page class name
			// try{
				var resource_path = win[CURRENT_URL_KEYNAME]
				var currentPageAnchor
				var currentLi
				if(resource_path){
					currentPageAnchor = $D.get('li > a[href="'+resource_path+'"]', wrapper)//NO I18N
					if(currentPageAnchor){
						currentLi =  $D.findParentByTag(currentPageAnchor, 'li')//NO I18N	
						currentLi && data.active && $D.addClass(currentLi , data.active)
					}
				}

				
			// } catch(e) {
			// 	e;
			// }

			
			
			// console.log('menu meta',data)

			// bind resize event for the wrapper

		}// end of init

		function bindDesktopEvents (wrapper, ul_top, data){

			//bind all the li menus for showing the submenu

			var li_list = $D.getAll( 'li', ul_top)
			// console.log('binding the desktop events')
			li_list.forEach(function _bindHover(li_element) {
				$E.bind(li_element, 'mouseenter', onHover, {
					args : wrapper
				})
			})
		}

		function unbindDesktopEvents (wrapper, ul_top, data){
			
			//unbind all the li menus for showing the submenu
			// console.log('unbinding the desktop events')
			$D.getAll( 'li', ul_top).forEach(function _unbindHover(li_element) {
				$E.unbind(li_element, 'mouseenter', onHover)
			})
		}

		function bindMobileEvents (wrapper, ul_top, data){

			//bind all the li menus for showing the submenu
			var toggleDiv = getTargetByMenuId(RESP_CLICKABLE_AREA, data)
			if(toggleDiv){
				// console.log('binding for toggle div')
				$E.bind(toggleDiv, 'click', toggleMenu, {
					args : wrapper
				})
			}
			
			var span_list = $D.getAll( '.'+ data[RESP_SPAN_CLASS] , ul_top)
			span_list.forEach(function _bindClick(clickable_span) {
				// console.log('binding for span')
				$E.bind(clickable_span, 'click', onMobileSubMenuClick, {
					args : wrapper
				})
			})
		}


		function unbindMobileEvents (wrapper, ul_top, data){
			
			//unbind all the li menus for showing the submenu

			//bind all the li menus for showing the submenu
			var toggleDiv = getTargetByMenuId(RESP_CLICKABLE_AREA, data)
			if(toggleDiv){
				$E.unbind(toggleDiv, 'click', toggleMenu)
			}
		
			$D.getAll( '.'+ data [RESP_SPAN_CLASS ] , ul_top).forEach(function _unbindClick(clickable_span) {
				$E.unbind(clickable_span, 'click', onMobileSubMenuClick)
			})
		}

		function placeMenuInResponsive(wrapper, data){
			// console.log('place the menu', data)
			var sel = getAttrSel( RESP_MENU_CONT, data[MENU_NAME])
			var responsive_container = $D.get(sel)
			// console.log('responsive_container', responsive_container, 'sel', sel)
			if(responsive_container){
				$D.append(responsive_container, wrapper)
			}

		}

		function replaceMenu(wrapper, data){
			var sel = getAttrSel( NON_RESP_MENU_CONT, data[MENU_NAME])
			var non_responsive_container = $D.get(sel)
			// console.log('non_responsive_container', non_responsive_container, 'sel', sel)
			if(non_responsive_container){
				$D.append(non_responsive_container, wrapper)
			}
		}


		
		// console.log( (isMobile(windowWidth) ? 'Mobile': 'Desktop') +' view')
		$E.bind(win, 'resize', onWindowResize)

		function bindIntersectionObserver (){
			var sections = $D.getAll('.' + MENU_ANCHOR_SELECTOR, document);
			for(var i = 0; i < sections.length; i++){
				if(sections[i].id && sections[i].id != ""){
					var section = sections[i];
					var options = {
						root: null,
						rootMargin: '0px', 	// No I18N
						threshold: [0,0.5,1]
					}

					var observer = new IntersectionObserver(observerCallBack, options);
					observer.observe(section);
				}
			}
		}

		function observerCallBack (entries, observer){

			entries.forEach(function(entry) {
				var ratio = parseFloat(entry.intersectionRatio.toFixed(1));
				if(entry.isIntersecting){
                    var curIndex = inViewPortIds.indexOf(entry.target.id);
                    if( curIndex != -1 ){
                        inViewPort.splice(curIndex,1);
                        inViewPortIds.splice(curIndex,1);
                    }
					inViewPort.push(entry);
					inViewPortIds.push(entry.target.id);
				}else if(ratio == 0 && !entry.isIntersecting){
                    var curIndex = inViewPortIds.indexOf(entry.target.id);
                    if( curIndex != -1 ){
                        inViewPort.splice(curIndex,1);
                        inViewPortIds.splice(curIndex,1);
                    }                
				}
				var section;
				var prevTop;
				for(var i=0 ;i < inViewPort.length; i++){
					if(isElementInViewport(inViewPort[i].target)){
						if(!prevTop || prevTop > inViewPort[i].target.offsetTop ){
							section = inViewPort[i].target;
							prevTop = inViewPort[i].target.offsetTop;
						}
					}
				}
				handleAnchor(section);
			});
		}

		function onCanvasScroll (e){
			e.preventDefault()
			var sections = $D.getAll('.' + MENU_ANCHOR_SELECTOR, document);
			var section;
			for(var i = 0; i < sections.length; i++){
				if(sections[i].id && sections[i].id != "" && isElementInViewport(sections[i],e)){
					section = sections[i];
					break;
				}
			}
			handleAnchor(section);
		}

		function handleAnchor (section){
			if(anchorTimer){
				clearTimeout(anchorTimer);
			}
			anchorTimer = setTimeout(function(){
				var menus = $D.getAll( menu_selector, document );
				if(section){
					menus.forEach(addMenuActive.bind(null, section));
				}else{
					menus.forEach(removeMenuActive);
				}					
			},50);			
		}

		function addMenuActive (element, menu, index, array){
			makeMenuActive(element.id, menu);
		}

		function removeMenuActive (menu, index, array){
			makeMenuActive('', menu);
		}

		function makeMenuActive (anchor_path, menu){
			var data
			try{
				data = getMenuData(menu)
			}catch(e){
				return
			}

			var selectedMenu = $D.get('li.'+ data.active, menu)//NO I18N
			if(selectedMenu){
				$D.removeClass(selectedMenu , data.active)
			}

			anchor_path = (anchor_path != '')? '#' + anchor_path : '';

			var resource_path = win[CURRENT_URL_KEYNAME];
			var currentPageAnchor = $D.get('li > a[href="'+resource_path+anchor_path+'"]', menu)//NO I18N
			currentPageAnchor = (currentPageAnchor)?currentPageAnchor : $D.get('li > a[href="'+resource_path+'"]', menu);
			if(currentPageAnchor){
				var currentLi =  $D.findParentByTag(currentPageAnchor, 'li')//NO I18N	
				currentLi && data.active && $D.addClass(currentLi , data.active)
				
				if(anchor_path == ''){
					window.history.replaceState('','',window.location.pathname+window.location.search)
				}else if(window.location.hash != anchor_path){
					window.history.replaceState('','',anchor_path)
				}

				if(window.zs_rendering_mode === "canvas" && window.frameElement && !window.frameElement.hasAttribute("data-hidden-frame")){
					if(anchor_path == ''){
						parent.window.history.replaceState('','',parent.window.location.pathname+parent.window.location.search)
					}else if(parent.window.location.hash != anchor_path){
						parent.window.history.replaceState('','',anchor_path)
					}
				}
			}			
		}

		function isElementInViewport (el,e) {
			return document.documentElement.scrollTop > el.offsetTop - window.innerHeight/2  && document.documentElement.scrollTop < (el.offsetTop + el.clientHeight - window.innerHeight/3);
		}
		
		


		function onWindowResize(e){

			
			var currentWidth = getViewportW(win)

			var change = getScreenChange(windowWidth, currentWidth)
			// console.log('onWindowResize', e, change)
			if(change == null) {
				return false
			}

			var menus = $D.getAll( menu_selector )

			switch(change){
				case SCREEN_CHANGE.d2m : 
					menus.forEach(desktopToMobile)
					break;
				case SCREEN_CHANGE.m2d : 
					menus.forEach(mobileToDesktopView)
					break;
				case SCREEN_CHANGE.d2d : 
					menus.forEach(reWrapMore)
					break;
				case SCREEN_CHANGE.m2m : 
					// menus.forEach()
					break;
			}

			// windowHeight = currentHeight
			windowWidth = currentWidth
		}

		// win.onresize = onWindowResize

		function getTargetByMenuId(attr, data, ctx) {
			ctx = ctx || doc
			return $D.get(getAttrSel(attr, data[MENU_NAME]), ctx)
		}

		/**
		*	Applicable for desktop view only. Restructures the menu more by creating menu if needed
		*	@param	{Node}		ul_top	topMost UL element of the menu
		*	@param	{Object}	data	the data extracted from the menu wrapper
		*	
		*
		*/

		function restructureMenu(ul_top, data) {
			// check whether more button is needed
			// if more menu items are being show in the menu

			// console.log('More Menu construction', ul_top, data)

			var moreMenu = getTargetByMenuId(MORE_MENU_ATTR, data, ul_top)
			var moreUl = moreMenu && $D.get('ul', moreMenu)

			var allowedMaxItems = data[MENU_ORIENTATION] == ORIENTATION.VER ? data[MAX_MENU_ITEM] : 2;

			// console.log('not at same height', ul_top.firstElementChild, getRect(ul_top.firstElementChild),'last',ul_top.lastElementChild, getRect(ul_top.lastElementChild))

			while( (data[MENU_ORIENTATION] === ORIENTATION.VER &&  (ul_top.childElementCount > allowedMaxItems) ) || (data[MENU_ORIENTATION] === ORIENTATION.HOR && !areAtSameHeight(ul_top.firstElementChild, ul_top.lastElementChild)) ){
				

				// if(data.orient == ORIENTATION.VER){
				// 	console.log('inside the ver menu, ', data)
				// } else if (data.orient === ORIENTATION.HOR) {
				// 	console.log('not at same height', ul_top.firstElementChild, getRect(ul_top.firstElementChild),'last',ul_top.lastElementChild, getRect(ul_top.lastElementChild))
				// }
				
				var non_responsive_class = data[ SUBMENU_NON_RESP_CLASS ]

				// create the moreMenu if not present
				if(moreMenu == null){
					moreMenu = createThemeLi( data, true)
					moreUl = $D.get('ul', moreMenu)
					// add the icon classes from the icon container
					// console.log('data',data)

					// console.log('non_responsive_class', non_responsive_class)

					if(moreUl && non_responsive_class){
						// console.log('the is non_responsive_class', non_responsive_class)

						var non_responsive_span = $D.get('.'+non_responsive_class, moreMenu)


						if(non_responsive_span && data[NON_RESP_ROOT_ICON_CLASS]){
							// console.log('moreUl.childElementCount', moreUl.childElementCount)
							$D.addClass( non_responsive_span, data[NON_RESP_ROOT_ICON_CLASS] )
							// console.log('after', non_responsive_span)
						}
					}
				}

				// if more menu is not yet appended to the menu bar
				if(!moreUl.firstElementChild){
					//add the ul's last element as more menu's first element
					// console.log('First Time appending the more')
					$D.append(moreUl, subTreeMovement(ul_top.lastElementChild, '.'+non_responsive_class, data, true))
					$D.append(ul_top, moreMenu)

				} else { // more menu has child elements , means more is already appened to the menu
					// console.log('Else Part, appending the li ', moreMenu.previousElementSibling)
					$D.insertBefore(moreUl.firstElementChild, subTreeMovement(moreMenu.previousElementSibling, '.'+non_responsive_class, data, true) )
				}

				if(ul_top.childElementCount <= allowedMaxItems ){ // here make the check for the max menu item
					// console.log('Exiting the loop')
					break;
				}
			}
			
		}


		/**
		*	makes the icon class change when moving in and out of the more menu
		*	@param 		{Node}			the LI node that is under movement
		*	@param		{Selector}		selector to choose the element that has non reponsive span
		*	@param		{Object}		the parse Data Object
		*	@param		{toSubTree}		true when moving into the subtree from TOP level
		*/

		function subTreeMovement(node, sel, data, toSubTree) {
			var span
			if(node && sel){
				span = $D.get(sel, node)
				if(span){
					if( toSubTree ){
						$D.removeClass(span, data[NON_RESP_ROOT_ICON_CLASS])
						$D.addClass(span, data[NON_RESP_SUBTREE_ICON_CLASS])
					} else {
						$D.removeClass(span, data[NON_RESP_SUBTREE_ICON_CLASS])
						$D.addClass(span, data[NON_RESP_ROOT_ICON_CLASS])
					}
				}
			}
			return  node
		}


		function destructMore(ul_top, data) {
			var moreMenu = getTargetByMenuId(MORE_MENU_ATTR, data, ul_top)
			var moreUl = moreMenu && $D.get('ul', moreMenu)
			var iconCont = getTargetByMenuId(SUBMENU_ICON_DIV, data)
			var non_responsive_class =  iconCont && data [ SUBMENU_NON_RESP_CLASS ]
			if(!(moreMenu && moreUl)){
				return
			}
			while(moreUl.firstElementChild){
				$D.insertBefore(moreMenu, subTreeMovement(moreUl.firstElementChild, '.'+non_responsive_class, data, false))
			}
			$E.purge(moreMenu)
			$D.remove(moreMenu)
		}

		// returns whether the two nodes are at the same height in the viewport

		function areAtSameHeight(el1, el2) {
			return getRect(el1).top === getRect(el2).top
			// return el1.offsetTop === el2.offsetTop
		}

		function getMenuData(wrapper) {
			var parsedData = getMenuOptions(wrapper)
			if(!parsedData){
				return parsedData
			}

			// set the default values, if it is not mentioned in the options, if that value is not set as default, then '' is set
			default_values.forEach(function setDefaultValue(defaultVal) {
				parsedData[defaultVal.key] = parsedData[defaultVal.key] || defaultVal.val || ''
			})

			return parsedData
		}

		function _attr(el, attr) {
			var value = el.getAttribute(attr)
			return value && value.trim()
		}

		function destroy(wrapper) {
			destructMenu(wrapper)
			// console.log('destroying the menu for wrapper', wrapper)
			$E.purge(wrapper)
		}

		$E.callOnLoad(_bindThemeMenus)

		 function getViewportW(ctx) {
		    ctx = ctx || win
		    var client = ctx.document.documentElement.clientWidth
		    var inner = ctx.innerWidth
		    return client < inner ? inner : client
		  }

		  function getViewportH(ctx) {
		    ctx = ctx || win
		    var client = ctx.document.documentElement.clientHeight
		    var inner = ctx.innerHeight
		    return client < inner ? inner : client
		  }

		  function reWrapMore(wrapper) {
		  		var data = getMenuData(wrapper)
				// wrap the more menu

				var ul_top = $D.get('ul', wrapper)
				// if there is no ul in the menu just exit the bind Process
				if(!ul_top){
					return
				}

				// ----- start of more button construction ----

				restructureMenu(ul_top, data)
		  }

		  function throttle(delay, callback, thisArg) {
		    var previousCall = new Date().getTime()

		    return function () {
		      var time = new Date().getTime()

		      if ((time - previousCall) >= delay) {
		        previousCall = time
		        callback.apply(thisArg || null, arguments)
		      }
		    }
		  }

		  function destructMenu(wrapper) {
		  		var ul_top = $D.get('ul', wrapper)
				var data = getMenuData(wrapper)
				destructMore(ul_top, data)
		  }


		  function mobileToDesktopView(wrapper) {
		  		// console.log('Mobile to Desktop for wraper', wrapper)
		  		var ul_top = $D.get('ul', wrapper)
				var data = getMenuData(wrapper)
				// console.log('data', data, 'ul_top', ul_top)
		  		
		  		unbindMobileEvents(wrapper, ul_top, data)

		  		// construct more button if necessary

		  		replaceMenu(wrapper, data)
		  		// console.log('setTimeout calling')
		  		setTimeout( function(){
		  			// console.log('setTimeout callback')
			  		restructureMenu(ul_top, data)

		  		// bind the necessary desktop events
					bindDesktopEvents(wrapper, ul_top, data)

		  		}, MOBILE_TO_DESKTOP_TIMEOUT)


		  }


		  function desktopToMobile(wrapper) {
		  		// console.log('Desktop to Mobile for wraper', wrapper)

		  		var ul_top = $D.get('ul', wrapper)
		  		var data = getMenuData(wrapper)

		  		//  destrcting the more removes the node so, unbind the desktop events first and then remove the more menu
		  		unbindDesktopEvents(wrapper, ul_top, data)

		  		destructMore(ul_top, data)

		  		placeMenuInResponsive(wrapper, data)

		  		bindMobileEvents(wrapper, ul_top, data)

		  }

		  // orientation change binding starts
		  
		  function mobileOrientation(wrapper) {
		  		// console.log('Mobile orientationchange', 'everything is css work')
		  		return false
		  }

		  function onOrientationChange(e, ctx) {

		  		// $E.unbind(win, 'resize',  onWindowResize)//throttle(100, onWindowResize))
			  	ctx = ctx || doc
				// var currentHeight = getViewportH(win)
				var currentWidth = getViewportW(win)
				var change = getScreenChange(windowWidth, currentWidth)
				// if(change == SCREEN_CHANGE.m2d){
				// 	$E.unbind(win, 'orientationchange', onOrientationChange)
				// 	mobileToDesktopView()
				// 	return
				// }
				// console.log('The change observed for orientation is onOrientationChange ', e, change)
				// windowHeight = currentHeight
				windowWidth = currentWidth

		  }

		  // win.onorientationchange = onOrientationChange


		  // bind the events here
		  // use the orientationchange and resiz events to detect screen changes in mobile and desktop respectivley
		  // orientationchange will also trigger resize event, so use only one in the mobile
		  
		  //##### in the mobile device desktop view wont appear at any time
		  // if(isMobile(windowWidth)){
		  // 		$E.bind(win,'orientationchange', onOrientationChange)//NO I18N
		  // } else {
			 //  	$E.bind(win, 'resize',  onWindowResize)//throttle(100, onWindowResize))
		  // }


		  // toggles the burger icon

		  function toggleMenu(e, wrapper){
		  		var data = getMenuData(wrapper)
		  		var burgerIcon = getTargetByMenuId(RESP_BURGER_ICON, data)
		  		var burgerCloseClass = data[ BURGER_CLOSE_CLASS ]
		  		var animate_open_class = data[ ANIMATE_OPEN_CLASS ]
		  		var animate_close_class = data[ ANIMATE_CLOSE_CLASS ]

		  		if($D.hasClass(burgerIcon, burgerCloseClass)){// hide the menu bar
		  			$D.removeClass(burgerIcon, burgerCloseClass)
		  			// it is in open state so animate class is already there
		  			$D.removeClass(wrapper, animate_open_class)
		  			$D.addClass(wrapper, animate_close_class)
		  			var topMenus = $D.get('ul', wrapper).children
		  			var currentSpan
		  			var span_class = data[ RESP_SPAN_CLASS ]
		  			var opened_class = data[MOBILE_SUBMENU_TO_CLOSE_STATE]
		  			for(var i = 0 ; i < topMenus.length; i++){
		  				currentSpan = $D.get('.'+ span_class ,topMenus[i])
		  				if(currentSpan && $D.hasClass(currentSpan, opened_class)){
		  					onMobileSubMenuClick.call(currentSpan, null, wrapper)
		  				}
		  			}
		  		} else {// show the menu bar
		  			$D.addClass(burgerIcon, burgerCloseClass)
		  			// it is in open state so animate class is not already there
		  			$D.removeClass(wrapper, animate_close_class)
		  			$D.addClass(wrapper, animate_open_class)
		  		}
		  }

		  /**
		  *		@description	shows or hides the submenu
		  *		@param			{Event}		e 	 	clickEvent | null
		  *		@param			{Node}		menu 	wrapper div
		  *		@this			{Node}		span inside the LI , that contians the responsive icon
		  */
		  function onMobileSubMenuClick(e, wrapper) {
			var span = this
			var data = getMenuData(wrapper)
			var opened_state_class = data[ MOBILE_SUBMENU_TO_CLOSE_STATE ]
			var closed_state_class = data[ MOBILE_SUBMENU_TO_OPEN_STATE ]
			var parentLi = $D.findParentByTag(span, 'li' )
			if($D.hasClass( span, closed_state_class)){// have to expand the menu
				$D.removeClass(span, closed_state_class)
				$D.addClass(span, opened_state_class)
				var submenu = $D.get('ul', parentLi)
				showOrHide(submenu, true)
			} else { // have to hide the menu
				var submenu_all = $D.getAll('ul[style="display: block;"]' , parentLi)//this has to be changed into class
				var span_all = $D.getAll('.'+opened_state_class, parentLi)
				for(var i =0 ; i < submenu_all.length; i++){
					$D.removeClass(span_all[i], opened_state_class)
					$D.addClass(span_all[i], closed_state_class)
					showOrHide(submenu_all[i] , false)
				}
			}
			// console.log('preventind default')
			e && e.preventDefault()
			function showOrHide(ultag, show){
				ultag && (ultag.style.display = show ? 'block' : 'none')//NO I18N
			}
		}

		  

		return {
			init : init,
			rewrap : reWrapMore,
			destruct : destructMenu,
			destroy : destroy
		};
	})()

	var zpAnimation = (function (){
		'use strict'
		var animElems = [];
		var inViewPort = [];

		function bindAnimation (){
			if(window.zs_rendering_mode === "canvas"){
				return;
			}
			if(window.IntersectionObserver){
				var animations = document.querySelectorAll('[data-animation-name]');       //NO I18N
				bindAnimationObserver(animations);
			}			
		}
		function bindAnimationObserver(animations){
			var options = {
				threshold: [0,0.5,0.75,1]
			}
			var observer = new IntersectionObserver(processChanges, options);
			for(var i = 0; i < animations.length; i++){
				observer.observe(animations[i]);
			}
		}

		function processChanges(entries) {
		    entries.forEach(function(entry) {
				var ratio = parseFloat(entry.intersectionRatio.toFixed(1));
		        var element = entry.target;
		        element.isVisible = isVisible(entry.boundingClientRect, entry.intersectionRect);
		        var repeat = element.getAttribute('data-animation-repeat') || "false";
		        var animElemsIndex = animElems.indexOf(entry.target);
		        var inViewPortIndex = inViewPort.indexOf(element);
		        var canAnimate = false;

				if( ratio == 0 && !entry.isIntersecting && !element.isVisible){
					/***** element exit ****/
					if(repeat == 'true' && animElemsIndex != -1){
						animElems.splice(animElemsIndex, 1)
					}
					if(inViewPortIndex != -1){
						inViewPort.splice(inViewPortIndex,1);
					}
				}else if(ratio >= 0.5){
					if( inViewPortIndex == -1 ){
						inViewPort.push(element)
						canAnimate = true
						/***** element entry ****/
					}
				}

				if( ratio >= 0.5 && entry.isIntersecting){

                    if( canAnimate && animElemsIndex == -1){

                        animElems.push(entry.target);
				        
				        if(element.isVisible) {
				            animateElement(element, animateCallback.bind(null, element));
				        }                        
                    }
				}			
		    
		  });
		}

		function animateElement(element, callback) {
		    var anim = element.getAttribute('data-animation-name')
		    if(!anim || anim == ''){
		    	return;
		    }
		    var duration = element.getAttribute('data-animation-duration') || '1s';       //NO I18N
		    
			var json = {}
			json['animation-name']=anim;       //NO I18N
			json['animation-duration']=duration;       //NO I18N
			var options = {}
			options.remove = true
			if(callback){
				options.callback = callback;	
			}
			animation.animateUsingName(element, json, options)
		}		

		function animateCallback(element){
			if(window.zs_rendering_mode === "canvas"){
				return;
			}

            var animElemsIndex = animElems.indexOf(element);
            var repeat = element.getAttribute('data-animation-repeat') || "false";
        	if(repeat == 'true' && animElemsIndex != -1){
				animElems.splice(animElemsIndex, 1)
        	}

        }

		function isVisible(boundingClientRect, intersectionRect) {
		    return intersectionRect.height> 0
		}

		$E.callOnLoad(bindAnimation);
		return {
			bindAnimationObserver 	: bindAnimationObserver,
			animateElement			: animateElement
		};		

	})()


/*$Id$*/

var CrmForms = (function(){

	"use strict"; //NO I18N
	function renderForm(node, data){
		node.innerHTML = "<h4 align='center'>" + i18n.get('forms.common.loading') + "</h4>";
		data.next && data.next();
		var params = {},
			heading_tag_open = "<h4 align='center'>", //NO I18N
			heading_tag_close = "</h4>"; //NO I18N
		params.type = node.getAttribute("data-formtype");
		params.crmFormId = node.getAttribute("data-formid");
		if(!params.type || !params.crmFormId){
			node.innerHTML = (window.zs_rendering_mode == "live") ? "" : parent.cms_i18n('ui.crm.add.errormessage',heading_tag_open,heading_tag_close); //NO I18N
			return;
		}
		$X.get({
        	url     : '/siteapps/crm',//NO I18N
        	params  : params,
        	handler : renderFormRes,
        	args	: { node : node, data : data }
    	});
	}

	function renderFormRes(args){
        var response = this.responseText,
            node = args.node, afterAppLoad = args.data.loaded;
        node.innerHTML = response;
        var formEle = node.getElementsByTagName("form")[0];
        var captchaEl = getCaptchaElement(formEle);
        if(window.zs_rendering_mode == "live"){
            if(response != ""){
                bindFormEvents(formEle);
            }
        }
        else{
            var formEle = node.getElementsByTagName("form")[0];
            formEle.addEventListener("submit",function(e){
                e.preventDefault();
            });
        }
        if(captchaEl) {
        	zsUtils.onImageLoad(captchaEl.parentNode, afterAppLoad)
        } else {
        	afterAppLoad();
        }
    }

	function bindFormEvents(formEle){
        
		//Form submit
		formEle.addEventListener("submit",function(e){
	    	var valid = validateCrmForm(formEle);
	    	if(!valid){
	    		e.preventDefault();
	    	}
		});

        //Datepicker events
        var dateTimeElements = formEle.querySelectorAll("[data-element-id=datetime]"); //NO I18N
        for(var i=0;i<dateTimeElements.length;i++){
            bindDateEvents(dateTimeElements[i],"datetime"); //NO I18N
        }
        var dateElements = formEle.querySelectorAll("[data-element-id=date]"); //NO I18N
        for(var i=0;i<dateElements.length;i++){
            bindDateEvents(dateElements[i],"date"); //NO I18N
        }
        var captchaEl = getCaptchaElement(formEle);
        if(captchaEl){
           captchaEl.addEventListener("click",function(e){
               captchaReload(captchaEl);
           });
        }
    }

    function getCaptchaElement(formEle) {
    	return formEle.querySelector("[data-element-id$=captcha]"); //NO I18N
    }

    function bindDateEvents(element,type){
    	if(type == "date"){
    		element.addEventListener("click",function(event){
                datepickerJS.init(event.currentTarget,'date'); //NO I18N
            });
    	}else{
    		element.addEventListener("click",function(event){
                datepickerJS.init(event.currentTarget,'datetime'); //NO I18N
            });
    	}
    }

    function captchaReload(captchaEl){
       var imgElem=captchaEl.parentNode.getElementsByTagName('img')[0];
        if(imgElem){
            if(imgElem.src.indexOf('&d') !== -1 ){
                imgElem.src=imgElem.src.substring(0,imgElem.src.indexOf('&d'))+'&d'+new Date().getTime();
            }else{
                imgElem.src=imgElem.src+'&d'+new Date().getTime();
            }
        }
    }

	function validateCrmForm(formEle){
		for(var i=0;i<formEle.elements.length;i++){
			var elem = formEle.elements[i];
			var errElem = document.getElementById(elem.name+"-error");
        	if(errElem){
            	errElem.parentNode.removeChild(errElem);
    		}
    		var regx = new RegExp("([0-1][0-9]|[2][0-3]):([0-5][0-9]):([0-5][0-9])");
	        var time = regx.exec(elem.value);
	        if(elem.getAttribute("format") && time !==null){
	            var hr=parseInt(time[1]);
	            var ampm;
	            ampm= (hr>11)?"pm":"am"; //NO I18N
	            hr=(hr>11)?(hr-12):hr;
	            hr=(hr===0)?(12):hr;
	            document.getElementsByName(elem.name)[0].value=elem.value.replace(time[0],"");
	            document.getElementsByName(elem.name+"minute")[0].value=time[2];
	            document.getElementsByName(elem.name+"hour")[0].value=""+hr;
	            document.getElementsByName(elem.name+"ampm")[0].value=ampm;
	        }
	        var dataReqd = elem.getAttribute("data-required");
	        if(dataReqd=="true"){
	        	var errMsg = "";
	            if(elem.value==""){
	                errMsg = i18n.get("crm.error.textempty",elem.name);
	            }else if(elem.type =="checkbox" && elem.checked == false){
	                errMsg = i18n.get("crm.error.checkboxempty",elem.name);
	            }else if(elem.nodeName=="SELECT" && (elem.options[elem.selectedIndex].text=="-None-" || elem.options[elem.selectedIndex].text=="-Select-")){
	                errMsg = i18n.get("crm.error.checkboxempty",elem.name);
	            }
	            if(errMsg != ""){
	            	errElem = document.createElement("div");
	                errElem.id = elem.name+"-error";
	                errElem.setAttribute("tag","eleErr");///NO I18N		
	            	errElem.className += " zpform-errormsg"; //NO I18N
	                errElem.innerHTML = errMsg;
	                elem.parentNode.appendChild(errElem);
	                return false;
	            }
        	}
		}
		return true;
	}

	return {
        init   : renderForm
    };
})();


/*$Id$*/

var datepickerJS = (function(){
    var datepicker = {};

    datepicker.display_months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]; //NO I18N
    datepicker.display_long_months = ['January','February','March','April','May','June','July','August','September','October','November','December']; //NO I18N
    datepicker.display_single_days = ['S','M','T','W','T','F','S']; //NO I18N
    datepicker.display_days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']; //NO I18N
    datepicker.display_long_days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']; //NO I18N

    // initializing the datepicker
    datepicker.init = function() { 
        var dp = document.createElement('div');
        dp.id = "datepicker";
        dp.style.position = "absolute";
        dp.style.left = "-1000px";
        dp.style.top = "1px";
        var calendar_html = [];

        calendar_html.push("<div class=\"zpcalendar-container\"><div class=\"zpcalendar-header\"><div class=\"zpcalendar-controller\"><span id=\"decrease_year\"><svg viewBox=\"0 5 7 7\" xmlns=\"ht"+"tp://www.w3.org/2000/svg\"><path d=\"M.2 8.3c-.05.06-.07.1-.07.17 0 .06.02.1.07.16l3.22 3.22c.05.04.1.07.16.07s.1-.03.16-.07l.34-.35c.05-.04.07-.1.07-.16s-.02-.1-.07-.16l-2.7-2.7 2.7-2.73c.05-.04.07-.1.07-.16 0-.07-.02-.12-.07-.17l-.34-.34C3.7 5.03 3.64 5 3.58 5s-.1.02-.16.07L.2 8.3zm2.58.17c0 .06.03.1.07.16l3.22 3.22c.05.04.1.07.16.07s.1-.03.16-.07l.34-.35c.04-.04.07-.1.07-.16s-.02-.1-.06-.16l-2.72-2.7 2.72-2.73c.04-.04.07-.1.07-.16 0-.07-.02-.12-.06-.17L6.4 5.1C6.33 5.03 6.3 5 6.22 5c-.06 0-.1.02-.16.07L2.85 8.3c-.04.06-.07.1-.07.17z\"/></svg></span>");
        calendar_html.push("<span id=\"decrease_month\"><svg viewBox=\"20 5 5 7\" xmlns=\"ht"+"tp://www.w3.org/2000/svg\"><path d=\"M20.07 8.3l3.22-3.23c.04-.05.1-.07.15-.07.06 0 .1.02.16.07l.35.34c.05.06.07.1.07.17 0 .06-.02.12-.07.16l-2.7 2.72 2.7 2.7c.05.06.07.1.07.17 0 .06-.02.12-.07.16l-.34.35c-.04.04-.1.07-.15.07-.06 0-.1-.03-.16-.07L20.06 8.6c-.05-.04-.07-.1-.07-.15 0-.06.02-.1.07-.16z\"/></svg></span>");
        calendar_html.push("<span class=\"select-box\"><select></select></span></span><span class=\"select-box\"><select></select></span>");
        calendar_html.push("<span id=\"increase_month\"><svg viewBox=\"19 0 6 7\" xmlns=\"ht"+"tp://www.w3.org/2000/svg\"><path d=\"M23.95 3.3L20.73.06c-.04-.05-.1-.07-.16-.07s-.1.02-.16.07l-.33.34c-.05.06-.07.1-.07.17 0 .06.02.12.07.16l2.7 2.72-2.7 2.7c-.05.06-.07.1-.07.17 0 .06.02.12.07.16l.34.35c.06.04.1.07.17.07.06 0 .12-.03.16-.07l3.22-3.22c.05-.04.07-.1.07-.15 0-.06-.02-.1-.07-.16z\"/></svg></span>");
        calendar_html.push("<span id=\"increase_year\"><svg viewBox=\"0 0 7 7\" xmlns=\"ht"+"tp://www.w3.org/2000/svg\"><path d=\"M6.74 3.3c.04.06.07.1.07.17 0 .06-.02.1-.06.16L3.52 6.85c-.05.04-.1.07-.16.07s-.12-.03-.16-.07l-.35-.35c-.04-.04-.07-.1-.07-.16s.03-.1.07-.16l2.72-2.7L2.85.74C2.8.7 2.78.65 2.78.6c0-.07.03-.12.07-.17L3.2.1c.04-.06.1-.08.16-.08s.1.02.16.07l3.22 3.2zm-2.6.17c0 .06 0 .1-.06.16L.86 6.85c-.04.04-.1.07-.16.07S.6 6.9.55 6.85L.2 6.5c-.05-.04-.07-.1-.07-.16s.02-.1.07-.16l2.72-2.7L.2.74C.15.7.13.65.13.6.13.52.15.47.2.42L.55.1C.6.03.65 0 .7 0 .76.02.82.04.86.1l3.22 3.2c.05.06.07.1.07.17z\"/></svg></span></div>");
        calendar_html.push("<div class=\"zpcalendar-days\">");
        for(var i=0;i<7;i++){
            calendar_html.push("<span>",datepicker.display_single_days[i],"</span>");
        }
        calendar_html.push("</div></div>");
        calendar_html.push("<div id=\"date-container\" class=\"zpcalendar-date-container\">");
        for(var i=0;i<5;i++){
            for(var j=0;j<7;j++){
                calendar_html.push("<div class=\"date\"></div>");
            }
        }
        calendar_html.push("</div>");
        calendar_html.push("<div class=\"zpcalendar-footer\"><div id=\"time\" class=\"zpcalendar-time-area\"><span>Time</span><span><input id=\"zphours\" class=\"\" type=\"text\" value=\"00\"></span> : <span><input id=\"zpmins\" class=\"\" type=\"text\" value=\"05\"></span> : <span><input id=\"zpsec\" class=\"\" type=\"text\" value=\"33\"></span> : <span><select id=\"zptimeformat\" name=\"zptimeformat\"><option>24</option><option>AM</option><option>PM</option></select></span></div>");
        calendar_html.push("<div class=\"zpcalendar-button-area\"><input id=\"dpBtnOK\" type=\"button\" value=\"OK\"><input id=\"dpBtnCancel\" type=\"button\" value=\"Cancel\"></div></div></div></div>");

        dp.innerHTML = calendar_html.join("");
        datepicker.dp = dp;
        var mclick = function(){
            /*set date for element*/
            if(datepicker.mode=="datetime"){
                if(/^\d+$/.test(this.innerHTML)){
                    var els= dp.getElementsByClassName("zpcalendar-date-container")[0].childNodes;
                    for(var el,i=0;(el = els[i]);i++) {
                        if(/\ selected-date/.test(el.className)){
                            el.className=el.className.replace(/\ selected-date/," ");
                        }
                    }
                    this.className+=" selected-date"; //NO I18N
                    datepicker.date=parseInt(this.innerHTML,10);
                }
            }
            else if(datepicker.mode=="date"){
                datepicker.date=parseInt(this.innerHTML,10);
                datepicker.forElement.value=datepicker.format(datepicker.forElement.getAttribute("format") || "MM-dd-yyyy", new Date(datepicker.showYear,datepicker.showMonth,datepicker.date)); //NO I18N
                var node = document.getElementById("datepicker");
                node.parentNode.removeChild(node);
                fnTriggerEvent();
            }   
        };
        var els= dp.getElementsByClassName("zpcalendar-date-container")[0].childNodes;
        for(var el,i=0;(el = els[i]);i++) {
            el.onclick = mclick;
        }
        els= dp.getElementsByTagName("span");
        var nclick = function(){
            /*set date for element*/
            var element = this;
            switch(element.id) {
                case "decrease_year": //NO I18N
                    if(datepicker.mode=="datetime"){
                        datepicker.go(new Date(datepicker.showYear-1,datepicker.showMonth,1,datepicker.hours,datepicker.mins,datepicker.secs));
                    }
                    else{
                        datepicker.go(new Date(datepicker.showYear-1,datepicker.showMonth,1));
                    }
                    break;
                case "decrease_month": //NO I18N
                    var m = (12+datepicker.showMonth-1)%12;
                    if(datepicker.mode=="datetime"){
                        datepicker.go(new Date(datepicker.showYear-((m==11)?1:0),m,1,datepicker.hours,datepicker.mins,datepicker.secs));
                    }
                    else{
                        datepicker.go(new Date(datepicker.showYear-((m==11)?1:0),m,1));
                    }
                    break;
                case "increase_month": //NO I18N
                    var m = (12+datepicker.showMonth+1)%12;
                    if(datepicker.mode=="datetime"){
                        datepicker.go(new Date(datepicker.showYear+((m==0)?1:0),m,1,datepicker.hours,datepicker.mins,datepicker.secs));
                    }
                    else{
                        datepicker.go(new Date(datepicker.showYear+((m==0)?1:0),m,1));
                    }
                    break;
                case "increase_year": //NO I18N
                    if(datepicker.mode=="datetime"){
                        datepicker.go(new Date(datepicker.showYear+1,datepicker.showMonth,1,datepicker.hours,datepicker.mins,datepicker.secs));
                    }
                    else{
                        datepicker.go(new Date(datepicker.showYear+1,datepicker.showMonth,1));
                    }
                    break;
            }
        };
        var kPress = function(event){
            /* increased/decreased time by keyboard up/down arrow */
            var code = event.keyCode;
            var timeEle = this.childNodes[0];
            var n = parseInt(timeEle.value,10);
            switch(code) {
                case 38 :
                    if(timeEle.id == "zphours"){
                        if((datepicker.timeformat.value == "24" && n<23) ||((datepicker.timeformat.value == "AM" || datepicker.timeformat.value == "PM") && n<12)){
                            timeEle.value=(n<9)?"0"+parseInt(n+1):parseInt(n+1);
                        }
                    }
                    else{
                        if(n<59){
                            timeEle.value=(n<9)?"0"+parseInt(n+1):parseInt(n+1);
                        }
                    }
                    break;
                case 40 :
                    if(timeEle.id == "zphours"){
                      if((datepicker.timeformat.value == "24" && n>0) ||((datepicker.timeformat.value == "AM" || datepicker.timeformat.value == "PM") && n>1)){
                            timeEle.value=(n<=10)?"0"+parseInt(n-1):parseInt(n-1);
                      }  
                    }
                    else{
                        if(n>0){
                            timeEle.value=(n<=10)?"0"+parseInt(n-1):parseInt(n-1);
                        }
                    }
            }
        };
        for(var el,i=0;(el = els[i]);i++) {
            el.onclick = nclick;
            el.onkeydown=kPress;
        }
        els= dp.getElementsByTagName("select");
        datepicker.monthSelect = els[0];
        for(var i=0; i < 12; i++) {
            var opt = new Option(datepicker.display_months[i]);
            datepicker.monthSelect.options[i]=opt;
        }
        datepicker.yearSelect = els[1];
        datepicker.monthSelect.onchange = function(){
            if(datepicker.mode=="datetime"){
                datepicker.go(new Date(datepicker.showYear,this.selectedIndex,1,datepicker.hours,datepicker.mins,datepicker.secs));
            }
            else{
                datepicker.go(new Date(datepicker.showYear,this.selectedIndex,1));
            }
        }
        datepicker.yearSelect.onchange = function(){
            if(datepicker.mode=="datetime"){
                datepicker.go(new Date(parseInt(this.options[this.selectedIndex].value,10),datepicker.showMonth,1,datepicker.hours,datepicker.mins,datepicker.secs));
            }
            else{
                datepicker.go(new Date(parseInt(this.options[this.selectedIndex].value,10),datepicker.showMonth,1));
            }
        }
        datepicker.timeformat=els[2];
        var preTf = datepicker.timeformat.value
        datepicker.timeformat.onchange = function(){
            var tf =this.options[this.selectedIndex].value;
            if(tf =="PM" || tf=="AM"){
                datepicker.hours = (datepicker.hours>11)?datepicker.hours-12:datepicker.hours;
            }
            else if(preTf =="PM"){
                datepicker.hours=parseInt(datepicker.hours);
                datepicker.hours+=12;
            }
            preTf = tf;
            datepicker.go(new Date(datepicker.showYear,datepicker.showMonth,datepicker.date,datepicker.hours,datepicker.mins,datepicker.secs));
        }
    }

    datepicker.go = function(dt) {
        //setting the date in date picker
        datepicker.monthSelect.selectedIndex = dt.getMonth();
        var showYear = datepicker.showYear = dt.getFullYear();
        var showMonth = datepicker.showMonth = dt.getMonth();
        var currDate = datepicker.date = dt.getDate();
        while(datepicker.yearSelect.firstChild){
            datepicker.yearSelect.removeChild(datepicker.yearSelect.firstChild);
        }
        for(var sy=showYear-101; sy < (showYear + 15);sy++) {
            var opt = new Option(""+sy);
            datepicker.yearSelect.options[datepicker.yearSelect.options.length]=opt;
        }
        datepicker.yearSelect.selectedIndex = 101;
        var day1 = new Date(showYear,showMonth,1)
        var weekday = day1.getDay();
        var day,curDate;
        var dayArray = datepicker.dp.getElementsByClassName("zpcalendar-date-container")[0].childNodes;
        for(var i=0; (day = dayArray[i]);i++) {
            day.className=day.className.replace(/\ selected-date/,"");
            if(showMonth == day1.getMonth() && i>=weekday){
                day.innerHTML = curDate = day1.getDate();
                if(!/^date/.test(day.className)){
                    day.className+="date"; //NO I18N
                }
                if(currDate == day1.getDate()){
                    day.className+=" selected-date"; //NO I18N
                }
                day1 = new Date(day1.getTime()+86400000);
                if(curDate === day1.getDate()){     
                    day1 = new Date(day1.getTime()+86400000);       
                }
            }
            else{
                day.innerHTML="";
                day.className=day.className.replace("date","");
            }
        }
        if(datepicker.mode=="datetime"){
            datepicker.hours=document.getElementById("zphours").value=(dt.getHours()<10?("0"+dt.getHours()):dt.getHours());
            datepicker.mins=document.getElementById("zpmins").value=dt.getMinutes()<10?("0"+dt.getMinutes()):dt.getMinutes();
            datepicker.secs=document.getElementById("zpsec").value=dt.getSeconds()<10?("0"+dt.getSeconds()):dt.getSeconds();
        }
    }

    datepicker.show = function(invoker,mode){
        // showing the datepicker with the specified date selected
        var node;
        node = document.getElementById("datepicker");
        if(node){
            node.parentNode.removeChild(node);
        }
        datepicker.init();
        datepicker.invoker = invoker;
        var formnode=datepicker.invoker;
        while(formnode.tagName.toLowerCase() !="form"){ //NO I18N
            formnode = formnode.parentNode;
        }
        document.body.appendChild(datepicker.dp);
        datepicker.mode = mode;
        if(datepicker.mode =="date"){
            document.getElementById("dpBtnOK").style.display="none";
        }
        if(datepicker.mode =="date"){
            document.getElementById("time").style.display="none";
        }
        var fore = datepicker.forElement = invoker.parentNode.children[0];
        var posElem;
        posElem = invoker;
        setDatepickerPosition(posElem);
        var  format = datepicker.forElement.getAttribute("format");
        if(datepicker.mode=="datetime"){
            format +=" HH:mm:ss"; //NO I18N
        }
        if(fore.value) {
            datepicker.showDate = datepicker.parse(format,fore.value);
        }
        else{
            datepicker.showDate = new Date();
        }
        datepicker.go(datepicker.showDate);
        $D.getById("dpBtnCancel").addEventListener("click",function(e){
            datepicker.cancelDate();
        });
        $D.getById("dpBtnOK").addEventListener("click",function(e){
            datepicker.submitDate();
        });
        return false;
    }

    datepicker.format = function(os,date) {
        // formating the given date according to the specified date format
        if(isNaN(date.getFullYear())){
            return null;
        }
        if(/yyyy/.test(os)){
            os = os.replace(/yyyy/g,date.getFullYear());
        }
        else if(/yy/i.test(os)) {
            os = os.replace(/yy/g,(date.getFullYear()+"").substring(2));
        }
        if(/MMMM/.test(os)) {
            os = os.replace(/MMMM/g,datepicker.display_long_months[date.getMonth()]);
        } 
        else if(/MMM/.test(os)) {
            os = os.replace(/MMM/g,datepicker.display_months[date.getMonth()]);
        } 
        else if(/MM/.test(os)) {
            var m = date.getMonth()+1;
            m = m<10?"0"+m:m;
            os = os.replace(/MM/g,m);
        } 
        else if(/M/.test(os)) {
            var m = date.getMonth()+1;
            os = os.replace(/M/g,m);
        }
        if(/dddd/.test(os)) {
            os = os.replace(/dddd/g,datepicker.display_long_days[date.getDay()]);
        } else if(/ddd/.test(os)) {
            os = os.replace(/ddd/g,datepicker.display_days[date.getDay()]);
        }
        if(/dd/.test(os)) {
            var d = date.getDate();
            d = d<10?"0"+d:d;
            os = os.replace(/dd/gi,d);
        } else if(/d/.test(os)) {
            var d = date.getDate();
            os = os.replace(/d/gi,d);
        }
        if(/HH/.test(os)){
            var h = datepicker.hours;
            os = os.replace(/HH/gi,h);
        }else if(/hh/.test(os)){
            var h = datepicker.hours;
            os = os.replace(/hh/gi,h);
        }
        if(/mm/.test(os)){
            var m= datepicker.mins;
            os = os.replace(/mm/gi,m);
        }
        if(/ss/.test(os)){
            var s= datepicker.secs;
            os = os.replace(/ss/gi,s);
        }
        return os;
    }

    datepicker.parse = function(format,ds) {
        // formating the date in the input box in any format as a date object
        var format_token=[],ds_token=[];
        for(var i=0;i<=format.length;){
            var x= format[i];
            var j=i+1;
            while((format[j]==format[i])&&(j<=format.length)){
                x+=format[j++];
            }
            i=j;
            format_token.push(x);
        }
        var x=0;
        for(var i=0;i<ds.length;){
            j=0,y="";
            while(x<format_token.length && j<format_token[x].length){
                y+=ds[i++];
                j++;
            }
            x++;
            ds_token.push(y);
        }
        var year=0;
        var month=0;
        var dt=0;
        var hour=0;
        var min=0;
        var sec=0;
        var day=0;
        for(var i=0;i<format_token.length;i++){
            switch(format_token[i]){
                case "yyyy": //NO I18N
                case "yy": //NO I18N
                    year=parseInt(ds_token[i]);
                    break;
                case "MMMM": //NO I18N
                    for(var k=0;k<12;k++){
                        if(ds_token[i]==datepicker.display_long_months[k] ){
                            month=k;
                            break;
                        }
                    }
                    break;
                case "MMM": //NO I18N
                    for(var k=0;k<12;k++){
                        if(ds_token[i]==datepicker.display_months[k] ){
                            month=k;
                            break;
                        }
                    }
                    break;
                case "MM": //NO I18N
                case "M" : //NO I18N
                    month=(parseInt(ds_token[i])-1);
                    break;
                case "dddd": //NO I18N
                case "ddd": //NO I18N
                    day=ds_token[i];
                    break;
                case "dd": //NO I18N
                case "d": //NO I18N
                    dt = parseInt(ds_token[i]);
                    break;
                case "HH": //NO I18N
                case "hh": //NO I18N
                    hour= parseInt(ds_token[i]);
                    break;
                case "mm": //NO I18N
                    min= parseInt(ds_token[i]);
                    break;
                case "ss": //NO I18N
                    sec= parseInt(ds_token[i]);
                    break;
                default:
                    break;
            }
        }
        if(isNaN(year) || isNaN(month) || isNaN(dt) || isNaN(hour) || isNaN(min) || isNaN(sec)){
            return(new Date());
        }
        else if(format.indexOf('mm')!==-1){
            return(new Date(year,month,dt,hour,min,sec));
        }
        else{
            return(new Date(year,month,dt));
        }
    }

    datepicker.submitDate=function(){
        // submitting the date and time selected to the input box
        datepicker.timeformat=document.getElementById("zptimeformat").options[document.getElementById("zptimeformat").selectedIndex].value;
        datepicker.hours= document.getElementById("zphours").value;
        datepicker.mins = document.getElementById("zpmins").value;
        datepicker.secs = document.getElementById("zpsec").value;
        if(datepicker.timeformat=="24"){
            if(!(/^(([0-9])|([0-1][0-9])|(2[0-3]))$/.test(datepicker.hours))){
                document.getElementById("zphours").select();
                return;
            }
        }
        else{
            if(!(/^((0?[0-9])|(1[0-2]))$/.test(datepicker.hours))){
                document.getElementById("zphours").select();
                return;
            }
        }   
        if(!(/^(([0-9])|([0-5][0-9]))$/.test(datepicker.mins))){
            document.getElementById("zpmins").select();
            return;
        }
        if(!(/^(([0-9])|([0-5][0-9]))$/.test(datepicker.secs))){
            document.getElementById("zpsec").select();
            return;
        }
        if(!isNaN(datepicker.date)) {
            if(datepicker.timeformat=="PM"){
                datepicker.hours= parseInt(datepicker.hours);
                datepicker.hours+=12;
            }
            var dateformat = datepicker.forElement.getAttribute("format")+" HH:mm:ss"; //NO I18N
            var newDate = new Date(datepicker.showYear,datepicker.showMonth,datepicker.date,datepicker.hours,datepicker.mins,datepicker.secs);
            datepicker.forElement.value=datepicker.format(dateformat || "MM-dd-yyyy HH:mm:ss", newDate);//NO I18N
            var node = document.getElementById("datepicker");
            node.parentNode.removeChild(node);
        }
        fnTriggerEvent();
    }

    datepicker.cancelDate=function(){//cancelling the date picker
        var node;
        node = document.getElementById("datepicker");
        node.parentNode.removeChild(node);
    }

    fnTriggerEvent = function(){
        var evnt;
        if(document.createEvent){ //for IE 9, Frefox, Chrome browser
            evnt = document.createEvent("HTMLEvents");//No I18N
            evnt.initEvent("change", true, false);//No I18N
            datepicker.forElement.dispatchEvent(evnt);
        } 
        else if(document.createEventObject){ //for IE 7, 8 browser
            evnt = document.createEventObject();
            datepicker.forElement.fireEvent("onchange", evnt);//No I18N
        }
    }

    setDatepickerPosition = function(element){
        datepicker.dp.style.top = ($D.offset(element.parentNode).top + element.parentNode.offsetHeight)+'px';
        var dp_top = parseInt(datepicker.dp.style.top.replace("px",""));
        var dp_bottom = dp_top + datepicker.dp.offsetHeight;
        var body_bottom = document.body.offsetHeight;
        if(dp_bottom > body_bottom){
            var input_top = $D.offset(element.parentNode).top;
            dp_bottom = dp_top + datepicker.dp.offsetHeight;
            dp_top = dp_top - (dp_bottom - input_top);
            datepicker.dp.style.top = dp_top + "px";
        }
        var dp_left = $D.offset(element.parentNode).left + element.parentNode.offsetWidth/2;
        var dp_right = dp_left + datepicker.dp.offsetWidth;
        var input_right = $D.offset(element.parentNode).left + element.parentNode.offsetWidth;
        datepicker.dp.style.left = dp_left + (input_right - dp_right) +'px';
        datepicker.dp.style.zIndex = 499;
    }

    return{
        init : datepicker.show
    };

})();

/*$Id$*/

var portal = (function () {
	function getCurrentUser(){
		if(window.is_portal_site){
			$X.get({
	        	url     : '/portaluser/getCurrentPortalUser',//NO I18N
	        	handler : getCurrentUserRes
	    	});
		}
	}	

	function getCurrentUserRes(){
		var resp_obj = JSON.parse(this.responseText).current_user;
		var disp_name = resp_obj.user;
		var site_visibility = resp_obj.site_visibility;
		var is_zsadmin = resp_obj.is_zsadmin;
		if(disp_name.indexOf("null") == -1){
			document.querySelector("[data-portal-loggedout]").style.display = "none"; //NO I18N
			document.querySelector("[data-portal-loggedin]").style.display = "block"; //NO I18N
			var anchor_elem = document.querySelector("[data-portal-loggedin]").querySelector("[data-portal-profile]");
			
			anchor_elem.querySelector("[data-portal-user-name]").innerHTML=i18n.get('portal.welcome', disp_name); //NO I18N
			var anchor_logout_elem = document.querySelector("[data-portal-loggedin]").querySelector("[data-portal-logout]"); //NO I18N
			if(site_visibility != 0 || is_zsadmin){
				anchor_elem.target = "_blank"; //NO I18N
			}
			anchor_elem.href = resp_obj.profile_url;
			anchor_logout_elem.href = resp_obj.logout_url
		}else{
			var display_elem = document.querySelector("[data-portal-loggedout]");//NO I18N
			display_elem.style.display = "block";
			document.querySelector("[data-portal-loggedin]").style.display = "none"; //NO I18N
			display_elem.querySelector("[data-portal-signin]").href = "/signin" ; //NO I18N
			display_elem.querySelector("[data-portal-signup]").href = "/signup"; //NO I18N
		}
	}

	function bindFunction(){
		getCurrentUser();
		$E.unbind(window,'DOMContentLoaded', bindFunction);
	}

	$E.callOnLoad(bindFunction);
})();

/*$Id$*/
var Newsletter = (function(){
	$E.callOnLoad(bindNewsletterButton);
	var NewsletterCont;
	function bindNewsletterButton(){
		var forms=document.querySelectorAll(".zpnewsletter-input-container");//NO I18N	
		for(var i =0; i<forms.length;i++){
			$E.bind(forms[i],'submit',subscribeUser);
            var inputs = $D.getByTag('input',forms[i]);
            for(var j=0;j<inputs.length;j++){
                $E.bind(inputs[j],'keydown',clearMessage);
            }
		}
	}
	function validateEmail(email) {
        var re =  /^((([^<>()[\]\\.,;:\s@!#&$%*"]+(\.[^<>()[\]\\.,;:\s@!#&$%*"]+)*)|(".+"))@(([[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,})))?$/;//No I18N
        return re.test(email);
    }
    function validate_name(name){
	    if(name.trim().length == 0){
	        showMessage("Please enter your name","error");//NO I18N
	        return false;
	    }else if(name.trim().length > 50){
	        showMessage("Length of the name must not exceed 50 charecters","error");//NO I18N
	        return false;
	    }
	    return true;
	}
    function subscribeUser(e){
        e.preventDefault();
        e.stopPropagation();
        if(window.zs_rendering_mode == "preview"){
        	alert("Subscribers cannot be added in the preview mode.");//NO I18N
        	return;
        }
        NewsletterCont = $D.findParent(e.target,'zpelem-newsletter');
        var list_id = NewsletterCont.getAttribute("data-list-id");
        var email = $D.getByClass('zpnewsletter-email-input-field',NewsletterCont)[0].value;
        var params = {};
        if(email.trim() == ""){
        	showMessage("Please enter your email","error");//NO I18N
            return;
        }
        if(list_id == ""){
            showMessage("No mailing list is associated","error");//NO I18N
            return;
        }
        if(!validateEmail(email)){
            showMessage("Invalid email address","error");//NO I18N
            return;
        } 
        showMessage("Please wait","success");//NO I18N
        params.email = email;   
        params.domain_name = window.location.hostname;
        params.newsletter_id = list_id;
        var fname=$D.getByClass('zpnewsletter-first-name-input-field',NewsletterCont)[0];
        if(fname){
        	if(!validate_name(fname.value)){
        		return;
        	}
            params.fname = fname.value;
        }
        var lname=$D.getByClass('zpnewsletter-last-name-input-field',NewsletterCont)[0];
        if(lname){
            if(!validate_name(lname.value)){
                return;
            }
            params.lname = lname.value;
        }
        var name=$D.getByClass('zpnewsletter-name-input-field',NewsletterCont)[0];
        if(name){
            if(!validate_name(name.value)){
                return;
            }
            params.fname = name.value;
        }
        $X.post({
                url     :  '/siteapps/newsletter', //NO I18N
                params  : params,
                handler : newsletterUpdatedRes
        });
        return ;
    }
	function newsletterUpdatedRes(){
		var res = JSON.parse(this.responseText);
        if ('error_code' in res){
            switch(res.error_code){
                case 102:showMessage("Newsletter service is disconnected","error");//NO I18N
                		break;
                case 502:var json=JSON.parse(res.msg);
                         if(json.detail == "Please provide a valid email address."){
                            showMessage("Invalid email address","error");//NO I18N
                         }else if(json.title == "Member Exists"){
                            showMessage("Email already added to the list","error");//NO I18N
                         }
                            break;
                default:showMessage("Error in adding user","error");//NO I18N
            }
        }else if('subscriber_added' in res && res.subscriber_added == "true"){
            showMessage("Successfully Added","success");//NO I18N
            var form = $D.getByTag('form',NewsletterCont)[0];
            form.reset();
        }
			
	}
	function showMessage(msg,type){
		var node = $D.getAll('#newsletter_response',NewsletterCont)[0];
		if(node){
			node.parentNode.removeChild(node);
		}
		var div = document.createElement("div");
		div.style.textAlign = "center";
		div.id="newsletter_response";
		div.innerHTML =msg;
            
		color = (type == "success")?"green":"red";//NO I18N
		div.style.color= color;
		NewsletterCont.appendChild(div);
	}
    function clearMessage(){
        var node = $D.getAll('#newsletter_response',NewsletterCont)[0];

        if(node && NewsletterCont.contains(node)){
            node.parentNode.removeChild(node);
        }
    }
	return {
		subscribeUser : subscribeUser
	}
})();

/*$Id: $*/
// DOM Utils start
var doc = document

function _get(selector, ctx) {
    ctx || (ctx = doc)
    return ctx.querySelector(selector)
}

function _getAll(selector, ctx) {
    ctx || (ctx = doc)
    return ctx.querySelectorAll(selector)
}

function _getByClass(cName, ctx) {
    ctx || (ctx = doc)
    return ctx.getElementsByClassName(cName)
}

function _hasClass(el, cls) {
    var re = new RegExp('(\\s|^)' + cls + '(\\s|$)')
    return re.test(el.className)
}

function _addClass(el, cls) {
    if (!_hasClass(el, cls)) {
        el.className += ' ' + cls
    }
}

function _removeClass(el, cls) {
    var re = new RegExp('(\\s|^)' + cls + '(\\s|$)')
    if (re.test(el.className)) {
        el.className = el.className.replace(re, ' ')
    }
}

function _attr(el, attrName, value) {
    if (value === undefined) {
        return el.getAttribute(attrName)
    } else {
        return el.setAttribute(attrName, value)
    }
}

var listeners = []

function _bind(element, type, listener) {
    element.addEventListener(type, listener, false);
    listeners.push({
        element: element,
        type: type,
        listener: listener
    });
}

function _unbind(element, type, listener) {
    element && element.removeEventListener(type, listener, false);
    for (var i = listeners.length - 1; i >= 0; i--) {
        if (listeners[i].element === element && listeners[i].type === type && listeners[i].listener === listener) {
            listeners.splice(i, 1);
            break;
        }
    };
}

function _purge(el) {
    for (var i = listeners.length - 1; i >= 0; i--) {
        if (listeners[i].element.nodeType && el.contains(listeners[i].element) || el === listeners[i].element) {
            _unbind(listeners[i].element, listeners[i].type, listeners[i].listener)    
        }
    }
}

var createElement = document.createElement.bind(document)

// DOM Utils end

function _hasOwn(obj, prop) {
    return obj.hasOwnProperty(prop)
}

/**
 * Returns a random number between min (inclusive) and max (exclusive)
 */
function getRandomArbitrary(min, max) {
    return Math.random() * (max - min) + min
}

/**
 * Returns a random integer between min (inclusive) and max (inclusive)
 * Using Math.round() will give you a non-uniform distribution!
 */
function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min
}

function _getCSS(el, prop) {
    return window.getComputedStyle(el)[prop]
}

function _scrollX(ctx) {
    ctx = ctx || window;
    return ctx.pageXOffset || ctx.document.documentElement.scrollLeft;
};

function _scrollY(ctx) {
    ctx = ctx || window;
    return ctx.pageYOffset || ctx.document.documentElement.scrollTop;
}

function _getOffset( el, ctx ) {
    var options = {fixed:false}
    if (!el) {
        throw new Error('Element to _find offset doesnot exists.');//No I18N
    }

    ctx = ctx || window;
    var offset = el.getBoundingClientRect();
    return {
        top  : options.fixed === 'true' ? offset.top : (offset.top + _scrollY(ctx)),
        left : options.fixed === 'true' ? offset.left: (offset.left + _scrollX(ctx)),
        width: offset.width,
        height: offset.height
    }
}

function _box (el) {
    return el.getBoundingClientRect()
}


/*$Id$*/
/* global _get, _getAll, _bind, _addClass, _removeClass, _hasClass, animation, _hasOwn */
var lightbox = (function() {
    'use strict';

    var TMPL_ID             = '#zs-lightbox-template'//NO I18N
    var IMG_CONT_CLASS      = '.hb-lightbox__images'//NO I18N
    var CONT_CLASS          = '.hb-lightbox'//NO I18N
    var ARROW_NAV_CLASS     = '.hb-lightbox__arrow-nav'//NO I18N
    var THUMBS_CONT_CLASS   = '.hb-lightbox__thumbs'//NO I18N
    var CONTROLS_CONT_CLASS = '.hb-lightbox__controls'//NO I18N
    var CAPTION_CONT_CLASS  = '.hb-lightbox__caption'//NO I18N
    var CURRENT_CLASS       = 'hb-current'//NO I18N
    var COUNTER_CONT_CLASS  = '.hb-lightbox__counter'//NO I18N

    var transitionIn     = 'slideInLeft'//NO I18N
    var transitionOut    = 'slideOutRight'//NO I18N
    var transitionInRev  = 'slideInRight'//NO I18N
    var transitionOutRev = 'slideOutLeft'//NO I18N

    var lightboxInstances = []

    var tmpl =
    '<div class="hb-lightbox__img-wrapper hb-center" data-pos="{pos}">'+
    '    <img data-src="{link}" src="{src}">'+
    '</div>'

    var lightboxTmpl =
            '<div class="hb-lightbox__cont">'+
            '<div class="hb-lightbox__controls">'+
                '<div class="hb-lightbox__counter"></div>'+
                '<div class="hb-lightbox__buttons">'+
                    '<ul>'+
                        
                        '<li data-action="zoom"><svg class="icon"><use xlink:href="#zoom-in" /></svg></li>'+
                        '<li data-action="download"><a href="" download><svg class="icon"><use xlink:href="#download" /></svg></a></li>'+
                        '<li data-action="fullscreen"><svg class="icon"><use xlink:href="#expand" /></svg></li>'+
                        '<li data-action="close"><svg class="icon"><use xlink:href="#cross-out" /></svg></li>'+
                    '</ul>'+
                '</div>'+
            '</div>'+
            '<div class="hb-lightbox__images"></div>'+
            '<div class="hb-lightbox__caption"></div>'+
            '<div class="hb-lightbox__thumbs-cont">'+
                '<div class="hb-lightbox__thumbs"></div>'+
            '</div>'+
            '<div class="hb-lightbox__arrow-nav nav-left hb-lightbox__arrow-1"><svg class="icon"><use xlink:href="#back" /></svg></div>'+
            '<div class="hb-lightbox__arrow-nav nav-right hb-lightbox__arrow-1"><svg class="icon"><use xlink:href="#next" /></svg></div>'+
            '<div class="loader" style="display: none"><svg version="1.1" id="Layer_1" xmlns="ht'+'tp://www.w3.org/2000/svg" xmlns:xlink="ht'+'tp://www.w3.org/1999/xlink" x="0px" y="0px"width="24px" height="30px" viewBox="0 0 24 30" style="enable-background:new 0 0 50 50;" xml:space="preserve"><rect x="0" y="0" width="4" height="10" fill="#333"><animateTransform attributeType="xml"attributeName="transform" type="translate"values="0 0; 0 20; 0 0"begin="0" dur="0.6s" repeatCount="indefinite" /></rect><rect x="10" y="0" width="4" height="10" fill="#333"><animateTransform attributeType="xml"attributeName="transform" type="translate"values="0 0; 0 20; 0 0"begin="0.2s" dur="0.6s" repeatCount="indefinite" /></rect><rect x="20" y="0" width="4" height="10" fill="#333"><animateTransform attributeType="xml"attributeName="transform" type="translate"values="0 0; 0 20; 0 0"begin="0.4s" dur="0.6s" repeatCount="indefinite" /></rect></svg></div>'+
    '<svg xmlns="ht'+'tp://www.w3.org/2000/svg"><symbol viewBox="0 0 18 18" id="cross-out"><title>cross-out</title><path d="M16 3.41L14.59 2 9 7.59 3.41 2 2 3.41 7.59 9 2 14.59 3.41 16 9 10.41 14.59 16 16 14.59 10.41 9"></path></symbol><symbol viewBox="0 0 18 18" id="download"><title>download</title> <path d="M13 9l-4 4-4-4h3V2h2v7h3zM1 12h.86l.112 4.05h14.025l.15-4.05H17v5H1v-5z" fill-rule="nonzero"></path> </symbol><symbol viewBox="0 0 18 18" id="expand"><title>expand</title><path d="M6.16 6.98L1.57 2.39c-.22-.22-.41-.148-.41.173v2.663c0 .318-.26.58-.58.58-.322 0-.58-.258-.58-.578V.578C0 .265.26 0 .578 0h4.65c.314 0 .578.26.578.58 0 .324-.26.58-.58.58H2.563c-.318 0-.398.184-.173.41l4.59 4.59-.82.82zm0 4.02l.82.82-4.59 4.592c-.225.226-.145.408.173.408h2.663c.32 0 .58.258.58.58 0 .32-.264.58-.578.58H.578c-.32 0-.578-.263-.578-.577v-4.65c0-.32.258-.578.58-.578.32 0 .58.263.58.58v2.663c0 .32.19.393.41.173L6.16 11zm5.66-4.02L11 6.16l4.59-4.59c.226-.226.146-.41-.172-.41h-2.662c-.32 0-.58-.256-.58-.58 0-.32.263-.58.577-.58h4.65c.32 0 .578.265.578.578v4.65c0 .32-.256.578-.58.578-.32 0-.58-.262-.58-.58V2.563c0-.32-.188-.393-.408-.173l-4.59 4.59zm0 4.02l4.592 4.59c.22.22.408.15.408-.172v-2.662c0-.318.26-.58.58-.58.324 0 .58.258.58.577v4.65c0 .314-.257.578-.577.578h-4.65c-.314 0-.578-.26-.578-.58 0-.322.26-.58.58-.58h2.663c.318 0 .398-.182.173-.408L11 11.822l.82-.822z" fill-rule="nonzero"></path></symbol><symbol viewBox="0 0 18 18" id="focus"><title>focus</title><path d="M.82 0l4.592 4.59c.22.22.408.15.408-.172V1.756c0-.318.26-.58.58-.58.324 0 .58.258.58.577v4.65c0 .314-.257.578-.577.578h-4.65c-.314 0-.578-.26-.578-.58 0-.322.26-.58.58-.58H4.42c.318 0 .398-.182.173-.408L0 .822.82 0zm0 17.98L0 17.16l4.59-4.59c.226-.226.146-.41-.172-.41H1.756c-.32 0-.58-.256-.58-.58 0-.32.263-.58.577-.58h4.65c.32 0 .578.265.578.578v4.65c0 .32-.256.578-.58.578-.32 0-.58-.262-.58-.58v-2.663c0-.32-.188-.393-.408-.173l-4.59 4.59zM17.16 0l.82.82-4.59 4.592c-.225.226-.145.408.173.408h2.663c.32 0 .58.258.58.58 0 .32-.264.58-.578.58h-4.65c-.32 0-.578-.263-.578-.577v-4.65c0-.32.258-.578.58-.578.32 0 .58.263.58.58V4.42c0 .32.19.393.41.173L17.16 0zm0 17.98l-4.59-4.59c-.22-.22-.41-.148-.41.173v2.663c0 .318-.26.58-.58.58-.322 0-.58-.258-.58-.578v-4.65c0-.313.26-.578.578-.578h4.65c.314 0 .578.26.578.58 0 .324-.26.58-.58.58h-2.663c-.318 0-.398.184-.173.41l4.59 4.59-.82.82z" fill-rule="nonzero"></path></symbol><symbol viewBox="0 0 18 18" id="next"><title>next</title><path d="M0 8h14.105l-5.59-5.59L9.935 1l8 8-8 8-1.41-1.41 5.58-5.59H0" fill-rule="nonzero"></path></symbol><symbol viewBox="0 0 18 18" id="back"><title>prev</title><path d="M17.942 8H3.83l5.59-5.59L8 1 0 9l8 8 1.41-1.41L3.83 10h14.112" fill-rule="nonzero"></path></symbol><symbol viewBox="0 0 18 18" id="zoom-in"><title>zoom-in</title> <path d="M17.604 16.896l-5.173-5.173C13.407 10.586 14 9.113 14 7.5 14 3.916 11.084 1 7.5 1c-1.737 0-3.37.676-4.597 1.904C1.675 4.13 1 5.764 1 7.5 1 11.084 3.916 14 7.5 14c1.612 0 3.086-.594 4.224-1.57l5.173 5.174.707-.708zM7.5 13C4.467 13 2 10.533 2 7.5c0-1.47.57-2.85 1.61-3.89C4.65 2.572 6.03 2 7.5 2 10.533 2 13 4.467 13 7.5S10.533 13 7.5 13zM8 7h2v1H8v2H7V8H5V7h2V5h1v2z" fill-rule="nonzero"></path> </symbol><symbol viewBox="0 0 18 18" id="zoom-out"><title>zoom-out</title> <path d="M17.604 16.896l-5.173-5.173C13.407 10.586 14 9.113 14 7.5 14 3.916 11.084 1 7.5 1c-1.736 0-3.37.676-4.598 1.903C1.675 4.13 1 5.763 1 7.5 1 11.084 3.916 14 7.5 14c1.612 0 3.087-.594 4.224-1.57l5.173 5.174.707-.708zM7.5 13C4.468 13 2 10.533 2 7.5c0-1.47.57-2.85 1.61-3.89C4.648 2.573 6.03 2 7.5 2 10.532 2 13 4.467 13 7.5c0 3.032-2.468 5.5-5.5 5.5zM5 7h5v1H5V7z" fill-rule="nonzero"></path> </symbol></svg>' + '</div>' //NO I18N

    var is_download = check_download();
    var is_full_screen = check_fullscreen();
    var is_zoom = check_zoom();
    
    var transitionEnd = (function transitionEndEventName () {
        var prop,
            el = document.createElement('div'),
            transitions = {
                'transition'      :'transitionend',   //NO I18N
                'OTransition'     :'otransitionend',  //NO I18N
                'MozTransition'   :'transitionend',   //NO I18N
                'WebkitTransition':'webkitTransitionEnd' //NO I18N
            };

        for (prop in transitions) {
            if ( _hasOwn( transitions, prop ) && el.style[ prop ] !== undefined) {
                return transitions[ prop ];
            }
        }
    })();

    var animationEnd = (function whichAnimationEvent() {
        var t
        var el = document.createElement('div')
        var animations = {
            'animation': 'animationend', // NO I18N
            'OAnimation': 'oAnimationEnd', // NO I18N
            'MozAnimation': 'animationend', // NO I18N
            'WebkitAnimation': 'webkitAnimationEnd' // NO I18N
        }

        for (t in animations) {
            if (_hasOwn(animations, t) && el.style[t] !== undefined) {
                return animations[t]
            }
        }
    })()

    var transitions = {
        slide_right: { in: 'slideInLeft', // NO I18N
            out: 'slideOutRight', // NO I18N
            revIn: 'slideInRight', // NO I18N
            revOut: 'slideOutLeft' // NO I18N
        },
        slide_left: { in: 'slideInRight', // NO I18N
            out: 'slideOutLeft', // NO I18N
            revIn: 'slideInLeft', // NO I18N
            revOut: 'slideOutRight' // NO I18N
        },
        slide_down: { in: 'slideInDown', // NO I18N
            out: 'slideOutDown', // NO I18N
            revIn: 'slideInUp', // NO I18N
            revOut: 'slideOutUp' // NO I18N
        },
        slide_up: { in: 'slideInUp', // NO I18N
            out: 'slideOutUp', // NO I18N
            revIn: 'slideInDown', // NO I18N
            revOut: 'slideOutDown' // NO I18N
        },
        diffuse: { in: 'fadeIn', // NO I18N
            out: 'fadeOut', // NO I18N
            revIn: 'fadeIn', // NO I18N
            revOut: 'fadeOut' // NO I18N
        },
        diffuse_left: { in: 'fadeIn', // NO I18N
            out: 'fadeOut', // NO I18N
            revIn: 'fadeIn', // NO I18N
            revOut: 'fadeOut' // NO I18N
        },

        diffuse_right: { in: 'fadeIn', // NO I18N
            out: 'fadeOut', // NO I18N
            revIn: 'fadeIn', // NO I18N
            revOut: 'fadeOut' // NO I18N
        }
    }

    function toggleFullScreen(e) {
        var ctx = _getCurrInstance(this)
        var el = _get('[data-action="fullscreen"] use', ctx.controlsCont)//NO I18N

        if ((document.fullScreenElement && document.fullScreenElement !== null) ||
            (!document.mozFullScreen && !document.webkitIsFullScreen)) {
            if (document.documentElement.requestFullScreen) {
                document.documentElement.requestFullScreen();
            } else if (document.documentElement.mozRequestFullScreen) {
                document.documentElement.mozRequestFullScreen();
            } else if (document.documentElement.webkitRequestFullScreen) {
                document.documentElement.webkitRequestFullScreen(Element.ALLOW_KEYBOARD_INPUT);
            }
            el.setAttribute('xlink:href', '#focus')

        } else {
            _exitFullscreen(ctx)
        }
    }

    function _exitFullscreen(ctx) {
        ctx = ctx || this
        var el = _get('[data-action="fullscreen"] use', ctx.controlsCont)//NO I18N
        if (document.cancelFullScreen) {
            document.cancelFullScreen();
        } else if (document.mozCancelFullScreen) {
            document.mozCancelFullScreen();
        } else if (document.webkitCancelFullScreen) {
            document.webkitCancelFullScreen();
        }

        el.setAttribute('xlink:href', '#expand')
    }

    function toggleZoom(e) {
        var ctx = _getCurrInstance(this)
        var el = _get('[data-action="zoom"] use', ctx.controlsCont)//NO I18N
        var imagesCont = ctx.imageCont
        var imgWrappers = ctx.items
        var curImageIndex = ctx.curImageIndex

        if (_hasClass(imgWrappers[ curImageIndex ], 'hb-zoom_in')) {
            _removeClass(imgWrappers[ curImageIndex ], 'hb-zoom_in')
            _addClass(imgWrappers[ curImageIndex ], 'hb-zoom_out')
            el.setAttribute('xlink:href', '#zoom-in')
            // _unbind(imagesCont, 'mousemove', _handleZoomScroll)//NO I18N

        } else {
            // going to zoom
            _removeClass(imgWrappers[ curImageIndex ], 'hb-zoom_out')
            _addClass(imgWrappers[ curImageIndex ], 'hb-zoom_in')
            el.setAttribute('xlink:href', '#zoom-out')
            // _bind(imagesCont, 'mousemove', _handleZoomScroll)//NO I18N

        }

    }

    // to be done later
    // function _handleZoomScroll(e) {
    //     var a
    // }

    function _getCurrInstance(el) {
        for (var i = lightboxInstances.length - 1; i >= 0; i--) {
            if (lightboxInstances[i].cont && lightboxInstances[i].cont.contains(el)) {
                return lightboxInstances[i]
            }
        }
    }

    function _getInstanceByCont(cont) {
        for (var i = lightboxInstances.length - 1; i >= 0; i--) {
            if (lightboxInstances[i].container && lightboxInstances[i].container === cont) {
                return i
            }
        }

    }

    // for each collection of images
    function Lightbox(options) {
        var type = options.cont.getAttribute('data-lightbox-type')
        type = type ? type.trim() : 'fullscreen'//NO I18N

        this.type = type
        this.remainingAni = 2
        this.container = options.cont
        this.state = "closed";//NO I18N

        if (this.type === 'fullscreen') {
            this.gridItems     = _getAll('.hb-grid-item', this.container)//NO I18N
            this.gridContainer = options.cont
            this.bindGridEvents()
            this._parseOptions()
            // cont and items will be initialised on item click in the grid
        } else if (this.type === 'imagelightbox'){
            this.gridItems     = _getAll('figure', this.container)//NO I18N
            this.gridContainer = options.cont
            this.bindGridEvents()
            this._parseOptions()
        }else {
            // for inplace cont and items are initialiased at start
            this.cont  = options.cont
            this.items = _getAll('.hb-lightbox__img-wrapper', this.cont)//NO I18N
            _addClass(this.cont, 'hb-inplace')//NO I18N
            this._parseOptions()
            this._start(0)
        }
        // window.el = this

    }

    Lightbox.prototype.bindGridEvents = function bindGridEvents() {
        var items = this.gridItems
        for (var i = 0, len = items.length; i < len; i++) {
            _bind(items[i], 'click', handleItemClick.bind(this, i))
        }
    }

    Lightbox.prototype._parseOptions = function () {
        var container = this.type === 'inplace' ? this.cont : this.gridContainer
        var options = container.getAttribute('data-lightbox-options')
        var parsedOptions = {}
        options.split(',').forEach(function (opt) {
            opt = opt.split(':')
            opt[0] = opt[0].trim()
            opt[1] = opt[1].trim()
            parsedOptions[ opt[0] ] = opt[1]
        })
        this.options = parsedOptions
    }

    Lightbox.prototype._start = function _start(startItemIndex) {
        var tempDiv

        // get the lightbox container
        if (this.type === 'fullscreen' || this.type === 'imagelightbox') {
            // insert template
            tempDiv = document.createElement('div')
            tempDiv.innerHTML = lightboxTmpl
            document.body.appendChild( tempDiv )
            this.cont = _get('.hb-lightbox__cont', tempDiv)//NO I18N
        }

        var lightboxCont   = this.cont
        this.arrowNav      = _getAll(ARROW_NAV_CLASS, lightboxCont)
        this.imageCont     = _get(IMG_CONT_CLASS, lightboxCont)
        this.thumbsCont    = _get(THUMBS_CONT_CLASS, lightboxCont)
        this.controlsCont  = _get(CONTROLS_CONT_CLASS, lightboxCont)
        this.captionCont   = _get(CAPTION_CONT_CLASS, lightboxCont)
        this.counterCont   = _get(COUNTER_CONT_CLASS, lightboxCont)
        this.curImageIndex = startItemIndex

        var diff = 0

        if (this.type === 'inplace') {
            // top controls not needed for inplace
            this.controlsCont.style.display = 'none'

        } else if (this.type === 'fullscreen' || this.type=== 'imagelightbox') {
            this.createImageWrappers(startItemIndex)
            this.items = _getAll('.hb-lightbox__img-wrapper', this.cont)//NO I18N
        }
        
        if(this.type === 'imagelightbox' ){
            for (var i = this.arrowNav.length - 1; i >= 0; i--) {
                this.arrowNav[i].style.display = 'none'
            }
            this.counterCont.style.display = 'none'
        }

        var options = this.options

        if (options.escClose === 'true') {
            this.boundOnKeyUp = onKeyUp.bind(this)
        }

        if (options.caption !== 'true') {
            this.captionCont.style.display = 'none'
        }

        if (!options.theme) {
            _addClass(lightboxCont, 'dark_theme')//NO I18N
        } else {
            _addClass(lightboxCont, options.theme + '_theme')//NO I18N
        }

        if (options.type === 'fullscreen') {
            _addClass(lightboxCont, 'hb-lightbox__fullscreen')//NO I18N
            _addClass(document.body, 'hb-lightbox__fixed-active')//NO I18N
        }

        this._bindLightboxEvents()
        _addClass(lightboxCont, 'isVisible')//NO I18N
        this.items[ startItemIndex ].setAttribute('data-hb-current', '')
        this.changeCaption(startItemIndex)

        var diff = 0

        if (options.type !== 'inplace') {
            diff = _box(this.controlsCont).height
        }

        if (options.caption === 'true') {
            if (options['caption-height']) {
                diff += Number(options[ 'caption-height' ].replace('px','').replace('%', ''))//NO I18N

            } else if (options.type === 'inplace') {
                // defaults
                if (this.type === 'inplace') {
                    // console.log('_box(this.captionCont).height', _box(this.captionCont).height);
                    diff += _box(this.captionCont).height
                } else {
                    diff += 100
                }
            }
        }

        var h
        var thumbsParent = _get('.hb-lightbox__thumbs-cont', this.cont)//NO I18N

        if (options.thumbs && options.thumbs=="true") {
            if (options[ 'thumbs-height' ]) {
                h = Number(options[ 'thumbs-height' ].replace('px','').replace('%', ''))//NO I18N
                diff += h
            } else {
                // defaults
                if (this.type === 'inplace') {
                    h = 70
                    diff += 70
                } else {
                    h = 100
                    diff += 100
                }
            }

            thumbsParent.style.height = h + 'px'
        }else{
            thumbsParent.style.display="none"
        }

        var heightInline
        // set imageCont height
        if (this.type === 'fullscreen' || this.type === 'imagelightbox') {
            this.imageCont.style.height = 'calc(100% - '+ (diff + 10) + 'px)'
        } else {
            // height needs to be set for inplace, width is always 100% of parent
            if (this.options['inplace-height']) {
                this.imageCont.style.height = this.options['inplace-height']

            } else {
                // set a height equal to parents width, if width is not greater than 670
                heightInline = _box(this.cont.parentElement).width

                if (heightInline > 670) {
                    heightInline = 670
                }
                this.imageCont.style.height = (heightInline - diff) + 'px'
            }
        }

        if (this.options.type === 'fullscreen') {
            this.getReady(this.items[ startItemIndex ])
            this.populateThumbs(startItemIndex, thumbsParent, h)
        } else {
            _addClass(this.items[ startItemIndex ], 'hb-current')
            thumbsParent.style.bottom = '-15px'//NO I18N
            thumbsParent.style.height = (_box(thumbsParent).height + 25) + 'px'
            // set thumbs cont width
            var thumbImgs = _getAll('img', this.thumbsCont) //NO I18N
            var thumbContWidth = 0
            this.thumbImgsLenth = thumbImgs.length
            var self = this
            
            for (var i = self.thumbImgsLenth - 1; i >= 0; i--) {
                if (thumbImgs[i].complete) {
                    if (self.options[ 'thumbs-height' ]) {
                        thumbImgs[i].style.height = self.options[ 'thumbs-height' ]
                    }
                    thumbContWidth += _box(thumbImgs[i]).width + 10
                    
                    if (--self.thumbImgsLenth <= 0) {
                        this.thumbsCont.style.width = thumbContWidth + 'px'
                    }
                } else {
                    _bind(thumbImgs[i], 'load', handleThumbLoad)
                }
            }
        }

        this.highlightActiveThumb( startItemIndex )

        function handleThumbLoad() {

            if (self.options[ 'thumbs-height' ]) {
                this.style.height = self.options[ 'thumbs-height' ]
            }

            // get width only after setting the height
            thumbContWidth += _box(this).width + 10
            if (--self.thumbImgsLenth === 0) {
                // if scroll is there
                // if (thumbContWidth > _box(thumbsParent).width) {
                //     // thumbsParent.style.bottom = '-15px'//NO I18N
                //     // thumbsParent.style.height = (h + 15) + 'px'
                // }

                self.thumbsCont.style.width = thumbContWidth + 'px'
            }
        }
    }

    Lightbox.prototype._bindLightboxEvents = function _bindLightboxEvents() {

        for (var i = this.arrowNav.length - 1; i >= 0; i--) {
            _bind(this.arrowNav[i], 'click', this.handleNav)
        }

        var btnsCont = _get('.hb-lightbox__buttons', this.cont)//NO I18N
        if (this.type !== 'inplace') {
            var zoom_btn = _get('[data-action="zoom"]', btnsCont)//NO I18N
            var full_btn = _get('[data-action="fullscreen"]', btnsCont)//NO I18N
            var download_btn = _get('[data-action="download"]', btnsCont)//NO I18N
            var closeCont = _get('[data-action="close"]', btnsCont)//NO I18N
            
            if(!is_zoom || (!is_download && !is_full_screen)){
                zoom_btn.style.display = "none"
            }else{
                _bind(zoom_btn, 'click', toggleZoom)//NO I18N
            }
            
            if(!is_zoom || !is_download){
                download_btn.style.display = "none"
            }else{
                _bind(download_btn, 'click', toggleDownload)//NO I18N
            }

            if(!is_zoom || !is_full_screen){
                full_btn.style.display = "none"
            }else{
                _bind(full_btn, 'click', toggleFullScreen)//NO I18N
            }
            
            _bind(closeCont, 'click', closeActions)//NO I18N
            // _bind(btnsCont, 'click', this.handleActions)//NO I18N
            _bind(window, 'keyup', this.boundOnKeyUp)//NO I18N
        }

        _bind(this.thumbsCont, 'click', this.handleThumbsClick)//NO I18N
        _bind(this.thumbsCont.parentElement, 'mousewheel', function _preventSwipeNav(event) {//NO I18N
          // We don't want to scroll below zero or above the width and height
          var maxX = this.scrollWidth - this.offsetWidth
          var maxY = this.scrollHeight - this.offsetHeight
          // If this event looks like it will scroll beyond the bounds of the element, prevent it and set the scroll to the boundary manually
          if (this.scrollLeft + event.deltaX < 0 || this.scrollLeft + event.deltaX > maxX) {
            // this.scrollTop + event.deltaY < 0 || this.scrollTop + event.deltaY > maxY
            event.preventDefault()

            // Manually set the scroll to the boundary
            this.scrollLeft = Math.max(0, Math.min(maxX, this.scrollLeft + event.deltaX))

            window.scrollTop = window.scrollTop + event.deltaY
          }
        }, false)

    }

    function onKeyUp(e) {
        e = e || window.event
        e.stopPropagation()
        var key = e.keyCode
        var nextImageIndex

        if (key === 27) {
            this.closeLightBox()
        } else if (key === 39) {
            nextImageIndex = this.curImageIndex === (this.items.length - 1) ? 0 : this.curImageIndex + 1

            this.handleNav(null, nextImageIndex, 1)
        } else if (key === 37) {
            nextImageIndex = this.curImageIndex === 0 ? this.items.length - 1 : this.curImageIndex - 1
            this.handleNav(null, nextImageIndex, -1)
        }
    }

    Lightbox.prototype.go = function go(nextSlideIndex, nextSlide, currentSlide) {
        this.positionThumbsCont(nextSlideIndex)
        this.changeCaption(nextSlideIndex)
        this.loadImage(nextSlideIndex)

        this.curImageIndex = nextSlideIndex
        _bind(nextSlide, animationEnd, this.handleAnimationEnd.bind(nextSlide, this))
        _bind(currentSlide, animationEnd, this.handleAnimationEnd.bind(currentSlide, this))

        _addClass(nextSlide, this.entryAnimation)
        _addClass(currentSlide, this.exitAnimation)

        var el = _get('[data-action="zoom"] use', this.controlsCont)//NO I18N
        el.setAttribute('xlink:href', '#zoom-in')

        var curThumbActive = _get('.hb-active', this.cont)//NO I18N
        curThumbActive && _removeClass(curThumbActive, 'hb-active')//NO I18N
        _addClass(_get('[data-index="'+ this.curImageIndex +'"]', this.cont), 'hb-active')//NO I18N
    }

    Lightbox.prototype.handleNav = function handleNav(el, navToItem, fromArrKey) {
        var self
        if (this instanceof Lightbox) {
            self = this
        } else if (! (this instanceof Lightbox)) {
            el = this
            self = _getCurrInstance(this)

        }

        var from
        if (el && _hasClass(el, 'hb-lightbox__thumbs')) {
            from = 'thumb'//NO I18N
        } else if (fromArrKey) {
            from = 'key'//NO I18N
        } else {
            from = 'arrNav'//NO I18N
        }

        // prevent multiple click on navigation button
        if (self.remainingAni !== 2 || navToItem === self.curImageIndex || self.items.length < 2) {
            return
        }

        // mark the start of animation
        --self.remainingAni

        var nextSlide
        var currentSlide
        var nextSlideIndex
        var entryAnimation
        var exitAnimation
        var isForward

        if (from === 'key') {
            isForward = fromArrKey === 1 ? true : false
            nextSlideIndex = navToItem

        } else if (from === 'thumb') {
            // thumbnail clicked
            isForward = self.curImageIndex > navToItem ? false : true

        } else {
            // clicked on navigation arrow
            isForward = _hasClass(el, 'nav-right')//NO I18N

        }

        if (fromArrKey) {
            if (isForward) {
                entryAnimation = transitionInRev
                exitAnimation = transitionOutRev
            } else {
                entryAnimation = transitionIn
                exitAnimation = transitionOut
            }

        } else if (isForward) {
            if (isNaN(navToItem)) {
                nextSlideIndex = self.curImageIndex === self.items.length - 1 ? 0 : self.curImageIndex + 1
            } else {
                nextSlideIndex = navToItem
            }

            entryAnimation = transitionInRev
            exitAnimation = transitionOutRev

        } else {
            // back
            if (isNaN(navToItem)) {
                nextSlideIndex = self.curImageIndex === 0 ? self.items.length - 1 : self.curImageIndex - 1
            } else {
                nextSlideIndex = navToItem
            }
            entryAnimation = transitionIn
            exitAnimation = transitionOut
        }

        var nextSlide = _get('[data-pos="'+ nextSlideIndex +'"]', self.cont)//NO I18N
        var currentSlide = _get('[data-pos="'+ self.curImageIndex +'"]', self.cont)//NO I18N

        self.entryAnimation = entryAnimation
        self.exitAnimation = exitAnimation

        if (_hasClass(currentSlide, 'hb-zoom_in')) {
            _bind(currentSlide, animationEnd, function closeZoomedImage() {
                _removeClass(this, 'hb-zoom_out')//NO I18N
                _unbind(this, animationEnd, closeZoomedImage)

                self.go(nextSlideIndex, nextSlide, currentSlide)
            })
            _removeClass(currentSlide, 'hb-zoom_in')//NO I18N
            _addClass(currentSlide, 'hb-zoom_out')//NO I18N

        } else {
            _removeClass(currentSlide, 'hb-zoom_out')//NO I18N
            _removeClass(currentSlide, 'hb-zoom_in')//NO I18N
            self.go(nextSlideIndex, nextSlide, currentSlide)
        }

    }

    Lightbox.prototype.closeLightBox = function closeLightBox() {
        this.state = "closed"//NO I18N
        var currImg = _get('.hb-current img', this.cont)//NO I18N
        _removeClass(document.body, 'hb-lightbox__fixed-active')//NO I18N

        if (!currImg) {
            return
        }

        var cloneImg = currImg.cloneNode(true)
        document.body.appendChild(cloneImg)
        cloneImg.className = ''
        cloneImg.removeAttribute("style")
        var from = _getOffset(currImg)
        cloneImg.style.position = 'fixed'
        cloneImg.style.left = from.left + 'px'
        cloneImg.style.top = (from.top - _scrollY()) + 'px'
        cloneImg.style.width = from.width + 'px'
        cloneImg.style.height = from.height + 'px'
        cloneImg.offsetHeight
        var to
        var isSquare
        if (this.gridContainer.getAttribute('data-layout-type') === 'square') {
            to = this.gridItems[ this.curImageIndex ]
            isSquare = true
        } else {
            to = _get('img', this.gridItems[ this.curImageIndex ])
        }

        to = _getOffset(to)
        cloneImg.style.transition = 'all .3s'//NO I18N
        cloneImg.style.position = 'fixed'
        cloneImg.style.left = to.left + 'px'
        cloneImg.style.top = (to.top - _scrollY()) + 'px'
        cloneImg.style.width = to.width + 'px'
        cloneImg.style.height = to.height + 'px'
        if (isSquare) {
            cloneImg.style.opacity = 0
        }

        _bind(cloneImg, transitionEnd, function _handleTransEnd() {
            currImg = null
            _unbind(this, transitionEnd, _handleTransEnd)
            document.body.removeChild( this )

        })

        if (this.type !== 'inplace') {
            _unbind(window, 'keyup', this.boundOnKeyUp) //NO I18N
            this.boundOnKeyUp = null
        }

        _removeClass(this.cont, 'isVisible')//NO I18N
        _removeClass(document.body, 'hb-lightbox__active')//NO I18N
        _removeClass(document.body, 'hb-lightbox__fixed-active')//NO I18N
        _purge(this.cont)
        this.cont.parentNode.removeChild(this.cont)
        this.cont = null
        _exitFullscreen.call(this)
    }

    // Zoom in from the current image
    Lightbox.prototype.getReady = function getReady(startItem) {
        var startGridItem = this.gridItems[ this.curImageIndex ]
        startGridItem = _get('img', startGridItem)//NO I18N
        _addClass(startItem, 'hb-current')//NO I18N
        var from = _getOffset(startGridItem)
        startGridItem.offsetHeight

        var cloneDiv = startGridItem.cloneNode(true)
        document.body.appendChild(cloneDiv)
        cloneDiv.style.transition = 'all .4s'//NO I18N
        cloneDiv.style.zIndex = '9999999999'
        cloneDiv.style.position = 'fixed'
        cloneDiv.style.top = (from.top - _scrollY()) + 'px'
        cloneDiv.style.left = from.left + 'px'
        cloneDiv.style.width = from.width + 'px'
        cloneDiv.style.height = from.height + 'px'

        var to = _getOffset(_get('img', startItem))//NO I18N

        startItem.offsetHeight
        _removeClass(startItem, 'hb-current')//NO I18N
        // cloneDiv.style.transition = 'all 4s'
        cloneDiv.style.top = (to.top - _scrollY()) + 'px'
        cloneDiv.style.left = to.left + 'px'
        cloneDiv.style.width = to.width + 'px'
        cloneDiv.style.height = to.height + 'px'
        cloneDiv.clientHeight
        _bind(cloneDiv, transitionEnd, function removeStyle() {
            _addClass(startItem, 'hb-current')//NO I18N
            _unbind(cloneDiv, transitionEnd, removeStyle)
            cloneDiv.parentNode.removeChild(cloneDiv)
        })

    }

    Lightbox.prototype.populateThumbs = function populateThumbs(curImageIndex, thumbsParent, h) {
        function handleThumbLoad() {

            if (self.options[ 'thumbs-height' ]) {
                this.style.height = self.options[ 'thumbs-height' ]
            }

            // get width only after setting the height
            width += _box(this).width + 10

            if (--thumbsRemaining === 0) {
                // if scroll is there
                if (width > _box(thumbsParent).width) {
                    thumbsParent.style.bottom = '-15px'//NO I18N
                    thumbsParent.style.height = (h + 15) + 'px'
                }
                thumbsCont.style.width = width + 'px'
                // when all thumbnails are loaded, set scroll amount
                self.positionThumbsCont(curImageIndex)
            }
        }

        var self = this
        var thumbsRemaining = this.gridItems.length
        var thumbsCont = this.thumbsCont
        var width = 0
        this.gridItems.forEach(function insertThumbs(item, index) {
            var img = _get('img', item)//NO I18N
            var thumbImg = document.createElement('img', index)
            thumbImg.setAttribute('data-index', index)
            thumbImg.className = ''
            thumbsCont.appendChild(thumbImg)
            _bind(thumbImg, 'load', handleThumbLoad)//NO I18N
            // thumbImg.src = img.src
            var orig_url = img.getAttribute("data-src");
            var urls = orig_url.split("/");
            var img_url = urls[urls.length - 1]
            var thump_url = orig_url.replace(img_url,"."+img_url+"_t.jpg");
            thumbImg.src = thump_url;
        })
    }


    Lightbox.prototype.createImageWrappers = function createImageWrappers(startItemIndex) {
        var items = this.gridItems
        var link
        var src
        var caption = ''
        var template
        for (var i = 0, len = items.length; i < len; i++) {
            template = tmpl
            link = _get('img', items[i]).getAttribute("data-src")//NO I18N
            //link = _get('a', items[i]).href
            if(i == startItemIndex){
                src = _get('img', items[i]).getAttribute("data-src")
            }else{
                src = ""
            }
            
            template = template.replace(/{pos}/g, i)
                    .replace(/{link}/, link)
                    .replace(/{src}/, src)
                    .replace(/{caption}/, caption)
            this.imageCont.insertAdjacentHTML('beforeend', template)
        }

        this.items = _getAll('.hb-lightbox__img-wrapper', this.imageCont)//NO I18N
    }

    function _animateImageLoad() {
        _bind(this.parentElement, animationEnd, function rClass() {
            _removeClass(this, 'zoomIn')    //NO I18N
            _unbind(this, animationEnd, rClass)
        })

        _unbind(this, 'load', _animateImageLoad)//NO I18N
        this.style.visibility = 'visible'

    }

    Lightbox.prototype.loadImage = function loadImage(index, animate) {
        var curWrapper = this.items[ index ]
        var imgEl      = _get('img', curWrapper)//NO I18N
        var dummyImgEl = new Image()
        dummyImgEl.onload = function () {
            imgEl.src = this.src
        }

        dummyImgEl.src = imgEl.getAttribute('data-src')

        // if (animate) {
        //     _bind(imgEl, 'load', _animateImageLoad)
        // }

        // _get('[data-action="download"] a', this.controlsCont).href = imgEl.getAttribute('data-src')
        _addClass(curWrapper, 'hb-current')//NO I18N
        // _preloadImages(index)

    }

    function _preloadImages(index) {
        var next, prev
        next = index === imgWrappers.length - 1 ? 0 : index + 1
        prev = index === 0 ? imgWrappers.length - 1 : index - 1
        var curWrapper = imgWrappers[ next ]
        var imgEl = _get('img', curWrapper)//NO I18N
        var fullSrc = imgEl.getAttribute('data-src')
        imgEl.src = fullSrc

        curWrapper = imgWrappers[ prev ]
        imgEl = _get('img', curWrapper)//NO I18N
        fullSrc = imgEl.getAttribute('data-src')
        imgEl.src = fullSrc

    }

    function handleItemClick(index, e) {
        e.preventDefault()
        if (typeof zs !== "undefined" && !zs.state.animation) {
            return
        }
        if(this.state == "opened"){
            return
        }
        this.state = "opened"//NO I18N
        
        var curr_img = _get("img",this.gridItems[index])
        var curr_url = curr_img.getAttribute("data-src") || curr_img.src;
        var dummyImgEl = new Image()
        var self = this
        dummyImgEl.onload = function () {
            self._start(index)
        }
        dummyImgEl.src = curr_url
        // this._start(index)
    }

    Lightbox.prototype.positionThumbsCont = function positionThumbsCont(nextSlideIndex) {
        var thumbsCont          = this.thumbsCont
        var thumbsContBox       = _box(thumbsCont)
        var lightboxContBox     = _box(this.cont)
        var nextThumb           = _get('[data-index="'+ nextSlideIndex +'"]', thumbsCont)//NO I18N
        var nextThumbBox        = _box(nextThumb)
        var thumbsParent        = _get('.hb-lightbox__thumbs-cont', this.cont)//NO I18N
        var thumbsParentContBox = _box(thumbsParent)
        var scrollAmount        = ((nextThumbBox.left - lightboxContBox.left) / lightboxContBox.width)*100
        var maxScroll           = thumbsContBox.width - thumbsParentContBox.width
        var itemPos             = (nextSlideIndex + 1 )/this.items.length * 100
        var scrollTo

        if (nextSlideIndex < 3) {
            scrollTo = 0
        } else if (nextSlideIndex > this.items.length - 3) {
            scrollTo = maxScroll
        } else {
            scrollTo = (itemPos / 100) * maxScroll
        }

        var currScroll = thumbsParent.scrollLeft
        var scrollAmount = (Math.abs(scrollTo - currScroll) / 10)
        var op = scrollTo > currScroll ? + 1 : -1
        var t = setInterval(function () {
            currScroll = currScroll + (op * scrollAmount)
            if (op === -1) {
                if (currScroll <= scrollTo) {
                    clearInterval(t)
                } else {
                    thumbsParent.scrollLeft = currScroll
                }
            } else {
                if (currScroll >= scrollTo) {
                    clearInterval(t)
                } else {
                    thumbsParent.scrollLeft = currScroll
                }
            }

        }, 10)
    }

    Lightbox.prototype.changeCaption = function changeCaption(nextItem) {
        var captionEl
        if (this.type === 'fullscreen') {
            captionEl = _get('figcaption', this.gridItems[nextItem])
        } else {
            captionEl = _get('figcaption', this.items[nextItem])
        }

        if (captionEl) {
            this.captionCont.innerHTML = captionEl.innerHTML
        }

        this.counterCont.innerHTML = (nextItem + 1) + '/' + this.items.length

    }



    Lightbox.prototype.handleAnimationEnd = function handleAnimationEnd(self) {
        // cannot use the below code to unbind,
        // _unbind(this, animationEnd, self.handleAnimationEnd)
        _purge(this)

        var pos = this.getAttribute('data-pos')

        if (pos === self.curImageIndex + '') {
            _addClass(this, 'hb-current')//NO I18N
            _removeClass(this, self.entryAnimation)

        } else {
            _removeClass(this, 'hb-current')//NO I18N
            _removeClass(this, self.exitAnimation)

        }
        if (--self.remainingAni < 0) {
            self.remainingAni = 2

        }
    }

    function initialise(container) {
        var lightboxes = _getAll(CONT_CLASS, container)
        for (var i = lightboxes.length - 1; i >= 0; i--) {
            lightboxInstances.push(new Lightbox({
                cont: lightboxes[i]
            }))
        }
    }
    
    function closeActions(e) {
        var self = _getCurrInstance(this)
        self.closeLightBox()
    }
    
    Lightbox.prototype.handleActions = function handleActions(e) {
        var self = _getCurrInstance(this)
        var temp = e.target
        var action
        while(!_hasClass(temp, 'hb-lightbox__buttons')) {//NO I18N
            if (temp.hasAttribute('data-action')) {
                action = temp.getAttribute('data-action')
                break
            }
            temp = temp.parentElement
        }
        switch (action) {
            case 'close'://NO I18N
                self.closeLightBox()
                break;

            case 'fullscreen'://NO I18N
                toggleFullScreen(self)
                break;

            case 'zoom': //NO I18N
                toggleZoom(self)
                break;
            case 'download': //NO I18N
                toggleDownload(self);
                break;
        }

    }
    
    function toggleDownload(e) {
        var ctx = _getCurrInstance(this)
        var index = ctx.curImageIndex;
        var curWrapper = ctx.items[index];
        var imgEl      = _get('img', curWrapper)//NO I18N
        _get('[data-action="download"] a', ctx.controlsCont).href = imgEl.getAttribute('data-src')
    }

    Lightbox.prototype.highlightActiveThumb = function highlightActiveThumb (index, el) {
        var curActive = _get('.hb-active', this.thumbsCont)//NO I18N
        if (curActive) {
            _removeClass(curActive, 'hb-active')  //NO I18N
        }

        if (!el) {
            el = _get('[data-index="'+ index +'"]', this.thumbsCont)//NO I18N
        }
        _addClass( el, 'hb-active')//NO I18N
    }

    Lightbox.prototype.handleThumbsClick = function handleThumbsClick(e) {
        var target = e.target
        var self = _getCurrInstance(target)
        if (target.tagName !== 'IMG') {
            return
        }

        self.handleNav(this, Number(target.getAttribute('data-index').trim() ))
    }

    function destroy(el) {
        var index = _getInstanceByCont(el)
        if (index === undefined) {
            return
        }

        lightboxInstances[ index ] = null
        lightboxInstances.splice(index, 1)
        _purge(el)
    }
    
    function check_download(){
        var a = document.createElement('a')
        return  (typeof a.download != "undefined")//NO I18N
    }
    
    function check_fullscreen(){
        return  document.documentElement.requestFullScreen || document.documentElement.mozRequestFullScreen || document.documentElement.webkitRequestFullScreen
    }
    
    function check_zoom(){
        return !( window.innerWidth <= 768)
    }
    
    return {
        init: initialise,
        destroy: destroy
    }
})()


/*$Id$*/
/* global _bind, _get, _attr, getRandomInt, _getByClass, _addClass, Image */
var layout = (function() {
    'use strict'

    if (window.NodeList && !NodeList.prototype.forEach) {
        NodeList.prototype.forEach = function (callback, argument) {
            argument = argument || window;
            for (var i = 0; i < this.length; i++) {
                callback.call(argument, this[i], i, this);
            }
        };
    }

    var instances = []

    function _getCS(el) {
        return window.getComputedStyle(el)
    }

    function _isUndef(check) {
        return typeof check === 'undefined' //NO I18N
    }

    function Matrix(m, n) {
        var mat = new Array(m)
        for (var i = 0; i < m; i++) {
            mat[i] = new Array(n)
        }

        return mat
    }

    function _pxToNumber(px) {
        return Number(px.replace('px', ''))
    }

    function _getSquarePos(matrix, imageIndex, rCount, cCount) {
        var r
        var c
        var isdone = false
        for (r = 0; r < rCount; r++) {
            if (isdone) {
                break
            }

            for (c = 0; c < cCount; c++) {
                if (c === cCount - 1 || r + 1 === rCount) {
                    continue
                }

                if (_isUndef( matrix[r][c] ) && _isUndef( matrix[r][c + 1] ) &&
                    _isUndef( matrix[r + 1][c] ) && _isUndef( matrix[r + 1][c + 1])) {

                    matrix[r][c] = imageIndex
                    matrix[r][c + 1] = imageIndex
                    matrix[r + 1][c] = imageIndex
                    matrix[r + 1][c + 1] = imageIndex
                    isdone = true
                    break
                }
            }
        }
    }

    function _getLandScapePos(matrix, imageIndex, rCount, cCount, isTwoCell) {
        var r
        var c
        var isdone = false
        for (r = 0; r < rCount; r++) {
            if (isdone) {
                break
            }

            for (c = 0; c < cCount; c++) {
                if (isTwoCell) {
                    if (matrix[r][c] === undefined && matrix[r][c + 1] === undefined) {
                        matrix[r][c] = imageIndex
                        matrix[r][c + 1] = imageIndex
                        isdone = true
                        break
                    }
                } else {
                    if (matrix[r][c] === undefined) {
                        matrix[r][c] = imageIndex
                        isdone = true
                        break
                    }
                }
            }
        }
    }

    function _getPortraitPos(matrix, imageIndex, rCount, cCount) {
        var r
        var c
        var isdone = false

        for (r = 0; r < rCount; r++) {
            if (isdone) {
                break
            }

            for (c = 0; c < cCount; c++) {
                if (matrix[r][c] === undefined) {
                    if (r + 1 < rCount && matrix[r + 1][c] === undefined) {
                        matrix[r + 1][c] = imageIndex
                        matrix[r][c] = imageIndex
                        isdone = true
                        break
                    }
                }
            }
        }
    }

    function _parseOptions(element) {
        var options = {
            album_name: _attr(element, 'data-album_name') || '',//NO I18N
            columns: parseInt(_attr(element, 'data-columns')),//NO I18N
            rows: parseInt(_attr(element, 'data-rows')),//NO I18N
            crop_type: _attr(element, 'data-crop_type'),//NO I18N
            enable_caption: _attr(element, 'data-enable_caption'),//NO I18N
            collage_type: _attr(element, 'data-collage_type'),//NO I18N
            style: _attr(element, 'data-style')//NO I18N
        }

        isNaN(options.columns) && (options.columns = 5)
        isNaN(options.rows) && (options.rows = '')

        if (options.enable_caption === 'false') {
            options.enable_caption = false
        } else if (options.enable_caption === 'true') {
            options.enable_caption = true
        } else {
            options.enable_caption = false
        }

        options.collage_type || (options.collage_type = 'gallery')//NO I18N

        return options
    }

    function Layout(container, options) {
        this.id = getRandomInt(10000, 999999)
        this.options = options
        this.container = container
        this.items = _getByClass('hb-grid-item', container)//NO I18N
        this.itemsRemaining = this.items.length
        this.rCount
        this.cCount
        this.init()
        // window.addEventListener('resize', this.getDimensions.bind(this))
    }

    Layout.prototype.init = function init() {
        var bodyWidth = _pxToNumber(_getCS(document.body).width)
        var _this = this
        var image
        // for tiny screens, just one column
        // todo: not working for 1 col
        if (bodyWidth <= 320) {
            this.options.columns = 1
        } else if (bodyWidth <= 480) {
            // 2 cols if small screens
            this.options.columns = 2
        }
        function loadImg() {
            // this is fixed
            // if html structure changes, will have to change this
            _this.checkIfLoadDone()
        }
        for (var i = this.items.length - 1; i >= 0; i--) {
            this.items[i].style.display = 'none'
            image = _get('img', this.items[i])

            if (image.complete) {
                _this.checkIfLoadDone()
            } else {
                
                _bind(_get('img', this.items[i]), 'load', loadImg)//NO I18N
            }
        }
    }

    Layout.prototype.checkIfLoadDone = function checkIfLoadDone() {
        this.itemsRemaining--
            // console.log(this.itemsRemaining)
            if (this.itemsRemaining === 0) {
                this.onLayoutLoad()
            }
    }

    Layout.prototype.onLayoutLoad = function onLayoutLoad() {
        // debugger
        this.getDimensions()
        for (var i = this.items.length - 1; i >= 0; i--) {
            var gridItem = this.items[i]
            gridItem.style.display = 'block'
            _addClass(gridItem, 'zoomIn')//NO I18N
            // zoomIn
            // slideInUp
            // fadeInUp
            // bounceInDown
            // zoomInUp
        }
        // this.container.style.height = _getCS(this.container).height
    }
    var trial = 0
    var data
    Layout.prototype.getDimensions = function getDimensions() {
        trial = 0
        var itemsCount = this.items.length
        var anchor = null
        var tempImgEl = null
        var remaining = itemsCount
        var imgDimensions = {}
        var self = this
        
        function templateImg(index) {
            var ratio = this.width * 100 / this.height
            imgDimensions[index] = {
                w: this.width,
                h: this.height,
                isLikeSquare: ratio > 80 && ratio < 140,
                isLandScape: ratio > 100,
                isPortrait: ratio < 100
            }

            remaining--

            // after image load grid will be created
            if (remaining === 0) {
                // instance.createGrid(instance.items, imgDimensions)
                data = JSON.parse(JSON.stringify(imgDimensions))
                _calc.call(self)
            }
        }
        
        for (var i = 0, len = this.items.length; i < len; i++) {
            anchor = _get('img', this.items[i])
            tempImgEl = new Image()

            // position image based on image aspect ratio in the grid
            // _bind('load', tempImgEl, positionImage.bind(tempImgEl, i, this))
            _bind(tempImgEl, 'load', templateImg.bind(tempImgEl, i, this))//NO I18N

            tempImgEl.src = anchor.src
        }
    }

    function _calc() {
        trial++
        var imgDimensions = JSON.parse(JSON.stringify(data))

        var isTwoCell = false
        var totalCells = 0
        for (var index in imgDimensions) {
            if (!imgDimensions.hasOwnProperty(index)) {
                continue
            }

            if (imgDimensions[index].isLikeSquare) {
                // squared like images will always take 4 cell
                totalCells += 4

            } else if (imgDimensions[index].isLandScape) {

                // to generate random layout
                //
                // landscape will either take 2 horizonal cell and 1 vertical cell
                // or 4 cell
                isTwoCell = getRandomInt(1, 2) % 2 === 0
                // isTwoCell = false
                if (isTwoCell) {
                    totalCells += 2
                    imgDimensions[index].isTwoCell = true
                } else {
                    totalCells += 1
                }
            } else if (imgDimensions[index].isPortrait) {
                totalCells += 2
            }
        }

        var cCount = this.options.columns
        var rCount = Math.ceil(totalCells / cCount)
        // console.log(rCount, cCount, totalCells);
        if (cCount * rCount === totalCells) {
            this.createGrid(imgDimensions, totalCells)  
            var sq = 0, land = 0, port = 0
            for (var i in imgDimensions) {
                if (imgDimensions[i].isLikeSquare) {
                    sq++
                } else if (imgDimensions[i].isPortrait) {
                    port++
                } else if (imgDimensions[i].isLandScape) {
                    land++
                }
            }  

            // console.log(sq, land, port);
            // console.log(imgDimensions);
        } else {
            _calc.call(this, imgDimensions)
        }

        
    }



    Layout.prototype.createGrid = function createGrid(dims, totalCells) {
        var items = this.items
        // console.log(dims)
        this.imgDimensions = dims

        var cCount = this.options.columns
        var rCount = Math.ceil(totalCells / cCount)
        this.rCount = rCount
        this.cCount = cCount
        var count = items.length
        var matrix = new Matrix(rCount, cCount)
        var imgIndex = 0
        var c

        for (var imageIndex = 0, len = count; imageIndex < len; imageIndex++) {
            if (dims[imageIndex].isLikeSquare) {
                _getSquarePos(matrix, imageIndex, rCount, cCount)
            } else if (dims[imageIndex].isLandScape) {
                _getLandScapePos(matrix, imageIndex, rCount, cCount, dims[imageIndex].isTwoCell)
            } else if (dims[imageIndex].isPortrait) {
                _getPortraitPos(matrix, imageIndex, rCount, cCount)
            }
        }

        // console.log(JSON.stringify(matrix))
        this.matrix = matrix

        var grid = new Array(count)

        for (var r = 0; r < rCount; r++) {
            for (c = 0; c < cCount; c++) {
                // if (matrix[r][c] === undefined) {
                //  break;
                // }

                imgIndex = matrix[r][c]

                if (grid[imgIndex] === undefined || grid[imgIndex] === null) {
                    grid[imgIndex] = {}
                    grid[imgIndex].startCol = c
                    grid[imgIndex].startRow = r
                    grid[imgIndex].endCol = c
                    grid[imgIndex].endRow = r
                } else {
                    grid[imgIndex].endCol = c
                    grid[imgIndex].endRow = r
                }
            }
        }



        var emptyCell = this.hasEmptyCell(grid)

        if (emptyCell.length > 0) {
            _calc.call(this, dims)
        } else {
        // } else if (!grid[count-1]) {
        //     return
        //     _calc.call(this, dims)
        // } else {
            this.grid = grid
            this.positionImages(dims, totalCells)
        }

    }

    Layout.prototype.positionImages = function positionImages(dims, totalCells) {
        var grid = this.grid
        var items = this.items
        var index = 0
        var diff = 0
        var colsCount = this.options.columns
        var contWidth = _pxToNumber(_getCS(this.container).width)
        var windowWidth = _pxToNumber(_getCS(document.documentElement).width)
        var contWidthVw = (contWidth / windowWidth) * 100
        var colWidth = (contWidthVw / colsCount)
        var count = items.length
        var rowsHeight = colWidth / 1.3
        var adjustWidth
        // var marginLeft
        
        for (index = 0; index < count; index++) {
            // marginLeft = 1
            adjustWidth = 1

            if (!grid[index]) {
                // console.log('== ', index, grid)
                _calc.call(this, dims)
                break
                // continue
            }

            if (grid[index].endCol === colsCount - 1) {
                adjustWidth = 0
            }

            items[index].style.position = 'absolute'

            diff = (grid[index].endRow - grid[index].startRow + 1)
            items[index].style.height = (diff * rowsHeight) - 1 + 'vw'

            diff = (grid[index].endCol - grid[index].startCol + 1)
            items[index].style.width = (diff * colWidth) - adjustWidth + 'vw'

            items[index].style.top = (grid[index].startRow * rowsHeight) + 'vw'
            items[index].style.left = (grid[index].startCol * colWidth) + 'vw'
        }

        // need to set height explicitly
        this.container.style.height = (this.rCount * rowsHeight) + 'vw'

    }

    Layout.prototype.hasEmptyCell = function hasEmptyCell() {
        var emptyCell = []
        for (var r = 0; r < this.rCount; r++) {
            for (var c = 0; c < this.cCount; c++) {
                if (this.matrix[r] === undefined || this.matrix[r][c] === undefined) {
                    emptyCell.push([r, c])
                }
            }
        }
        return emptyCell
    }

    Layout.prototype.destroy = function() {

    }

    function initialise() {
        var layouts = _getByClass('hb-layout')//NO I18N
        var options = null
        var instance = null
        for (var i = layouts.length - 1; i >= 0; i--) {
            // layouts[ i ].style.border = '2px solid #FF8808'
            if (layouts[i].getAttribute('data-layout-type') === 'collage') {
                options = _parseOptions(layouts[i])
                instance = new Layout(layouts[i], options)
                instances.push(instance)    
            }
            
        }
    }

    return initialise
})()

// function bindGall() {
//     start();
//     $E.unbind(window,'DOMContentLoaded', bindGall);
// }
$E.callOnLoad(start);

//document.addEventListener('DOMContentLoaded',start) 

function start() {
    layout()
    lightbox.init()
    set_dimension()
    
}
function  set_dimension(elem) {
    var images = (elem || document).querySelectorAll('[data-layout-type="square"] img')//NO I18N
    images.forEach(function (image) {
        var newImg = new Image();

        (function(img, newImg) {
            newImg.onload = function() {
                var height = newImg.height;
                var width = newImg.width;

                if (height === width || height > width) {
                    img.style.maxWidth = '100%';
                    img.style.height = 'auto';
                } else {
                    img.style.maxHeight = '100%';
                    img.style.width = 'auto';
                }

            }
        })(image, newImg)
        

        newImg.src = image.src; // this must be done AFTER setting onload
    })
    
    images = (elem || document).querySelectorAll('[data-layout-type="row"] img')//NO I18N

    var dims = []
    var remaining = images.length
    images.forEach(function (image, index) {
        var newImg = new Image();

        (function(img, newImg, index) {
            newImg.onload = function() {
                var height = newImg.height;
                var width = newImg.width;
                dims[ index ] = {
                    width: width,
                    height: height
                }

                if (--remaining === 0) {
                    _set(dims)
                }

            }
        })(image, newImg, index)
        

        newImg.src = image.src; // this must be done AFTER setting onload
    })

    function _set(dims) {
        images.forEach(function (img, index) {
            var d = dims[index]
            var newWidth = (d.width * 200) / d.height
            var i = document.createElement('i')
            var cont = img.parentElement.parentElement.parentElement
            i.style.paddingBottom = (d.height/d.width*100) + '%'
            cont.style.width = newWidth + 'px'
            cont.style.flexGrow = newWidth
            img.parentElement.insertBefore(i, img);
            // img.style.width = newWidth + 'px'
            // img.style.flexGrow = newWidth
        })
    }

}



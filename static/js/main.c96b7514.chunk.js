(this.webpackJsonpgates=this.webpackJsonpgates||[]).push([[0],{17:function(t,e){},18:function(t,e){},26:function(t,e,n){},27:function(t,e,n){},28:function(t,e,n){},30:function(t,e,n){},32:function(t,e,n){},33:function(t,e,n){"use strict";n.r(e);var i,o=n(3),s=n.n(o),a=n(19),r=n.n(a),c=(n(26),function(t){t&&t instanceof Function&&n.e(3).then(n.bind(null,35)).then((function(e){var n=e.getCLS,i=e.getFID,o=e.getFCP,s=e.getLCP,a=e.getTTFB;n(t),i(t),o(t),s(t),a(t)}))}),u=n(1),h=n(2),d=n(5),l=n(4),p=(n(27),n(28),n(0)),v=function(t){Object(d.a)(n,t);var e=Object(l.a)(n);function n(t){var i;return Object(u.a)(this,n),(i=e.call(this,t)).state={open:!1},i}return Object(h.a)(n,[{key:"render",value:function(){var t=this,e=["sidebar"];return this.state.open||e.push("collapsed"),Object(p.jsxs)("div",{className:e.join(" "),onMouseLeave:function(e){return t.handleMouseExit(e)},children:[Object(p.jsx)("div",{className:"floaty",onMouseEnter:function(e){return t.handleMouseEnter(e)}}),Object(p.jsx)("div",{className:"sidebar-content",children:this.props.content}),Object(p.jsx)("div",{className:"divider",children:Object(p.jsx)("button",{className:"handle",onClick:function(e){return t.handleMouseDown(e)},children:"*"})})]})}},{key:"handleMouseEnter",value:function(t){this.setState({open:!0})}},{key:"handleMouseExit",value:function(t){this.setState({open:!1})}},{key:"handleMouseDown",value:function(t){this.setState((function(t,e){return{open:!t.open}}))}}]),n}(s.a.Component),f=(n(30),n(7)),b=n(10),y=n(6),O=n(8),g=n(14),j=n(9),m=n.n(j),w=n(13),x=n(34),k=n(21),M=["onGateMouseDown","onGateMouseUp","onGateContextMenu"],P=function(t){Object(d.a)(n,t);var e=Object(l.a)(n);function n(t){var i;return Object(u.a)(this,n),(i=e.call(this,t)).state={},i}return Object(h.a)(n,[{key:"getTransforms",value:function(){var t=this.props.logicComponent.geometry.position,e=t.x,n=t.y;return["translate(".concat(e," ").concat(n,")"),"rotate(".concat(this.props.logicComponent.geometry.rotation,")")].join(" ")}},{key:"render",value:function(){var t=this.props.handlers,e=(t.onGateMouseDown,t.onGateMouseUp,t.onGateContextMenu,Object(k.a)(t,M)),n=this.props.logicComponent.pins().map((function(t){return t.render(e)})),i=this.props.logicComponent,o=["component"];return i.body.selected&&o.push("selected"),Object(p.jsxs)("g",{className:o.join(" "),"data-ctype":i.subtype,"data-uuid":i.uuid,transform:this.getTransforms(),children:[Object(p.jsx)("path",{d:i.d,onMouseDown:this.props.handlers.onGateMouseDown,onMouseUp:this.props.handlers.onGateMouseUp,onMouseMove:this.props.handlers.onGateMouseMove,onContextMenu:this.props.handlers.onGateContextMenu}),i.extraRender(),n]})}}]),n}(s.a.Component);!function(t){t[t.VariableShape=1]="VariableShape",t[t.IBussable=2]="IBussable",t[t.OBussable=4]="OBussable",t[t.SingleOutput=8]="SingleOutput",t[t.MergingPins=16]="MergingPins",t[t.Mux=32]="Mux",t[t.Bussed=64]="Bussed"}(i||(i={}));var N,T=function(){function t(e){var n,i;Object(u.a)(this,t),this.__fieldWidth=0,this.__width=void 0,this.__d="",this.flags=void 0,this.uuid=void 0,this.type=void 0,this.subtype=void 0,this.scope=void 0,this.board=void 0,this.delay=void 0,this.body=void 0,this.geometry=void 0,this.inputPins=[],this.outputPins=[],this.uuid=Object(x.a)(),this.scope=e.scope,this.flags=e.flags,this.type=e.type,this.subtype=e.subtype,this.delay=1,this.__width=null!==(n=e.width)&&void 0!==n?n:1,this.board=e.board,this.fieldWidth=null!==(i=e.fieldWidth)&&void 0!==i?i:0}return Object(h.a)(t,[{key:"updateGeometry",value:function(t){var e=this.scope,n=e.Group,i=e.Point;this.body&&this.body.remove(),this.body=this.setUpBody(t),this.geometry||(this.geometry=new n,this.geometry.pivot=new i(0,0),this.geometry.applyMatrix=!1),this.setUpPins(t),this.geometry.addChild(this.body),this.geometry.addChildren(this.pins().map((function(t){return t.geometry}))),this.__d=this.body.exportSVG().getAttribute("d"),this.body.data={type:"Component",logic:this,geometry:this.geometry}}},{key:"hasProperty",value:function(t){return 0!==(this.flags&t)}},{key:"setProperty",value:function(t){this.flags|=t}},{key:"clearProperty",value:function(t){this.flags&=this.bitMask(32)^t}},{key:"bitMask",value:function(t){var e;return(1<<(t=null!==(e=t)&&void 0!==e?e:this.width))-1}},{key:"pins",value:function(){return[].concat(Object(w.a)(this.inputPins),Object(w.a)(this.outputPins))}},{key:"clearPins",value:function(){var t,e=Object(y.a)(this.pins());try{for(e.s();!(t=e.n()).done;){t.value.remove()}}catch(n){e.e(n)}finally{e.f()}this.inputPins=[],this.outputPins=[]}},{key:"setUpPins",value:function(t){this.inputPins=[].concat(Object(w.a)(this.setUpInputPins(t)),Object(w.a)(this.setUpSelectorPins(t))),this.outputPins=this.setUpOutputPins(t)}},{key:"setUpInputPins",value:function(t){return[]}},{key:"setUpOutputPins",value:function(t){return[]}},{key:"setUpSelectorPins",value:function(t){return[]}},{key:"fieldWidth",get:function(){return this.__fieldWidth},set:function(t){this.updateGeometry(t),this.__fieldWidth=t}},{key:"width",get:function(){return this.__width},set:function(t){this.__width!==t&&(this.__width=t)}},{key:"d",get:function(){return this.__d}},{key:"postEvent",value:function(t,e){var n,i;e=null!==(n=e)&&void 0!==n?n:this.outputPins[0],null===(i=this.board)||void 0===i||i.postEvent(t,e,this.delay)}},{key:"remove",value:function(){var t;this.clearPins(),delete this.body.data.logic,this.body.remove(),this.geometry.remove(),null===(t=this.board)||void 0===t||t.removeComponent(this.uuid)}},{key:"extraRender",value:function(){return[]}},{key:"render",value:function(t){return Object(p.jsx)(P,Object(O.a)({},this.getRenderParams(t)),this.uuid)}},{key:"getRenderParams",value:function(t){var e,n,i,o;return{type:this.subtype,logicComponent:this,scope:this.scope,handlers:{onGateMouseDown:null===t||void 0===t||null===(e=t.onGateMouseDown)||void 0===e?void 0:e.bind(void 0,this),onGateMouseUp:null===t||void 0===t||null===(n=t.onGateMouseUp)||void 0===n?void 0:n.bind(void 0,this),onGateMouseMove:null===t||void 0===t||null===(i=t.onGateMouseMove)||void 0===i?void 0:i.bind(void 0,this),onGateContextMenu:null===t||void 0===t||null===(o=t.onGateContextMenu)||void 0===o?void 0:o.bind(void 0,this),onPinMouseDown:null===t||void 0===t?void 0:t.onPinMouseDown,onPinMouseUp:null===t||void 0===t?void 0:t.onPinMouseUp,onPinMouseMove:null===t||void 0===t?void 0:t.onPinMouseMove,onPinContextMenu:null===t||void 0===t?void 0:t.onPinContextMenu}}}}]),t}();!function(t){t[t.UNKNOWN=0]="UNKNOWN",t[t.GATE=1]="GATE",t[t.INPUT=2]="INPUT",t[t.OUTPUT=3]="OUTPUT",t[t.COMPOSITE_BUILT_IN=4]="COMPOSITE_BUILT_IN",t[t.COMPOSITE_CUSTOM=5]="COMPOSITE_CUSTOM"}(N||(N={}));var U=N;function D(){var t=new m.a.PaperScope;return t.setup(),t}var C,G,A=D(),E="M 0 0 L 8 0 Q 22.72 0 32 16 Q 22.72 32 8 32 L 0 32 Q 8 16 0 0 Z",B=function(t){Object(d.a)(n,t);var e=Object(l.a)(n);function n(t){var i;return Object(u.a)(this,n),(i=e.call(this,t)).state={},i}return Object(h.a)(n,[{key:"render",value:function(){var t,e,n,i=this.props.pin.geometry.data;this.props.pin.geometry.data={};var o=this.props.pin.geometry.exportSVG().getAttribute("d");this.props.pin.geometry.data=i;var s={d:o},a=["pin"];(null===(t=this.props.pin.geometry)||void 0===t?void 0:t.selected)&&a.push("selected");var r=Object(b.a)(this.props.pin.anchor,1)[0];return Object(p.jsxs)("g",{className:a.join(" "),onMouseDown:null===(e=this.props.handlers)||void 0===e?void 0:e.onPinMouseDown,onMouseUp:null===(n=this.props.handlers)||void 0===n?void 0:n.onPinMouseUp,onContextMenu:function(){return console.log("context p!")},children:[Object(p.jsx)("circle",{className:"anchor",cx:r.x,cy:r.y,r:5}),Object(p.jsx)("path",Object(O.a)({},s))]},this.props.pin.uuid)}}]),n}(s.a.Component),L=function(){function t(e){var n,i,o;Object(u.a)(this,t),this.v=void 0,this.x=void 0,this.z=void 0,this.v=null!==(n=e.v)&&void 0!==n?n:0,this.x=null!==(i=e.x)&&void 0!==i?i:0,this.z=null!==(o=e.z)&&void 0!==o?o:0}return Object(h.a)(t,[{key:"eq",value:function(t){return this.v===t.v&&this.x===t.x&&this.z===t.z}},{key:"ne",value:function(t){return this.v!==t.v||this.x!==t.x||this.z!==t.z}},{key:"negate",value:function(t){var e=(1<<t)-1;this.v=~this.v&~this.x&~this.z&e}}]),t}(),R=function(t){Object(d.a)(n,t);var e=Object(l.a)(n);function n(){return Object(u.a)(this,n),e.apply(this,arguments)}return Object(h.a)(n,[{key:"render",value:function(){var t=this.props.i,e=t.x,n=t.y,i=this.props.o,o=i.x,s=i.y,a=this.props.ic,r=a.x,c=a.y,u=this.props.oc,h=u.x,d=u.y,l="M ".concat(e-1," ").concat(n," A ").concat(1," ").concat(1," 180 0 0 ").concat(e+1," ").concat(n," "),v="A ".concat(1," ").concat(1," 180 0 0 ").concat(e-1," ").concat(n," "),f="M ".concat(o-1," ").concat(s," A ").concat(1," ").concat(1," 180 0 0 ").concat(o+1," ").concat(s," "),b="A ".concat(1," ").concat(1," 180 0 0 ").concat(o-1," ").concat(s," "),y="".concat(l," ").concat(v," M ").concat(e," ").concat(n," C ").concat(r," ").concat(c," ").concat(h," ").concat(d," ").concat(o," ").concat(s," ").concat(f," ").concat(b);return Object(p.jsxs)("g",{children:[Object(p.jsx)("path",{className:"connection-outer",d:y}),Object(p.jsx)("path",{fillRule:"nonzero",className:"connection-inner error",d:y}),Object(p.jsx)("path",{fillRule:"nonzero",className:"connection-inner bus",d:y})]})}}]),n}(s.a.Component),S=function(){function t(e){var n,i;Object(u.a)(this,t),this.uuid=void 0,this.source=void 0,this.sink=void 0,this.hidden=void 0,this.board=void 0,this.uuid=null!==(n=e.uuid)&&void 0!==n?n:Object(x.a)(),this.source=e.source,this.sink=e.sink,this.hidden=null!==(i=e.hidden)&&void 0!==i&&i,this.board=e.board}return Object(h.a)(t,[{key:"remove",value:function(){var t;this.source.connections.delete(this.uuid),this.sink.connections.delete(this.uuid),null===(t=this.board)||void 0===t||t.removeConnection(this.uuid)}},{key:"render",value:function(){var t=Object(b.a)(this.source.anchor,2),e=t[0],n=t[1],i=Object(b.a)(this.sink.anchor,2),o=i[0],s=i[1];e=this.source.transform(e),o=this.sink.transform(o);var a=Math.min(e.getDistance(o),30),r=e.add(n.multiply(a)),c=o.add(s.multiply(a));return Object(p.jsx)(R,{connection:this,i:e,o:o,ic:r,oc:c},this.uuid)}}]),t}();!function(t){t[t.UNKNOWN=0]="UNKNOWN",t[t.UP=1]="UP",t[t.DOWN=2]="DOWN",t[t.LEFT=3]="LEFT",t[t.RIGHT=4]="RIGHT"}(C||(C={})),function(t){t[t.UNKNOWN=0]="UNKNOWN",t[t.INPUT=1]="INPUT",t[t.OUTPUT=2]="OUTPUT"}(G||(G={}));var W,I=function(){function t(e){var n,i,o;Object(u.a)(this,t),this.parent=void 0,this.connectionAnchor=void 0,this.uuid=void 0,this.board=void 0,this.width=void 0,this.geometry=void 0,this.not=void 0,this.orientation=void 0,this.pinType=void 0,this.state=void 0,this.connections=new Map,this.uuid=Object(x.a)(),this.parent=e.parent,this.width=null!==(n=e.width)&&void 0!==n?n:1,this.orientation=null!==(i=e.orientation)&&void 0!==i?i:C.LEFT,this.pinType=e.pinType,this.not=null!==(o=e.not)&&void 0!==o&&o,this.state=new L({}),this.board=e.board}return Object(h.a)(t,[{key:"setLogicState",value:function(t){switch(this.state=t,this.pinType){case G.INPUT:this.parent.operate();break;case G.OUTPUT:this.updateNext();break;default:throw new Error}}},{key:"updateNext",value:function(){if(this.pinType!==G.OUTPUT)throw new Error;var t,e=Object(y.a)(this.connections.values());try{for(e.s();!(t=e.n()).done;){var n=t.value.sink;this.state.ne(n.state)&&n.setLogicState(this.state)}}catch(i){e.e(i)}finally{e.f()}}},{key:"disconnect",value:function(){this.connections.forEach((function(t){return t.remove()})),this.connections.clear()}},{key:"canConnect",value:function(t){if(this.width!==t.width)return!1;switch(this.pinType){case G.INPUT:return t.pinType===G.OUTPUT;case G.OUTPUT:return t.pinType===G.INPUT}return!1}},{key:"connectTo",value:function(t){if(!this.canConnect(t))return null;if(this.pinType===G.INPUT){if(this.isConnectedTo(t))return null;this.disconnect();var e=new S({source:t,sink:this,board:this.board});return this.connections.set(e.uuid,e),t.connections.set(e.uuid,e),this.setLogicState(t.state),e}return t.connectTo(this)}},{key:"isConnectedTo",value:function(t){return this.connections.has(t.uuid)}},{key:"remove",value:function(){var t,e;this.disconnect(),null===(t=this.geometry)||void 0===t||t.remove(),null===(e=this.geometry)||void 0===e||delete e.data.logic}},{key:"render",value:function(t){return Object(p.jsx)(B,Object(O.a)({},this.getRenderParams(t)),this.uuid)}},{key:"getRenderParams",value:function(t){var e,n,i,o;return{pin:this,type:this.pinType,handlers:{onPinMouseUp:null===t||void 0===t||null===(e=t.onPinMouseUp)||void 0===e?void 0:e.bind(void 0,this),onPinMouseDown:null===t||void 0===t||null===(n=t.onPinMouseDown)||void 0===n?void 0:n.bind(void 0,this),onPinMouseMove:null===t||void 0===t||null===(i=t.onPinMouseMove)||void 0===i?void 0:i.bind(void 0,this),onPinContextMenu:null===t||void 0===t||null===(o=t.onPinContextMenu)||void 0===o?void 0:o.bind(void 0,this)}}}},{key:"updateGeometry",value:function(t){this.geometry&&this.geometry.remove();var e,n=this.parent.scope,i=n.CompoundPath,o=n.Path,s=n.Point;switch((e=this.not?new i("M -4 0 A 4 4 180 0 1 4 0 A 4 4 180 0 1 -4 0 Z M 3.47 -2 L 18.5 -2 L 20 0 L 18.5 2 L 3.467 2 A 4 4 -20 0 0 3.467 -2 Z"):new o("M -4 -2 L 18.5 -2 L 20 0 L 18.5 2 L -4 2 Z")).pivot=new s(0,0),this.orientation){case C.UP:e.rotate(-90),this.connectionAnchor=new s(0,-18);break;case C.DOWN:e.rotate(90),this.connectionAnchor=new s(0,18);break;case C.LEFT:e.rotate(180),this.connectionAnchor=new s(-18,0);break;case C.RIGHT:this.connectionAnchor=new s(18,0);break;default:throw new Error("Unknown pin orientation")}e.translate(t),this.geometry=e.subtract(this.parent.body),e.remove(),this.geometry.data.type="Pin",this.geometry.data.logical=this}},{key:"transform",value:function(t){return this.parent.geometry.matrix.transform(t)}},{key:"rotation",get:function(){return this.parent.geometry.rotation}},{key:"pos",get:function(){return this.geometry.position}},{key:"anchor",get:function(){return[this.pos.add(this.connectionAnchor),this.connectionAnchor.rotate(this.rotation,new this.parent.scope.Point(0,0)).divide(18)]}}]),t}();!function(t){t[t.UNKNOWN=0]="UNKNOWN",t[t.AND=1]="AND",t[t.NAND=2]="NAND",t[t.OR=3]="OR",t[t.NOR=4]="NOR",t[t.XOR=5]="XOR",t[t.XNOR=6]="XNOR",t[t.BUF=7]="BUF",t[t.NOT=8]="NOT"}(W||(W={}));var z,_=W;function F(t){switch(t){case _.NAND:case _.NOR:case _.XNOR:case _.NOT:return!0;case _.AND:case _.OR:case _.XOR:case _.BUF:return!1;default:throw Error("Unsupported Gate Type")}}var X=function(t){Object(d.a)(n,t);var e=Object(l.a)(n);function n(t){var i;return Object(u.a)(this,n),(i=e.call(this,Object(O.a)({flags:0,type:U.GATE,fieldWidth:2},t))).opFunc=void 0,i.opFunc=n.opFuncs[i.subtype].bind(Object(g.a)(i)),i}return Object(h.a)(n,[{key:"opAnd",value:function(){var t,e=this.bitMask(),n=0,i=0,o=Object(y.a)(this.inputPins);try{for(o.s();!(t=o.n()).done;){var s=t.value;i|=~(s.state.v|s.state.x|s.state.z),e&=s.state.v,n|=s.state.x,n|=s.state.z}}catch(a){o.e(a)}finally{o.f()}return new L({v:e,x:n&=~i,z:0})}},{key:"opNand",value:function(){var t=this.opAnd();return t.negate(this.width),t}},{key:"opOr",value:function(){var t,e=0,n=0,i=Object(y.a)(this.inputPins);try{for(i.s();!(t=i.n()).done;){var o=t.value;e|=o.state.v,n|=o.state.x,n|=o.state.z}}catch(s){i.e(s)}finally{i.f()}return new L({v:e,x:n&=~e,z:0})}},{key:"opNor",value:function(){var t=this.opOr();return t.negate(this.width),t}},{key:"opXor",value:function(){var t,e=0,n=0,i=Object(y.a)(this.inputPins);try{for(i.s();!(t=i.n()).done;){var o=t.value;e^=o.state.v,n|=o.state.x,n|=o.state.z}}catch(s){i.e(s)}finally{i.f()}return new L({v:e&~n,x:n,z:0})}},{key:"opXnor",value:function(){var t=this.opXor();return t.negate(this.width),t}},{key:"opBuf",value:function(){var t=Object(b.a)(this.inputPins,1)[0],e=t.state.v,n=t.state.x|t.state.z;return new L({v:e,x:n,z:0})}},{key:"opNot",value:function(){var t=Object(b.a)(this.inputPins,1)[0],e=t.state.x|t.state.z,n=~t.state.v&this.bitMask()&~e;return new L({v:n,x:e,z:0})}},{key:"operate",value:function(){var t=this.opFunc();this.postEvent(t,this.outputPins[0])}},{key:"setUpBody",value:function(){return new(0,this.scope.CompoundPath)(function(t){switch(t){case _.AND:case _.NAND:return"M 0 0 L 16 0 A 16 16 -180 0 1 16 32 L 0 32 L 0 0 Z";case _.OR:case _.NOR:return E;case _.XOR:case _.XNOR:return"M 0 0 L 8 0 Q 22.72 0 32 16 Q 22.72 32 8 32 L 0 32 Q 8 16 0 0 Z M -4 0 Q 4 16 -4 32 Q 4 16 -4 0 Z";case _.BUF:case _.NOT:return"M 0 0 L 32 16 L 0 32 L 0 0 Z";default:throw Error("Unsupported Gate Type")}}(this.subtype))}},{key:"setUpInputPins",value:function(t){var e=this.inputPins.slice(0,t);this.inputPins.slice(t).forEach((function(t){return t.remove()}));for(var n=this.fieldWidth;n<t;++n)e.push(new I({parent:this,pinType:G.INPUT,orientation:C.LEFT,board:this.board}));for(var i=2===t?32/3:3===t?6:2,o=2===t?32/3:3===t?10:28/3,s=0;s<t;++s)e[s].updateGeometry(new m.a.Point(0,i+s*o));return e}},{key:"setUpOutputPins",value:function(){if(this.outputPins.length>0)return this.outputPins;var t=new I({parent:this,pinType:G.OUTPUT,orientation:C.RIGHT,not:F(this.subtype),board:this.board});return t.updateGeometry(new m.a.Point(32,16)),[t]}}]),n}(T);X.opFuncs=(z={},Object(f.a)(z,_.AND,X.prototype.opAnd),Object(f.a)(z,_.NAND,X.prototype.opNand),Object(f.a)(z,_.OR,X.prototype.opOr),Object(f.a)(z,_.NOR,X.prototype.opNor),Object(f.a)(z,_.XOR,X.prototype.opXor),Object(f.a)(z,_.XNOR,X.prototype.opXnor),Object(f.a)(z,_.BUF,X.prototype.opBuf),Object(f.a)(z,_.NOT,X.prototype.opNot),Object(f.a)(z,_.UNKNOWN,(function(){throw new Error("Unsupported type")})),z);var Q=X,K=n(20),V=n.n(K),Z=function(t){Object(d.a)(n,t);var e=Object(l.a)(n);function n(t){var i;return Object(u.a)(this,n),(i=e.call(this,Object(O.a)(Object(O.a)({},t),{},{type:U.OUTPUT,flags:0}))).on=!1,i}return Object(h.a)(n,[{key:"operate",value:function(){this.on=1===this.inputPins[0].state.v}},{key:"extraRender",value:function(){var t=this.on?"auto":"none";return[Object(p.jsx)("circle",{className:"bulb-glow",cx:16,cy:16,r:32,display:t},0)]}},{key:"setUpBody",value:function(){return new this.scope.Path("M 27.3137084989848 27.3137084989848 A 16 16 90 1 0 4.68629150101524 27.3137084989848 Q 9.238107812 31.86552481 10.71553501 36 Q 11.21553501 37.39921453 11.71553501 40 C 12.21553501 42.60078547 19.78446499 42.60078547 20.28446499 40 Q 20.78446499 37.39921453 21.28446499 36 Q 22.76189219 31.86552481 27.3137085 27.3137085")}},{key:"setUpInputPins",value:function(t){var e=this.body.bounds.bottom,n=new I({parent:this,pinType:G.INPUT,orientation:C.DOWN,board:this.board});return n.updateGeometry(new V.a.Point(16,e)),[n]}}]),n}(T),H=function(){function t(e){var n;Object(u.a)(this,t),this.subtype=void 0,this.type=void 0,this.label=void 0,this.component=void 0,this.type=e.type,this.subtype=e.subtype,this.label=null!==(n=e.label)&&void 0!==n?n:"<NO LABEL>",this.component=this.make()}return Object(h.a)(t,[{key:"make",value:function(t){var e,n=null!==(e=null===t||void 0===t?void 0:t.scope)&&void 0!==e?e:A;switch(this.type){case U.GATE:return new Q({subtype:this.subtype,scope:n,board:t});case U.OUTPUT:return new Z({subtype:0,board:t,scope:n});default:throw Error("Unsupported Part Type")}}}]),t}();H.data=void 0;var Y=H,J=function(t){Object(d.a)(n,t);var e=Object(l.a)(n);function n(){return Object(u.a)(this,n),e.apply(this,arguments)}return Object(h.a)(n,[{key:"renderPart",value:function(t){var e=t.component,n=e.render(),i=t.label,o=e.geometry.bounds,s=o.left,a=o.top,r=o.width,c=o.height;s-=2,a-=2,r+=4,c+=4;var u=i.replace(" ","_");return Object(p.jsxs)("div",{className:"part",draggable:!0,onDragStart:this.handleDragStart.bind(this,u,t),onDragEnd:this.handleDragEnd.bind(this),children:[Object(p.jsx)("div",{className:"part-image-container",children:Object(p.jsx)("svg",{className:"part-image",id:u,viewBox:"".concat(s," ").concat(a," ").concat(r," ").concat(c),width:r,height:c,children:n})}),Object(p.jsx)("div",{className:"part-label",children:i})]},e.uuid)}},{key:"handleDragStart",value:function(t,e,n){Y.data=e;var i=document.getElementById(t),o=e.component.geometry.bounds.center,s=o.x,a=o.y;n.dataTransfer.setDragImage(i,s+2,a+2),n.dataTransfer.effectAllowed="move"}},{key:"handleDragEnd",value:function(){Y.data=void 0}},{key:"render",value:function(){return Object(p.jsx)("div",{className:"drawer",children:this.props.parts.map(this.renderPart.bind(this))})}}]),n}(s.a.Component),q=(n(32),function(t){Object(d.a)(n,t);var e=Object(l.a)(n);function n(t){var i;return Object(u.a)(this,n),(i=e.call(this,t)).ref=void 0,i.resizeObserer=void 0,i.sPoint=void 0,i.select=void 0,i.select=null,i.state={viewBox:{left:0,top:0,width:800,height:600},viewPort:{width:0,height:0},scaleFactor:1,pan:!1,drag:!1},i.ref=s.a.createRef(),i}return Object(h.a)(n,[{key:"onResize",value:function(t){var e=t[0].contentRect,n=e.width,i=e.height;this.setState((function(t){return{viewPort:{width:n,height:i},viewBox:{left:t.viewBox.left,top:t.viewBox.top,width:n*t.scaleFactor,height:i*t.scaleFactor}}}))}},{key:"componentDidMount",value:function(){this.setState({});var t=this.ref.current;this.resizeObserer=new ResizeObserver(this.onResize.bind(this)),this.resizeObserer.observe(t)}},{key:"componentWillUnmount",value:function(){var t;null===(t=this.resizeObserer)||void 0===t||t.disconnect()}},{key:"defs",value:function(){return Object(p.jsxs)("defs",{children:[Object(p.jsxs)("pattern",{id:"grid",x:0,y:0,width:80,height:80,viewBox:"0 0 80 80",patternUnits:"userSpaceOnUse",children:[Object(p.jsx)("path",{className:"grid",d:"M 0 0 L 0 80",strokeWidth:"2"}),Object(p.jsx)("path",{className:"grid",d:"M 10 0 L 10 80",strokeWidth:"0.5"}),Object(p.jsx)("path",{className:"grid",d:"M 20 0 L 20 80",strokeWidth:"0.5"}),Object(p.jsx)("path",{className:"grid",d:"M 30 0 L 30 80",strokeWidth:"0.5"}),Object(p.jsx)("path",{className:"grid",d:"M 40 0 L 40 80",strokeWidth:"0.5"}),Object(p.jsx)("path",{className:"grid",d:"M 50 0 L 50 80",strokeWidth:"0.5"}),Object(p.jsx)("path",{className:"grid",d:"M 60 0 L 60 80",strokeWidth:"0.5"}),Object(p.jsx)("path",{className:"grid",d:"M 70 0 L 70 80",strokeWidth:"0.5"}),Object(p.jsx)("path",{className:"grid",d:"M 80 0 L 80 80",strokeWidth:"2"}),Object(p.jsx)("path",{className:"grid",d:"M 0 0 L 80 0",strokeWidth:"2"}),Object(p.jsx)("path",{className:"grid",d:"M 0 10 L 80 10",strokeWidth:"0.5"}),Object(p.jsx)("path",{className:"grid",d:"M 0 20 L 80 20",strokeWidth:"0.5"}),Object(p.jsx)("path",{className:"grid",d:"M 0 30 L 80 30",strokeWidth:"0.5"}),Object(p.jsx)("path",{className:"grid",d:"M 0 40 L 80 40",strokeWidth:"0.5"}),Object(p.jsx)("path",{className:"grid",d:"M 0 50 L 80 50",strokeWidth:"0.5"}),Object(p.jsx)("path",{className:"grid",d:"M 0 60 L 80 60",strokeWidth:"0.5"}),Object(p.jsx)("path",{className:"grid",d:"M 0 70 L 80 70",strokeWidth:"0.5"}),Object(p.jsx)("path",{className:"grid",d:"M 0 80 L 80 80",strokeWidth:"2"})]}),Object(p.jsxs)("pattern",{id:"bus",x:0,y:0,width:3,height:3,viewBox:"0 0 3 3",patternUnits:"userSpaceOnUse",children:[Object(p.jsx)("rect",{x:2,y:0,width:1,height:1,fill:"black"}),Object(p.jsx)("rect",{x:1,y:1,width:1,height:1,fill:"black"}),Object(p.jsx)("rect",{x:0,y:2,width:1,height:1,fill:"black"})]}),Object(p.jsxs)("radialGradient",{id:"bulb-glow",children:[Object(p.jsx)("stop",{offset:"0%",stopColor:"rgb(255, 255, 128)"}),Object(p.jsx)("stop",{offset:"100%",stopColor:"rgba(255, 255, 255, 0)"})]})]},"defs")}},{key:"renderGrid",value:function(){var t=this.state.viewBox.left,e=this.state.viewBox.width,n=this.state.viewBox.top,i=this.state.viewBox.height;return Object(p.jsx)("rect",{x:t,y:n,width:e,height:i,fill:"url(#grid)"},"grid")}},{key:"render",value:function(){var t,e,n=this,i=this.state.viewBox.left,o=this.state.viewBox.width,s=this.state.viewBox.top,a=this.state.viewBox.height,r=null===(t=this.select)||void 0===t||null===(e=t.exportSVG())||void 0===e?void 0:e.getAttribute("d"),c={onGateMouseDown:this.handleGateMouseDown.bind(this),onGateMouseUp:this.handleGateMouseUp.bind(this),onGateContextMenu:this.handleGateContextMenu.bind(this),onPinMouseDown:this.handlePinMouseDown.bind(this)},u=[];this.props.board.connections.forEach((function(t){return u.push(t.render())}));var h=[];return this.props.board.components.forEach((function(t){return h.push(t.render(c))})),Object(p.jsx)("div",{ref:this.ref,style:{width:"100%",height:"100%"},children:Object(p.jsx)("svg",{className:"board-wrapper",style:this.state.viewPort,xmlns:"http://www.w3.org/2000/svg",onWheel:function(t){return n.handleWheel(t)},onMouseMove:function(t){return n.handleMouseMove(t)},onMouseDown:function(t){return n.handleMouseDown(t)},onMouseUp:function(t){return n.handleMouseUp(t)},onMouseLeave:function(t){return n.handleMouseExit(t)},onDragEnter:this.handleDragEnter.bind(this),onDragOver:function(t){return n.handleDragOver(t)},onDrop:function(t){return n.handleDrop(t)},children:Object(p.jsxs)("svg",{className:"board",preserveAspectRatio:"xMinYMin slice",xmlns:"http://www.w3.org/2000/svg",viewBox:"".concat(i," ").concat(s," ").concat(o," ").concat(a),onScroll:function(){return console.log("scroll")},children:[this.defs(),this.renderGrid(),Object(p.jsx)("circle",{className:"origin",x:"0",y:"0",r:"40",fill:"red"}),u,h,r&&Object(p.jsx)("path",{className:"select",d:r,vectorEffect:"non-scaling-stroke"})]})})})}},{key:"clearSelection",value:function(){var t,e=Object(y.a)(this.scope.project.selectedItems);try{for(e.s();!(t=e.n()).done;){t.value.selected=!1}}catch(n){e.e(n)}finally{e.f()}}},{key:"getViewCoordinates",value:function(t){var e=t.currentTarget.getBoundingClientRect(),n=e.left,i=e.top,o=e.width,s=e.height,a=t.pageX-n,r=t.pageY-i,c=t.movementX,u=t.movementY,h=this.state.viewBox.width,d=this.state.viewBox.height,l=a/o,p=r/s;return{x:this.state.viewBox.left+l*h,y:this.state.viewBox.top+p*d,rx:l,ry:p,dx:c/o*h,dy:u/s*d}}},{key:"enableDrag",value:function(t){t.stopPropagation(),this.setState({drag:!0})}},{key:"disableDrag",value:function(t){t.stopPropagation(),this.setState({drag:!1})}},{key:"handleDragEnter",value:function(t){t.preventDefault(),t.dataTransfer.effectAllowed="move"}},{key:"handleDragOver",value:function(t){t.preventDefault(),t.dataTransfer.effectAllowed="move"}},{key:"handleDrop",value:function(t){t.preventDefault();var e=this.getViewCoordinates(t),n=e.x,i=e.y,o=Y.data;if(o){var s=o.make(this.props.board);s.geometry.translate(new m.a.Point(n-16,i-16)),this.props.board.addComponent(s),this.setState({})}}},{key:"handleMouseDown",value:function(t){t.preventDefault(),t.stopPropagation(),this.clearSelection();var e=this.props.board.scope,n=e.Path,i=e.Point,o=e.Rectangle,s=e.Size,a=this.getViewCoordinates(t),r=a.x,c=a.y;this.sPoint=new i(r,c);var u=new o(this.sPoint,new s(0,0));this.select=new n.Rectangle(u),this.setState({})}},{key:"handleMouseUp",value:function(t){t.preventDefault(),t.stopPropagation(),this.select&&(this.select.remove(),this.select=null),this.setState({pan:!1,drag:!1})}},{key:"handleMouseExit",value:function(t){this.select&&(this.select.remove(),this.select=null),this.setState({pan:!1,drag:!1})}},{key:"isSelected",value:function(t){var e=this.select,n=e.bounds,i=t.clone();i.transform(t.parent.matrix);var o=i.intersects(e)||i.isInside(n)||i.contains(n.center);return i.remove(),o}},{key:"handleMouseMove",value:function(t){var e=this.getViewCoordinates(t),n=e.x,i=e.y,o=e.dx,s=e.dy;if(this.state.drag){t.stopPropagation(),t.preventDefault();var a,r=this.props.board.scope.project.getItems({selected:!0,data:{type:"Component"}}),c=Object(y.a)(r);try{for(c.s();!(a=c.n()).done;){var u=a.value,h=new m.a.Point(o,s);u.parent.translate(h)}}catch(U){c.e(U)}finally{c.f()}this.setState({})}if(this.select&&this.sPoint){var d=this.select,l=[this.sPoint.x,this.sPoint.y],p=l[0],v=l[1];if(n===p&&i===v){var f,b=Object(y.a)(d.segments);try{for(b.s();!(f=b.n()).done;){f.value.point=this.sPoint}}catch(U){b.e(U)}finally{b.f()}}n<=p&&(d.segments[0].point.x=n,d.segments[1].point.x=n,d.segments[2].point.x=p,d.segments[3].point.x=p),n>=p&&(d.segments[0].point.x=p,d.segments[1].point.x=p,d.segments[2].point.x=n,d.segments[3].point.x=n),i<=v&&(d.segments[0].point.y=v,d.segments[1].point.y=i,d.segments[2].point.y=i,d.segments[3].point.y=v),i>=v&&(d.segments[0].point.y=i,d.segments[1].point.y=v,d.segments[2].point.y=v,d.segments[3].point.y=i);var O,g=this.props.board.scope.project,j=g.getItems({data:{type:"Component"}}),w=!1,x=Object(y.a)(j);try{for(x.s();!(O=x.n()).done;){var k=O.value;this.isSelected(k)?(w=!0,k.selected=!0):k.selected=!1}}catch(U){x.e(U)}finally{x.f()}var M,P=g.getItems({data:{type:"Pin"}}),N=Object(y.a)(P);try{for(N.s();!(M=N.n()).done;){var T=M.value;T.selected=!w&&this.isSelected(T)}}catch(U){N.e(U)}finally{N.f()}this.setState({}),this.forceUpdate()}this.state.pan&&this.setState({viewBox:{top:this.state.viewBox.top-s,left:this.state.viewBox.left-o,width:this.state.viewBox.width,height:this.state.viewBox.height}})}},{key:"handleWheel",value:function(t){var e=this.getViewCoordinates(t),i=e.x,o=e.y,s=e.rx,a=e.ry,r=this.state.viewPort.width,c=this.state.viewPort.height,u=this.state.scaleFactor,h=n.between(1/16,Math.pow(2,t.deltaY/1e3)*u,4),d=r*h,l=c*h,p={left:i-s*d,top:o-a*l,width:d,height:l};this.setState({scaleFactor:h,viewBox:p})}},{key:"handleGateMouseDown",value:function(t,e){e.preventDefault(),e.stopPropagation(),console.log("Gate Down");var n=this.props.board.scope.project.getItems({selected:!0}),i=t.body;if(!n.includes(i)){var o,s=Object(y.a)(n);try{for(s.s();!(o=s.n()).done;){o.value.selected=!1}}catch(a){s.e(a)}finally{s.f()}i.selected=!0}this.setState({drag:!0})}},{key:"handleGateMouseUp",value:function(t,e){e.preventDefault(),console.log("up gate")}},{key:"handleGateContextMenu",value:function(t,e){e.shiftKey||(e.stopPropagation(),e.preventDefault(),console.log("context g!"))}},{key:"handlePinMouseDown",value:function(t,e){e.stopPropagation(),e.preventDefault();var n=this.props.board.scope.project.getItems({selected:!0,data:{type:"Pin"}}).map((function(t){return t.data.logical})),i=n.filter((function(t){return t.pinType===G.OUTPUT})).length;if(console.log("Num outputs: ".concat(i)),i<=1){var o,s=Object(y.a)(n);try{for(s.s();!(o=s.n()).done;){var a=o.value;this.makeConnection(a,t)}}catch(r){s.e(r)}finally{s.f()}}}},{key:"makeConnection",value:function(t,e){console.log("attempting connection");var n=t.connectTo(e);n&&(this.props.board.addConnection(n),this.setState({}))}},{key:"scope",get:function(){return this.props.board.scope}}],[{key:"between",value:function(t,e,n){return Math.min(Math.max(t,e),n)}}]),n}(s.a.Component)),$=function(){function t(){Object(u.a)(this,t),this.components=new Map,this.connections=new Map,this.scope=D()}return Object(h.a)(t,[{key:"render",value:function(){return Object(p.jsx)(q,{board:this})}},{key:"postEvent",value:function(t,e,n){}},{key:"addComponent",value:function(t){this.components.set(t.uuid,t)}},{key:"addConnection",value:function(t){this.connections.set(t.uuid,t)}},{key:"removeComponent",value:function(t){this.components.delete(t)}},{key:"removeConnection",value:function(t){this.connections.delete(t)}}]),t}(),tt=function(t){Object(d.a)(n,t);var e=Object(l.a)(n);function n(){var t;Object(u.a)(this,n);for(var i=arguments.length,o=new Array(i),s=0;s<i;s++)o[s]=arguments[s];return(t=e.call.apply(e,[this].concat(o))).board=new $,t}return Object(h.a)(n,[{key:"render",value:function(){return Object(p.jsxs)("div",{style:{width:"100%",height:"100%"},children:[Object(p.jsx)("div",{children:"Menu/Toolbars"}),Object(p.jsxs)("div",{style:{width:"100%",height:"100%"},children:[Object(p.jsx)(v,{content:Object(p.jsx)(J,{parts:[new Y({type:U.GATE,subtype:_.AND,label:"AND"}),new Y({type:U.GATE,subtype:_.NAND,label:"NAND"}),new Y({type:U.GATE,subtype:_.OR,label:"OR"}),new Y({type:U.GATE,subtype:_.NOR,label:"NOR"}),new Y({type:U.GATE,subtype:_.XOR,label:"XOR"}),new Y({type:U.GATE,subtype:_.XNOR,label:"XNOR"}),new Y({type:U.GATE,subtype:_.BUF,label:"BUF"}),new Y({type:U.GATE,subtype:_.NOT,label:"NOT"}),new Y({type:U.OUTPUT,subtype:0,label:"Bulb"})]})}),this.board.render()]})]})}}]),n}(s.a.Component);r.a.render(Object(p.jsx)(s.a.StrictMode,{children:Object(p.jsx)(tt,{})}),document.getElementById("root")),c()}},[[33,1,2]]]);
//# sourceMappingURL=main.c96b7514.chunk.js.map
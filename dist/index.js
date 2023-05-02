(()=>{"use strict";const t=jQuery,e=JXG;function o(t,e){return Math.random()*(e-t)+t}function n(t){var e=t.getParents(),o=t.ancestors[e[0]],n=t.ancestors[e[1]];return o.coords.usrCoords[1]<n.coords.usrCoords[1]?[o,n]:[n,o]}function r(t,e){var o=n(t),r=o[0].coords.usrCoords[1];return e>o[1].coords.usrCoords[1]?-1:e<r?1:0}var s=function(){function t(t){var o=this;this.acceptChanges=!0,this.segments=[],this.newSegmentListeners=[],this.startAddingSegmentFunction=function(t){if(!(o.board.getAllObjectsUnderMouse(t).length>0)){var e=o.board.getUsrCoordsOfMouse(t);o.creatingLine=o.newSegment(e,e)}},this.moveEndpointWhenAddingFunction=function(t){if(void 0!==o.creatingLine){var e=o.board.getUsrCoordsOfMouse(t);o.creatingLine.p1.setPosition(JXG.COORDS_BY_USER,[o.creatingLine.p1.coords.usrCoords[1],e[1]]),o.creatingLine.p2.setPosition(JXG.COORDS_BY_USER,e),o.board.update()}},this.releaseAddingSegmentFunction=function(){o.creatingLine=void 0},this.board=e.JSXGraph.initBoard(t,{boundingbox:[-10,10,10,-10],showCopyright:!1,showNavigation:!1,pan:{enabled:!1},zoom:{wheel:!1}}),this.board.on("down",this.startAddingSegmentFunction),this.board.on("move",this.moveEndpointWhenAddingFunction),this.board.on("up",this.releaseAddingSegmentFunction)}return t.prototype.stopAcceptingChanges=function(){this.acceptChanges=!1,this.board.off("down",this.startAddingSegmentFunction),this.board.off("move",this.moveEndpointWhenAddingFunction),this.board.off("up",this.releaseAddingSegmentFunction);for(var t=0,e=this.board.objectsList;t<e.length;t++){var o=e[t];"line"!==o.getType()&&"point"!==o.getType()||(o.isDraggable=!1)}},t.prototype.newSegment=function(t,e){if(!this.acceptChanges)throw new Error("Board is frozen, new segments are not accepted.");var o=this.board.create("point",t,{withLabel:!1}),n=this.board.create("point",e,{withLabel:!1}),r=this.board.create("line",[o,n],{straightFirst:!1,straightLast:!1});o.on("drag",(function(){return n.setPosition(JXG.COORDS_BY_USER,[n.coords.usrCoords[1],o.coords.usrCoords[2]])})),n.on("drag",(function(){return o.setPosition(JXG.COORDS_BY_USER,[o.coords.usrCoords[1],n.coords.usrCoords[2]])})),this.segments.push(r);for(var s=0,i=this.newSegmentListeners;s<i.length;s++)(0,i[s])(o,n,r);return{p1:o,p2:n,l:r}},t.prototype.onNewSegment=function(t){this.newSegmentListeners.push(t)},t.prototype.getSegments=function(){return this.segments},t.prototype.populateSegments=function(t){for(var e=18/(t-1),n=0;n<t;n++){var r=o(-9.5,8.74),s=o(r+.76,9.5),i=e*n-9;this.newSegment([r,i],[s,i])}},t}(),i=function(){function t(){this.state="add",this.listeners=[]}return t.prototype.onChange=function(t){this.listeners.push(t)},t.prototype.setState=function(t){if(this.state!==t){var e=this.state;this.state=t;for(var o=0,n=this.listeners;o<n.length;o++)(0,n[o])(t,e)}},t.prototype.next=function(){"add"===this.state?this.setState("build"):"build"===this.state&&this.setState("query")},t}(),a=function(){function t(t){var e=t.slice(),o=t.slice();e.sort((function(t,e){return n(t)[0].coords.usrCoords[1]-n(e)[0].coords.usrCoords[1]})),o.sort((function(t,e){return n(e)[1].coords.usrCoords[1]-n(t)[1].coords.usrCoords[1]})),this.root=this.makeNode(void 0,e,o,1),this.height=this.root.height}return t.prototype.makeNode=function(t,e,o,s){var i=e.length;if(0!==i){for(var a={parent:t,childLeft:void 0,childRight:void 0,depth:void 0===t?0:t.depth+1,height:1,npeer:s,median:0,linesLeftSorted:[],linesRightSorted:[]},d=0,h=i-1,u=0;u<i;){var c=d>=i?void 0:n(e[d])[0].coords.usrCoords[1],g=h<0?void 0:n(o[h])[1].coords.usrCoords[1];void 0===g||c<g?(a.median=c,d++):(a.median=g,h--),u++}for(var p=[],l=[],f=[],m=[],b=0,v=e;b<v.length;b++)(y=r(w=v[b],a.median))<0?p.push(w):0===y?a.linesLeftSorted.push(w):f.push(w);for(var S=0,C=o;S<C.length;S++){var w,y;(y=r(w=C[S],a.median))<0?l.push(w):0===y?a.linesRightSorted.push(w):m.push(w)}return a.childLeft=this.makeNode(a,p,l,2*s-1),a.childRight=this.makeNode(a,f,m,2*s),void 0!==a.childLeft&&(a.height=a.childLeft.height+1),void 0!==a.childRight&&(a.height=Math.max(a.height,a.childRight.height+1)),a}},t}(),d=function(t,o){this.board=e.JSXGraph.initBoard(t,{boundingbox:[-10,10,10,-10],showCopyright:!1}),this.tree=new a(o)};t((function(){var e=new i,o=new s("plotboard"),n=t("#populate"),r={all:t("#algo-buttons button"),start:t("#algo-start"),recurse:t("#algo-recurse"),undoRecurse:t("#algo-undo-recurse"),finishSubtree:t("#algo-finish-subtree")},a=void 0;o.onNewSegment((function(){return r.start.prop("disabled",!1)})),n.on("submit",(function(e){o.populateSegments(parseInt(t("#populate-count").val())),e.preventDefault()})),e.onChange((function(t){"add"!==t&&(o.stopAcceptingChanges(),n.find(":input").prop("disabled",!0))})),r.all.prop("disabled",!0),r.start.on("click",(function(){"add"===e.state&&0===o.getSegments().length||("query"!==e.state?e.next():window.location.reload())})),e.onChange((function(t){switch(t){case"add":r.start.html("Start Building"),r.start.removeClass("btn-outline-danger"),r.start.addClass('btn-outline-primary"');break;case"build":r.start.html("Start Query"),r.start.removeClass("btn-outline-danger"),r.start.addClass('btn-outline-primary"');break;case"query":r.start.html("Reset"),r.start.removeClass('btn-outline-primary"'),r.start.addClass("btn-outline-danger")}})),e.onChange((function(t){"build"===t&&void 0===a&&(a=new d("treeboard",o.getSegments()))}))}))})();
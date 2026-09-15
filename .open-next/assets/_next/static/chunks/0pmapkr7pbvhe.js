(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,283071,(t,e,i)=>{t.e,e.exports=function(t,e,i){var n=function(t){return t.add(4-t.isoWeekday(),"day")},r=e.prototype;r.isoWeekYear=function(){return n(this).year()},r.isoWeek=function(t){if(!this.$utils().u(t))return this.add(7*(t-this.isoWeek()),"day");var e,r,s,a=n(this),o=(e=this.isoWeekYear(),s=4-(r=(this.$u?i.utc:i)().year(e).startOf("year")).isoWeekday(),r.isoWeekday()>4&&(s+=7),r.add(s,"day"));return a.diff(o,"week")+1},r.isoWeekday=function(t){return this.$utils().u(t)?this.day()||7:this.day(this.day()%7?t:t-7)};var s=r.startOf;r.startOf=function(t,e){var i=this.$utils(),n=!!i.u(e)||e;return"isoweek"===i.p(t)?n?this.date(this.date()-(this.isoWeekday()-1)).startOf("day"):this.date(this.date()-1-(this.isoWeekday()-1)+7).endOf("day"):s.bind(this)(t,e)}}},381391,(t,e,i)=>{t.e,e.exports=function(){"use strict";var t={LTS:"h:mm:ss A",LT:"h:mm A",L:"MM/DD/YYYY",LL:"MMMM D, YYYY",LLL:"MMMM D, YYYY h:mm A",LLLL:"dddd, MMMM D, YYYY h:mm A"},e=/(\[[^[]*\])|([-_:/.,()\s]+)|(A|a|Q|YYYY|YY?|ww?|MM?M?M?|Do|DD?|hh?|HH?|mm?|ss?|S{1,3}|z|ZZ?)/g,i=/\d/,n=/\d\d/,r=/\d\d?/,s=/\d*[^-_:/,()\s\d]+/,a={},o=function(t){return(t*=1)+(t>68?1900:2e3)},c=function(t){return function(e){this[t]=+e}},l=[/[+-]\d\d:?(\d\d)?|Z/,function(t){(this.zone||(this.zone={})).offset=function(t){if(!t||"Z"===t)return 0;var e=t.match(/([+-]|\d\d)/g),i=60*e[1]+(+e[2]||0);return 0===i?0:"+"===e[0]?-i:i}(t)}],u=function(t){var e=a[t];return e&&(e.indexOf?e:e.s.concat(e.f))},d=function(t,e){var i,n=a.meridiem;if(n){for(var r=1;r<=24;r+=1)if(t.indexOf(n(r,0,e))>-1){i=r>12;break}}else i=t===(e?"pm":"PM");return i},h={A:[s,function(t){this.afternoon=d(t,!1)}],a:[s,function(t){this.afternoon=d(t,!0)}],Q:[i,function(t){this.month=3*(t-1)+1}],S:[i,function(t){this.milliseconds=100*t}],SS:[n,function(t){this.milliseconds=10*t}],SSS:[/\d{3}/,function(t){this.milliseconds=+t}],s:[r,c("seconds")],ss:[r,c("seconds")],m:[r,c("minutes")],mm:[r,c("minutes")],H:[r,c("hours")],h:[r,c("hours")],HH:[r,c("hours")],hh:[r,c("hours")],D:[r,c("day")],DD:[n,c("day")],Do:[s,function(t){var e=a.ordinal,i=t.match(/\d+/);if(this.day=i[0],e)for(var n=1;n<=31;n+=1)e(n).replace(/\[|\]/g,"")===t&&(this.day=n)}],w:[r,c("week")],ww:[n,c("week")],M:[r,c("month")],MM:[n,c("month")],MMM:[s,function(t){var e=u("months"),i=(u("monthsShort")||e.map(function(t){return t.slice(0,3)})).indexOf(t)+1;if(i<1)throw Error();this.month=i%12||i}],MMMM:[s,function(t){var e=u("months").indexOf(t)+1;if(e<1)throw Error();this.month=e%12||e}],Y:[/[+-]?\d+/,c("year")],YY:[n,function(t){this.year=o(t)}],YYYY:[/\d{4}/,c("year")],Z:l,ZZ:l};return function(i,n,r){r.p.customParseFormat=!0,i&&i.parseTwoDigitYear&&(o=i.parseTwoDigitYear);var s=n.prototype,c=s.parse;s.parse=function(i){var n=i.date,s=i.utc,o=i.args;this.$u=s;var l=o[1];if("string"==typeof l){var u=!0===o[2],d=!0===o[3],f=o[2];d&&(f=o[2]),a=this.$locale(),!u&&f&&(a=r.Ls[f]),this.$d=function(i,n,r,s){try{if(["x","X"].indexOf(n)>-1)return new Date(("X"===n?1e3:1)*i);var o=(function(i){var n,r;n=i,r=a&&a.formats;for(var s=(i=n.replace(/(\[[^\]]+])|(LTS?|l{1,4}|L{1,4})/g,function(e,i,n){var s=n&&n.toUpperCase();return i||r[n]||t[n]||r[s].replace(/(\[[^\]]+])|(MMMM|MM|DD|dddd)/g,function(t,e,i){return e||i.slice(1)})})).match(e),o=s.length,c=0;c<o;c+=1){var l=s[c],u=h[l],d=u&&u[0],f=u&&u[1];s[c]=f?{regex:d,parser:f}:l.replace(/^\[|\]$/g,"")}return function(t){for(var e={},i=0,n=0;i<o;i+=1){var r=s[i];if("string"==typeof r)n+=r.length;else{var a=r.regex,c=r.parser,l=t.slice(n),u=a.exec(l)[0];c.call(e,u),t=t.replace(u,"")}}return function(t){var e=t.afternoon;if(void 0!==e){var i=t.hours;e?i<12&&(t.hours+=12):12===i&&(t.hours=0),delete t.afternoon}}(e),e}})(n)(i),c=o.year,l=o.month,u=o.day,d=o.hours,f=o.minutes,m=o.seconds,y=o.milliseconds,k=o.zone,p=o.week,g=new Date,b=u||(c||l?1:g.getDate()),v=c||g.getFullYear(),x=0;c&&!l||(x=l>0?l-1:g.getMonth());var T,w=d||0,_=f||0,$=m||0,D=y||0;return k?new Date(Date.UTC(v,x,b,w,_,$,D+60*k.offset*1e3)):r?new Date(Date.UTC(v,x,b,w,_,$,D)):(T=new Date(v,x,b,w,_,$,D),p&&(T=s(T).week(p).toDate()),T)}catch(t){return new Date("")}}(n,l,s,r),this.init(),f&&!0!==f&&(this.$L=this.locale(f).$L),(u||d)&&n!=this.format(l)&&(this.$d=new Date("")),a={}}else if(l instanceof Array)for(var m=l.length,y=1;y<=m;y+=1){o[1]=l[y-1];var k=r.apply(this,o);if(k.isValid()){this.$d=k.$d,this.$L=k.$L,this.init();break}y===m&&(this.$d=new Date(""))}else c.call(this,i)}}}()},402174,(t,e,i)=>{t.e,e.exports=function(t,e){var i=e.prototype,n=i.format;i.format=function(t){var e=this,i=this.$locale();if(!this.isValid())return n.bind(this)(t);var r=this.$utils(),s=(t||"YYYY-MM-DDTHH:mm:ssZ").replace(/\[([^\]]+)]|Q|wo|ww|w|WW|W|zzz|z|gggg|GGGG|Do|X|x|k{1,2}|S/g,function(t){switch(t){case"Q":return Math.ceil((e.$M+1)/3);case"Do":return i.ordinal(e.$D);case"gggg":return e.weekYear();case"GGGG":return e.isoWeekYear();case"wo":return i.ordinal(e.week(),"W");case"w":case"ww":return r.s(e.week(),"w"===t?1:2,"0");case"W":case"WW":return r.s(e.isoWeek(),"W"===t?1:2,"0");case"k":case"kk":return r.s(String(0===e.$H?24:e.$H),"k"===t?1:2,"0");case"X":return Math.floor(e.$d.getTime()/1e3);case"x":return e.$d.getTime();case"z":return"["+e.offsetName()+"]";case"zzz":return"["+e.offsetName("long")+"]";default:return t}});return n.bind(this)(s)}}},322372,t=>{"use strict";let e,i,n,r;var s=t.i(349125),a=t.i(153848),o=t.i(283071),c=t.i(381391),l=t.i(402174),u=t.i(330026);t.i(991577);var d=t.i(692423),h=t.i(707568),h=h,f=t.i(60297),f=f,m=t.i(453779),m=m,y=t.i(197609),k=t.i(189517),p=t.i(321137);let g=Math.PI/180,b=180/Math.PI,v=4/29,x=6/29,T=6/29*3*(6/29),w=6/29*(6/29)*(6/29);function _(t){if(t instanceof $)return new $(t.l,t.a,t.b,t.opacity);if(t instanceof E)return Y(t);t instanceof p.Rgb||(t=(0,p.rgbConvert)(t));var e,i,n=M(t.r),r=M(t.g),s=M(t.b),a=D((.2225045*n+.7168786*r+.0606169*s)/1);return n===r&&r===s?e=i=a:(e=D((.4360747*n+.3850649*r+.1430804*s)/.96422),i=D((.0139322*n+.0971045*r+.7141733*s)/.82521)),new $(116*a-16,500*(e-a),200*(a-i),t.opacity)}function $(t,e,i,n){this.l=+t,this.a=+e,this.b=+i,this.opacity=+n}function D(t){return t>w?Math.pow(t,1/3):t/T+v}function C(t){return t>x?t*t*t:T*(t-v)}function S(t){return 255*(t<=.0031308?12.92*t:1.055*Math.pow(t,1/2.4)-.055)}function M(t){return(t/=255)<=.04045?t/12.92:Math.pow((t+.055)/1.055,2.4)}function A(t,e,i,n){return 1==arguments.length?function(t){if(t instanceof E)return new E(t.h,t.c,t.l,t.opacity);if(t instanceof $||(t=_(t)),0===t.a&&0===t.b)return new E(NaN,0<t.l&&t.l<100?0:NaN,t.l,t.opacity);var e=Math.atan2(t.b,t.a)*b;return new E(e<0?e+360:e,Math.sqrt(t.a*t.a+t.b*t.b),t.l,t.opacity)}(t):new E(t,e,i,null==n?1:n)}function E(t,e,i,n){this.h=+t,this.c=+e,this.l=+i,this.opacity=+n}function Y(t){if(isNaN(t.h))return new $(t.l,0,0,t.opacity);var e=t.h*g;return new $(t.l,Math.cos(e)*t.c,Math.sin(e)*t.c,t.opacity)}(0,k.default)($,function(t,e,i,n){return 1==arguments.length?_(t):new $(t,e,i,null==n?1:n)},(0,k.extend)(p.Color,{brighter(t){return new $(this.l+18*(null==t?1:t),this.a,this.b,this.opacity)},darker(t){return new $(this.l-18*(null==t?1:t),this.a,this.b,this.opacity)},rgb(){var t=(this.l+16)/116,e=isNaN(this.a)?t:t+this.a/500,i=isNaN(this.b)?t:t-this.b/200;return e=.96422*C(e),t=+C(t),i=.82521*C(i),new p.Rgb(S(3.1338561*e-1.6168667*t-.4906146*i),S(-.9787684*e+1.9161415*t+.033454*i),S(.0719453*e-.2289914*t+1.4052427*i),this.opacity)}})),(0,k.default)(E,A,(0,k.extend)(p.Color,{brighter(t){return new E(this.h,this.c,this.l+18*(null==t?1:t),this.opacity)},darker(t){return new E(this.h,this.c,this.l-18*(null==t?1:t),this.opacity)},rgb(){return Y(this).rgb()}}));var L=t.i(425902);function F(t){return function(e,i){var n=t((e=A(e)).h,(i=A(i)).h),r=(0,L.default)(e.c,i.c),s=(0,L.default)(e.l,i.l),a=(0,L.default)(e.opacity,i.opacity);return function(t){return e.h=n(t),e.c=r(t),e.l=s(t),e.opacity=a(t),e+""}}}let I=F(L.hue);function O(t){return t}function W(t){return"translate("+t+",0)"}function P(t){return"translate(0,"+t+")"}function N(){return!this.__axis}function z(t,e){var i=[],n=null,r=null,s=6,a=6,o=3,c="u">typeof window&&window.devicePixelRatio>1?0:.5,l=1===t||4===t?-1:1,u=4===t||2===t?"x":"y",d=1===t||3===t?W:P;function h(h){var f=null==n?e.ticks?e.ticks.apply(e,i):e.domain():n,m=null==r?e.tickFormat?e.tickFormat.apply(e,i):O:r,y=Math.max(s,0)+o,k=e.range(),p=+k[0]+c,g=+k[k.length-1]+c,b=(e.bandwidth?function(t,e){return e=Math.max(0,t.bandwidth()-2*e)/2,t.round()&&(e=Math.round(e)),i=>+t(i)+e}:function(t){return e=>+t(e)})(e.copy(),c),v=h.selection?h.selection():h,x=v.selectAll(".domain").data([null]),T=v.selectAll(".tick").data(f,e).order(),w=T.exit(),_=T.enter().append("g").attr("class","tick"),$=T.select("line"),D=T.select("text");x=x.merge(x.enter().insert("path",".tick").attr("class","domain").attr("stroke","currentColor")),T=T.merge(_),$=$.merge(_.append("line").attr("stroke","currentColor").attr(u+"2",l*s)),D=D.merge(_.append("text").attr("fill","currentColor").attr(u,l*y).attr("dy",1===t?"0em":3===t?"0.71em":"0.32em")),h!==v&&(x=x.transition(h),T=T.transition(h),$=$.transition(h),D=D.transition(h),w=w.transition(h).attr("opacity",1e-6).attr("transform",function(t){return isFinite(t=b(t))?d(t+c):this.getAttribute("transform")}),_.attr("opacity",1e-6).attr("transform",function(t){var e=this.parentNode.__axis;return d((e&&isFinite(e=e(t))?e:b(t))+c)})),w.remove(),x.attr("d",4===t||2===t?a?"M"+l*a+","+p+"H"+c+"V"+g+"H"+l*a:"M"+c+","+p+"V"+g:a?"M"+p+","+l*a+"V"+c+"H"+g+"V"+l*a:"M"+p+","+c+"H"+g),T.attr("opacity",1).attr("transform",function(t){return d(b(t)+c)}),$.attr(u+"2",l*s),D.attr(u,l*y).text(m),v.filter(N).attr("fill","none").attr("font-size",10).attr("font-family","sans-serif").attr("text-anchor",2===t?"start":4===t?"end":"middle"),v.each(function(){this.__axis=b})}return h.scale=function(t){return arguments.length?(e=t,h):e},h.ticks=function(){return i=Array.from(arguments),h},h.tickArguments=function(t){return arguments.length?(i=null==t?[]:Array.from(t),h):i.slice()},h.tickValues=function(t){return arguments.length?(n=null==t?null:Array.from(t),h):n&&n.slice()},h.tickFormat=function(t){return arguments.length?(r=t,h):r},h.tickSize=function(t){return arguments.length?(s=a=+t,h):s},h.tickSizeInner=function(t){return arguments.length?(s=+t,h):s},h.tickSizeOuter=function(t){return arguments.length?(a=+t,h):a},h.tickPadding=function(t){return arguments.length?(o=+t,h):o},h.offset=function(t){return arguments.length?(c=+t,h):c},h}F(L.default);var B=t.i(1685),H=t.i(97793),j=t.i(233253),R=t.i(847686),V=t.i(80534),G=t.i(516636),U=t.i(97349),U=U,Z=t.i(850051);t.i(10235);var q=function(){var t=function(t,e,i,n){for(i=i||{},n=t.length;n--;i[t[n]]=e);return i},e=[6,8,10,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,30,32,33,35,37],i=[1,25],n=[1,26],r=[1,27],s=[1,28],a=[1,29],o=[1,30],c=[1,31],l=[1,9],u=[1,10],d=[1,11],h=[1,12],f=[1,13],m=[1,14],y=[1,15],k=[1,16],p=[1,18],g=[1,19],b=[1,20],v=[1,21],x=[1,22],T=[1,24],w=[1,32],_={trace:function(){},yy:{},symbols_:{error:2,start:3,gantt:4,document:5,EOF:6,line:7,SPACE:8,statement:9,NL:10,weekday:11,weekday_monday:12,weekday_tuesday:13,weekday_wednesday:14,weekday_thursday:15,weekday_friday:16,weekday_saturday:17,weekday_sunday:18,dateFormat:19,inclusiveEndDates:20,topAxis:21,axisFormat:22,tickInterval:23,excludes:24,includes:25,todayMarker:26,title:27,acc_title:28,acc_title_value:29,acc_descr:30,acc_descr_value:31,acc_descr_multiline_value:32,section:33,clickStatement:34,taskTxt:35,taskData:36,click:37,callbackname:38,callbackargs:39,href:40,clickStatementDebug:41,$accept:0,$end:1},terminals_:{2:"error",4:"gantt",6:"EOF",8:"SPACE",10:"NL",12:"weekday_monday",13:"weekday_tuesday",14:"weekday_wednesday",15:"weekday_thursday",16:"weekday_friday",17:"weekday_saturday",18:"weekday_sunday",19:"dateFormat",20:"inclusiveEndDates",21:"topAxis",22:"axisFormat",23:"tickInterval",24:"excludes",25:"includes",26:"todayMarker",27:"title",28:"acc_title",29:"acc_title_value",30:"acc_descr",31:"acc_descr_value",32:"acc_descr_multiline_value",33:"section",35:"taskTxt",36:"taskData",37:"click",38:"callbackname",39:"callbackargs",40:"href"},productions_:[0,[3,3],[5,0],[5,2],[7,2],[7,1],[7,1],[7,1],[11,1],[11,1],[11,1],[11,1],[11,1],[11,1],[11,1],[9,1],[9,1],[9,1],[9,1],[9,1],[9,1],[9,1],[9,1],[9,1],[9,1],[9,2],[9,2],[9,1],[9,1],[9,1],[9,2],[34,2],[34,3],[34,3],[34,4],[34,3],[34,4],[34,2],[41,2],[41,3],[41,3],[41,4],[41,3],[41,4],[41,2]],performAction:function(t,e,i,n,r,s,a){var o=s.length-1;switch(r){case 1:return s[o-1];case 2:case 6:case 7:this.$=[];break;case 3:s[o-1].push(s[o]),this.$=s[o-1];break;case 4:case 5:this.$=s[o];break;case 8:n.setWeekday("monday");break;case 9:n.setWeekday("tuesday");break;case 10:n.setWeekday("wednesday");break;case 11:n.setWeekday("thursday");break;case 12:n.setWeekday("friday");break;case 13:n.setWeekday("saturday");break;case 14:n.setWeekday("sunday");break;case 15:n.setDateFormat(s[o].substr(11)),this.$=s[o].substr(11);break;case 16:n.enableInclusiveEndDates(),this.$=s[o].substr(18);break;case 17:n.TopAxis(),this.$=s[o].substr(8);break;case 18:n.setAxisFormat(s[o].substr(11)),this.$=s[o].substr(11);break;case 19:n.setTickInterval(s[o].substr(13)),this.$=s[o].substr(13);break;case 20:n.setExcludes(s[o].substr(9)),this.$=s[o].substr(9);break;case 21:n.setIncludes(s[o].substr(9)),this.$=s[o].substr(9);break;case 22:n.setTodayMarker(s[o].substr(12)),this.$=s[o].substr(12);break;case 24:n.setDiagramTitle(s[o].substr(6)),this.$=s[o].substr(6);break;case 25:this.$=s[o].trim(),n.setAccTitle(this.$);break;case 26:case 27:this.$=s[o].trim(),n.setAccDescription(this.$);break;case 28:n.addSection(s[o].substr(8)),this.$=s[o].substr(8);break;case 30:n.addTask(s[o-1],s[o]),this.$="task";break;case 31:this.$=s[o-1],n.setClickEvent(s[o-1],s[o],null);break;case 32:this.$=s[o-2],n.setClickEvent(s[o-2],s[o-1],s[o]);break;case 33:this.$=s[o-2],n.setClickEvent(s[o-2],s[o-1],null),n.setLink(s[o-2],s[o]);break;case 34:this.$=s[o-3],n.setClickEvent(s[o-3],s[o-2],s[o-1]),n.setLink(s[o-3],s[o]);break;case 35:this.$=s[o-2],n.setClickEvent(s[o-2],s[o],null),n.setLink(s[o-2],s[o-1]);break;case 36:this.$=s[o-3],n.setClickEvent(s[o-3],s[o-1],s[o]),n.setLink(s[o-3],s[o-2]);break;case 37:this.$=s[o-1],n.setLink(s[o-1],s[o]);break;case 38:case 44:this.$=s[o-1]+" "+s[o];break;case 39:case 40:case 42:this.$=s[o-2]+" "+s[o-1]+" "+s[o];break;case 41:case 43:this.$=s[o-3]+" "+s[o-2]+" "+s[o-1]+" "+s[o]}},table:[{3:1,4:[1,2]},{1:[3]},t(e,[2,2],{5:3}),{6:[1,4],7:5,8:[1,6],9:7,10:[1,8],11:17,12:i,13:n,14:r,15:s,16:a,17:o,18:c,19:l,20:u,21:d,22:h,23:f,24:m,25:y,26:k,27:p,28:g,30:b,32:v,33:x,34:23,35:T,37:w},t(e,[2,7],{1:[2,1]}),t(e,[2,3]),{9:33,11:17,12:i,13:n,14:r,15:s,16:a,17:o,18:c,19:l,20:u,21:d,22:h,23:f,24:m,25:y,26:k,27:p,28:g,30:b,32:v,33:x,34:23,35:T,37:w},t(e,[2,5]),t(e,[2,6]),t(e,[2,15]),t(e,[2,16]),t(e,[2,17]),t(e,[2,18]),t(e,[2,19]),t(e,[2,20]),t(e,[2,21]),t(e,[2,22]),t(e,[2,23]),t(e,[2,24]),{29:[1,34]},{31:[1,35]},t(e,[2,27]),t(e,[2,28]),t(e,[2,29]),{36:[1,36]},t(e,[2,8]),t(e,[2,9]),t(e,[2,10]),t(e,[2,11]),t(e,[2,12]),t(e,[2,13]),t(e,[2,14]),{38:[1,37],40:[1,38]},t(e,[2,4]),t(e,[2,25]),t(e,[2,26]),t(e,[2,30]),t(e,[2,31],{39:[1,39],40:[1,40]}),t(e,[2,37],{38:[1,41]}),t(e,[2,32],{40:[1,42]}),t(e,[2,33]),t(e,[2,35],{39:[1,43]}),t(e,[2,34]),t(e,[2,36])],defaultActions:{},parseError:function(t,e){if(e.recoverable)this.trace(t);else{var i=Error(t);throw i.hash=e,i}},parse:function(t){var e=this,i=[0],n=[],r=[null],s=[],a=this.table,o="",c=0,l=0,u=s.slice.call(arguments,1),d=Object.create(this.lexer),h={};for(var f in this.yy)Object.prototype.hasOwnProperty.call(this.yy,f)&&(h[f]=this.yy[f]);d.setInput(t,h),h.lexer=d,h.parser=this,void 0===d.yylloc&&(d.yylloc={});var m=d.yylloc;s.push(m);var y=d.options&&d.options.ranges;"function"==typeof h.parseError?this.parseError=h.parseError:this.parseError=Object.getPrototypeOf(this).parseError;for(var k,p,g,b,v,x,T,w,_={};;){if(p=i[i.length-1],this.defaultActions[p]?g=this.defaultActions[p]:(null==k&&(k=function(){var t;return"number"!=typeof(t=n.pop()||d.lex()||1)&&(t instanceof Array&&(t=(n=t).pop()),t=e.symbols_[t]||t),t}()),g=a[p]&&a[p][k]),void 0===g||!g.length||!g[0]){var $="";for(v in w=[],a[p])this.terminals_[v]&&v>2&&w.push("'"+this.terminals_[v]+"'");$=d.showPosition?"Parse error on line "+(c+1)+":\n"+d.showPosition()+"\nExpecting "+w.join(", ")+", got '"+(this.terminals_[k]||k)+"'":"Parse error on line "+(c+1)+": Unexpected "+(1==k?"end of input":"'"+(this.terminals_[k]||k)+"'"),this.parseError($,{text:d.match,token:this.terminals_[k]||k,line:d.yylineno,loc:m,expected:w})}if(g[0]instanceof Array&&g.length>1)throw Error("Parse Error: multiple actions possible at state: "+p+", token: "+k);switch(g[0]){case 1:i.push(k),r.push(d.yytext),s.push(d.yylloc),i.push(g[1]),k=null,l=d.yyleng,o=d.yytext,c=d.yylineno,m=d.yylloc;break;case 2:if(x=this.productions_[g[1]][1],_.$=r[r.length-x],_._$={first_line:s[s.length-(x||1)].first_line,last_line:s[s.length-1].last_line,first_column:s[s.length-(x||1)].first_column,last_column:s[s.length-1].last_column},y&&(_._$.range=[s[s.length-(x||1)].range[0],s[s.length-1].range[1]]),void 0!==(b=this.performAction.apply(_,[o,l,c,h,g[1],r,s].concat(u))))return b;x&&(i=i.slice(0,-1*x*2),r=r.slice(0,-1*x),s=s.slice(0,-1*x)),i.push(this.productions_[g[1]][0]),r.push(_.$),s.push(_._$),T=a[i[i.length-2]][i[i.length-1]],i.push(T);break;case 3:return!0}}return!0}};function $(){this.yy={}}return _.lexer={EOF:1,parseError:function(t,e){if(this.yy.parser)this.yy.parser.parseError(t,e);else throw Error(t)},setInput:function(t,e){return this.yy=e||this.yy||{},this._input=t,this._more=this._backtrack=this.done=!1,this.yylineno=this.yyleng=0,this.yytext=this.matched=this.match="",this.conditionStack=["INITIAL"],this.yylloc={first_line:1,first_column:0,last_line:1,last_column:0},this.options.ranges&&(this.yylloc.range=[0,0]),this.offset=0,this},input:function(){var t=this._input[0];return this.yytext+=t,this.yyleng++,this.offset++,this.match+=t,this.matched+=t,t.match(/(?:\r\n?|\n).*/g)?(this.yylineno++,this.yylloc.last_line++):this.yylloc.last_column++,this.options.ranges&&this.yylloc.range[1]++,this._input=this._input.slice(1),t},unput:function(t){var e=t.length,i=t.split(/(?:\r\n?|\n)/g);this._input=t+this._input,this.yytext=this.yytext.substr(0,this.yytext.length-e),this.offset-=e;var n=this.match.split(/(?:\r\n?|\n)/g);this.match=this.match.substr(0,this.match.length-1),this.matched=this.matched.substr(0,this.matched.length-1),i.length-1&&(this.yylineno-=i.length-1);var r=this.yylloc.range;return this.yylloc={first_line:this.yylloc.first_line,last_line:this.yylineno+1,first_column:this.yylloc.first_column,last_column:i?(i.length===n.length?this.yylloc.first_column:0)+n[n.length-i.length].length-i[0].length:this.yylloc.first_column-e},this.options.ranges&&(this.yylloc.range=[r[0],r[0]+this.yyleng-e]),this.yyleng=this.yytext.length,this},more:function(){return this._more=!0,this},reject:function(){return this.options.backtrack_lexer?(this._backtrack=!0,this):this.parseError("Lexical error on line "+(this.yylineno+1)+". You can only invoke reject() in the lexer when the lexer is of the backtracking persuasion (options.backtrack_lexer = true).\n"+this.showPosition(),{text:"",token:null,line:this.yylineno})},less:function(t){this.unput(this.match.slice(t))},pastInput:function(){var t=this.matched.substr(0,this.matched.length-this.match.length);return(t.length>20?"...":"")+t.substr(-20).replace(/\n/g,"")},upcomingInput:function(){var t=this.match;return t.length<20&&(t+=this._input.substr(0,20-t.length)),(t.substr(0,20)+(t.length>20?"...":"")).replace(/\n/g,"")},showPosition:function(){var t=this.pastInput(),e=Array(t.length+1).join("-");return t+this.upcomingInput()+"\n"+e+"^"},test_match:function(t,e){var i,n,r;if(this.options.backtrack_lexer&&(r={yylineno:this.yylineno,yylloc:{first_line:this.yylloc.first_line,last_line:this.last_line,first_column:this.yylloc.first_column,last_column:this.yylloc.last_column},yytext:this.yytext,match:this.match,matches:this.matches,matched:this.matched,yyleng:this.yyleng,offset:this.offset,_more:this._more,_input:this._input,yy:this.yy,conditionStack:this.conditionStack.slice(0),done:this.done},this.options.ranges&&(r.yylloc.range=this.yylloc.range.slice(0))),(n=t[0].match(/(?:\r\n?|\n).*/g))&&(this.yylineno+=n.length),this.yylloc={first_line:this.yylloc.last_line,last_line:this.yylineno+1,first_column:this.yylloc.last_column,last_column:n?n[n.length-1].length-n[n.length-1].match(/\r?\n?/)[0].length:this.yylloc.last_column+t[0].length},this.yytext+=t[0],this.match+=t[0],this.matches=t,this.yyleng=this.yytext.length,this.options.ranges&&(this.yylloc.range=[this.offset,this.offset+=this.yyleng]),this._more=!1,this._backtrack=!1,this._input=this._input.slice(t[0].length),this.matched+=t[0],i=this.performAction.call(this,this.yy,this,e,this.conditionStack[this.conditionStack.length-1]),this.done&&this._input&&(this.done=!1),i)return i;if(this._backtrack)for(var s in r)this[s]=r[s];return!1},next:function(){if(this.done)return this.EOF;this._input||(this.done=!0),this._more||(this.yytext="",this.match="");for(var t,e,i,n,r=this._currentRules(),s=0;s<r.length;s++)if((i=this._input.match(this.rules[r[s]]))&&(!e||i[0].length>e[0].length)){if(e=i,n=s,this.options.backtrack_lexer){if(!1!==(t=this.test_match(i,r[s])))return t;if(!this._backtrack)return!1;e=!1;continue}if(!this.options.flex)break}return e?!1!==(t=this.test_match(e,r[n]))&&t:""===this._input?this.EOF:this.parseError("Lexical error on line "+(this.yylineno+1)+". Unrecognized text.\n"+this.showPosition(),{text:"",token:null,line:this.yylineno})},lex:function(){var t=this.next();return t||this.lex()},begin:function(t){this.conditionStack.push(t)},popState:function(){return this.conditionStack.length-1>0?this.conditionStack.pop():this.conditionStack[0]},_currentRules:function(){return this.conditionStack.length&&this.conditionStack[this.conditionStack.length-1]?this.conditions[this.conditionStack[this.conditionStack.length-1]].rules:this.conditions.INITIAL.rules},topState:function(t){return(t=this.conditionStack.length-1-Math.abs(t||0))>=0?this.conditionStack[t]:"INITIAL"},pushState:function(t){this.begin(t)},stateStackSize:function(){return this.conditionStack.length},options:{"case-insensitive":!0},performAction:function(t,e,i,n){switch(i){case 0:return this.begin("open_directive"),"open_directive";case 1:return this.begin("acc_title"),28;case 2:return this.popState(),"acc_title_value";case 3:return this.begin("acc_descr"),30;case 4:return this.popState(),"acc_descr_value";case 5:this.begin("acc_descr_multiline");break;case 6:case 15:case 18:case 21:case 24:this.popState();break;case 7:return"acc_descr_multiline_value";case 8:case 9:case 10:case 12:case 13:break;case 11:return 10;case 14:this.begin("href");break;case 16:return 40;case 17:this.begin("callbackname");break;case 19:this.popState(),this.begin("callbackargs");break;case 20:return 38;case 22:return 39;case 23:this.begin("click");break;case 25:return 37;case 26:return 4;case 27:return 19;case 28:return 20;case 29:return 21;case 30:return 22;case 31:return 23;case 32:return 25;case 33:return 24;case 34:return 26;case 35:return 12;case 36:return 13;case 37:return 14;case 38:return 15;case 39:return 16;case 40:return 17;case 41:return 18;case 42:return"date";case 43:return 27;case 44:return"accDescription";case 45:return 33;case 46:return 35;case 47:return 36;case 48:return":";case 49:return 6;case 50:return"INVALID"}},rules:[/^(?:%%\{)/i,/^(?:accTitle\s*:\s*)/i,/^(?:(?!\n||)*[^\n]*)/i,/^(?:accDescr\s*:\s*)/i,/^(?:(?!\n||)*[^\n]*)/i,/^(?:accDescr\s*\{\s*)/i,/^(?:[\}])/i,/^(?:[^\}]*)/i,/^(?:%%(?!\{)*[^\n]*)/i,/^(?:[^\}]%%*[^\n]*)/i,/^(?:%%*[^\n]*[\n]*)/i,/^(?:[\n]+)/i,/^(?:\s+)/i,/^(?:%[^\n]*)/i,/^(?:href[\s]+["])/i,/^(?:["])/i,/^(?:[^"]*)/i,/^(?:call[\s]+)/i,/^(?:\([\s]*\))/i,/^(?:\()/i,/^(?:[^(]*)/i,/^(?:\))/i,/^(?:[^)]*)/i,/^(?:click[\s]+)/i,/^(?:[\s\n])/i,/^(?:[^\s\n]*)/i,/^(?:gantt\b)/i,/^(?:dateFormat\s[^#\n;]+)/i,/^(?:inclusiveEndDates\b)/i,/^(?:topAxis\b)/i,/^(?:axisFormat\s[^#\n;]+)/i,/^(?:tickInterval\s[^#\n;]+)/i,/^(?:includes\s[^#\n;]+)/i,/^(?:excludes\s[^#\n;]+)/i,/^(?:todayMarker\s[^\n;]+)/i,/^(?:weekday\s+monday\b)/i,/^(?:weekday\s+tuesday\b)/i,/^(?:weekday\s+wednesday\b)/i,/^(?:weekday\s+thursday\b)/i,/^(?:weekday\s+friday\b)/i,/^(?:weekday\s+saturday\b)/i,/^(?:weekday\s+sunday\b)/i,/^(?:\d\d\d\d-\d\d-\d\d\b)/i,/^(?:title\s[^\n]+)/i,/^(?:accDescription\s[^#\n;]+)/i,/^(?:section\s[^\n]+)/i,/^(?:[^:\n]+)/i,/^(?::[^#\n;]+)/i,/^(?::)/i,/^(?:$)/i,/^(?:.)/i],conditions:{acc_descr_multiline:{rules:[6,7],inclusive:!1},acc_descr:{rules:[4],inclusive:!1},acc_title:{rules:[2],inclusive:!1},callbackargs:{rules:[21,22],inclusive:!1},callbackname:{rules:[18,19,20],inclusive:!1},href:{rules:[15,16],inclusive:!1},click:{rules:[24,25],inclusive:!1},INITIAL:{rules:[0,1,3,5,8,9,10,11,12,13,14,17,23,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50],inclusive:!0}}},$.prototype=_,_.Parser=$,new $}();q.parser=q,a.default.extend(o.default),a.default.extend(c.default),a.default.extend(l.default);let Q="",X="",K="",J=[],tt=[],te={},ti=[],tn=[],tr="",ts="",ta=["active","done","crit","milestone"],to=[],tc=!1,tl=!1,tu="sunday",td=0,th=function(t,e,i,n){return!n.includes(t.format(e.trim()))&&(!!(t.isoWeekday()>=6&&i.includes("weekends")||i.includes(t.format("dddd").toLowerCase()))||i.includes(t.format(e.trim())))},tf=function(t,e,i,n){let r;if(!i.length||t.manualEndTime)return;let[s,o]=tm(r=(r=t.startTime instanceof Date?(0,a.default)(t.startTime):(0,a.default)(t.startTime,e,!0)).add(1,"d"),t.endTime instanceof Date?(0,a.default)(t.endTime):(0,a.default)(t.endTime,e,!0),e,i,n);t.endTime=s.toDate(),t.renderEndTime=o},tm=function(t,e,i,n,r){let s=!1,a=null,o=e.add(1e4,"d");for(;t<=e;){if(s||(a=e.toDate()),(s=th(t,i,n,r))&&(e=e.add(1,"d"))>o)throw Error("Failed to find a valid date that was not excluded by `excludes` after 10,000 iterations.");t=t.add(1,"d")}return[e,a]},ty=function(t,e,i){i=i.trim();let n=/^after\s+(?<ids>[\d\w- ]+)/.exec(i);if(null!==n){let t=null;for(let e of n.groups.ids.split(" ")){let i=t_(e);void 0!==i&&(!t||i.endTime>t.endTime)&&(t=i)}if(t)return t.endTime;let e=new Date;return e.setHours(0,0,0,0),e}let r=(0,a.default)(i,e.trim(),!0);if(r.isValid())return r.toDate();{u.l.debug("Invalid date:"+i),u.l.debug("With date format:"+e.trim());let t=new Date(i);if(void 0===t||isNaN(t.getTime())||-1e4>t.getFullYear()||t.getFullYear()>1e4)throw Error("Invalid date:"+i);return t}},tk=function(t){let e=/^(\d+(?:\.\d+)?)([Mdhmswy]|ms)$/.exec(t.trim());return null!==e?[Number.parseFloat(e[1]),e[2]]:[NaN,"ms"]},tp=function(t,e,i,n=!1){i=i.trim();let r=/^until\s+(?<ids>[\d\w- ]+)/.exec(i);if(null!==r){let t=null;for(let e of r.groups.ids.split(" ")){let i=t_(e);void 0!==i&&(!t||i.startTime<t.startTime)&&(t=i)}if(t)return t.startTime;let e=new Date;return e.setHours(0,0,0,0),e}let s=(0,a.default)(i,e.trim(),!0);if(s.isValid())return n&&(s=s.add(1,"d")),s.toDate();let o=(0,a.default)(t),[c,l]=tk(i);if(!Number.isNaN(c)){let t=o.add(c,l);t.isValid()&&(o=t)}return o.toDate()},tg=0,tb=function(t){return void 0===t?"task"+(tg+=1):t},tv=function(t,e){let i=(":"===e.substr(0,1)?e.substr(1,e.length):e).split(","),n={};tA(i,n,ta);for(let t=0;t<i.length;t++)i[t]=i[t].trim();let r="";switch(i.length){case 1:n.id=tb(),n.startTime=t.endTime,r=i[0];break;case 2:n.id=tb(),n.startTime=ty(void 0,Q,i[0]),r=i[1];break;case 3:n.id=tb(i[0]),n.startTime=ty(void 0,Q,i[1]),r=i[2]}return r&&(n.endTime=tp(n.startTime,Q,r,tc),n.manualEndTime=(0,a.default)(r,"YYYY-MM-DD",!0).isValid(),tf(n,Q,tt,J)),n},tx=function(t,e){let i=(":"===e.substr(0,1)?e.substr(1,e.length):e).split(","),n={};tA(i,n,ta);for(let t=0;t<i.length;t++)i[t]=i[t].trim();switch(i.length){case 1:n.id=tb(),n.startTime={type:"prevTaskEnd",id:t},n.endTime={data:i[0]};break;case 2:n.id=tb(),n.startTime={type:"getStartDate",startData:i[0]},n.endTime={data:i[1]};break;case 3:n.id=tb(i[0]),n.startTime={type:"getStartDate",startData:i[1]},n.endTime={data:i[2]}}return n},tT=[],tw={},t_=function(t){return tT[tw[t]]},t$=function(){let t=!0;for(let[e,i]of tT.entries())!function(t){let e=tT[t],i="";switch(tT[t].raw.startTime.type){case"prevTaskEnd":{let t=t_(e.prevTaskId);e.startTime=t.endTime;break}case"getStartDate":(i=ty(void 0,Q,tT[t].raw.startTime.startData))&&(tT[t].startTime=i)}tT[t].startTime&&(tT[t].endTime=tp(tT[t].startTime,Q,tT[t].raw.endTime.data,tc),tT[t].endTime&&(tT[t].processed=!0,tT[t].manualEndTime=(0,a.default)(tT[t].raw.endTime.data,"YYYY-MM-DD",!0).isValid(),tf(tT[t],Q,tt,J))),tT[t].processed}(e),t=t&&i.processed;return t},tD=function(t,e){t.split(",").forEach(function(t){let i=t_(t);void 0!==i&&i.classes.push(e)})},tC=function(t,e,i){if("loose"!==(0,u.c)().securityLevel||void 0===e)return;let n=[];if("string"==typeof i){n=i.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);for(let t=0;t<n.length;t++){let e=n[t].trim();'"'===e.charAt(0)&&'"'===e.charAt(e.length-1)&&(e=e.substr(1,e.length-2)),n[t]=e}}0===n.length&&n.push(t),void 0!==t_(t)&&tS(t,()=>{u.u.runFunc(e,...n)})},tS=function(t,e){to.push(function(){let i=document.querySelector(`[id="${t}"]`);null!==i&&i.addEventListener("click",function(){e()})},function(){let i=document.querySelector(`[id="${t}-text"]`);null!==i&&i.addEventListener("click",function(){e()})})},tM={getConfig:()=>(0,u.c)().gantt,clear:function(){ti=[],tn=[],tr="",to=[],tg=0,e=void 0,i=void 0,tT=[],Q="",X="",ts="",r=void 0,K="",J=[],tt=[],tc=!1,tl=!1,td=0,te={},(0,u.v)(),tu="sunday"},setDateFormat:function(t){Q=t},getDateFormat:function(){return Q},enableInclusiveEndDates:function(){tc=!0},endDatesAreInclusive:function(){return tc},enableTopAxis:function(){tl=!0},topAxisEnabled:function(){return tl},setAxisFormat:function(t){X=t},getAxisFormat:function(){return X},setTickInterval:function(t){r=t},getTickInterval:function(){return r},setTodayMarker:function(t){K=t},getTodayMarker:function(){return K},setAccTitle:u.s,getAccTitle:u.g,setDiagramTitle:u.q,getDiagramTitle:u.t,setDisplayMode:function(t){ts=t},getDisplayMode:function(){return ts},setAccDescription:u.b,getAccDescription:u.a,addSection:function(t){tr=t,ti.push(t)},getSections:function(){return ti},getTasks:function(){let t=t$(),e=0;for(;!t&&e<10;)t=t$(),e++;return tn=tT},addTask:function(t,e){let n={section:tr,type:tr,processed:!1,manualEndTime:!1,renderEndTime:null,raw:{data:e},task:t,classes:[]},r=tx(i,e);n.raw.startTime=r.startTime,n.raw.endTime=r.endTime,n.id=r.id,n.prevTaskId=i,n.active=r.active,n.done=r.done,n.crit=r.crit,n.milestone=r.milestone,n.order=td,td++;let s=tT.push(n);i=n.id,tw[n.id]=s-1},findTaskById:t_,addTaskOrg:function(t,i){let n={section:tr,type:tr,description:t,task:t,classes:[]},r=tv(e,i);n.startTime=r.startTime,n.endTime=r.endTime,n.id=r.id,n.active=r.active,n.done=r.done,n.crit=r.crit,n.milestone=r.milestone,e=n,tn.push(n)},setIncludes:function(t){J=t.toLowerCase().split(/[\s,]+/)},getIncludes:function(){return J},setExcludes:function(t){tt=t.toLowerCase().split(/[\s,]+/)},getExcludes:function(){return tt},setClickEvent:function(t,e,i){t.split(",").forEach(function(t){tC(t,e,i)}),tD(t,"clickable")},setLink:function(t,e){let i=e;"loose"!==(0,u.c)().securityLevel&&(i=(0,s.sanitizeUrl)(e)),t.split(",").forEach(function(t){void 0!==t_(t)&&(tS(t,()=>{window.open(i,"_self")}),te[t]=i)}),tD(t,"clickable")},getLinks:function(){return te},bindFunctions:function(t){to.forEach(function(e){e(t)})},parseDuration:tk,isInvalidDate:th,setWeekday:function(t){tu=t},getWeekday:function(){return tu}};function tA(t,e,i){let n=!0;for(;n;)n=!1,i.forEach(function(i){let r=RegExp("^\\s*"+i+"\\s*$");t[0].match(r)&&(e[i]=!0,t.shift(1),n=!0)})}let tE={monday:Z.timeMonday,tuesday:Z.timeTuesday,wednesday:Z.timeWednesday,thursday:Z.timeThursday,friday:Z.timeFriday,saturday:Z.timeSaturday,sunday:Z.timeSunday},tY=(t,e)=>{let i=[...t].map(()=>-1/0),n=[...t].sort((t,e)=>t.startTime-e.startTime||t.order-e.order),r=0;for(let t of n)for(let n=0;n<i.length;n++)if(t.startTime>=i[n]){i[n]=t.endTime,t.order=n+e,n>r&&(r=n);break}return r};t.s(["diagram",0,{parser:q,db:tM,renderer:{setConf:function(){u.l.debug("Something is calling, setConf, remove the call")},draw:function(t,e,i,r){var s,o,c,l,k;let p,g,b,v,x,T,w,_,$=(0,u.c)().gantt,D=(0,u.c)().securityLevel;"sandbox"===D&&(_=(0,d.select)("#i"+e));let C="sandbox"===D?(0,d.select)(_.nodes()[0].contentDocument.body):(0,d.select)("body"),S="sandbox"===D?_.nodes()[0].contentDocument:document,M=S.getElementById(e);void 0===(n=M.parentElement.offsetWidth)&&(n=1200),void 0!==$.useWidth&&(n=$.useWidth);let A=r.db.getTasks(),E=[];for(let t of A)E.push(t.type);E=function(t){let e={},i=[];for(let n=0,r=t.length;n<r;++n)Object.prototype.hasOwnProperty.call(e,t[n])||(e[t[n]]=!0,i.push(t[n]));return i}(E);let Y={},L=2*$.topPadding;if("compact"===r.db.getDisplayMode()||"compact"===$.displayMode){let t={};for(let e of A)void 0===t[e.section]?t[e.section]=[e]:t[e.section].push(e);let e=0;for(let i of Object.keys(t)){let n=tY(t[i],e)+1;e+=n,L+=n*($.barHeight+$.barGap),Y[i]=n}}else for(let t of(L+=A.length*($.barHeight+$.barGap),E))Y[t]=A.filter(e=>e.type===t).length;M.setAttribute("viewBox","0 0 "+n+" "+L);let F=C.select(`[id="${e}"]`),O=(0,h.default)().domain([(0,f.default)(A,function(t){return t.startTime}),(0,m.default)(A,function(t){return t.endTime})]).rangeRound([0,n-$.leftPadding-$.rightPadding]);A.sort(function(t,e){let i=t.startTime,n=e.startTime,r=0;return i>n?r=1:i<n&&(r=-1),r}),s=A,o=n,c=L,g=(p=$.barHeight)+$.barGap,b=$.topPadding,v=$.leftPadding,x=(0,y.scaleLinear)().domain([0,E.length]).range(["#00B9FA","#F95002"]).interpolate(I),function(t,e,i,n,s,o,c){let l,d;if(0===o.length&&0===c.length)return;for(let{startTime:t,endTime:e}of s)(void 0===l||t<l)&&(l=t),(void 0===d||e>d)&&(d=e);if(!l||!d)return;if((0,a.default)(d).diff((0,a.default)(l),"year")>5)return u.l.warn("The difference between the min and max time is more than 5 years. This will cause performance issues. Skipping drawing exclude days.");let h=r.db.getDateFormat(),f=[],m=null,y=(0,a.default)(l);for(;y.valueOf()<=d;)r.db.isInvalidDate(y,h,o,c)?m?m.end=y:m={start:y,end:y}:m&&(f.push(m),m=null),y=y.add(1,"d");F.append("g").selectAll("rect").data(f).enter().append("rect").attr("id",function(t){return"exclude-"+t.start.format("YYYY-MM-DD")}).attr("x",function(t){return O(t.start)+i}).attr("y",$.gridLineStartPadding).attr("width",function(t){return O(t.end.add(1,"day"))-O(t.start)}).attr("height",n-e-$.gridLineStartPadding).attr("transform-origin",function(e,r){return(O(e.start)+i+.5*(O(e.end)-O(e.start))).toString()+"px "+(r*t+.5*n).toString()+"px"}).attr("class","exclude-range")}(g,b,v,c,s,r.db.getExcludes(),r.db.getIncludes()),function(t,e,i){let n=z(3,O).tickSize(-i+e+$.gridLineStartPadding).tickFormat((0,B.timeFormat)(r.db.getAxisFormat()||$.axisFormat||"%Y-%m-%d")),s=/^([1-9]\d*)(millisecond|second|minute|hour|day|week|month)$/.exec(r.db.getTickInterval()||$.tickInterval);if(null!==s){let t=s[1],e=s[2],i=r.db.getWeekday()||$.weekday;switch(e){case"millisecond":n.ticks(U.millisecond.every(t));break;case"second":n.ticks(G.timeSecond.every(t));break;case"minute":n.ticks(V.timeMinute.every(t));break;case"hour":n.ticks(R.timeHour.every(t));break;case"day":n.ticks(j.timeDay.every(t));break;case"week":n.ticks(tE[i].every(t));break;case"month":n.ticks(H.timeMonth.every(t))}}if(F.append("g").attr("class","grid").attr("transform","translate("+t+", "+(i-50)+")").call(n).selectAll("text").style("text-anchor","middle").attr("fill","#000").attr("stroke","none").attr("font-size",10).attr("dy","1em"),r.db.topAxisEnabled()||$.topAxis){let n=z(1,O).tickSize(-i+e+$.gridLineStartPadding).tickFormat((0,B.timeFormat)(r.db.getAxisFormat()||$.axisFormat||"%Y-%m-%d"));if(null!==s){let t=s[1],e=s[2],i=r.db.getWeekday()||$.weekday;switch(e){case"millisecond":n.ticks(U.millisecond.every(t));break;case"second":n.ticks(G.timeSecond.every(t));break;case"minute":n.ticks(V.timeMinute.every(t));break;case"hour":n.ticks(R.timeHour.every(t));break;case"day":n.ticks(j.timeDay.every(t));break;case"week":n.ticks(tE[i].every(t));break;case"month":n.ticks(H.timeMonth.every(t))}}F.append("g").attr("class","grid").attr("transform","translate("+t+", "+e+")").call(n).selectAll("text").style("text-anchor","middle").attr("fill","#000").attr("stroke","none").attr("font-size",10)}}(v,b,c),function(t,i,n,s,a,o){let c=[...new Set(t.map(t=>t.order))].map(e=>t.find(t=>t.order===e));F.append("g").selectAll("rect").data(c).enter().append("rect").attr("x",0).attr("y",function(t,e){return t.order*i+n-2}).attr("width",function(){return o-$.rightPadding/2}).attr("height",i).attr("class",function(t){for(let[e,i]of E.entries())if(t.type===i)return"section section"+e%$.numberSectionStyles;return"section section0"});let l=F.append("g").selectAll("rect").data(t).enter(),h=r.db.getLinks();if(l.append("rect").attr("id",function(t){return t.id}).attr("rx",3).attr("ry",3).attr("x",function(t){return t.milestone?O(t.startTime)+s+.5*(O(t.endTime)-O(t.startTime))-.5*a:O(t.startTime)+s}).attr("y",function(t,e){return t.order*i+n}).attr("width",function(t){return t.milestone?a:O(t.renderEndTime||t.endTime)-O(t.startTime)}).attr("height",a).attr("transform-origin",function(t,e){return e=t.order,(O(t.startTime)+s+.5*(O(t.endTime)-O(t.startTime))).toString()+"px "+(e*i+n+.5*a).toString()+"px"}).attr("class",function(t){let e="";t.classes.length>0&&(e=t.classes.join(" "));let i=0;for(let[e,n]of E.entries())t.type===n&&(i=e%$.numberSectionStyles);let n="";return t.active?t.crit?n+=" activeCrit":n=" active":t.done?n=t.crit?" doneCrit":" done":t.crit&&(n+=" crit"),0===n.length&&(n=" task"),t.milestone&&(n=" milestone "+n),n+=i,"task"+(n+=" "+e)}),l.append("text").attr("id",function(t){return t.id+"-text"}).text(function(t){return t.task}).attr("font-size",$.fontSize).attr("x",function(t){let e=O(t.startTime),i=O(t.renderEndTime||t.endTime);t.milestone&&(e+=.5*(O(t.endTime)-O(t.startTime))-.5*a),t.milestone&&(i=e+a);let n=this.getBBox().width;return n>i-e?i+n+1.5*$.leftPadding>o?e+s-5:i+s+5:(i-e)/2+e+s}).attr("y",function(t,e){return t.order*i+$.barHeight/2+($.fontSize/2-2)+n}).attr("text-height",a).attr("class",function(t){let e=O(t.startTime),i=O(t.endTime);t.milestone&&(i=e+a);let n=this.getBBox().width,r="";t.classes.length>0&&(r=t.classes.join(" "));let s=0;for(let[e,i]of E.entries())t.type===i&&(s=e%$.numberSectionStyles);let c="";return(t.active&&(c=t.crit?"activeCritText"+s:"activeText"+s),t.done?c=t.crit?c+" doneCritText"+s:c+" doneText"+s:t.crit&&(c=c+" critText"+s),t.milestone&&(c+=" milestoneText"),n>i-e)?i+n+1.5*$.leftPadding>o?r+" taskTextOutsideLeft taskTextOutside"+s+" "+c:r+" taskTextOutsideRight taskTextOutside"+s+" "+c+" width-"+n:r+" taskText taskText"+s+" "+c+" width-"+n}),"sandbox"===(0,u.c)().securityLevel){let t=(0,d.select)("#i"+e).nodes()[0].contentDocument;l.filter(function(t){return void 0!==h[t.id]}).each(function(e){var i=t.querySelector("#"+e.id),n=t.querySelector("#"+e.id+"-text");let r=i.parentNode;var s=t.createElement("a");s.setAttribute("xlink:href",h[e.id]),s.setAttribute("target","_top"),r.appendChild(s),s.appendChild(i),s.appendChild(n)})}}(s,g,b,v,p,o),l=g,k=b,T=0,w=Object.keys(Y).map(t=>[t,Y[t]]),F.append("g").selectAll("text").data(w).enter().append(function(t){let e=t[0].split(u.e.lineBreakRegex),i=-(e.length-1)/2,n=S.createElementNS("http://www.w3.org/2000/svg","text");for(let[t,r]of(n.setAttribute("dy",i+"em"),e.entries())){let e=S.createElementNS("http://www.w3.org/2000/svg","tspan");e.setAttribute("alignment-baseline","central"),e.setAttribute("x","10"),t>0&&e.setAttribute("dy","1em"),e.textContent=r,n.appendChild(e)}return n}).attr("x",10).attr("y",function(t,e){if(!(e>0))return t[1]*l/2+k;for(let i=0;i<e;i++)return T+=w[e-1][1],t[1]*l/2+T*l+k}).attr("font-size",$.sectionFontSize).attr("class",function(t){for(let[e,i]of E.entries())if(t[0]===i)return"sectionTitle sectionTitle"+e%$.numberSectionStyles;return"sectionTitle"}),function(t,e){let i=r.db.getTodayMarker();if("off"===i)return;let n=F.append("g").attr("class","today"),s=new Date,a=n.append("line");a.attr("x1",O(s)+t).attr("x2",O(s)+t).attr("y1",$.titleTopMargin).attr("y2",e-$.titleTopMargin).attr("class","today"),""!==i&&a.attr("style",i.replace(/,/g,";"))}(v,c),(0,u.i)(F,L,n,$.useMaxWidth),F.append("text").text(r.db.getDiagramTitle()).attr("x",n/2).attr("y",$.titleTopMargin).attr("class","titleText")}},styles:t=>`
  .mermaid-main-font {
    font-family: var(--mermaid-font-family, "trebuchet ms", verdana, arial, sans-serif);
  }

  .exclude-range {
    fill: ${t.excludeBkgColor};
  }

  .section {
    stroke: none;
    opacity: 0.2;
  }

  .section0 {
    fill: ${t.sectionBkgColor};
  }

  .section2 {
    fill: ${t.sectionBkgColor2};
  }

  .section1,
  .section3 {
    fill: ${t.altSectionBkgColor};
    opacity: 0.2;
  }

  .sectionTitle0 {
    fill: ${t.titleColor};
  }

  .sectionTitle1 {
    fill: ${t.titleColor};
  }

  .sectionTitle2 {
    fill: ${t.titleColor};
  }

  .sectionTitle3 {
    fill: ${t.titleColor};
  }

  .sectionTitle {
    text-anchor: start;
    font-family: var(--mermaid-font-family, "trebuchet ms", verdana, arial, sans-serif);
  }


  /* Grid and axis */

  .grid .tick {
    stroke: ${t.gridColor};
    opacity: 0.8;
    shape-rendering: crispEdges;
  }

  .grid .tick text {
    font-family: ${t.fontFamily};
    fill: ${t.textColor};
  }

  .grid path {
    stroke-width: 0;
  }


  /* Today line */

  .today {
    fill: none;
    stroke: ${t.todayLineColor};
    stroke-width: 2px;
  }


  /* Task styling */

  /* Default task */

  .task {
    stroke-width: 2;
  }

  .taskText {
    text-anchor: middle;
    font-family: var(--mermaid-font-family, "trebuchet ms", verdana, arial, sans-serif);
  }

  .taskTextOutsideRight {
    fill: ${t.taskTextDarkColor};
    text-anchor: start;
    font-family: var(--mermaid-font-family, "trebuchet ms", verdana, arial, sans-serif);
  }

  .taskTextOutsideLeft {
    fill: ${t.taskTextDarkColor};
    text-anchor: end;
  }


  /* Special case clickable */

  .task.clickable {
    cursor: pointer;
  }

  .taskText.clickable {
    cursor: pointer;
    fill: ${t.taskTextClickableColor} !important;
    font-weight: bold;
  }

  .taskTextOutsideLeft.clickable {
    cursor: pointer;
    fill: ${t.taskTextClickableColor} !important;
    font-weight: bold;
  }

  .taskTextOutsideRight.clickable {
    cursor: pointer;
    fill: ${t.taskTextClickableColor} !important;
    font-weight: bold;
  }


  /* Specific task settings for the sections*/

  .taskText0,
  .taskText1,
  .taskText2,
  .taskText3 {
    fill: ${t.taskTextColor};
  }

  .task0,
  .task1,
  .task2,
  .task3 {
    fill: ${t.taskBkgColor};
    stroke: ${t.taskBorderColor};
  }

  .taskTextOutside0,
  .taskTextOutside2
  {
    fill: ${t.taskTextOutsideColor};
  }

  .taskTextOutside1,
  .taskTextOutside3 {
    fill: ${t.taskTextOutsideColor};
  }


  /* Active task */

  .active0,
  .active1,
  .active2,
  .active3 {
    fill: ${t.activeTaskBkgColor};
    stroke: ${t.activeTaskBorderColor};
  }

  .activeText0,
  .activeText1,
  .activeText2,
  .activeText3 {
    fill: ${t.taskTextDarkColor} !important;
  }


  /* Completed task */

  .done0,
  .done1,
  .done2,
  .done3 {
    stroke: ${t.doneTaskBorderColor};
    fill: ${t.doneTaskBkgColor};
    stroke-width: 2;
  }

  .doneText0,
  .doneText1,
  .doneText2,
  .doneText3 {
    fill: ${t.taskTextDarkColor} !important;
  }


  /* Tasks on the critical line */

  .crit0,
  .crit1,
  .crit2,
  .crit3 {
    stroke: ${t.critBorderColor};
    fill: ${t.critBkgColor};
    stroke-width: 2;
  }

  .activeCrit0,
  .activeCrit1,
  .activeCrit2,
  .activeCrit3 {
    stroke: ${t.critBorderColor};
    fill: ${t.activeTaskBkgColor};
    stroke-width: 2;
  }

  .doneCrit0,
  .doneCrit1,
  .doneCrit2,
  .doneCrit3 {
    stroke: ${t.critBorderColor};
    fill: ${t.doneTaskBkgColor};
    stroke-width: 2;
    cursor: pointer;
    shape-rendering: crispEdges;
  }

  .milestone {
    transform: rotate(45deg) scale(0.8,0.8);
  }

  .milestoneText {
    font-style: italic;
  }
  .doneCritText0,
  .doneCritText1,
  .doneCritText2,
  .doneCritText3 {
    fill: ${t.taskTextDarkColor} !important;
  }

  .activeCritText0,
  .activeCritText1,
  .activeCritText2,
  .activeCritText3 {
    fill: ${t.taskTextDarkColor} !important;
  }

  .titleText {
    text-anchor: middle;
    font-size: 18px;
    fill: ${t.titleColor||t.textColor};
    font-family: var(--mermaid-font-family, "trebuchet ms", verdana, arial, sans-serif);
  }
`}],322372)}]);
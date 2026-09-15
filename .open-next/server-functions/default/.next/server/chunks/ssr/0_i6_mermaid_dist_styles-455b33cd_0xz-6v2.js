module.exports=[314420,a=>{"use strict";var b=a.i(221021),c=function(){var a=function(a,b,c,d){for(c=c||{},d=a.length;d--;c[a[d]]=b);return c},b=[1,2],c=[1,3],d=[1,4],e=[2,4],f=[1,9],g=[1,11],h=[1,15],i=[1,16],j=[1,17],k=[1,18],l=[1,30],m=[1,19],n=[1,20],o=[1,21],p=[1,22],q=[1,23],r=[1,25],s=[1,26],t=[1,27],u=[1,28],v=[1,29],w=[1,32],x=[1,33],y=[1,34],z=[1,35],A=[1,31],B=[1,4,5,15,16,18,20,21,23,24,25,26,27,28,32,34,36,37,41,44,45,46,47,50],C=[1,4,5,13,14,15,16,18,20,21,23,24,25,26,27,28,32,34,36,37,41,44,45,46,47,50],D=[4,5,15,16,18,20,21,23,24,25,26,27,28,32,34,36,37,41,44,45,46,47,50],E={trace:function(){},yy:{},symbols_:{error:2,start:3,SPACE:4,NL:5,SD:6,document:7,line:8,statement:9,classDefStatement:10,cssClassStatement:11,idStatement:12,DESCR:13,"-->":14,HIDE_EMPTY:15,scale:16,WIDTH:17,COMPOSIT_STATE:18,STRUCT_START:19,STRUCT_STOP:20,STATE_DESCR:21,AS:22,ID:23,FORK:24,JOIN:25,CHOICE:26,CONCURRENT:27,note:28,notePosition:29,NOTE_TEXT:30,direction:31,acc_title:32,acc_title_value:33,acc_descr:34,acc_descr_value:35,acc_descr_multiline_value:36,classDef:37,CLASSDEF_ID:38,CLASSDEF_STYLEOPTS:39,DEFAULT:40,class:41,CLASSENTITY_IDS:42,STYLECLASS:43,direction_tb:44,direction_bt:45,direction_rl:46,direction_lr:47,eol:48,";":49,EDGE_STATE:50,STYLE_SEPARATOR:51,left_of:52,right_of:53,$accept:0,$end:1},terminals_:{2:"error",4:"SPACE",5:"NL",6:"SD",13:"DESCR",14:"-->",15:"HIDE_EMPTY",16:"scale",17:"WIDTH",18:"COMPOSIT_STATE",19:"STRUCT_START",20:"STRUCT_STOP",21:"STATE_DESCR",22:"AS",23:"ID",24:"FORK",25:"JOIN",26:"CHOICE",27:"CONCURRENT",28:"note",30:"NOTE_TEXT",32:"acc_title",33:"acc_title_value",34:"acc_descr",35:"acc_descr_value",36:"acc_descr_multiline_value",37:"classDef",38:"CLASSDEF_ID",39:"CLASSDEF_STYLEOPTS",40:"DEFAULT",41:"class",42:"CLASSENTITY_IDS",43:"STYLECLASS",44:"direction_tb",45:"direction_bt",46:"direction_rl",47:"direction_lr",49:";",50:"EDGE_STATE",51:"STYLE_SEPARATOR",52:"left_of",53:"right_of"},productions_:[0,[3,2],[3,2],[3,2],[7,0],[7,2],[8,2],[8,1],[8,1],[9,1],[9,1],[9,1],[9,2],[9,3],[9,4],[9,1],[9,2],[9,1],[9,4],[9,3],[9,6],[9,1],[9,1],[9,1],[9,1],[9,4],[9,4],[9,1],[9,2],[9,2],[9,1],[10,3],[10,3],[11,3],[31,1],[31,1],[31,1],[31,1],[48,1],[48,1],[12,1],[12,1],[12,3],[12,3],[29,1],[29,1]],performAction:function(a,b,c,d,e,f,g){var h=f.length-1;switch(e){case 3:return d.setRootDoc(f[h]),f[h];case 4:this.$=[];break;case 5:"nl"!=f[h]&&(f[h-1].push(f[h]),this.$=f[h-1]);break;case 6:case 7:case 11:this.$=f[h];break;case 8:this.$="nl";break;case 12:let i=f[h-1];i.description=d.trimColon(f[h]),this.$=i;break;case 13:this.$={stmt:"relation",state1:f[h-2],state2:f[h]};break;case 14:let j=d.trimColon(f[h]);this.$={stmt:"relation",state1:f[h-3],state2:f[h-1],description:j};break;case 18:this.$={stmt:"state",id:f[h-3],type:"default",description:"",doc:f[h-1]};break;case 19:var k=f[h],l=f[h-2].trim();if(f[h].match(":")){var m=f[h].split(":");k=m[0],l=[l,m[1]]}this.$={stmt:"state",id:k,type:"default",description:l};break;case 20:this.$={stmt:"state",id:f[h-3],type:"default",description:f[h-5],doc:f[h-1]};break;case 21:this.$={stmt:"state",id:f[h],type:"fork"};break;case 22:this.$={stmt:"state",id:f[h],type:"join"};break;case 23:this.$={stmt:"state",id:f[h],type:"choice"};break;case 24:this.$={stmt:"state",id:d.getDividerId(),type:"divider"};break;case 25:this.$={stmt:"state",id:f[h-1].trim(),note:{position:f[h-2].trim(),text:f[h].trim()}};break;case 28:this.$=f[h].trim(),d.setAccTitle(this.$);break;case 29:case 30:this.$=f[h].trim(),d.setAccDescription(this.$);break;case 31:case 32:this.$={stmt:"classDef",id:f[h-1].trim(),classes:f[h].trim()};break;case 33:this.$={stmt:"applyClass",id:f[h-1].trim(),styleClass:f[h].trim()};break;case 34:d.setDirection("TB"),this.$={stmt:"dir",value:"TB"};break;case 35:d.setDirection("BT"),this.$={stmt:"dir",value:"BT"};break;case 36:d.setDirection("RL"),this.$={stmt:"dir",value:"RL"};break;case 37:d.setDirection("LR"),this.$={stmt:"dir",value:"LR"};break;case 40:case 41:this.$={stmt:"state",id:f[h].trim(),type:"default",description:""};break;case 42:case 43:this.$={stmt:"state",id:f[h-2].trim(),classes:[f[h].trim()],type:"default",description:""}}},table:[{3:1,4:b,5:c,6:d},{1:[3]},{3:5,4:b,5:c,6:d},{3:6,4:b,5:c,6:d},a([1,4,5,15,16,18,21,23,24,25,26,27,28,32,34,36,37,41,44,45,46,47,50],e,{7:7}),{1:[2,1]},{1:[2,2]},{1:[2,3],4:f,5:g,8:8,9:10,10:12,11:13,12:14,15:h,16:i,18:j,21:k,23:l,24:m,25:n,26:o,27:p,28:q,31:24,32:r,34:s,36:t,37:u,41:v,44:w,45:x,46:y,47:z,50:A},a(B,[2,5]),{9:36,10:12,11:13,12:14,15:h,16:i,18:j,21:k,23:l,24:m,25:n,26:o,27:p,28:q,31:24,32:r,34:s,36:t,37:u,41:v,44:w,45:x,46:y,47:z,50:A},a(B,[2,7]),a(B,[2,8]),a(B,[2,9]),a(B,[2,10]),a(B,[2,11],{13:[1,37],14:[1,38]}),a(B,[2,15]),{17:[1,39]},a(B,[2,17],{19:[1,40]}),{22:[1,41]},a(B,[2,21]),a(B,[2,22]),a(B,[2,23]),a(B,[2,24]),{29:42,30:[1,43],52:[1,44],53:[1,45]},a(B,[2,27]),{33:[1,46]},{35:[1,47]},a(B,[2,30]),{38:[1,48],40:[1,49]},{42:[1,50]},a(C,[2,40],{51:[1,51]}),a(C,[2,41],{51:[1,52]}),a(B,[2,34]),a(B,[2,35]),a(B,[2,36]),a(B,[2,37]),a(B,[2,6]),a(B,[2,12]),{12:53,23:l,50:A},a(B,[2,16]),a(D,e,{7:54}),{23:[1,55]},{23:[1,56]},{22:[1,57]},{23:[2,44]},{23:[2,45]},a(B,[2,28]),a(B,[2,29]),{39:[1,58]},{39:[1,59]},{43:[1,60]},{23:[1,61]},{23:[1,62]},a(B,[2,13],{13:[1,63]}),{4:f,5:g,8:8,9:10,10:12,11:13,12:14,15:h,16:i,18:j,20:[1,64],21:k,23:l,24:m,25:n,26:o,27:p,28:q,31:24,32:r,34:s,36:t,37:u,41:v,44:w,45:x,46:y,47:z,50:A},a(B,[2,19],{19:[1,65]}),{30:[1,66]},{23:[1,67]},a(B,[2,31]),a(B,[2,32]),a(B,[2,33]),a(C,[2,42]),a(C,[2,43]),a(B,[2,14]),a(B,[2,18]),a(D,e,{7:68}),a(B,[2,25]),a(B,[2,26]),{4:f,5:g,8:8,9:10,10:12,11:13,12:14,15:h,16:i,18:j,20:[1,69],21:k,23:l,24:m,25:n,26:o,27:p,28:q,31:24,32:r,34:s,36:t,37:u,41:v,44:w,45:x,46:y,47:z,50:A},a(B,[2,20])],defaultActions:{5:[2,1],6:[2,2],44:[2,44],45:[2,45]},parseError:function(a,b){if(b.recoverable)this.trace(a);else{var c=Error(a);throw c.hash=b,c}},parse:function(a){var b=this,c=[0],d=[],e=[null],f=[],g=this.table,h="",i=0,j=0,k=f.slice.call(arguments,1),l=Object.create(this.lexer),m={};for(var n in this.yy)Object.prototype.hasOwnProperty.call(this.yy,n)&&(m[n]=this.yy[n]);l.setInput(a,m),m.lexer=l,m.parser=this,void 0===l.yylloc&&(l.yylloc={});var o=l.yylloc;f.push(o);var p=l.options&&l.options.ranges;"function"==typeof m.parseError?this.parseError=m.parseError:this.parseError=Object.getPrototypeOf(this).parseError;for(var q,r,s,t,u,v,w,x,y={};;){if(r=c[c.length-1],this.defaultActions[r]?s=this.defaultActions[r]:(null==q&&(q=function(){var a;return"number"!=typeof(a=d.pop()||l.lex()||1)&&(a instanceof Array&&(a=(d=a).pop()),a=b.symbols_[a]||a),a}()),s=g[r]&&g[r][q]),void 0===s||!s.length||!s[0]){var z="";for(u in x=[],g[r])this.terminals_[u]&&u>2&&x.push("'"+this.terminals_[u]+"'");z=l.showPosition?"Parse error on line "+(i+1)+":\n"+l.showPosition()+"\nExpecting "+x.join(", ")+", got '"+(this.terminals_[q]||q)+"'":"Parse error on line "+(i+1)+": Unexpected "+(1==q?"end of input":"'"+(this.terminals_[q]||q)+"'"),this.parseError(z,{text:l.match,token:this.terminals_[q]||q,line:l.yylineno,loc:o,expected:x})}if(s[0]instanceof Array&&s.length>1)throw Error("Parse Error: multiple actions possible at state: "+r+", token: "+q);switch(s[0]){case 1:c.push(q),e.push(l.yytext),f.push(l.yylloc),c.push(s[1]),q=null,j=l.yyleng,h=l.yytext,i=l.yylineno,o=l.yylloc;break;case 2:if(v=this.productions_[s[1]][1],y.$=e[e.length-v],y._$={first_line:f[f.length-(v||1)].first_line,last_line:f[f.length-1].last_line,first_column:f[f.length-(v||1)].first_column,last_column:f[f.length-1].last_column},p&&(y._$.range=[f[f.length-(v||1)].range[0],f[f.length-1].range[1]]),void 0!==(t=this.performAction.apply(y,[h,j,i,m,s[1],e,f].concat(k))))return t;v&&(c=c.slice(0,-1*v*2),e=e.slice(0,-1*v),f=f.slice(0,-1*v)),c.push(this.productions_[s[1]][0]),e.push(y.$),f.push(y._$),w=g[c[c.length-2]][c[c.length-1]],c.push(w);break;case 3:return!0}}return!0}};function F(){this.yy={}}return E.lexer={EOF:1,parseError:function(a,b){if(this.yy.parser)this.yy.parser.parseError(a,b);else throw Error(a)},setInput:function(a,b){return this.yy=b||this.yy||{},this._input=a,this._more=this._backtrack=this.done=!1,this.yylineno=this.yyleng=0,this.yytext=this.matched=this.match="",this.conditionStack=["INITIAL"],this.yylloc={first_line:1,first_column:0,last_line:1,last_column:0},this.options.ranges&&(this.yylloc.range=[0,0]),this.offset=0,this},input:function(){var a=this._input[0];return this.yytext+=a,this.yyleng++,this.offset++,this.match+=a,this.matched+=a,a.match(/(?:\r\n?|\n).*/g)?(this.yylineno++,this.yylloc.last_line++):this.yylloc.last_column++,this.options.ranges&&this.yylloc.range[1]++,this._input=this._input.slice(1),a},unput:function(a){var b=a.length,c=a.split(/(?:\r\n?|\n)/g);this._input=a+this._input,this.yytext=this.yytext.substr(0,this.yytext.length-b),this.offset-=b;var d=this.match.split(/(?:\r\n?|\n)/g);this.match=this.match.substr(0,this.match.length-1),this.matched=this.matched.substr(0,this.matched.length-1),c.length-1&&(this.yylineno-=c.length-1);var e=this.yylloc.range;return this.yylloc={first_line:this.yylloc.first_line,last_line:this.yylineno+1,first_column:this.yylloc.first_column,last_column:c?(c.length===d.length?this.yylloc.first_column:0)+d[d.length-c.length].length-c[0].length:this.yylloc.first_column-b},this.options.ranges&&(this.yylloc.range=[e[0],e[0]+this.yyleng-b]),this.yyleng=this.yytext.length,this},more:function(){return this._more=!0,this},reject:function(){return this.options.backtrack_lexer?(this._backtrack=!0,this):this.parseError("Lexical error on line "+(this.yylineno+1)+". You can only invoke reject() in the lexer when the lexer is of the backtracking persuasion (options.backtrack_lexer = true).\n"+this.showPosition(),{text:"",token:null,line:this.yylineno})},less:function(a){this.unput(this.match.slice(a))},pastInput:function(){var a=this.matched.substr(0,this.matched.length-this.match.length);return(a.length>20?"...":"")+a.substr(-20).replace(/\n/g,"")},upcomingInput:function(){var a=this.match;return a.length<20&&(a+=this._input.substr(0,20-a.length)),(a.substr(0,20)+(a.length>20?"...":"")).replace(/\n/g,"")},showPosition:function(){var a=this.pastInput(),b=Array(a.length+1).join("-");return a+this.upcomingInput()+"\n"+b+"^"},test_match:function(a,b){var c,d,e;if(this.options.backtrack_lexer&&(e={yylineno:this.yylineno,yylloc:{first_line:this.yylloc.first_line,last_line:this.last_line,first_column:this.yylloc.first_column,last_column:this.yylloc.last_column},yytext:this.yytext,match:this.match,matches:this.matches,matched:this.matched,yyleng:this.yyleng,offset:this.offset,_more:this._more,_input:this._input,yy:this.yy,conditionStack:this.conditionStack.slice(0),done:this.done},this.options.ranges&&(e.yylloc.range=this.yylloc.range.slice(0))),(d=a[0].match(/(?:\r\n?|\n).*/g))&&(this.yylineno+=d.length),this.yylloc={first_line:this.yylloc.last_line,last_line:this.yylineno+1,first_column:this.yylloc.last_column,last_column:d?d[d.length-1].length-d[d.length-1].match(/\r?\n?/)[0].length:this.yylloc.last_column+a[0].length},this.yytext+=a[0],this.match+=a[0],this.matches=a,this.yyleng=this.yytext.length,this.options.ranges&&(this.yylloc.range=[this.offset,this.offset+=this.yyleng]),this._more=!1,this._backtrack=!1,this._input=this._input.slice(a[0].length),this.matched+=a[0],c=this.performAction.call(this,this.yy,this,b,this.conditionStack[this.conditionStack.length-1]),this.done&&this._input&&(this.done=!1),c)return c;if(this._backtrack)for(var f in e)this[f]=e[f];return!1},next:function(){if(this.done)return this.EOF;this._input||(this.done=!0),this._more||(this.yytext="",this.match="");for(var a,b,c,d,e=this._currentRules(),f=0;f<e.length;f++)if((c=this._input.match(this.rules[e[f]]))&&(!b||c[0].length>b[0].length)){if(b=c,d=f,this.options.backtrack_lexer){if(!1!==(a=this.test_match(c,e[f])))return a;if(!this._backtrack)return!1;b=!1;continue}if(!this.options.flex)break}return b?!1!==(a=this.test_match(b,e[d]))&&a:""===this._input?this.EOF:this.parseError("Lexical error on line "+(this.yylineno+1)+". Unrecognized text.\n"+this.showPosition(),{text:"",token:null,line:this.yylineno})},lex:function(){var a=this.next();return a||this.lex()},begin:function(a){this.conditionStack.push(a)},popState:function(){return this.conditionStack.length-1>0?this.conditionStack.pop():this.conditionStack[0]},_currentRules:function(){return this.conditionStack.length&&this.conditionStack[this.conditionStack.length-1]?this.conditions[this.conditionStack[this.conditionStack.length-1]].rules:this.conditions.INITIAL.rules},topState:function(a){return(a=this.conditionStack.length-1-Math.abs(a||0))>=0?this.conditionStack[a]:"INITIAL"},pushState:function(a){this.begin(a)},stateStackSize:function(){return this.conditionStack.length},options:{"case-insensitive":!0},performAction:function(a,b,c,d){switch(c){case 0:return 40;case 1:case 39:return 44;case 2:case 40:return 45;case 3:case 41:return 46;case 4:case 42:return 47;case 5:case 6:case 8:case 9:case 10:case 11:case 51:case 53:case 59:break;case 7:case 74:return 5;case 12:case 29:return this.pushState("SCALE"),16;case 13:case 30:return 17;case 14:case 20:case 31:case 46:case 49:this.popState();break;case 15:return this.begin("acc_title"),32;case 16:return this.popState(),"acc_title_value";case 17:return this.begin("acc_descr"),34;case 18:return this.popState(),"acc_descr_value";case 19:this.begin("acc_descr_multiline");break;case 21:return"acc_descr_multiline_value";case 22:return this.pushState("CLASSDEF"),37;case 23:return this.popState(),this.pushState("CLASSDEFID"),"DEFAULT_CLASSDEF_ID";case 24:return this.popState(),this.pushState("CLASSDEFID"),38;case 25:return this.popState(),39;case 26:return this.pushState("CLASS"),41;case 27:return this.popState(),this.pushState("CLASS_STYLE"),42;case 28:return this.popState(),43;case 32:this.pushState("STATE");break;case 33:case 36:return this.popState(),b.yytext=b.yytext.slice(0,-8).trim(),24;case 34:case 37:return this.popState(),b.yytext=b.yytext.slice(0,-8).trim(),25;case 35:case 38:return this.popState(),b.yytext=b.yytext.slice(0,-10).trim(),26;case 43:this.pushState("STATE_STRING");break;case 44:return this.pushState("STATE_ID"),"AS";case 45:case 61:return this.popState(),"ID";case 47:return"STATE_DESCR";case 48:return 18;case 50:return this.popState(),this.pushState("struct"),19;case 52:return this.popState(),20;case 54:return this.begin("NOTE"),28;case 55:return this.popState(),this.pushState("NOTE_ID"),52;case 56:return this.popState(),this.pushState("NOTE_ID"),53;case 57:this.popState(),this.pushState("FLOATING_NOTE");break;case 58:return this.popState(),this.pushState("FLOATING_NOTE_ID"),"AS";case 60:return"NOTE_TEXT";case 62:return this.popState(),this.pushState("NOTE_TEXT"),23;case 63:return this.popState(),b.yytext=b.yytext.substr(2).trim(),30;case 64:return this.popState(),b.yytext=b.yytext.slice(0,-8).trim(),30;case 65:case 66:return 6;case 67:return 15;case 68:return 50;case 69:return 23;case 70:return b.yytext=b.yytext.trim(),13;case 71:return 14;case 72:return 27;case 73:return 51;case 75:return"INVALID"}},rules:[/^(?:default\b)/i,/^(?:.*direction\s+TB[^\n]*)/i,/^(?:.*direction\s+BT[^\n]*)/i,/^(?:.*direction\s+RL[^\n]*)/i,/^(?:.*direction\s+LR[^\n]*)/i,/^(?:%%(?!\{)[^\n]*)/i,/^(?:[^\}]%%[^\n]*)/i,/^(?:[\n]+)/i,/^(?:[\s]+)/i,/^(?:((?!\n)\s)+)/i,/^(?:#[^\n]*)/i,/^(?:%[^\n]*)/i,/^(?:scale\s+)/i,/^(?:\d+)/i,/^(?:\s+width\b)/i,/^(?:accTitle\s*:\s*)/i,/^(?:(?!\n||)*[^\n]*)/i,/^(?:accDescr\s*:\s*)/i,/^(?:(?!\n||)*[^\n]*)/i,/^(?:accDescr\s*\{\s*)/i,/^(?:[\}])/i,/^(?:[^\}]*)/i,/^(?:classDef\s+)/i,/^(?:DEFAULT\s+)/i,/^(?:\w+\s+)/i,/^(?:[^\n]*)/i,/^(?:class\s+)/i,/^(?:(\w+)+((,\s*\w+)*))/i,/^(?:[^\n]*)/i,/^(?:scale\s+)/i,/^(?:\d+)/i,/^(?:\s+width\b)/i,/^(?:state\s+)/i,/^(?:.*<<fork>>)/i,/^(?:.*<<join>>)/i,/^(?:.*<<choice>>)/i,/^(?:.*\[\[fork\]\])/i,/^(?:.*\[\[join\]\])/i,/^(?:.*\[\[choice\]\])/i,/^(?:.*direction\s+TB[^\n]*)/i,/^(?:.*direction\s+BT[^\n]*)/i,/^(?:.*direction\s+RL[^\n]*)/i,/^(?:.*direction\s+LR[^\n]*)/i,/^(?:["])/i,/^(?:\s*as\s+)/i,/^(?:[^\n\{]*)/i,/^(?:["])/i,/^(?:[^"]*)/i,/^(?:[^\n\s\{]+)/i,/^(?:\n)/i,/^(?:\{)/i,/^(?:%%(?!\{)[^\n]*)/i,/^(?:\})/i,/^(?:[\n])/i,/^(?:note\s+)/i,/^(?:left of\b)/i,/^(?:right of\b)/i,/^(?:")/i,/^(?:\s*as\s*)/i,/^(?:["])/i,/^(?:[^"]*)/i,/^(?:[^\n]*)/i,/^(?:\s*[^:\n\s\-]+)/i,/^(?:\s*:[^:\n;]+)/i,/^(?:[\s\S]*?end note\b)/i,/^(?:stateDiagram\s+)/i,/^(?:stateDiagram-v2\s+)/i,/^(?:hide empty description\b)/i,/^(?:\[\*\])/i,/^(?:[^:\n\s\-\{]+)/i,/^(?:\s*:[^:\n;]+)/i,/^(?:-->)/i,/^(?:--)/i,/^(?::::)/i,/^(?:$)/i,/^(?:.)/i],conditions:{LINE:{rules:[9,10],inclusive:!1},struct:{rules:[9,10,22,26,32,39,40,41,42,51,52,53,54,68,69,70,71,72],inclusive:!1},FLOATING_NOTE_ID:{rules:[61],inclusive:!1},FLOATING_NOTE:{rules:[58,59,60],inclusive:!1},NOTE_TEXT:{rules:[63,64],inclusive:!1},NOTE_ID:{rules:[62],inclusive:!1},NOTE:{rules:[55,56,57],inclusive:!1},CLASS_STYLE:{rules:[28],inclusive:!1},CLASS:{rules:[27],inclusive:!1},CLASSDEFID:{rules:[25],inclusive:!1},CLASSDEF:{rules:[23,24],inclusive:!1},acc_descr_multiline:{rules:[20,21],inclusive:!1},acc_descr:{rules:[18],inclusive:!1},acc_title:{rules:[16],inclusive:!1},SCALE:{rules:[13,14,30,31],inclusive:!1},ALIAS:{rules:[],inclusive:!1},STATE_ID:{rules:[45],inclusive:!1},STATE_STRING:{rules:[46,47],inclusive:!1},FORK_STATE:{rules:[],inclusive:!1},STATE:{rules:[9,10,33,34,35,36,37,38,43,44,48,49,50],inclusive:!1},ID:{rules:[9,10],inclusive:!1},INITIAL:{rules:[0,1,2,3,4,5,6,7,8,10,11,12,15,17,19,22,26,29,32,50,54,65,66,67,68,69,70,71,73,74,75],inclusive:!0}}},F.prototype=E,E.Parser=F,new F}();c.parser=c;let d="state",e="relation",f="default",g="divider",h="start",i="color",j="fill",k="LR",l=[],m={},n=()=>({relations:[],states:{},documents:{}}),o={root:n()},p=o.root,q=0,r=0,s=a=>JSON.parse(JSON.stringify(a)),t=(a,c,f)=>{if(c.stmt===e)t(a,c.state1,!0),t(a,c.state2,!1);else if(c.stmt===d&&("[*]"===c.id?(c.id=f?a.id+"_start":a.id+"_end",c.start=f):c.id=c.id.trim()),c.doc){let a,e=[],f=[];for(a=0;a<c.doc.length;a++)if(c.doc[a].type===g){let b=s(c.doc[a]);b.doc=s(f),e.push(b),f=[]}else f.push(c.doc[a]);if(e.length>0&&f.length>0){let a={stmt:d,id:(0,b.I)(),type:"divider",doc:s(f)};e.push(s(a)),c.doc=e}c.doc.forEach(a=>t(c,a,!0))}},u=function(a,c=f,d=null,e=null,g=null,h=null,i=null,j=null){let k=null==a?void 0:a.trim();void 0===p.states[k]?(b.l.info("Adding state ",k,e),p.states[k]={id:k,descriptions:[],type:c,doc:d,note:g,classes:[],styles:[],textStyles:[]}):(p.states[k].doc||(p.states[k].doc=d),p.states[k].type||(p.states[k].type=c)),e&&(b.l.info("Setting state description",k,e),"string"==typeof e&&A(k,e.trim()),"object"==typeof e&&e.forEach(a=>A(k,a.trim()))),g&&(p.states[k].note=g,p.states[k].note.text=b.e.sanitizeText(p.states[k].note.text,(0,b.c)())),h&&(b.l.info("Setting state classes",k,h),("string"==typeof h?[h]:h).forEach(a=>C(k,a.trim()))),i&&(b.l.info("Setting state styles",k,i),("string"==typeof i?[i]:i).forEach(a=>D(k,a.trim()))),j&&(b.l.info("Setting state styles",k,i),("string"==typeof j?[j]:j).forEach(a=>E(k,a.trim())))},v=function(a){p=(o={root:n()}).root,q=0,m={},a||(0,b.v)()},w=function(a){return p.states[a]};function x(a=""){let b=a;return"[*]"===a&&(q++,b=`${h}${q}`),b}function y(a="",b=f){return"[*]"===a?h:b}let z=function(a,c,d){if("object"==typeof a){let e,f,g,h;e=x(a.id.trim()),f=y(a.id.trim(),a.type),g=x(c.id.trim()),h=y(c.id.trim(),c.type),u(e,f,a.doc,a.description,a.note,a.classes,a.styles,a.textStyles),u(g,h,c.doc,c.description,c.note,c.classes,c.styles,c.textStyles),p.relations.push({id1:e,id2:g,relationTitle:b.e.sanitizeText(d,(0,b.c)())})}else{let e=x(a.trim()),g=y(a),h=function(a=""){let b=a;return"[*]"===a&&(q++,b=`end${q}`),b}(c.trim()),i=function(a="",b=f){return"[*]"===a?"end":b}(c);u(e,g),u(h,i),p.relations.push({id1:e,id2:h,title:b.e.sanitizeText(d,(0,b.c)())})}},A=function(a,c){let d=p.states[a],e=c.startsWith(":")?c.replace(":","").trim():c;d.descriptions.push(b.e.sanitizeText(e,(0,b.c)()))},B=function(a,b=""){void 0===m[a]&&(m[a]={id:a,styles:[],textStyles:[]});let c=m[a];null!=b&&b.split(",").forEach(a=>{let b=a.replace(/([^;]*);/,"$1").trim();if(a.match(i)){let a=b.replace(j,"bgFill").replace(i,j);c.textStyles.push(a)}c.styles.push(b)})},C=function(a,b){a.split(",").forEach(function(a){let c=w(a);if(void 0===c){let b=a.trim();u(b),c=w(b)}c.classes.push(b)})},D=function(a,b){let c=w(a);void 0!==c&&c.textStyles.push(b)},E=function(a,b){let c=w(a);void 0!==c&&c.textStyles.push(b)},F={getConfig:()=>(0,b.c)().state,addState:u,clear:v,getState:w,getStates:function(){return p.states},getRelations:function(){return p.relations},getClasses:function(){return m},getDirection:()=>k,addRelation:z,getDividerId:()=>"divider-id-"+ ++r,setDirection:a=>{k=a},cleanupLabel:function(a){return":"===a.substring(0,1)?a.substr(2).trim():a.trim()},lineType:{LINE:0,DOTTED_LINE:1},relationType:{AGGREGATION:0,EXTENSION:1,COMPOSITION:2,DEPENDENCY:3},logDocuments:function(){b.l.info("Documents = ",o)},getRootDoc:()=>l,setRootDoc:a=>{b.l.info("Setting root doc",a),l=a},getRootDocV2:()=>(t({id:"root"},{id:"root",doc:l},!0),{id:"root",doc:l}),extract:a=>{let c;c=a.doc?a.doc:a,b.l.info(c),v(!0),b.l.info("Extract",c),c.forEach(a=>{switch(a.stmt){case d:u(a.id.trim(),a.type,a.doc,a.description,a.note,a.classes,a.styles,a.textStyles);break;case e:z(a.state1,a.state2,a.description);break;case"classDef":B(a.id.trim(),a.classes);break;case"applyClass":C(a.id.trim(),a.styleClass)}})},trimColon:a=>a&&":"===a[0]?a.substr(1).trim():a.trim(),getAccTitle:b.g,setAccTitle:b.s,getAccDescription:b.a,setAccDescription:b.b,addStyleClass:B,setCssClass:C,addDescription:A,setDiagramTitle:b.q,getDiagramTitle:b.t};a.s(["D",0,f,"S",0,e,"a",0,g,"b",0,d,"c",0,"TB","d",0,F,"p",0,c,"s",0,a=>`
defs #statediagram-barbEnd {
    fill: ${a.transitionColor};
    stroke: ${a.transitionColor};
  }
g.stateGroup text {
  fill: ${a.nodeBorder};
  stroke: none;
  font-size: 10px;
}
g.stateGroup text {
  fill: ${a.textColor};
  stroke: none;
  font-size: 10px;

}
g.stateGroup .state-title {
  font-weight: bolder;
  fill: ${a.stateLabelColor};
}

g.stateGroup rect {
  fill: ${a.mainBkg};
  stroke: ${a.nodeBorder};
}

g.stateGroup line {
  stroke: ${a.lineColor};
  stroke-width: 1;
}

.transition {
  stroke: ${a.transitionColor};
  stroke-width: 1;
  fill: none;
}

.stateGroup .composit {
  fill: ${a.background};
  border-bottom: 1px
}

.stateGroup .alt-composit {
  fill: #e0e0e0;
  border-bottom: 1px
}

.state-note {
  stroke: ${a.noteBorderColor};
  fill: ${a.noteBkgColor};

  text {
    fill: ${a.noteTextColor};
    stroke: none;
    font-size: 10px;
  }
}

.stateLabel .box {
  stroke: none;
  stroke-width: 0;
  fill: ${a.mainBkg};
  opacity: 0.5;
}

.edgeLabel .label rect {
  fill: ${a.labelBackgroundColor};
  opacity: 0.5;
}
.edgeLabel .label text {
  fill: ${a.transitionLabelColor||a.tertiaryTextColor};
}
.label div .edgeLabel {
  color: ${a.transitionLabelColor||a.tertiaryTextColor};
}

.stateLabel text {
  fill: ${a.stateLabelColor};
  font-size: 10px;
  font-weight: bold;
}

.node circle.state-start {
  fill: ${a.specialStateColor};
  stroke: ${a.specialStateColor};
}

.node .fork-join {
  fill: ${a.specialStateColor};
  stroke: ${a.specialStateColor};
}

.node circle.state-end {
  fill: ${a.innerEndBackground};
  stroke: ${a.background};
  stroke-width: 1.5
}
.end-state-inner {
  fill: ${a.compositeBackground||a.background};
  // stroke: ${a.background};
  stroke-width: 1.5
}

.node rect {
  fill: ${a.stateBkg||a.mainBkg};
  stroke: ${a.stateBorder||a.nodeBorder};
  stroke-width: 1px;
}
.node polygon {
  fill: ${a.mainBkg};
  stroke: ${a.stateBorder||a.nodeBorder};;
  stroke-width: 1px;
}
#statediagram-barbEnd {
  fill: ${a.lineColor};
}

.statediagram-cluster rect {
  fill: ${a.compositeTitleBackground};
  stroke: ${a.stateBorder||a.nodeBorder};
  stroke-width: 1px;
}

.cluster-label, .nodeLabel {
  color: ${a.stateLabelColor};
}

.statediagram-cluster rect.outer {
  rx: 5px;
  ry: 5px;
}
.statediagram-state .divider {
  stroke: ${a.stateBorder||a.nodeBorder};
}

.statediagram-state .title-state {
  rx: 5px;
  ry: 5px;
}
.statediagram-cluster.statediagram-cluster .inner {
  fill: ${a.compositeBackground||a.background};
}
.statediagram-cluster.statediagram-cluster-alt .inner {
  fill: ${a.altBackground?a.altBackground:"#efefef"};
}

.statediagram-cluster .inner {
  rx:0;
  ry:0;
}

.statediagram-state rect.basic {
  rx: 5px;
  ry: 5px;
}
.statediagram-state rect.divider {
  stroke-dasharray: 10,10;
  fill: ${a.altBackground?a.altBackground:"#efefef"};
}

.note-edge {
  stroke-dasharray: 5;
}

.statediagram-note rect {
  fill: ${a.noteBkgColor};
  stroke: ${a.noteBorderColor};
  stroke-width: 1px;
  rx: 0;
  ry: 0;
}
.statediagram-note rect {
  fill: ${a.noteBkgColor};
  stroke: ${a.noteBorderColor};
  stroke-width: 1px;
  rx: 0;
  ry: 0;
}

.statediagram-note text {
  fill: ${a.noteTextColor};
}

.statediagram-note .nodeLabel {
  color: ${a.noteTextColor};
}
.statediagram .edgeLabel {
  color: red; // ${a.noteTextColor};
}

#dependencyStart, #dependencyEnd {
  fill: ${a.lineColor};
  stroke: ${a.lineColor};
  stroke-width: 1;
}

.statediagramTitleText {
  text-anchor: middle;
  font-size: 18px;
  fill: ${a.textColor};
}
`])}];

//# sourceMappingURL=0_i6_mermaid_dist_styles-455b33cd_0xz-6v2.js.map
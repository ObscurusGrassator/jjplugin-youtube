var _interopRequireDefault=require("@babel/runtime/helpers/interopRequireDefault");var _asyncToGenerator2=_interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));var _classCallCheck2=_interopRequireDefault(require("@babel/runtime/helpers/classCallCheck"));var _createClass2=_interopRequireDefault(require("@babel/runtime/helpers/createClass"));module.exports=function(){function YouTube(options){(0,_classCallCheck2.default)(this,YouTube);this.options=options;}return(0,_createClass2.default)(YouTube,[{key:"playVideo",value:function(){var _playVideo=(0,_asyncToGenerator2.default)(function*(videoId){var fromSecond=arguments.length>1&&arguments[1]!==undefined?arguments[1]:0;yield this.options.browserTab.goToUrl(`https://www.yout-ube.com/watch?v=${videoId}&loop=1&start=${fromSecond}`);});function playVideo(_x){return _playVideo.apply(this,arguments);}return playVideo;}()},{key:"stopVideo",value:(function(){var _stopVideo=(0,_asyncToGenerator2.default)(function*(){return yield this.options.browserTab.sendRequest(`async%20utils%20%3D%3E%20%7B%0A%20%20%20%20%20%20%20%20%20%20%20%20let%20currentTimeR%20%3D%20%2F**%20%40type%20%7B%20HTMLSpanElement%20%7D%20*%2F%20(await%20utils.waitForElement('.ytp-time-current')).innerText.match(%2F((%3F%3Ch%3E%5B0-9%5D%2B)%3A)%3F(%3F%3Cm%3E%5B0-9%5D%2B)%3A(%3F%3Cs%3E%5B0-9%5D%2B)%24%2F)%3B%0A%20%20%20%20%20%20%20%20%20%20%20%20let%20durationR%20%20%20%3D%20%2F**%20%40type%20%7B%20HTMLSpanElement%20%7D%20*%2F%20(await%20utils.waitForElement('.ytp-time-duration')).innerText.match(%2F((%3F%3Ch%3E%5B0-9%5D%2B)%3A)%3F(%3F%3Cm%3E%5B0-9%5D%2B)%3A(%3F%3Cs%3E%5B0-9%5D%2B)%24%2F)%3B%0A%0A%20%20%20%20%20%20%20%20%20%20%20%20let%20currentTime%20%3D%20((%2BcurrentTimeR.groups.h%20%7C%7C%200)%20*%2060%20*%2060)%20%2B%20(%2BcurrentTimeR.groups.m%20*%2060)%20%2B%20(%2BcurrentTimeR.groups.s)%3B%0A%20%20%20%20%20%20%20%20%20%20%20%20let%20duration%20%20%20%20%3D%20((%20%20%20%2BdurationR.groups.h%20%7C%7C%200)%20*%2060%20*%2060)%20%2B%20(%20%20%20%2BdurationR.groups.m%20*%2060)%20%2B%20%20%20%20(%2BdurationR.groups.s)%3B%0A%0A%20%20%20%20%20%20%20%20%20%20%20%20%2F**%20%40type%20%7B%20HTMLButtonElement%20%7D%20*%2F%20(document.querySelector('.ytp-play-button-playlist')).click()%3B%0A%0A%20%20%20%20%20%20%20%20%20%20%20%20return%20%7BcurrentTime%2C%20duration%7D%3B%0A%20%20%20%20%20%20%20%20%7D`,'$*');});function stopVideo(){return _stopVideo.apply(this,arguments);}return stopVideo;}())},{key:"search",value:function(){var _search=(0,_asyncToGenerator2.default)(function*(){var _this=this;var _ref=arguments.length>0&&arguments[0]!==undefined?arguments[0]:{},_ref$searchedKeywords=_ref.searchedKeywords,searchedKeywords=_ref$searchedKeywords===void 0?[]:_ref$searchedKeywords,_ref$channelId=_ref.channelId,channelId=_ref$channelId===void 0?null:_ref$channelId,_ref$maxResults=_ref.maxResults,maxResults=_ref$maxResults===void 0?1:_ref$maxResults,_ref$order=_ref.order,order=_ref$order===void 0?'relevance':_ref$order,_ref$publishedAfter=_ref.publishedAfter,publishedAfter=_ref$publishedAfter===void 0?null:_ref$publishedAfter,_ref$publishedBefore=_ref.publishedBefore,publishedBefore=_ref$publishedBefore===void 0?null:_ref$publishedBefore,_ref$relevanceLanguag=_ref.relevanceLanguage,relevanceLanguage=_ref$relevanceLanguag===void 0?null:_ref$relevanceLanguag,_ref$type=_ref.type,type=_ref$type===void 0?null:_ref$type;var result=arguments.length>1&&arguments[1]!==undefined?arguments[1]:{items:[]};var url=new URL('https://www.googleapis.com/youtube/v3/search');url.searchParams.set('key',this.options.config.podcastPlayer.apiKey.value);url.searchParams.set('part','snippet');searchedKeywords.length&&url.searchParams.set('q',searchedKeywords.join(' '));channelId&&url.searchParams.set('channelId',channelId);maxResults&&url.searchParams.set('maxResults',(maxResults<0?50:maxResults)+'');order&&url.searchParams.set('order',order);result.nextPageToken&&url.searchParams.set('pageToken',result.nextPageToken);var resultPart=yield fetch(url).then(function(){var _ref2=(0,_asyncToGenerator2.default)(function*(response){var result=yield response.json();if(response.status===200){if('error'in result)return Promise.reject(result);else return result;}else return Promise.reject(result);});return function(_x2){return _ref2.apply(this,arguments);};}()).catch(function(){var _ref3=(0,_asyncToGenerator2.default)(function*(error){console.warn(error);yield _this.options.speech('YouTube API request problem.');yield _this.options.speech(url+': '+error,false,{speakDisable:true});});return function(_x3){return _ref3.apply(this,arguments);};}());result.items=Object.assign({},result.items,resultPart.items);result.nextPageToken=resultPart.nextPageToken;if(channelId&&maxResults<0&&maxResults>-100&&resultPart.nextPageToken)return yield this.search({searchedKeywords:searchedKeywords,channelId:channelId,maxResults:maxResults-1,order:order,publishedAfter:publishedAfter,publishedBefore:publishedBefore,relevanceLanguage:relevanceLanguage,type:type,result:result});else return result;});function search(){return _search.apply(this,arguments);}return search;}()},{key:"getList",value:(function(){var _getList=(0,_asyncToGenerator2.default)(function*(id,idType){var _this2=this;var result=arguments.length>2&&arguments[2]!==undefined?arguments[2]:{items:[]};var url=new URL('https://www.googleapis.com/youtube/v3/'+(idType=='playlist'?'playlists':'channel'));url.searchParams.set('key',this.options.config.podcastPlayer.apiKey.value);url.searchParams.set('part','snippet');url.searchParams.set(idType=='playlist'?'id':'channelId',id);url.searchParams.set('maxResults','50');result.nextPageToken&&url.searchParams.set('pageToken',result.nextPageToken);var resultPart=yield fetch(url).then(function(){var _ref4=(0,_asyncToGenerator2.default)(function*(response){var result=yield response.json();if(response.status===200){if('error'in result)return Promise.reject(result);else return result;}else return Promise.reject(result);});return function(_x6){return _ref4.apply(this,arguments);};}()).catch(function(){var _ref5=(0,_asyncToGenerator2.default)(function*(error){console.warn(error);yield _this2.options.speech('YouTube API request problem.');yield _this2.options.speech(url+': '+error,false,{speakDisable:true});});return function(_x7){return _ref5.apply(this,arguments);};}());result.items=Object.assign({},result.items,resultPart.items);result.nextPageToken=resultPart.nextPageToken;if(resultPart.nextPageToken)return yield this.getList(id,idType,result);else return result;});function getList(_x4,_x5){return _getList.apply(this,arguments);}return getList;}())}]);}();
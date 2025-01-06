/**
 * Aktuálne sú search() a getPlayList() jediný spôsob, ako nahrať playList k prehrávaniu.
 * Priamo z konfigu sa playListnenahráva, len sa s ním synchronizuje.
 * Z tohoto dôvodu nie je nutné sledovať vlastnosti updatedAt a reloadEveryHours a playListi automaticky updajtovať.
 * 
 * https://developers.google.com/youtube/v3/docs/search/list
 * https://github.com/PierfrancescoSoffritti/android-youtube-player?tab=readme-ov-file
 * https://docs.thewidlarzgroup.com/react-native-video/
 */

/** @typedef { import('./interfaceForAI.js') } InterfaceForAI */
/** @implements {InterfaceForAI} */
module.exports = class PlayLists {
    constructor(options) {
        /**
         * @type { import('jjplugin').Ctx< import('jjplugin').ConfigFrom<typeof import('./index')['config']>, PlayLists, typeof import('./index')['translations'] >
         *      & { browserTab: import('jjplugin').BrowserPuppeteer }
         * }
         */
        this.options = options;
    }

    // MARK: -   markRecording()
    /** @param { recordingMarks } mark */
    async createNewMarkForRecording(mark) {
        if (this.options.config.playLists.recordingMarks.options.includes(mark)) return;
        if (!(await this.options.getSummaryAccept(this.options.translate.createMark({mark})))) return;

        this.options.config.playLists.recordingMarks.options.push(mark);
        await this.options.configSave();
    }

    /**
     * @template { PlayList | PlayList['recordingList'][number] } [pl = PlayList]
     * @param { string } idInPlatform
     * @param { string } snippetTitle
     * @param { pl[] } [playLists = undefined]
     * @returns { pl }
     */
    // @ts-ignore
    searchConfigPlayList(idInPlatform, snippetTitle, playLists = this.options.config.playLists.playLists) {
        return playLists.find(p => (
            (!idInPlatform && !p.idInPlatform.value && p.name.value && this.normName(p.name.value) === this.normName(snippetTitle))
         || ( idInPlatform &&  p.idInPlatform.value &&                        p.idInPlatform.value === idInPlatform)
        ));
    }

    /**
     * Recording is markable, only if it is part of a PlayList.
     * @param { PlayList['recordingList'][number] } recording
     * @param { PlayList } playList
     * @param { recordingMarks[] } marks
     * @param { boolean } [unmark = false] If unmark = true, marks will by removed
     */
    async markRecording(recording, playList, marks, unmark = false) {
        // create playList in config
        if (!this.searchConfigPlayList(playList.idInPlatform.value, playList.name.value)) {
            let newPlayList = await this.getPlayList(playList.idInPlatform.value, 'playList', playList.name.value, true);
            
            if (this.lastPlayedPlayList.playList == playList) {
                this.lastPlayedPlayList.playList = newPlayList;
                recording = this.lastPlayedPlayList.playList.recordingList.find(r => r.idInPlatform.value == recording.idInPlatform.value);
                this.lastPlayedPlayList.recordingIndex = this.lastPlayedPlayList.playList.recordingList.indexOf(recording);
            }
        }

        for (let mark of marks) {
            if (!this.options.config.playLists.recordingMarks.options.includes(mark) && mark !== 'listened')
                throw `"${mark}" mark is not exists. You must creating it, if it not exists.`;
        }

        for (let mark of marks) {
            if (!unmark && !recording.marks.value.includes(mark)) recording.marks.value.push(mark);
            if ( unmark &&  recording.marks.value.includes(mark)) recording.marks.value.splice(recording.marks.value.indexOf(mark), 1);
        }

        await this.options.configSave();

        console.debug('jjplugin: YouTube - marks:', recording.marks.value);
    }

    // MARK: -   playYouTubeRecording()
    /** @type { (value: any) => void } */ stopResolver;
    /**
     * @param { PlayList['recordingList'][number] } recording
     * @param { number } [fromSecond = 0]
     * @param { boolean } [inLoop = false]
     */
    async playYouTubeRecording(
        recording, fromSecond = 0, inLoop = false,
        disableAsync = false, startPlaying = true, list = false,
    ) {
        console.debug('jjplugin: YouTube - playYouTubeRecording(', {recording: {idInPlatform: recording.idInPlatform, name: recording.name, marks: recording.marks.value}, fromSecond, inLoop, disableAsync, startPlaying, list}, ')');

        if (startPlaying) await this.options.browserTab.viewTab();

        this.recordingPlaying = true;

        if (!list) {
            this.lastPlayedRecording = {recording};
            this.lastPlayedPlayList = undefined;
        }

        await this.options.browserTab.goToUrl(`https://${this.options.deviceStatus.displayOff ? 'm' : 'www'}.yout-ube.com/watch?v=${recording.idInPlatform.value}&loop=0&start=${fromSecond}`);
        await new Promise(res => setTimeout(res, 3000)); // redirecting and load video
        // await this.qualityChange(!this.options.deviceStatus.displayOff ? 'low' : 'auto');

        return new Promise(async (res, rej) => {
            try {
                let currentTime = 0;
                let retryCount = 0;
                let duration = 1;

                while (currentTime < duration) {
                    if ((!list && this.lastPlayedRecording.stoppedInSecond !== undefined)
                     || ( list && this.lastPlayedPlayList.stoppedInSecond !== undefined)) {
                        this.recordingPlaying = false;
                        return res(); // video is paused
                    }

                    let tmp = await this.options.browserTab.sendRequest(async (utils, fromSecond) => {
                        if (fromSecond)   /** @type { HTMLVideoElement } */ (document.querySelector('.video-stream')).currentTime = fromSecond;
                        let currentTime = /** @type { HTMLVideoElement } */ (document.querySelector('.video-stream')).currentTime;
                        let duration    = /** @type { HTMLVideoElement } */ (document.querySelector('.video-stream')).duration;

                        return { currentTime, duration };
                    }, '$*', fromSecond);

                    fromSecond = 0;

                    if (typeof tmp.currentTime == 'number' && currentTime > tmp.currentTime) {
                        break; // video is play retry, and is cancelled
                    }
                    if (typeof tmp.currentTime == 'number' && currentTime === tmp.currentTime) retryCount++;
                    else retryCount = 0;
                    if (typeof tmp.currentTime == 'number' && currentTime === tmp.currentTime && retryCount > 3) {
                        if (!list) this.lastPlayedRecording.stoppedInSecond = currentTime;
                        if ( list) this.lastPlayedPlayList.stoppedInSecond = currentTime;

                        this.options.speech(this.options.translate.recordingNotLoading);

                        this.options.browserTab.destructor();
                        this.recordingPlaying = false;
                        return res(); // video is paused or network is lost
                    }
                    if ((typeof tmp.duration != 'number' || typeof tmp.currentTime != 'number') && retryCount > 3) {
                        if ( list) this.lastPlayedPlayList.stoppedInSecond = 0; // stop playlist while

                        this.options.speech(this.options.translate.recordingNotLoading);
                        // this.options.speech('ERROR: duration or currentTime is not number', false, {speakDisable: true});

                        this.options.browserTab.destructor();
                        this.recordingPlaying = false;
                        return res(); // video playing error
                    }

                    currentTime = tmp.currentTime;
                    duration = tmp.duration;

                    if (disableAsync) res();

                    await new Promise(res => {
                        this.stopResolver = () => { res(); this.stopResolver = undefined; };
                        setTimeout(() => this.stopResolver?.(), 2000);
                    }); // JJAssistant will not by frezee
                }

                if (!list) this.lastPlayedRecording.stoppedInSecond = undefined;
                if ( list) this.lastPlayedPlayList.stoppedInSecond = undefined;

                if ( list && this.lastPlayedPlayList && this.options.config.playLists.recordingMarks.options.includes('listened')) {
                    if (this.searchConfigPlayList(this.lastPlayedPlayList.playList.idInPlatform.value, this.lastPlayedPlayList.playList.name.value))
                        this.markRecording(recording, this.lastPlayedPlayList.playList, ['listened']);
                }

                if (inLoop && !list)
                    return res(await this.playYouTubeRecording(recording, 0, inLoop, disableAsync, false));

                if (!list) this.options.browserTab.destructor();

                return res();
            } catch (err) { rej(err); }
        });
    }

    // MARK: -   playYouTubePlayList()
    previousRecordingIndex = 0;
    /**
     * @param { PlayList } playList
     * @param { Object } [options]
     * @param { number } [options.fromRecordingIndex = 0]
     * @param { number } [options.fromSecond = 0]
     * @param { recordingMarks[] } [options.withMarks = []] play only recording that do contain marks
     * @param { recordingMarks[] } [options.withoutMarks = []] play only recording that do not contain marks
     * @param { boolean } [options.shuffleOrder = false]
     * @param { boolean } [options.inLoop = false]
     */
    async playYouTubePlayList(playList, {
        fromRecordingIndex = 0, fromSecond = 0, withMarks = [], withoutMarks = [], shuffleOrder = false, inLoop = false
    } = {}, startPlaying = true) {
        console.debug('jjplugin: YouTube - playYouTubePlayList(', {playList: {idInPlatform: playList.idInPlatform, name: playList.name, recordingListLength: playList.recordingList.length}, fromRecordingIndex, fromSecond, withMarks, withoutMarks, shuffleOrder, inLoop, startPlaying}, ')');

        if (startPlaying) {
            await this.options.browserTab.viewTab();

            if (shuffleOrder) this.shuffleArray(playList.recordingList);
        }

        this.lastPlayedRecording = undefined;
        this.lastPlayedPlayList = {playList, recordingIndex: fromRecordingIndex, previousRecordingIndex: this.previousRecordingIndex, shuffleOrder, inLoop};

        return new Promise(async (res, rej) => {
            try {
                let recorded = 0;
                if (startPlaying) setTimeout(res, 1000); // JJAssistant will not by frezee

                rec: while (this.lastPlayedPlayList.recordingIndex <= this.lastPlayedPlayList.playList.recordingList.length) {
                    let recording = playList.recordingList[this.lastPlayedPlayList.recordingIndex];

                    for (let mark of withMarks || []) {
                        if (!recording.marks.value.includes(mark)) {
                            this.lastPlayedPlayList.recordingIndex++;
                            continue rec;
                        }
                    }
                    for (let mark of withoutMarks || []) {
                        if ( recording.marks.value.includes(mark)) {
                            this.lastPlayedPlayList.recordingIndex++;
                            continue rec;
                        }
                    }

                    await this.playYouTubeRecording(recording, fromSecond, false, false, false, true);

                    if (this.lastPlayedPlayList.stoppedInSecond !== undefined) return;

                    recorded++;
                    fromSecond = 0;
                    this.previousRecordingIndex = this.lastPlayedPlayList.previousRecordingIndex = this.lastPlayedPlayList.recordingIndex;
                    this.lastPlayedPlayList.recordingIndex++;
                }

                if (!recorded) {
                    this.recordingPlaying = false;
                    await this.options.speech(this.options.translate.playListEmpty);
                }
                else if (inLoop) return await this.playYouTubePlayList(playList, {fromRecordingIndex: 0, fromSecond: 0, withMarks, withoutMarks, shuffleOrder, inLoop}, false);
                else {
                    this.recordingPlaying = false;
                    this.options.browserTab.destructor();
                    await this.options.speech(this.options.translate.playListEnd);
                }
            } catch (err) { rej(err); }
        });
    }

    stoppedAfterAwaking = false;

    // MARK: -   continuePlaying()
    async continuePlaying(continueAfterAsleep = false) {
        if (continueAfterAsleep && !this.stoppedAfterAwaking) return;
        this.stoppedAfterAwaking = false;

        if (this.recordingPlaying) return;

        await this.options.browserTab.viewTab();

        if (this.lastPlayedRecording)
            await this.playYouTubeRecording(this.lastPlayedRecording.recording, this.lastPlayedRecording.stoppedInSecond);
        if (this.lastPlayedPlayList)
            await this.playYouTubePlayList(this.lastPlayedPlayList.playList, {
                fromRecordingIndex: this.lastPlayedPlayList.recordingIndex,
                fromSecond: this.lastPlayedPlayList.stoppedInSecond,
                shuffleOrder: this.lastPlayedPlayList.shuffleOrder,
                inLoop: this.lastPlayedPlayList.inLoop,
            });
    }

    // MARK: -   stopPlaying()
    async stopPlaying(stoppedAfterAwaking = false) {
        if (!stoppedAfterAwaking && this.stoppedAfterAwaking) { // if user stop recording after awake
            this.stoppedAfterAwaking = false; // after JJAssistant sleeping, recordin will not continue
            this.options.browserTab.destructor();
            return;
        }
        if (!this.recordingPlaying) return;

        this.stoppedAfterAwaking = stoppedAfterAwaking;

        let { currentTime, duration } = await this.options.browserTab.sendRequest(async utils => {
            let currentTime = /** @type { HTMLVideoElement } */ (document.querySelector('.video-stream')).currentTime;
            let duration    = /** @type { HTMLVideoElement } */ (document.querySelector('.video-stream')).duration;

            /** @type { HTMLVideoElement } */ (document.querySelector('.video-stream')).pause();
            
            return { currentTime, duration };
        }, '$*');

        if (currentTime > 5 && currentTime !== duration) currentTime -= 5;

        if (this.lastPlayedRecording) this.lastPlayedRecording.stoppedInSecond = currentTime;
        if (this.lastPlayedPlayList)  this.lastPlayedPlayList.stoppedInSecond = currentTime;

        this.stopResolver?.();

        this.recordingPlaying = false;

        this.options.browserTab.destructor(); // playing is connect with window layer and it must by closed
    }

    // MARK: -   qualityChange()
    async qualityChange(/** @type { 'low' | 'auto' } */ quality) {
        await this.options.browserTab.sendRequest(async utils => {
            /** @type { HTMLButtonElement } */ (await utils.waitForElement('.ytp-settings-button')).click();
            /** @type { HTMLButtonElement } */ (await utils.waitForElement('.ytp-menuitem:last-child')).click()
            if (quality == 'low')
                /** @type { HTMLButtonElement } */ (document.querySelector('.ytp-menuitem:nth-last-child(2)')).click();
            if (quality == 'auto') {
                /** @type { HTMLButtonElement } */ (document.querySelector('.ytp-menuitem:nth-last-child(6)')).click();
                await new Promise(res => setTimeout(res, 1000));
                /** @type { HTMLButtonElement } */ (document.querySelector('.ytp-menuitem:nth-last-child(1)')).click();
            }
        }, '$*', quality);
    }

    // MARK: -   createPlayList()
    /**
     * @param { string } name
     * @returns { Promise<PlayList> }
     */
    async createPlayList(name) {
        name = name.charAt(0).toLocaleUpperCase() + name.substring(1);

        console.debug('jjplugin: YouTube - createPlayList(' + name + ')');

        if (this.searchConfigPlayList('', name)) {
            this.options.speech(this.options.translate.playListExists);
            return;
        } else if (!(await this.options.getSummaryAccept(this.options.translate.playListCreate({name}))))
            return;

        let plo = this.options.config.playLists.playLists[0];
        let now = new Date().toISOString().match(/^(\d\d\d\d)-(\d\d)-(\d\d)T/);
        let nowTime = `${now[1]}.${now[2]}.${now[3]}`;

        /** @type { PlayList } */
        let newPlayList = {
            platform: {...plo.platform, value: 'YouTube'},
            idInPlatform: {...plo.idInPlatform, value: ''},
            name: {...plo.idInPlatform, value: name},
            updatedAt: {...plo.updatedAt, value: nowTime},
            setMassStatus: {...plo.setMassStatus},
            reloadEveryHours: {...plo.reloadEveryHours},
            recordingList: [],
        };
        this.options.config.playLists.playLists.push(newPlayList);

        await this.options.configSave();

        return newPlayList;
    }

    normName(/** @type { string } */ name) {
        return name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    }

    // MARK: -   addToPlayList()
    /**
     * @param { string } idInPlatform idInPlatform / playlistId / channelId from SearchResults
     * @param { 'recording' | 'playList' } idType
     * @param { string } snippetTitle
     * @param { PlayList } toPlayList
     */
    async addToPlayList(idInPlatform, idType, snippetTitle, toPlayList) {
        console.debug('jjplugin: YouTube - addToPlayList(' + idInPlatform + ": " + snippetTitle + " --> " + toPlayList.idInPlatform.value + ": " + toPlayList.name.value + ')');

        let configPlayList = this.searchConfigPlayList(toPlayList.idInPlatform.value, toPlayList.name.value);

        // create playList in config, but only for YouTube playList, not my
        if (toPlayList.idInPlatform.value && !configPlayList) {
            let newPlayList = await this.getPlayList(toPlayList.idInPlatform.value, 'playList', toPlayList.name.value, true);

            if (this.lastPlayedPlayList.playList == toPlayList)
                this.lastPlayedPlayList.playList = newPlayList;

            configPlayList = this.searchConfigPlayList(toPlayList.idInPlatform.value, toPlayList.name.value);
        }

        let plo = this.options.config.playLists.playLists[0];
        let plro = plo.recordingList[0];
        let now = new Date().toISOString().match(/^(\d\d\d\d)-(\d\d)-(\d\d)T/);
        let nowTime = `${now[1]}.${now[2]}.${now[3]}`;

        if (!this.searchConfigPlayList(toPlayList.idInPlatform.value, toPlayList.name.value, configPlayList.recordingList)
         && await this.options.getSummaryAccept(this.options.translate.playListAdd({
            recording: snippetTitle,
            playList: toPlayList.name.value,
        }))) {
            /** @type { PlayList['recordingList'][number] } */
            let recording = {
                idInPlatform: {...plro.idInPlatform, value: idInPlatform},
                type: {...plro.type, value: idType},
                name: {...plro.name, value: snippetTitle},
                publishedAt: {...plro.publishedAt, value: new Date().toISOString()},
                stoppedIn: {...plro.stoppedIn},
                marks: {...plro.marks, value: []},
            };

            toPlayList.updatedAt.value = nowTime;
            toPlayList.recordingList.unshift(recording);
            configPlayList.updatedAt.value = nowTime;
            configPlayList.recordingList.unshift(recording);

            await this.options.configSave();
        }
    }

    // MARK: YouTube rest API
    // https://developers.google.com/youtube/v3/docs/search/list

    /** @typedef { string } recordingMarks */

    /**
     * @typedef {Array<
     *      {
     *          snippet: { publishedAt: string, title: string },
     *      } & ( {id: { videoId: string }}
     *          | {id: { playlistId: string }}
     *          | {id: { channelId: string }}
     *      )
     * >} SearchResults
     */

    /** @typedef { import('jjplugin').ConfigFrom< typeof import('./index')['config']['playLists']['playLists'][number] > } PlayList */

    /** @type { boolean } */
    recordingPlaying = false;
    /** @type {{ recording: PlayList['recordingList'][number], stoppedInSecond?: number } | undefined} */
    lastPlayedRecording;
    /** @type {{ playList: PlayList, recordingIndex: number, previousRecordingIndex: number, stoppedInSecond?: number, shuffleOrder?: boolean, inLoop?: boolean } | undefined} */
    lastPlayedPlayList;
    /**
     * @param { boolean } [getPreviousRecording = false]
     * @returns { PlayList['recordingList'][number] }
     */
    getLastPlayedRecording(getPreviousRecording = false) {
        return this.lastPlayedRecording?.recording
            || this.lastPlayedPlayList?.playList?.recordingList?.[this.lastPlayedPlayList?.[
                getPreviousRecording ? 'previousRecordingIndex' : 'recordingIndex'
            ]];
    }

    // MARK: -   search()
    /**
     * @param { string[] } searchedKeywords
     * @param { Object } [options]
     * @param { string } [options.channelId]
     * @param { number } [options.maxResults = 1] from 1 to 50; or -1 for all items if options.channelId is exists
     * @param { 'relevance' | 'date' | 'rating' | 'title' | 'videoCount' | 'viewCount' } [options.order = 'relevance']
     * @param { string } [options.publishedAfter] datetime, example: 1970-01-01T00:00:00Z
     * @param { string } [options.publishedBefore] datetime, example: 1970-01-01T00:00:00Z
     * @param { string } [options.relevanceLanguage] ISO 639-1 two-letter language code format
     * @param { 'channel' | 'playList' | 'video' } [options.type]
     * @returns { Promise<SearchResults> }
     */
    async search(searchedKeywords, {
        channelId = undefined, maxResults = 1, order = 'relevance',
        publishedAfter = undefined, publishedBefore = undefined, relevanceLanguage = undefined, type = undefined,
    } = {}, /** @type { SearchResults } */ results = [], /** @type { string } */ nextPageToken = undefined
    ) {
        console.debug('jjplugin: YouTube - search(', {searchedKeywords, channelId, maxResults, order, publishedAfter, publishedBefore, relevanceLanguage, type, nextPageToken}, ')');

        let existingPlayList = type == 'playList' && this.searchConfigPlayList('', searchedKeywords.join(' '));
        if (existingPlayList) return [{
            snippet: { publishedAt: '1970-01-01T00:00:00Z', title: existingPlayList.name.value },
            id: { playlistId: existingPlayList.idInPlatform.value },
        }];
        let n = new Date();
        let url = this.options.config.playLists.youtubeAPIKey.value ? new URL('https://www.googleapis.com/youtube/v3/search')
              : new URL('obsgrass.com:9999/api/youtube?url_=' + encodeURIComponent('https://www.googleapis.com/youtube/v3/search'));

        url.searchParams.set('key', this.options.config.playLists.youtubeAPIKey.value);
        url.searchParams.set('part', 'snippet');
        url.searchParams.set('q', searchedKeywords.join(' '));

        channelId && url.searchParams.set('channelId', channelId);
        maxResults && url.searchParams.set('maxResults', (maxResults < 0 ? 50 : maxResults) + '');
        order && url.searchParams.set('order', order);
        publishedAfter && url.searchParams.set('publishedAfter', publishedAfter);
        publishedBefore && url.searchParams.set('publishedBefore', publishedBefore);
        relevanceLanguage && url.searchParams.set('relevanceLanguage', relevanceLanguage);
        type && url.searchParams.set('type', type);
        nextPageToken && url.searchParams.set('pageToken', nextPageToken);
        url.searchParams.set('expirationISO', `${n.getUTCFullYear()}-${(n.getUTCMonth()+1).toString().padStart(2, '0')}-${(n.getUTCDate()+1).toString().padStart(2, '0')}T${n.getUTCSeconds().toString().padStart(2, '0')}:${n.getUTCMinutes().toString().padStart(2, '0')}:${n.getUTCHours().toString().padStart(2, '0')}.000Z`);

        /** @type { {items: SearchResults, nextPageToken?: string} } */
        let resultPart = await fetch(url).then(async response => {
            let result = await response.json();
            if (response.status === 200) {
                if ('error' in result) return Promise.reject(JSON.stringify(result, null, 4));
                else return result;
            }
            else return Promise.reject(JSON.stringify(result, null, 4));
        });

        results = [...results, ...resultPart.items];

        if (channelId && maxResults < 0 && maxResults > -100 && resultPart.nextPageToken)
            return await this.search(searchedKeywords, {
                channelId, maxResults: maxResults - 1, order,
                publishedAfter, publishedBefore, relevanceLanguage, type,
            }, results, resultPart.nextPageToken);
        else {
            console.debug('jjplugin: YouTube - search return: length =', results.length, '; id[0] =', results[0].id, '; title[0] =', results[0].snippet.title);
            return results;
        }
    }

    // MARK: -   getPlayList()
    /**
     * Videos list from 'playList' or 'channel' type.
     * @param { string } idInPlatform idInPlatform / playlistId / channelId from SearchResults
     * @param { 'channel' | 'playList' } idType
     * @param { string } snippetTitle
     * @returns { Promise<PlayList> }
     */
    async getPlayList(idInPlatform, idType, snippetTitle,
        /** @type { boolean } */ saveInConfig = false,
        /** @type { PlayList } */ result = undefined,
        /** @type { string } */ nextPageToken = undefined,
    ) {
        console.debug('jjplugin: YouTube - getPlayList(', {idInPlatform, idType, snippetTitle, saveInConfig, result: {idInPlatform: result?.idInPlatform, name: result?.name}, nextPageToken}, ')');

        let configPlayList = this.searchConfigPlayList(idInPlatform, snippetTitle)

        if (idInPlatform) {
            let n = new Date();
            let url = this.options.config.playLists.youtubeAPIKey.value ? new URL('https://www.googleapis.com/youtube/v3/' + (idType == 'playList' ? 'playlistItems' : 'playlists'))
                  : new URL('obsgrass.com:9999/api/youtube?url_=' + encodeURIComponent('https://www.googleapis.com/youtube/v3/' + (idType == 'playList' ? 'playlistItems' : 'playlists')));
    
            url.searchParams.set('key', this.options.config.playLists.youtubeAPIKey.value);
            url.searchParams.set('part', 'snippet,contentDetails');
            url.searchParams.set(idType == 'playList' ? 'playlistId' : 'channelId', idInPlatform);
            url.searchParams.set('maxResults', '50');
            nextPageToken && url.searchParams.set('pageToken', nextPageToken);
            url.searchParams.set('expirationISO', `${n.getUTCFullYear()}-${(n.getUTCMonth()+1).toString().padStart(2, '0')}-${(n.getUTCDate()+1).toString().padStart(2, '0')}T${n.getUTCSeconds().toString().padStart(2, '0')}:${n.getUTCMinutes().toString().padStart(2, '0')}:${n.getUTCHours().toString().padStart(2, '0')}.000Z`);

            /** @type {{ items: {snippet: SearchResults[0]['snippet'], contentDetails: {videoId: string}, id: string}[], nextPageToken?: string }} */
            let resultPart = await fetch(url.href).then(async response => {
                let result = await response.json();
                if (response.status === 200) {
                    if ('error' in result) return Promise.reject(JSON.stringify(result, null, 4));
                    else return result;
                }
                else return Promise.reject(JSON.stringify(result, null, 4));
            });

            let plo = this.options.config.playLists.playLists[0];
            let plro = plo.recordingList[0];
            let now = new Date().toISOString().match(/^(\d\d\d\d)-(\d\d)-(\d\d)T/);
            let nowTime = `${now[1]}.${now[2]}.${now[3]}`;
            /** @type { PlayList } */
            let newPlayList = {
                platform: {...plo.platform, value: 'YouTube'},
                idInPlatform: {...plo.idInPlatform, value: idInPlatform},
                name: {...plo.idInPlatform, value: snippetTitle},
                updatedAt: {...plo.updatedAt, value: nowTime},
                setMassStatus: {...plo.setMassStatus},
                reloadEveryHours: {...plo.reloadEveryHours},
                recordingList: [],
            };

            !configPlayList && console.debug('jjplugin: YouTube - configPlayList not exists');
    
            // result and configPlayList not have identical recordingList,
            //   because result contain recordings from all inner playLists withou another playLists
            if (!configPlayList && saveInConfig) {
                configPlayList = {...newPlayList, recordingList: []};
                this.options.config.playLists.playLists.unshift(configPlayList);

                console.debug('jjplugin: YouTube - configPlayList is created');
            }

            // so that playlists created later are also created later in the config
            if (configPlayList) saveInConfig = true;

            result ??= {...newPlayList, recordingList: []};

            for (let i = 0; i < resultPart.items.length; i++) {
                let item = resultPart.items[i];

                if (configPlayList && configPlayList.recordingList.find(r => r.idInPlatform.value === (item.contentDetails.videoId || item.id))) {
                    delete resultPart.nextPageToken;
                    break;
                } else {
                    /** @type { PlayList['recordingList'][number] } */
                    let recording = {
                        idInPlatform: {...plro.idInPlatform, value: item.contentDetails.videoId},
                        type: {...plro.type, value: idType == 'playList' ? 'recording' : 'playList'},
                        name: {...plro.name, value: item.snippet.title},
                        publishedAt: {...plro.publishedAt, value: item.snippet.publishedAt},
                        stoppedIn: {...plro.stoppedIn},
                        marks: {...plro.marks, value: []},
                    };
                    if (idType == 'playList') result.recordingList.splice(i, 0, recording);
                    if (configPlayList) {
                        configPlayList.recordingList.splice(i, 0, recording);
                        configPlayList.updatedAt.value = nowTime;
                    }
                }

                if (idType == 'channel') await this.getPlayList(item.id, 'playList', item.snippet.title, saveInConfig, result, undefined);
            }

            if (resultPart.nextPageToken) {
                return await this.getPlayList(idInPlatform, idType, snippetTitle, saveInConfig, result, resultPart.nextPageToken);
            }
        } else {
            result ??= {...configPlayList, recordingList: []};
        }    

        if (configPlayList) {
            for (let i = 0; i < configPlayList.recordingList.length; i++) {
                let rec = configPlayList.recordingList[i];

                if (rec.type.value == 'playList')
                    await this.getPlayList(rec.idInPlatform.value, idType, snippetTitle, saveInConfig, result);
                else if (!result.recordingList.find(r => r.idInPlatform.value == rec.idInPlatform.value))
                    result.recordingList.splice(i, 0, rec);
            }

            // configPlayList.recordingList.sort((a, b) => a.publishedAt > b.publishedAt ? -1 : 1);
            await this.options.configSave();
        }

        return result;
    }

    shuffleArray(array) {
        for (let i = array.length - 1; i >= 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

};

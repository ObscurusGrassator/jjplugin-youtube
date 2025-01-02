module.exports = class InterfaceForAI {

    /** @typedef { string } recordingMarks */

    /**
     * SearchResults.id == PlayList.idInPlatform
     * @typedef {Array<
     *      {
     *          snippet: { publishedAt: string, title: string },
     *      } & ( {id: { videoId: string }}
     *          | {id: { playlistId: string }}
     *          | {id: { channelId: string }}
     *      )
     * >} SearchResults
     */

    /**
     * @typedef { Object } PlayList
     * @property {{ type: "string", value: string }} name
     * @property {{ type: "string", value: 'YouTube' }} platform
     * @property {{ type: "string", value: string }} idInPlatform
     * @property {{ type: "string", value: string }} updatedAt /^\d\d\d\d\.\d\d\.\d\d$/
     * @property {{ type: "number", value: number }} reloadEveryHours
     * @property { Object[] } recordingList
     * @property    {{ type: "string", value: string }} recordingList.name
     * @property    {{ type: "string", value: 'recording' | 'playList' }} recordingList.type
     * @property    {{ type: "string", value: string }} recordingList.idInPlatform
     * @property    {{ type: "string", value: string }} recordingList.stoppedIn /^\d\d:\d\d$/
     * @property    {{ type: "string", value: string }} recordingList.publishedAt /^\d\d\d\d-\d\d-\d\dT\d\d:\d\d:\d\dZ$/
     * @property    {{ type: "string", value: recordingMarks[] }} recordingList.marks
     */

    /** @type { boolean } */
    recordingPlaying = false;
    /**
     * Only lastPlayedRecording or lastPlayedPlayList variable will exist at a time.
     * @type {{ recording: PlayList['recordingList'][number], stoppedInSecond?: number } | undefined}
     */
    lastPlayedRecording;
    /**
     * Only lastPlayedRecording or lastPlayedPlayList variable will exist at a time.
     * @type {{ playList: PlayList, recordingIndex: number, previousRecordingIndex: number, stoppedInSecond?: number, shuffleOrder?: boolean, inLoop?: boolean } | undefined}
     */
    lastPlayedPlayList;
    /**
     * Return first existed value of lastPlayedRecording.recording and lastPlayedPlayList.playList.recordingList[this.lastPlayedPlayList.recordingIndex].
     * @param { boolean } [getPreviousRecording = false]
     * @returns { PlayList['recordingList'][number] | undefined }
     */
    getLastPlayedRecording(getPreviousRecording = false) { return undefined; }


    /** @param { recordingMarks } mark */
    async createNewMarkForRecording(mark) {}

    /**
     * Recording is markable, only if it is part of a PlayList (lastPlayedPlayList must exists).
     * If the user wants to delete an element from the playlist, mark the element as "deleted".
     * If the mark does not exist, you must create it first.
     * @param { PlayList['recordingList'][number] } recording
     * @param { PlayList } playList
     * @param { recordingMarks[] } marks
     * @param { boolean } [unmark = false] If unmark = true, marks will by removed
     */
    async markRecording(recording, playList, marks, unmark = false) {}

    /**
     * Play one specific video / music / recording.
     * @param { PlayList['recordingList'][number] } recording
     * @param { number } [fromSecond = 0]
     * @param { boolean } [inLoop = false]
     */
    async playYouTubeRecording(recording, fromSecond = 0, inLoop = false, startPlaying = true, list = false) {}

    /**
     * You can tell the user the real name of the playlist you are playing: playList.name.value.
     * Unless the user says otherwise, you set the mark "deleted" to withoutMarks.
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
    } = {}) {}

    async continuePlaying() {}
    async stopPlaying() {}

    /**
     * Assume that playList exists and try to find it via search()
     * Call this method only if the user requests it.
     * @param { string } name
     * @returns { Promise<PlayList> }
     */
    async createPlayList(name) { return undefined; }

    /**
     * PlayList can contain other playLists - do not add recordings one by one!
     * @param { string } idInPlatform idInPlatform / playlistId / channelId from SearchResults
     * @param { 'recording' | 'playList' } idType
     * @param { string } snippetTitle
     * @param { PlayList } playList
     */
    async addToPlayList(idInPlatform, idType, snippetTitle, playList) {}

    /**
     * @param { string[] } searchedKeywords
     * @param { Object } [options]
     * @param { string } [options.channelId] search in a specific playlist
     * @param { number } [options.maxResults = 1] from 1 to 50; or -1 for all items if options.channelId is exists
     * @param { 'relevance' | 'date' | 'rating' | 'title' | 'videoCount' | 'viewCount' } [options.order = 'relevance']
     * @param { string } [options.publishedAfter] datetime, example: 1970-01-01T00:00:00Z
     * @param { string } [options.publishedBefore] datetime, example: 1970-01-01T00:00:00Z
     * @param { string } [options.relevanceLanguage] ISO 639-1 two-letter language code format
     * @param { 'channel' | 'playList' | 'video' } [options.type]
     * @returns { Promise<SearchResults> }
     */
    async search(searchedKeywords, {
        channelId = null, maxResults = 1, order = 'relevance',
        publishedAfter = null, publishedBefore = null, relevanceLanguage = null, type = null,
    } = {}) { return undefined; }

    /**
     * Videos list from 'playList' or 'channel' type.
     * @param { string } idInPlatform idInPlatform / playlistId / channelId from SearchResults
     * @param { 'channel' | 'playList' } idType
     * @param { string } snippetTitle
     * @returns { Promise<PlayList> }
     */
    async getPlayList(idInPlatform, idType, snippetTitle) { return undefined; }

};

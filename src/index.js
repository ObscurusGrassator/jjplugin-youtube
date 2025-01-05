const PlayLists = require('./PlayLists');

module.exports = addPlugin({
    playLists: {
        youInLinkCreateProjectThenAddCredentialYoutubeAPIKeyThereAndFinallyItCopyHere: { type: 'link', value: "https://console.cloud.google.com/cloud-resource-manager" },
        youtubeAPIKey: { type: 'string' },
        recordingMarks: { type: 'optionsList', options: ['listened', 'deleted', 'favorite'] },
        playLists: [{
            name: { type: 'string' },
            platform: { type: 'string', value: 'YouTube', options: /** @type { const } */ (['YouTube']) },
            idInPlatform: { type: 'string', value: '' },
            updatedAt: { type: 'string', pattern: '^\\d\\d\\d\\d\\.\\d\\d\\.\\d\\d$', value: '1970.01.01' },
            reloadEveryHours: { type: 'number', min: 1, step: 1, value: 12 },
            recordingList: [{
                name: { type: 'string' },
                type: { type: 'string', value: 'recording', options: /** @type { const } */ (['recording', 'playList']) },
                idInPlatform: { type: 'string', value: '' },
                stoppedIn: { type: 'string', pattern: '^\\d\\d:\\d\\d$', value: '00:00' },
                publishedAt: { type: 'string', pattern: '^\\d\\d\\d\\d-\\d\\d-\\d\\dT\\d\\d:\\d\\d:\\d+Z$', value: '1970-01-01T00:00:000Z' },
                marks: { type: 'string', value: [], options: 'recordingMarks' },
            }],
            setMassStatus: {
                fromTime: { type: 'string', pattern: '^\\d\\d\\d\\d\\.\\d\\d\\.\\d\\d$', value: '2030.01.01' },
                toTime: { type: 'string', pattern: '^\\d\\d\\d\\d\\.\\d\\d\\.\\d\\d$', value: '1970.01.01' },
                mark: { type: 'string', value: 'listened', options: 'recordingMarks' },
                set: { type: 'button', functionName: 'setStatus' },
            },
        }],
    },
}, {
    os: { linux: true, darwin: true, win32: true, android: true, ios: true },
    pluginFormatVersion: 1,
}, {
    scriptInitializer: async ctx => new PlayLists({...ctx, browserTab: await ctx.browserTabStart('https://yout-ube.com', true, false)}),
    translations: {
        recordingNotLoading: {
            "sk-SK": "Nahrávka sa nechce načítavať. Prehrávanie je pozastavené.",
            "en-US": "The recording doesn't want to load. Playback is paused.",
        },
        playListEmpty: {
            "sk-SK": "Playlist je prázdny.",
            "en-US": "Playlist is empty.",
        },
        playListEnd: {
            "sk-SK": "Som na konci playlistu.",
            "en-US": "I'm at the end of the playlist.",
        },
        createMark: {
            "sk-SK": "Želáte si vytvoriť značku \"${mark}\"?",
            "en-US": "Do you want to create a \"${mark}\" tag?",
        },
        playListExists: {
            "sk-SK": "Playlist s takýmto názvom už existuje.",
            "en-US": "A playlist with that name already exists.",
        },
        playListCreate: {
            "sk-SK": "Želáte si vytvoriť playList s názvom \"${name}\"?",
            "en-US": "Do you want to create a playlist named \"${name}\"?",
        },
        playListAdd: {
            "sk-SK": "Želáte si pridať \"${recording}\" do playlistu \"${playList}\"?",
            "en-US": "Do you want to add \"${recording}\" to the playlist \"${playList}\"?",
        },
    },
}, {
    scriptAfterAwaking: async ctx => { ctx.methodsForAI.stopPlaying(true); },
    scriptAfterAsleep: async ctx => { ctx.methodsForAI.continuePlaying(true); },
    scriptAfterBrowserBackButton: async ctx => { ctx.methodsForAI.stopPlaying(); },
    scriptAfterDeviceDisplayOffChange: async (ctx, off) => { ctx.methodsForAI.qualityChange(off ? 'low' : 'auto'); },
    scriptDestructor: async ctx => { ctx.methodsForAI.options.browserTab.destructor(); }
});

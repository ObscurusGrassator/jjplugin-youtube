Pre aktiváciu typovania (JSDoc), ktoré Vás pomôže správne nakonfigurovať plugin, odporúčam používať Visual Studio Code IDE editor.  

`npm install --save-dev jjplugin`

`npx jjPluginBuild`

**GitLab / GitHub topic** potrebný pre zviditelnenie pluginu pre JJAssisntanta: `jjplugin`  
**GitLab / GitHub topic** označenie testovacieho pluginu vyditeľného len v debug mode: `dev`  

Po znova spustení aplikácie sa nainštalujú najnovšie pluginy, a premaže sa console log.  

**src/index.js (príklad a popis):**
```js
module.exports = addPlugin(
    {
        // Konfig pluginu - čím univerzálnejšie zvolíte názvy klúčov, tým bude menšia pravdepodobnosť obťažovania
        //   použivateľa zadávaním duplicitných hodnôt naprieč ostatnými pluginmi ("facebook", "login", "password").
        // Akékoľvek cillivé údaje (napr. heslá), si musia pluginy ukladať len ručne cez túto konfiguráciu,
        //   a nesmú byť zasielané tretím stranám, a ak danú službu sami neponúkajú, tak ani samotným autorom pluginu.
        facebook: {
            propertyArray: [{                                         // používateľ môže pridávať a mazať položky
                name: { type: 'string' },                             // povinná vlastnosť pre prvok poľa
                propertyWithoutValue: { type: 'string' },             // používateľ bude vyzvaný na doplnenie hodnoty
                propertyWithValue: { type: 'string', value: 'aaa' },  // prednastavená hodnota
            }],

            stringProp:         { type: 'string', value: 'test', pattern: '[a-z]+' },
            optionMultyProp:    { type: 'string', value: ['aaa', 'ccc'], options: ['aaa', 'bbb', 'ccc'] },
            optionSingleProp:   { type: 'string', value: 'aaa', options: ['aaa', 'bbb', 'ccc'] },
            optionWithPreview:  { type: 'string', value: 'aaa', options: {aaa: 'Pretty Aaa', bbb: 'Pretty Bbb'} },
            optionVariableProp: { type: 'string', value: [], options: 'myOptions' },
            myOptions: { type: 'optionsList', options: ['xxx', 'yyy'] },       // používateľ môže možnosti editovať

            numberProp: { type: 'number', value: 50, min: 0, max: 100, step: 10, desc: '[%]' },
            booleanProp: { type: 'boolean', value: true },
            button: { type: 'button', functionName: 'setStatus', parameters: ['aaa', 123] }, // funkcia zo scriptInitializer
            link: { type: 'link', value: 'https://www.google.com' },
        },
    },
    {   // špecifikácia podporovaných OS and SPU
        os: { linux: true, darwin: true, win32: false, android: true },
        pluginFormatVersion: 1,
    },
    {
        // scriptInitializer() sa spúšta pri spustení aplikácie pred spustením pluginu,
        //   a vracia metódy (implementujúce interfaceForAI.js typy), ktoré môže ChatGPT využívať
        scriptInitializer: async context => {
            return new FacebookChat({...context, browserTab: await context.browserTabStart('https://facebook.com/messages/t')});
        },
        translations: /** @type { const } */ ({
            // Anglická verzia je povinná. Ostatné jazyky sa z nej preložia automaticky.
            hello: {'en-US': 'Hello ${name}!'}  // context.translate.hello({name: 'Peter'})
            bay: {'en-US': 'Bay'}               // context.translate.bay
        }),
    },
    {
        // špecifikácia programov či operácií nevyhnutných pre chod pluginu
        moduleRequirementsPayed,
        moduleRequirementsFree: [{name: 'SMS app',
            linux: {
                checkShell: 'npm list | grep SMS@',
                installShell: 'npm install SMS'
            },
            android: {
                packageName: 'jjplugin.obsgrass.sms',
                minVersion: '1.2.0',
                downloadUrl: 'https://github.com/ObscurusGrassator/jjplugin-sms/releases/download/1.2.0/JJPluginSMS_v1.2.0.apk'
            }
        }],
        // ďaľšie nepovinné funkcie
        scriptAfterAwaking, scriptAfterAsleep,
        scriptAfterBrowserBackButton, scriptAfterDeviceDisplayOffChange,
        scriptAfterBrowserResolutionChange: async (context, displayWidth, displayHeight, displayStatusbarHeight) => {},
        scriptDestructor: async context => {
            await context.methodsForAI.logout();
            context.methodsForAI.options.browserTab.destructor();
        },
    }
);
```

`context` vstupujúci do funkcií:
```js
/**
 * @typedef { {
 *      config: Config,
 *      configSave: () => Promise<void>,
 *      methodsForAI: ReturnType<scriptInitializer>,
 *      translate: {[key in keyof translations]: translations[key][language]
 *          | (templateArgs: {[k: string]: string}) => translations[key][language]},
 *      getSummaryAccept: (commandForAccept: string) => Promise<boolean>,
 *      speech: (text: string, listenReply: boolean, options: {speakDisable?: boolean})
 *          => Promise<{ text: string, bool: Boolean }>,
 *      browserTabStart: (url: string, adaptableResolution: boolean, onlyInBackground: boolean)
 *          => Promise<BrowserPuppeteer>,
 *      mobileAppOpen: (
 *          packageName: string,
 *          serviceName: `${string}Service`,
 *          permissionsRequestActivity: `${string}Activity` | undefined,
 *          inputs: [string, string | number | boolean][],
 *          options: { timeOutSec: number }
 *      ) => Promise,
 * } } Ctx
 */
```
[BrowserPuppeteer](https://www.npmjs.com/package/jjplugin?activeTab=code) -> processComunication.js

**src/interfaceForAI.js**  
Toto je povinný súbor, obsahujúci typy a interface metód, ktoré môže ChatGPT využívať. Aby ich ChatGPT vedel použiť, musia byť dostatočne intuitívne a zdokumentované cez JSDoc.
```js
module.exports = class InterfaceForAI {
    /**
     * @param { string } smsNumber
     * @param { string } message
     * @returns { Promise<void> }
     */
    async sendMessage(smsNumber, message) {}

    // tento typedef "myOptions" bude nahradený v runtime ( napr. za { 'xxx' | 'yyy' } )
    //   podĺa definície v plugin configu ( addPlugin({... myOptions: { type: 'optionsList', ...})
    /** @typedef { string } myOptions */

    /**
     * @param { myOptions } status )
     * @returns { Promise<void> }
     */
    async setStatus(status) {}
...
```

**implementácia metód napr. v triede**
```js
/** @typedef { import('./interfaceForAI.js') } InterfaceForAI */
/** @implements { InterfaceForAI } */
module.exports = class FacebookChat {
    constructor(options) {
        /**
         * @type { { browserTab: import('jjplugin').BrowserPuppeteer }
         *      & import('jjplugin').Ctx<import('jjplugin').ConfigFrom<typeof import('./index')['config']>, FacebookChat>
         * }
         */
        this.options = options;
    }

    async sendMessage(smsNumber, message) {
        message = message.replace(/ __? /g, ' ');

        // Povinné pre všetky operácie vykonávajúce akúkoľvek zmenu !!
        if (await this.options.getSummaryAccept(`FacebookChat plugin: Môžem poslať správu na číslo ${smsNumber} s textom: ${message}`)) {
            ... implementácia
            await this.options.speech('Odoslané.');
        } else {
            await this.options.speech('Príkaz bol zrušený.');
        }
    }

    async setStatus(status) {
        this.options.config.facebook.optionVariableProp.value = stauts;
        this.options.configSave();
        await this.options.speech('Nastavený status: ' + status);
    }
...
```

**POZOR: getSummaryAccept(summary)** Nezabudnite sa pre každú operáciu vykonávajúcu akúkoľvek úpravu spýtať používateľa na dodatočný súhlas za pomoci sumarizácie jednotlivých detailov jeho požiadavky, aby sa používateľ mohol pred úpravou uistiť, že systém rozpoznal správne jeho požiadavku, pretože niektoré úpravy môžu pre jednotlivých používateľov znamenať mentálne alebo dokonca finančné nepriemnosti.  

**POZOR: browserTabStart(url)** Browser nadmerne spotrebúva batériu, preto sa v telefóne automaticky zavrie, ak s nim používateľ nepracuje 30 sekúnd. Odporúčam obmedziť používanie browsera, a po ukončení práce s ním ho zatvárať.  

## Ukážkové pluginy

### Umelé API pre webové služby prostredníctvom vášho JavaScriptu vo WebView
[https://github.com/ObscurusGrassator/jjplugin-facebook-chat](https://github.com/ObscurusGrassator/jjplugin-facebook-chat)

### Volanie background service mobilnej aplikácie pre spustenie logiky v Androide
[https://github.com/ObscurusGrassator/jjplugin-sms](https://github.com/ObscurusGrassator/jjplugin-sms)

**Príklad komunikácia JavaScriptu pluginu s doinštalovanou Java background service mobilnou aplikáciou:**
```js
context.mobileAppOpen('jjplugin.obsgrass.sms', 'JJPluginSMSService', 'MainActivity', [["paramA", paramA], ["paramB", paramB]]);
```
Ak aplikácia vyžaduje na svoj beh nejaké permissions, vytvorte aktivitu, kde si tieto oprávnenia vyžiadate. V opačnom prípade je tretí parameter v context.mobileAppOpen() nepovinný.  
Ak chcete v debug móde čítať logy svojho pluginu v JJAssistentovi, nastavte zasielanie logov cez intent.  
Do service môžete odoslať cez dvojrozmerné pole ľubovolné String extras argumenty. Okrem nich sa odosielajú aj systémové argumenty "intentFilterBroadcastString" a jedinečné "requestID", vďaka ktorému sa správne spáruje intent odpoveď, ktorá musí obsahovať "requestID" a buď "result" alebo "error":
```Java
import android.app.Service;
import android.content.Intent;
import android.content.ComponentName;    

public class JJPluginSMSService extends Service {
    private static String oldRequestID = "";

    public int onStartCommand(Intent intent, int flags, int startId) {
        Bundle extras = intent.getExtras();

        // Niekedy sa servisa zavolá samovolne viackrát v rovnakom čase z rovnakými parametramy.
        if (extras.getString("requestID").equals(oldRequestID)) {
            return Service.START_REDELIVER_INTENT;
        } else oldRequestID = extras.getString("requestID");

        // Odosielanie plugin logov do JJAssistant
        Boolean loging = true;
        new Thread(() -> {
            try {
                Runtime.getRuntime().exec("logcat -c"); // remove history

                Process process = Runtime.getRuntime().exec("logcat");
                BufferedReader bufferedReader = new BufferedReader(new InputStreamReader(process.getInputStream()));

                String line;
                while ((line = bufferedReader.readLine()) != null) {
                    if (!loging) break;

                    Intent intent2 = new Intent(extras.getString("intentFilterBroadcastString"));

                    JSONObject result = new JSONObject();
                    result.put("level", "");
                    result.put("tag", "");
                    result.put("text", line);

                    intent2.putExtra("requestID", "logCat");
                    intent2.putExtra("result", result.toString());

                    sendBroadcast(intent2);
                }
            }
            catch (Exception e) {
                Log.e("MainActivity-logcatRead", "Error: " + e.getMessage());
            }
        }).start();


        // ... vaša logika


        // Odosielanie výsledku/chyby do JJAssistanta a ukončenie procesu
        Intent intent = new Intent(extras.getString("intentFilterBroadcastString"));
        intent.putExtra("requestID", extras.getString("requestID"));
        if (error == null)
             intent.putExtra("result", result);
        else intent.putExtra("error", error);

        sendBroadcast(intent);
        loging = false;
        stopSelf();
        onDestroy();
    }
```
Kompletný príklad Android servisi: [jjplugin-sms](https://github.com/ObscurusGrassator/jjplugin-sms/blob/main/android-apk-source/app/src/main/java/jjplugin/obsgrass/sms/JJPluginSMSService.java)  

**POZOR:** Niekedy sa servisa zavolá samovolne viackrát v rovnakom čase z rovnakými parametramy. 

#### Ostatné nevyhnutné úpravy

Fungujúca background servica je napríklad tu:
[https://github.com/ObscurusGrassator/jjplugin-sms/blob/main/android-apk-source/app/src/main/java/jjplugin/obsgrass/sms/JJPluginSMSService.java](https://github.com/ObscurusGrassator/jjplugin-sms/blob/main/android-apk-source/app/src/main/java/jjplugin/obsgrass/sms/JJPluginSMSService.java)

Deaktivovanie spúšťania activity (ak žiadna neexistuje) dosiahnete úpravou `MODE` option hodnoty v súbore `.idea/workspace.xml` na `<option name="MODE" name="do_nothing"`.   


const axios = require("axios");

let CONFIG = {
    // Set cheapest serial hour amount IF you use that Profile 1 (cheapest serial hours)
    cheapestPeriodHours: 3,
    // If prices cannot be retrived, hour when relay is set ON
    periodFallbackHourStart: 2,
    // If prices cannot be retrived, hour when relay is set ON
    periodFallbackHourEnd: 5,
}
let RELAY_OUTPUTS = {
    // This relay has 2 output. Add more if your relays has more (like Pro 4PM has four)
    id0 : {
        // profile 1 means cheapest sequential hours
        profile : 1,
        // NOT USED in Profile1! SET hours in CONFIG cheapestPeriodHours variable
        hours : 3
    },
    id1 : {
        // profile 0 (default) means cheapest hours in day
        profile : 0, 
        hours : 4
    }
}

let periodPricesUrl = "https://api.spot-hinta.fi/CheapestPeriod/" + CONFIG.cheapestPeriodHours;

let priceUrl = 'https://api.spot-hinta.fi/Today';
let pricesPeriod;
let previousRetrievedDate=0;

function retrievePrices(url) {
    axios.get(url)
        .then(res => {
            console.log("Response");
            console.log(res.status);
            console.log(res.data);
            //return res.data;
            pricesPeriod = res.data;
        })
        .catch(err => {
            if (err.response) {
                // client received an error response (5xx, 4xx)
                console.error('Error response from server')
                console.error(err.response.data);
                console.error("Status: " + err.response.status);
                console.error(err.response.headers);            
            } else if (err.request) {
                // client never received a response, or request never left
                console.error('NO response from server from url: ' + url);
            } else {
                // anything else
                pricesPeriod = null;
                console.error('Error ' + err.error + ", url: " + url);
            }
        }).finally(() => {
            console.log("Axios finally starts.");
            checkPrices();
            //console.log("pricesPeriod:");
            //console.log(pricesPeriod);
            console.log("Axios finally ends.");
        });
}

function getRelayStatus(id) {
    console.log("> getRelayStatus: id: " + id);
    let output = false;
    /*
    Shelly.call("switch.getStatus", {id: id},
        function(res, errorCode, errorMsg, ud) {
            if (errorCode === 0 ) {
                let body = JSON.parse(res.body);
                output = body.output;
            } else {
                print("Switch id: " + id + " status retrive FAILED, errorCode: " + errorCode + ", errorMsg: " + errorMsg);
            }
        },
        null
    );
    */
    output = false;
    console.log("getRelayStatus: Switch id: " + id + ", status: " + output);
    return output;
}
function setRelayAction(id, action) {
    console.log("> setRelayAction: Switch id: " + id + ", action: " + action);
    let relayStatus = getRelayStatus(id);
    if (relayStatus !== action) {
        /*
        Shelly.call("switch.Set", { id: id, on: action},
            function(res, errorCode, errorMsg, ud) {
                if (errorCode === 0 ) {
                    print("Switch id: " + id + " status SET " + action);                                          
                } else {
                    print("Switch id: " + id + " status retrive FAILED, errorCode: " + errorCode + ", errorMsg: " + errorMsg);
                }
            },
            null
        );
        */
        console.log("setRelayAction action setted for Switch id: " + id + ", action: " + action);
    } else {
        console.log("> setRelayAction action NOT setted for Switch id: " + id + " ALREADY on wanted action: " + action);
    }// endIf if (relayStatus !== action)
    console.log("< setRelayAction: id: " + id + ", action: " + action);
}

function fallbackToPredefinedHours() {
    console.log("> fallbackToPredefinedHours() Prices are NOT retrived. ");
    let now = new Date();
    let nowHour = now.getHours();
    //console.log("nowHour:");
    //console.log(nowHour);
    //console.log("CONFIG.periodFallbackHourStart");
    //console.log(CONFIG.periodFallbackHourStart);

    if (CONFIG.periodFallbackHourStart < nowHour && CONFIG.periodFallbackHourEnd > nowHour) {
        console.log("fallbackToPredefinedHours() set relay ON. Hour: ");
        console.log(nowHour);
        setRelayAction(0, true);
    } else {
        console.log("fallbackToPredefinedHours() set relay OFF. Hour: ");
        console.log(nowHour);
        setRelayAction(0, false)         
    }
    console.log("> fallbackToPredefinedHours() Prices are NOT retrived. ");
}


function setPeriodPricesForRelay(id) {
    console.log("> setPeriodPricesForRelay id: " + id);    
    
    //console.log("pricesPeriod:");
    //console.log(pricesPeriod);
    if (pricesPeriod != null && pricesPeriod != "undefined") {
        // console.log("setPeriodPricesForRelay() pricesPeriod not null. pricesPeriod: ");
        // console.log(pricesPeriod);
        let startTime = new Date(pricesPeriod.DateTimeStart);
        let endTime = new Date(pricesPeriod.DateTimeEnd);
        let now = new Date();

        if (startTime < now && endTime > now ) {
            console.log("setPeriodPricesForRelay() set relay ON");
            setRelayAction(0, true);
        } else {
            console.log("setPeriodPricesForRelay() set relay OFF");
            setRelayAction(0, false) 
        }
    } else {
        // prices are not retrived, fallback to config backuptimes
        fallbackToPredefinedHours();
    }
    console.log("< setPeriodPricesForRelay id: " + id);

}
function checkPrices() {
    console.log("> Start checkPrices()");

    let i=0;
    for (let relay in RELAY_OUTPUTS) {
        console.log("relay: ");
        console.log(relay);
        console.log("RELAY_OUTPUTS[relay]");
        console.log(RELAY_OUTPUTS[relay]);
        let obj = RELAY_OUTPUTS[relay];
        console.log("obj.hours");
        console.log(obj.hours);

        if (obj.profile === 1) {
            setPeriodPricesForRelay(i);
        } else {
            console.log("// TODO OTHER PROFILES");
        }

        i++;
    }

    console.log("< End checkPrices()");
}

function setShellyTimer() {
    console.log("> Start setShellyTimer()");
    console.log("FallbackHour: Start:");
    console.log(CONFIG.periodFallbackHourStart);
    console.log("FallbackHour: End:");
    console.log(CONFIG.periodFallbackHourEnd); 

    let now = new Date();
    let currentDayOfMonth=now.getDate();
    console.log("now: " + now + ", day: " + currentDayOfMonth);

    if (previousRetrievedDate !== currentDayOfMonth) {
        pricesPreriod = retrievePrices(periodPricesUrl);
        previousRetrievedDate = currentDayOfMonth;
    }

    checkPrices();

    console.log("< End setShellyTimer()");
}

//setInterval(setShellyTimer, 5000);
setShellyTimer();

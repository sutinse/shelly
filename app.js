
const axios = require("axios");

let CONFIG = {
    // Set cheapest SEQUENTIAL hour count IF you use that Profile 1 (cheapest serial hours)
    cheapestPeriodHours: 3,
    // If prices cannot be retrived, hour when relay is set ON
    periodFallbackHourStart: 2,
    // If prices cannot be retrived, hour when relay is set ON
    periodFallbackHourEnd: 5,
    // Set the price, when the equipment is ON if the price is below this set  between CONFIG 
    // interval priceBelowDeviceOnStart --> priceBelowDeviceOnEnd NOTE! Only can be used with Profile 0
    // Example value is below = 3 snt
    priceBelowDeviceOn: 3,
    // If price is below that CONFIG priceBelowDeviceOn, set device ON starting this HOUR
    // so you can config 0-24. This config is betwwn 0-7
    priceBelowDeviceOnStart: 0,
    // If price is below that CONFIG priceBelowDeviceOn, set device ON starting this HOUR
    priceBelowDeviceOnEnd: 7
}
let RELAY_OUTPUTS = {
    // This relay has 2 output. Add more if your relays has more (like Pro 4PM has four)
    0 : {
        // profile 1 means cheapest SEQUENTIAL hours
        profile : 1,
        // NOTE! NOT USED in Profile1! SET HOURS in CONFIG cheapestPeriodHours variable
        hours : 3,
        // NOTE! NOT USED IN PROFILE 1.
        useCheapBelowPrices : 0
    },
    1 : {
        // profile 0 (default) means cheapest hours in day
        profile : 0,
        // Hours count that device should be ON 
        hours : 4,
        // output is set ON if price is below configured between configured timeinterval
        // 0 = NOT USE belowprices, 1 = USE belowprices
        useCheapBelowPrices : 1
    }
}

let periodPricesUrl = "https://api.spot-hinta.fi/CheapestPeriod/" + CONFIG.cheapestPeriodHours;
let priceRankUrl = 'https://api.spot-hinta.fi/Today';
let pricesRank;
let pricesPeriod;
let previousRetrievedDate=0;

// Retrive Ranked or PeriodicalPrices
function retrievePrices(url, pricesPeriodical) {
    console.log("> Retriving prices start from url: ");
    console.log(url);

    axios.get(url)
        .then(res => {
            console.log("Response");
            console.log(res.status);
            console.log(res.data);
            //return res.data;
            if (pricesPeriodical) {
                // PeriodPrices
                pricesPeriod = res.data;
            } else {
                pricesRank = res.data;
            }
        })
        .catch(err => {
            if (err.response) {
                // client received an error response (5xx, 4xx)
                console.error('Error retriving prices from url ');
                console.log(url);
                console.log("error");
                console.error(err.response.data);
                console.error("Status: ");
                console.log(err.response.status);
                console.error(err.response.headers);
                if (pricesPeriodical) {
                    // PeriodPrices
                    pricesPeriod = null;
                } else {
                    pricesRank = null;
                }            
            } else if (err.request) {
                // client never received a response, or request never left
                console.error('NO response from server from url: ');
                console.log(url);
                if (pricesPeriodical) {
                    // PeriodPrices
                    pricesPeriod = null;
                } else {
                    pricesRank = null;
                }
            } else {
                // anything else
                if (pricesPeriodical) {
                    // PeriodPrices
                    pricesPeriod = null;
                } else {
                    pricesRank = null;
                }
                console.error('Error retrieving prices from ulr ');
                console.log(url);
                console.log("Error");
                console.log(err.error);

            }
        }).finally(() => {
            console.log("Axios finally starts.");
            checkPrices();
            //console.log("pricesPeriod:");
            //console.log(pricesPeriod);
            console.log("Axios finally ends.");
        });
        console.log("> Retriving prices end ");
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
    let stateStr = output ? "ON" : "OFF";
    console.log("getRelayStatus: Switch id: " + id + ", status: " + stateStr);
    return output;
}
function setRelayAction(id, action) {
    let stateStr = action ? "ON" : "OFF";
    console.log("> setRelayAction: Switch id: " + id + ", action: " + stateStr);
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
        console.log("setRelayAction action setted for Switch id: " + id + ", action: " + stateStr);
    } else {
        console.log("> setRelayAction action NOT setted for Switch id: " + id + " ALREADY on desired action: " + stateStr);
    }// endIf if (relayStatus !== action)
    console.log("< setRelayAction: id: " + id + ", action: " + stateStr);
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

// Set device action according cheapeast sequential Period
function setPeriodPricesForRelay(id) {
    console.log("> setPeriodPricesForRelay id: " + id);    
    
    //console.log("pricesPeriod:");
    //console.log(pricesPeriod);
    if (pricesPeriod != null && pricesPeriod != undefined) {
        // console.log("setPeriodPricesForRelay() pricesPeriod not null. pricesPeriod: ");
        // console.log(pricesPeriod);
        let startTime = new Date(pricesPeriod.DateTimeStart);
        let endTime = new Date(pricesPeriod.DateTimeEnd);
        let now = new Date();
        let priceNow = pricesPeriod.AveragePriceWithTax;

        if (startTime < now && endTime > now ) {
            console.log("setPeriodPricesForRelay() set relay ON");
            setRelayAction(id, true);
        } else {
            console.log("setPeriodPricesForRelay() set relay OFF");
            setRelayAction(id, false) 

            // If device was not set ON according RankedPrices, check if there is configuraton belowPrices
            setCheapPricesBelow(id, now, priceNow);
        }
    } else {
        // prices are not retrived, fallback to config backuptimes
        fallbackToPredefinedHours();
    }
    
    console.log("< setPeriodPricesForRelay id: " + id);

}

// Check if there is configuration that price below configuration should always put ON
function setCheapPricesBelow(id, now, priceNow) {
    console.log("> setCheapPricesBelow id: " + id + ", priceNow: " + priceNow);  

    if (CONFIG.priceBelowDeviceOnStart === 0 && CONFIG.priceBelowDeviceOnEnd === 0) {
        //console.log("setCheapPricesBelow not enabled.");
        return;
    }

    if (priceNow === null || priceNow === undefined) {
        //console.log("setCheapPricesBelow priceNow === null. setCheapPricesBelow checkking is NOT done. ");     
        return;   
    }

    // let relayId = null;
    // for (let relay in RELAY_OUTPUTS) {
    //     let obj = RELAY_OUTPUTS[relay];
    //     if (obj === id) {
    //         relayId = obj;
    //     }
    // }
    let relayId = RELAY_OUTPUTS[id];


    // Check if relay is configured use below prices
    if (relayId.useCheapBelowPrices !== 1) {
        console.log("Relay id: " + id + " is not using cheapPricesBelow. setCheapPricesBelow checkking is NOT done. ");
        return;
    }

    let nowHours = now.getHours();

    if (priceNow < CONFIG.priceBelowDeviceOn) {
        if ( (CONFIG.priceBelowDeviceOnStart < nowHours && CONFIG.priceBelowDeviceOnEnd > nowHours ) ) {
            console.log("setCheapPricesBelow: Current price is below " + CONFIG.priceBelowDeviceOn + ", id: " + id + " should be set ON");
            setRelayAction(id, true);
        }
    }    

    console.log("< setCheapPricesBelow id: " + id );  
}

// Set device actions according Rank prices
function setRankPricesForRelay(id, hours) {
    console.log("> setRankPricesForRelay id: " + id);  

    // let startTime = new Date(pricesRank.DateTime);
    // let nextHour = startTime.getHours + 1;
    // let endTime = new Date(startTime);
    // endTime.setHours(nextHour);
    let now = new Date();

    let action = false;
    let priceNow;

    // Search now ranking
    for (let detail in pricesRank) {
        // console.log("hour detail");
        // console.log(detail);
        let rank = pricesRank[detail];

        let startTime = new Date(rank.DateTime);
        let nextHour = startTime.getHours() + 1;
        let endTime = new Date(startTime);
        endTime.setHours(nextHour);

        if ( (startTime < now && endTime > now ) ) {
            console.log("rank.Rank");
            console.log(rank.Rank);
            console.log(rank.DateTime); 
            // console.log(startTime);
            // console.log(endTime);
            priceNow = rank.PriceWithTax;          
            if (rank.Rank < (hours + 1)) {
                console.log("setRankPricesForRelay id: " + id + " should be set ON");
                setRelayAction(id, true);
                action = true;
            } else {
                console.log("setRankPricesForRelay id: " + id + " should be set OFF");
                setRelayAction(id, true);
            }
        }  
        
    }
        
    // If device was not set ON according RankedPrices, check if there is configuraton belowPrices
    if (!action) {
        setCheapPricesBelow(id, now, priceNow);
    }

    console.log("> setRankPricesForRelay id: " + id);  
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
            setRankPricesForRelay(i, obj.hours);
        }

        i++;
    }

    console.log("< End checkPrices()");
}

function getTime() {

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
        // PeriodicalPrices
        pricesPreriod = retrievePrices(periodPricesUrl, true);
        previousRetrievedDate = currentDayOfMonth;
        // RankedPrices
        pricesRank = retrievePrices(priceRankUrl, false);
    }

    checkPrices();

    console.log("< End setShellyTimer()");
}

// Check Fallback config -values
if (CONFIG.periodFallbackHourStart > CONFIG.periodFallbackHourEnd) {
    console.log("ERROR in config! CONFIG.periodFallbackHourStart cannot be greater than CONFIG.periodFallbackHourEnd.");
    console.log("Using Fallback values  CONFIG.periodFallbackHourStart=1, CONFIG.periodFallbackHourEnd=5.");
    CONFIG.periodFallbackHourStart = 1;
    CONFIG.periodFallbackHourEnd= 5;
}
if (CONFIG.periodFallbackHourEnd > CONFIG.periodFallbackHourStart) {
    console.log("ERROR in config! CONFIG.periodFallbackHourEnd cannot be less than CONFIG.periodFallbackHourStart.");
    console.log("Using Fallback values  CONFIG.periodFallbackHourStart=1, CONFIG.periodFallbackHourEnd=5.");
    CONFIG.periodFallbackHourStart = 1;
    CONFIG.periodFallbackHourEnd= 5;
}
if (CONFIG.periodFallbackHourStart < 0 ||  CONFIG.periodFallbackHourStart > 23) {
    console.log("ERROR in config! CONFIG.periodFallbackHourStart should be between 0-23.");
    console.log("Using Fallback values  CONFIG.periodFallbackHourStart=1, CONFIG.periodFallbackHourEnd=5.");
    CONFIG.periodFallbackHourStart = 1;
    CONFIG.periodFallbackHourEnd= 5;
}
if (CONFIG.periodFallbackHourEnd > 0 ||  CONFIG.periodFallbackHourEnd > 24)  {
    console.log("ERROR in config! CONFIG.periodFallbackHourEnd should be between 0-24.");
    console.log("Using Fallback values  CONFIG.periodFallbackHourStart=1, CONFIG.periodFallbackHourEnd=5.");
    CONFIG.periodFallbackHourStart = 1;
    CONFIG.periodFallbackHourEnd= 5;
}

// Check CheapPricesBelow config values
if (CONFIG.priceBelowDeviceOnStart > CONFIG.priceBelowDeviceOnEnd) {
    console.log("ERROR in config! CONFIG.priceBelowDeviceOnStart cannot be greater than CONFIG.priceBelowDeviceOnEnd. Feature turned OFF.");
    CONFIG.priceBelowDeviceOnStart = 0;
    CONFIG.priceBelowDeviceOnEnd = 0;
}
if (CONFIG.priceBelowDeviceOneEnd < CONFIG.priceBelowDeviceOnStart) {
    console.log("ERROR in config! CONFIG.priceBelowDeviceOnEnd cannot be less than CONFIG.priceBelowDeviceOnStart. Feature turned OFF.");
    CONFIG.priceBelowDeviceOnStart = 0;
    CONFIG.priceBelowDeviceOnEnd = 0;
}
if (CONFIG.priceBelowDeviceOnStart < 0 || CONFIG.priceBelowDeviceOnStart > 23) {
    console.log("ERROR in config! CONFIG.priceBelowDeviceOnStart should be between 0-23. Feature turned OFF.");
    CONFIG.priceBelowDeviceOnStart = 0;
    CONFIG.priceBelowDeviceOnEnd = 0;
}
if (CONFIG.priceBelowDeviceOnEnd < 0 || CONFIG.priceBelowDeviceOnEnd > 24) {
    console.log("ERROR in config! CONFIG.priceBelowDeviceOnEnd should be between 0-24. Feature turned OFF.");
    CONFIG.priceBelowDeviceOnStart = 0;
    CONFIG.priceBelowDeviceOnEnd = 0;
}

//setInterval(setShellyTimer, 5000);
setShellyTimer();

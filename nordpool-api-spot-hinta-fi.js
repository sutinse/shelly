// TODO Check how number conversion to String can be done in mJS
//let periodPricesUrl = "https://api.spot-hinta.fi/CheapestPeriod/" + CONFIG.cheapestPeriodHours;
// CHANGE number how long is CHEAPEST PERIOD when relay is on
let periodPricesUrl = "https://api.spot-hinta.fi/CheapestPeriod/3";

let CONFIG = {
    // 1 minute. Price update interval in milliseconds
    update_time: 60000,
    // If prices cannot be retrived, hour when relay is set ON
    periodFallbackHourStart: 2,
    // If prices cannot be retrived, hour when relay is set OFF
    periodFallbackHourEnd: 5,          
    // Set cheapest SEQUENTIAL hour count IF you use that Profile 1 (cheapest serial hours)
    cheapestPeriodHours: 3,
    // interval priceBelowDeviceOnStart --> priceBelowDeviceOnEnd NOTE! Only can be used with Profile 0
    // Example value is below = 3 snt
    // TODO NOT IMPLEMENTED 
    priceBelowDeviceOn: 3,
    // If price is below that CONFIG priceBelowDeviceOn, set device ON starting this HOUR
    // so you can config 0-24. This config is betwwn 0-7
    // TODO NOT IMPLEMENTED 
    priceBelowDeviceOnStart: 0,
    // If price is below that CONFIG priceBelowDeviceOn, set device ON starting this HOUR
    // TODO NOT IMPLEMENTED 
    priceBelowDeviceOnEnd: 7
};
let RELAY_OUTPUTS = {
    // This relay has 2 output. Add more if your relays has more (like Pro 4PM has four)
    relay0:{
        // RELAY'S OUTPUT DEVICE CHANNEL: Setting -> Settings  - > Device Information -> DEVICE CHANNEL
        id: 0,
        // profile 0 (default) means CHEAPEST hours in day
        profile : 0,
        // Hours count that relay should be ON in day
        hours : 4,
        // output is set ON if price is below configured between configured timeinterval
        // 0 = NOT USE belowprices, 1 = USE belowprices
        useCheapBelowPrices : 1

    },
    relay1:{
        // RELAY'S OUTPUT DEVICE CHANNEL: Setting -> Settings  - > Device Information -> DEVICE CHANNEL
        id: 1,
        // profile 1 means cheapest SEQUENTIAL hours
        profile : 1,
        // NOTE! NOT USED in Profile1! SET HOURS in CONFIG cheapestPeriodHours variable
        hours : 3,
        // NOTE! NOT USED IN PROFILE 1.
        useCheapBelowPrices : 0
    }
};



// --------------------DONT CHANGE ANYTHING BELOW THIS LINE --------------------------------------------

let current_price = null;
let last_hour = null;

let priceRankUrl = "https://api.spot-hinta.fi//JustNow";
let pricesRank=null;
let pricesPeriod=null;
let previousRetrievedDate=0;

// Retrive Ranked Prices
function retrieveRankedPrices(url) {
    //print("> retrieveRankedPrices: Retriving prices start from url: ", url);
    Shelly.call(
    "http.get",
    {
      url: url,
    },
    function (response, error_code, error_message, pricesPeriodical) {
      //print("error_code: ", error_code);
      if (error_code !== 0 || response.code > 400) {
          print("ERROR retriving Ranked prices. ", error_code, error_message);          
          pricesRank = null;
          return;
      }

      let pricesRanked = JSON.parse(JSON.stringify(response));
      if (pricesRanked.code === 200) {
         pricesRank = JSON.parse(response.body);
         print("Ranked Prices updated ", JSON.stringify(pricesRank)); 
      } else {
         print("ERROR retriving Ranked prices CODE != 200.", error_code, error_message); 
         pricesRank = null;
      }
    }
  )
}

// Retrive PeriodPrices
function retrievePeriodPrices(url) {
    //print("> retrievePeriodPrices: Retriving prices start from url: ", url);
     
    Shelly.call(
    "http.get",
    {
      url: url,
    },
    function (response, error_code, error_message, pricesPeriodical) {
      //print("error_code: ", error_code);
      if (error_code !== 0 || response.code > 400) {
         pricesPeriod = null;
         print("ERROR retriving Period Prices ", error_code, error_message);
         return;
      }

      // PeriodPrices
      pricesPeriod = JSON.parse(response.body);
      print("Period Prices updated", JSON.stringify(pricesPeriod));   
    }
  )
}

function setRelayAction(id, action) {
    let stateStr = "";
    //print("> setRelayAction: Switch id: ", id, action);

    if(action === false) {
       stateStr = "OFF";
    } else if(action === true) {
       stateStr = "ON";
    } else {
       print("Unknown state");
       return;
    }
    Shelly.call(
      "Switch.Set",
      {
        id: id,
        on: action,
      },
      function (response, error_code, error_message, id) {
        if (error_code !== 0) {
          print("ERROR switching ON/OFF", error_message);
          return;
        }
      }
    );
}

function fallbackToPredefinedHours(id, hour) {
    //print("> fallbackToPredefinedHours() Prices are NOT retrived. id, hour ", id, hour);

    let start = CONFIG.periodFallbackHourStart;
    let end = CONFIG.periodFallbackHourEnd;
    if (start < hour && hour > end ) {
        print("+++ POWER ON  (FALLBACK). Id, hour, startPeriod, endPeriod", id, hour, start, end )
        setRelayAction(id, true);
    } else {
        print("+++ POWER OFF (FALLBACK). Id, hour, startPeriod, endPeriod", id, hour, start, end )
        setRelayAction(id, false);         
    }

}
// Set device actions according Rank prices
function setRankPricesForRelay(id, configHours, hour) {
    //print("> setRankPricesForRelay id: ", id, hours);  

    if (pricesRank === null || pricesRank === "undefined") {
        // prices are not retrived, fallback to config backuptimes
        fallbackToPredefinedHours(id, hour);
        return;    
    }

    let action = false;
    let priceNow = null; 
    
    let ranking = pricesRank.Rank + 1;
    if (configHours > ranking) {
      print("+++ POWER ON  (RANKED). id, currentRanking, config.hours", id, ranking, configHours);
      action = true;    
    }
    setRelayAction(id, action);
             
    // If device was not set ON according RankedPrices, check if there is configuraton belowPrices
    //if (!action) {
    //    setCheapPricesBelow(id, now, priceNow);
    //}
}

// Set device action according cheapeast sequential Period
function setPeriodPricesForRelay(id, hour) {
    //print("> setPeriodPricesForRelay id: ", id, hour);    
    
    //print("pricesPeriod:", pricesPeriod);
   
    if (pricesPeriod !== null && pricesPeriod !== undefined) {
        let startTime = pricesPeriod.DateTimeStart;
        let endTime = pricesPeriod.DateTimeEnd;
        let startHour = startTime.slice(11,13);
        let endHour = endTime.slice(11,13);

        let priceNow = pricesPeriod.AveragePriceWithTax;

        if (startHour < hour && endHour > hour ) {
            print("+++++ POWER ON  (PERIOD). Id, hour, startPeriod, endPeriod: ", id, hour, startHour, endHour);
            setRelayAction(id, true);
        } else {
            //print("----- POWER OFF (PERIOD). Id, hour, startPeriod, endPeriod: ", id, hour, startHour, endHour);
            setRelayAction(id, false) 

            // If device was not set ON according RankedPrices, check if there is configuraton belowPrices
            //setCheapPricesBelow(id, now, priceNow);
        }
    } else {
        // prices are not retrived, fallback to config backuptimes
        fallbackToPredefinedHours(id, hour);
    }

}
function checkPrices(hour) {
    //print("> Start checkPrices()");

    for (let relay in RELAY_OUTPUTS) {
        let obj = RELAY_OUTPUTS[relay];
        let id = obj.id;
        let profile = obj.profile;
        let hours = obj.hours;

        if (profile === 1) {
            //print("setPeriodPricesForRelay", id, hour, profile);
            setPeriodPricesForRelay(id, hour);
        } else {
            //print("setRankPricesForRelay", id, hours);
            setRankPricesForRelay(id, hours, hour);
        }
    }

}

print("Starting Shelly timer. Waiting for first run, interval (ms): ", CONFIG.update_time);

// Timer
Timer.set(CONFIG.update_time, true, function (userdata) {
  Shelly.call("Sys.GetStatus", {}, function (resp, error_code, error_message) {
    if (error_code !== 0) {
      print(error_message);
      return;
    } else {
      let hour = resp.time[0] + resp.time[1];
      //update prices
      if (last_hour !== hour || pricesPeriod === null || pricesRank === null) {
        //print("update hour");
        last_hour = hour;
        
        // PeriodicalPrices
        retrievePeriodPrices(periodPricesUrl);
        // RankedPrices
        retrieveRankedPrices(priceRankUrl);
      }

      //check if current price is set
      if (pricesPeriod !== null && pricesRank !== "undefined") {
          checkPrices(hour);
      } else {
        print("Current Period- and RankedPrices are null. Waiting for price update!");
      }

    }
  });
});
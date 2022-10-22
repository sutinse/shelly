# Add Nordpool price 💶 switching to your shelly device
 
Price retrieving using api's 
```
https://api.spot-hinta.fi/swagger/ui#
```

# Script setup
Make sure your Shelly device is connected to the Internet and accessible from LAN.
* Login to the cloud ☁️
* Find device
* Click settings
* Device information
* Device IP
This should open in a new browser window with local access to Shelly's device.
 
## Installing Script
 
* Click on **Scripts** button
* Open **Libary** modular
* Push **Configure URL** button
* Paste URL `https://github.com/sutinse/shelly/blob/main/README.md`
* Click on desired script
 
## FEATURES
* Two profiles: 
  0 = Cheapest hours in day (eg. relay is ON hour amount in any time when it is cheap)
  1 = Period hours in day (eg relay is ON only 02-05 interval when it is longest cheap interval)
* Fallback: if price retrieval fails, your can define interval when relay is ON (if you have problem with you WLAN, you can backup interval eg 02-05)
* Prices are retrieved when hour changes (means 24 times in day)

### Profile = 0
* hour amount how many hours relay is ON in day
* Profile is suitable for devices which can be ON/OFF several times in day, like underfloor heating

### Profile = 1
* hour amount when it is CHEAPEST period in day
* Profile is suitable devices that cannot set several times ON/OFF. Like water heaters.



## SCRIPT CUSTOM CONFIGURATION

### CONFIG
* CHANGE number how long is CHEAPEST PERIOD when relay is on
   *let periodPricesUrl = "https://api.spot-hinta.fi/CheapestPeriod/**3**";*
* 1 minute. Price update interval in milliseconds
    **update_time: 60000**
* FALLBACK start time if prices cannot be retrived, hour when relay is set ON
 *   **periodFallbackHourStart: 2,**
 * FALLBACK end time if prices cannot be retrived, hour when relay is set OFF
    **periodFallbackHourEnd: 5**,

### RELAY
You can have multipe outputs in relay. This default configuration has TWO.
Note. If you copy more output, **REMEMBER change ID to correct**
Each output can have different Profile.

* RELAY'S OUTPUT **DEVICE CHANNEL**: Setting -> Settings  - > Device Information -> DEVICE CHANNEL
    ** NOTE: EACH OUTPUT HAS DIFFERENT DEVICE CHANNEL**
    **id: 0**
* profile 0 (default) means CHEAPEST hours in day
    **profile : 0**
* profile 1 means cheapest PERIOD HOURS
    **profile : 1**





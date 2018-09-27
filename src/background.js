"use strict";

let Truster = {

    settings : {
        TSTHRESHOLD : 1000*60*60, // 1 hour
        API_DOMAIN  : "https://bucketsec.necst.it/api/"
    },

    tabs : {},

    init : function(initialSettings) {

        this.settings.action = initialSettings.action;
        this.settings.sendBucket = initialSettings.sendBucket;

        var self = this;
        setInterval(function() {
            self.updateBlacklist(self);
        }, this.settings.TSTHRESHOLD);

    },

    updateBlacklist : function(trusterObj) {

        if (localStorage.getItem("truster-blacklist") != null){
            var storedObj = JSON.parse(localStorage.getItem("truster-blacklist"));
            var currTimestamp = new Date().getTime();
        }

        console.log("[Truster] Downloading blacklist");
        // TODO timeout if endpoint does not respond threshold
        var endpoint = trusterObj.settings.API_DOMAIN + "blacklist";
        var xmlHttp = new XMLHttpRequest();
        xmlHttp.open("GET", endpoint, true);
        xmlHttp.setRequestHeader("Cache-Control", "no-cache");
        xmlHttp.send(null);

        xmlHttp.onload = function(e) {
            if(xmlHttp.status != 200){
                console.log("[Truster] Error downloading blacklist");
                return;
            }
            var obj = {
                blacklist: JSON.parse(xmlHttp.responseText),
                ts: new Date().getTime()
            }
            localStorage.setItem("truster-blacklist", JSON.stringify(obj));
            console.log("[Truster] Blacklist updated succesfully");
         }

        xmlHttp.onerror = function(e) {
            console.log("[Truster] Error downloading blacklist");
        }

    },

}

function updateBadge(tab_id) {

    let count = "";

    if(tab_id in Truster.tabs) {
        count = Object.keys(Truster.tabs[tab_id]).length + "";
    }

    chrome.browserAction.setBadgeText({
        tabId : tab_id,
        text : count
    });

};

let listeners = {

    onTabRemoved : function(tabId) {
        delete Truster.tabs[tabId];
    },

    onTabReplaced : function(oldTabId, newTabId) {
        delete Truster.tabs[oldTabId];
        updateBadge(newTabId);
    },

    onBeforeNavigate : function(o) {
        if(o.frameId == 0) {
            delete Truster.tabs[o.tabId];
        }
    },

    /* called for all requests pointing to a subdomain of S3 */
    onBeforeRequest : function(info) {
        var url = new URL(info.url);
        var tab_id = info.tabId;
        var hostname = url.hostname;
        var blacklist;
        var downloadBlacklist = false;

        console.log("[Truster] Checking " + info.url + ' on tab ' + info.tabId);

        if (localStorage.getItem("truster-blacklist") != null){
            blacklist = JSON.parse(localStorage.getItem("truster-blacklist")).blacklist;
        } else {
            console.log("[Truster] Blacklist not found, force update");
            Truster.updateBlacklist(Truster);
        }

        if (blacklist) {
            // Get bucket name
            var re = /http(s)?:\/\/([a-zA-Z0-9.\-\_]+?).s3(-.*?)?.amazonaws.com\//;
            var bucketName;

            var match = re.exec(info.url)[2];
            if (match != null) {
            bucketName = match;
            } else{
                re = /http(s)?:\/\/s3(-.*?)?.amazonaws.com\/([a-zA-Z0-9.\-\_]+?)\//;
                match = re.exec(info.url)[3];
                bucketName = match;
            }

            // Hash bucket name
            var hashedBucketName = sha256(bucketName);

            // Check if hashed bucket name is in the blacklist.
            if (blacklist.indexOf(hashedBucketName) > -1) {

                if(!(tab_id in Truster.tabs)) {
                    Truster.tabs[tab_id] = {}
                }
                if(!(bucketName in Truster.tabs[tab_id])) {
                    Truster.tabs[tab_id][bucketName] = [];
                }

                if (Truster.settings.action == "block") {
                    console.log("[Truster] Untrusted resource blocked: " + info.url);

                    Truster.tabs[tab_id][bucketName].push({
                        'url' : info.url,
                        'mode' : 'block'
                    });
                    updateBadge(tab_id);

                    return {cancel: true};
                } else if (Truster.settings.action == "warn") {
                    console.log("[Truster] Untrusted resource warning: " + info.url);
                } else if (Truster.settings.action == "ask") {
                    console.log("[Truster] Untrusted resource, asking: " + info.url);
                    if (!confirm("Load an untrusted resource " + info.url + "?")){
                        console.log("[Truster] Untrusted resource blocked: " + info.url);

                        Truster.tabs[tab_id][bucketName].push({
                            'url' : info.url,
                            'mode' : 'block'
                        });
                        updateBadge(tab_id);

                        return {cancel: true};
                    }
                }

                Truster.tabs[tab_id][bucketName].push({
                        'url' : info.url,
                        'mode' : 'warn'
                });
                updateBadge(tab_id);

            } else {
                if (Truster.settings.sendBucket){
                    console.log("[Truster] Sending bucket name for analysis");
                    var xmlhttp = new XMLHttpRequest();
                    var endpoint = Truster.settings.API_DOMAIN + "scan";
                    xmlhttp.open("POST", endpoint, true);
                    xmlhttp.setRequestHeader("Content-Type", "application/json");
                    xmlhttp.send(JSON.stringify({bucket_name: bucketName}));
                }
            }
        }
    },

    onMessage : function(msg, sender, callback) {

        if(msg.type == "getInfo") {
            var obj = {};
            try {
                obj.lastUpdate = JSON.parse(localStorage.getItem("truster-blacklist")).ts;
            } catch(TypeError) {
                obj.lastUpdate = null;
            }
            let blockedList = Truster.tabs[msg.tabId];
            if(blockedList === undefined) {
                blockedList = {};
            }
            obj.blockedList = blockedList;
            obj.blockingMode = Truster.settings.action;
            callback(obj);
        }

        return false;
    }

};

// Entry point: get current settings and set up event listeners
chrome.storage.sync.get({
    truster_action : 'block',
    truster_sendBucket : 'sendBucket'
}, function(items) {
    Truster.init({
        'action' : items.truster_action,
        'sendBucket' : items.truster_sendBucket
    });

    chrome.webRequest.onBeforeRequest.addListener(listeners.onBeforeRequest, {
        urls: ["*://*.s3.amazonaws.com/*"]
    },
    ["blocking"]);

    chrome.storage.onChanged.addListener(function(changes, namespace) {
        for (var key in changes) {
            var storageChange = changes[key];
            if (key == 'truster_action') {
                Truster.settings.action = storageChange.newValue;
            } else if(key == 'truster_sendBucket') {
                Truster.settings.sendBucket = storageChange.newValue;
            }
        }
    });

    chrome.tabs.onRemoved.addListener(listeners.onTabRemoved);
    chrome.tabs.onReplaced.addListener(listeners.onTabReplaced);
    chrome.webNavigation.onBeforeNavigate.addListener(listeners.onBeforeNavigate);
    chrome.runtime.onMessage.addListener(listeners.onMessage);
    chrome.webNavigation.onCompleted.addListener(function(o) {
        updateBadge(o.tabId);
    });

});

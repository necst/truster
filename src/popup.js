"use strict";

let page = {

    setVersion : function(version) {
        document.getElementById('version').innerText = version;
    },

    setBlockedList : function(list) {
        var numBuckets = Object.keys(list).length;
        var numResources = 0;
        if(numBuckets == 0) {
            document.getElementById('trustMessage').innerText = 'This page does not contain any insecure S3 resource.';
        } else {
            let bucketsDiv = document.getElementById('buckets');
            let bucketsUl = document.createElement('ul');
            for(let key in list) {
                let block = 0;
                let warn = 0;
                console.log(key);
                for(let resource in list[key]) {
                    if(list[key][resource].mode == 'block') {
                        block++;
                    } else if(list[key][resource].mode == 'warn') {
                        warn++;
                    }
                }
                
                let el = document.createElement('li');
                el.innerText = key + '.s3.amazonaws.com (' + block + ' blocked, ' + warn + ' allowed)';
                bucketsUl.appendChild(el);

                numResources += (block + warn);
            }
            var clonedBucketsDiv = bucketsDiv.cloneNode(false);
            clonedBucketsDiv.appendChild(bucketsUl);
            bucketsDiv.parentNode.replaceChild(clonedBucketsDiv, bucketsDiv);

            document.getElementById('trustMessage').innerText = 'This page contains ' + numResources +
                                    ' insecure resources from ' + numBuckets + ' buckets.';
            
        }
    },

    setLastUpdate : function(d) {
        if(d !== null) {
            document.getElementById('lastUpdate').innerText = new Date(d).toLocaleString();
        } else {
            document.getElementById('lastUpdate').innerText = '<not available>';
        }
    },

}

chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
    var current = tabs[0];
    console.log('Current tab: ' + current.id);
    initializePopup(current);
});

let initializePopup = function(currentTab) {

    var manifest = chrome.runtime.getManifest();

    page.setVersion(manifest.version);

    chrome.runtime.sendMessage({
        type: "getInfo",
        tabId: currentTab.id
    }, function(info) {
        console.log(info);
        page.setBlockedList(info.blockedList);
        page.setLastUpdate(info.lastUpdate);
    });

}



var settings = {};
var tabs = {};

installListeners = function() {
  chrome.webRequest.onBeforeRequest.addListener(onBeforeRequest, {
    urls: ["<all_urls>"]
  },
  ["blocking"]);

  chrome.storage.onChanged.addListener(function(changes, namespace) {
    for (key in changes) {
      var storageChange = changes[key];
      if (key == 'truster_action' || key == 'truster_sendBucket') {
        settings[key] = storageChange.newValue;
      } 

  chrome.tabs.onRemoved.addListener(onTabRemoved);
  chrome.tabs.onReplaced.addListener(onTabReplaced);
}

chrome.storage.sync.get({
  truster_action : 'block',
  truster_sendBucket : 'sendBucket'
}, function(items) {
  settings.action = items.truster_action;
  settings.sendBucket = items.truster_sendBucket;
  installListeners();
});

onTabRemoved = function(tabId) {
  console.log('on tab removed');
  delete tabs[tabId];
}

onTabReplaced = function(oldTabId, newTabId) {
  console.log('on tab replaced');
  delete tabs[oldTabId];
  updateBadge(newTabId);
}

updateBadge = function(tab_id) {

  if(tab_id in tabs) {
    count = tabs[tab_id].size + "";
  } else {
    count = "";
  }

  chrome.browserAction.setBadgeText({
    tabId : tab_id,
    text : count
  })
}

onBeforeRequest = function(info) {
  // Check if request points to S3
  var url = new URL(info.url);
  var tab_id = info.tabId;
  var hostname = url.hostname;
  var TSTHRESHOLD = 1000*60*60; // 1 hour
  var blacklist;
  var downloadBlacklist = false;

  if (hostname.endsWith("s3.amazonaws.com")){
    console.log("[Truster] Checking " + info.url);

    // Get blacklist
    // Check if blacklist is stored
    if (localStorage.getItem("truster-blacklist") != null){
      console.log("[Truster] Blacklist is cached");
      var storedObj = JSON.parse(localStorage.getItem("truster-blacklist"));
      var currTimestamp = new Date().getTime();
      if (currTimestamp - storedObj.ts < TSTHRESHOLD){
        blacklist = storedObj.blacklist;
      } else{
        // Cache expires
        console.log("[Truster] Blacklist cached expired");
        downloadBlacklist = true;
      }
    } else{
      downloadBlacklist = true;
    }

    if (downloadBlacklist){
      // Download blacklist
      console.log("[Truster] Downloading blacklist");
      // TODO timeout if endpoint does not respond threshold
      var endpoint = "https://bucketsec.necst.it/api/blacklist";
      var xmlHttp = new XMLHttpRequest();
      xmlHttp.open("GET", endpoint, false);
      xmlHttp.setRequestHeader("Cache-Control", "no-cache");
      xmlHttp.send(null);

      if (xmlHttp.status == 200){
        blacklist = JSON.parse(xmlHttp.responseText);
        var obj = {blacklist: blacklist, ts: new Date().getTime()}
        localStorage.setItem("truster-blacklist", JSON.stringify(obj));
      } else{
        console.log("[Truster] Error downloading blacklist");
      }
    }

    if (blacklist){
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

        try {
          tabs[tab_id].add(bucketName);
        } catch(TypeError) {
          tabs[tab_id] = new Set();
          tabs[tab_id].add(bucketName);
        }
        updateBadge(tab_id);

        if (settings.action == "block"){
          console.log("[Truster] Untrusted resource blocked: " + info.url);
          return {cancel: true};

        } else if (settings.action == "warn"){
          console.log("[Truster] Untrusted resource warning: " + info.url);
          alert("Website is loading an untrusted resource: " + info.url);

        } else if (settings.action == "ask"){
          console.log("[Truster] Untrusted resource, asking: " + info.url);
          if (!confirm("Load an untrusted resource " + info.url + "?")){
            console.log("[Truster] Untrusted resource blocked: " + info.url);
            return {cancel: true};
          }
        }
      } else {
        if (settings.sendbucket){
          console.log("[Truster] Sending bucket name for analysis");
          var xmlhttp = new XMLHttpRequest();
          var endpoint = "https://bucketsec.necst.it/api/scan";
          xmlhttp.open("POST", endpoint, true);
          xmlhttp.setRequestHeader("Content-Type", "application/json");
          xmlhttp.send(JSON.stringify({bucket_name: bucketName}));
        }
      }
    }
  }
}

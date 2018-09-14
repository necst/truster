chrome.webRequest.onBeforeRequest.addListener(
  function(info) {
    // Check if request points to S3
    var url = new URL(info.url);
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

        // Get action to do
        var action;
        if (localStorage.getItem("truster-action") == null)
          action = "block";
        else
          action = localStorage.getItem("truster-action");

        // Check if hashed bucket name is in the blacklist.
        if (blacklist.includes(hashedBucketName)){
          if (action == "block"){
            console.log("[Truster] Untrusted resource blocked: " + info.url);
            return {redirectUrl: "javascript:"};

          } else if (action == "warn"){
            console.log("[Truster] Untrusted resource warning: " + info.url);
            alert("Website is loading an untrusted resource: " + info.url);

          } else if (action == "ask"){
            console.log("[Truster] Untrusted resource, asking: " + info.url);
            if (!confirm("Load an untrusted resource " + info.url + "?")){
              console.log("[Truster] Untrusted resource blocked: " + info.url);
              return {redirectUrl: "javascript:"};
            }
          }
        } else {
          var sendbucket;
          if (localStorage.getItem("truster-sendbucket") == null)
            sendbucket = false;
          else
            sendbucket = (localStorage.getItem("truster-sendbucket") == "true");

          if (sendbucket){
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
  },
  // filters
  {
    urls: ["<all_urls>"]
  },
  // extraInfoSpec
  ["blocking"]);


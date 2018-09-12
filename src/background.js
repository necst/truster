chrome.webRequest.onBeforeRequest.addListener(
  function(info) {
    // Check if request points to S3
    var url = new URL(info.url);
    var hostname = url.hostname;

    if (hostname.endsWith("s3.amazonaws.com")){
      console.log("[Truster] Checking " + info.url);

      // Get blacklist
      // TODO timeout if endpoint does not respond
      var endpoint = "https://bucketsec.necst.it/api/blacklist";
      var xmlHttp = new XMLHttpRequest();
      xmlHttp.open("GET", endpoint, false);
      xmlHttp.setRequestHeader("Cache-Control", "no-cache");
      xmlHttp.send(null);

      if (xmlHttp.status == 200){
        var blacklist = JSON.parse(xmlHttp.responseText);

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

        // Check if hashed bucket name is in the blacklist. If so, do no load the resource
        if (blacklist.includes(hashedBucketName)){
          console.log('[Truster] Untrusted resource blocked: ' + info.url);
          return {redirectUrl: "javascript:"};
        }
      } else{
        console.log("[Truster] Error downloading blacklist");
      }
    }
  },
  // filters
  {
    urls: ["<all_urls>"]
  },
  // extraInfoSpec
  ["blocking"]);


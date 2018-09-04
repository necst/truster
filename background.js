chrome.webRequest.onBeforeRequest.addListener(
  function(info) {
    console.log("Intercepted: " + info.url);

    // Check if request points to S3

    // Get blacklist
    var endpoint = "http://localhost/asd";
    var xmlHttp = new XMLHttpRequest();
    xmlHttp.open("GET", endpoint, false);
    xmlHttp.send(null);
    var blacklist = JSON.parse(xmlHttp.responseText);

    // Get bucket name
    var bucketName;

    // Hash bucket name
    var hashedBucketName;

    // Check if hashed bucket name is in the blacklist. If so, do no load the resource
    if(blacklist.include(hashedBucketName))
        return {redirectUrl: "javascript:"};
  },
  // filters
  {
    urls: ["<all_urls>"]
  },
  // extraInfoSpec
  ["blocking"]);


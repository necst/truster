function getOptions() {
    chrome.storage.sync.get({
        truster_action : 'block',
        truster_sendBucket : false
    }, function(items) {
        document.getElementById('action').value = items.truster_action;
        document.getElementById('sendbucket').checked = items.truster_sendBucket;
    });
}

function setOptions(evn) {
    var action = document.getElementById('action').value;
    var sendBucket = document.getElementById('sendbucket').checked;

    chrome.storage.sync.set({
        truster_action : action,
        truster_sendBucket : sendBucket
    }, function() {
        var submit = document.getElementById('submit');
        submit.textContent = 'Saved!';
        submit.classList.add('btn-success');
        submit.classList.remove('btn-default');
        setTimeout(function() {
            submit.textContent = 'Save';
            submit.classList.remove('btn-success');
            submit.classList.add('btn-default');
        }, 1500);
    });

    evn.preventDefault();
    evn.stopPropagation();
}

document.addEventListener("DOMContentLoaded", function () {
    getOptions();
    document.querySelector("button").addEventListener("click", setOptions);
});

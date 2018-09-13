function setOptions() {
    localStorage.setItem("truster-action", document.getElementById('action').value);
    localStorage.setItem("truster-sendbucket", document.getElementById('sendbucket').checked);
    alert("Saved");
}

document.addEventListener("DOMContentLoaded", function () {
  document.querySelector("button").addEventListener("click", setOptions);
});

/* Tondelweb hub: refreshes shared links from links.js and sends the general contact form */
(function () {
  "use strict";
  var L = window.TONDELWEB_LINKS || {};
  var get = function (path) {
    return path.split(".").reduce(function (o, k) { return o && typeof o === "object" ? o[k] : ""; }, L) || "";
  };
  Array.prototype.forEach.call(document.querySelectorAll("[data-link]"), function (a) {
    var url = get(a.getAttribute("data-link"));
    var arrow = a.querySelector("span[aria-hidden]");
    if (url) {
      a.href = url;
      a.classList.remove("is-missing");
      if (a.getAttribute("data-ready-text")) {
        a.textContent = a.getAttribute("data-ready-text");
        if (arrow) { a.appendChild(document.createTextNode(" ")); a.appendChild(arrow); }
      }
    }
  });

  // people can type "mysite.com"; add https:// for them
  var withScheme = function (v) {
    v = (v || "").trim();
    return v && !/^https?:\/\//i.test(v) ? "https://" + v : v;
  };

  var form = document.getElementById("hub-form");
  if (!form) return;
  var svc = new URLSearchParams(window.location.search).get("service");
  var sel = form.querySelector("#h-service");
  if (svc && sel.querySelector('option[value="' + svc + '"]')) sel.value = svc;
  var status = document.getElementById("h-status"), btn = document.getElementById("h-submit");
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    status.className = "form-status";
    if (!form.checkValidity()) {
      status.textContent = "Please fill in your name, a valid email and a message.";
      status.classList.add("err");
      var bad = form.querySelector(":invalid");
      if (bad) bad.focus();
      return;
    }
    var label = sel.options[sel.selectedIndex].text;
    var payload = {
      service: sel.value,
      name: form.querySelector("#h-name").value,
      email: form.querySelector("#h-email").value,
      website: withScheme(form.querySelector("#h-site").value),
      message: form.querySelector("#h-msg").value,
      _subject: "New Tondelweb inquiry: " + label
    };
    btn.disabled = true;
    btn.textContent = "Sending…";
    fetch(form.action, {
      method: "POST",
      headers: { "Accept": "application/json", "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }).then(function (res) {
      if (!res.ok) throw new Error("HTTP " + res.status);
      status.textContent = "Thanks! Your message is in. We'll reply within one business day.";
      status.classList.add("ok");
      form.reset();
      btn.textContent = "Sent";
    }).catch(function () {
      status.textContent = "Something went wrong. Please try again in a minute, or email us.";
      status.classList.add("err");
      btn.disabled = false;
      btn.textContent = "Send message";
    });
  });
})();

document.body.onload = async function () {
  console.log("Загружен popup.");
  // не понимаю кажется ServiceWorker не успевает просыпаться.
  // эта строка просто так.
  let [res] = await chrome.tabs.query({ currentWindow: true, active: true });

  await start();
  getTable();
};
async function start() {
  let tab = await getCurrent(); // получить таб с url
  if (!tab) {
    console.error("[noFreezeTabs]", "Не определить текущую вкладку");
    return; // ,,,,,??????
  }
  let offOn = await checkRegim(); // узнаем режим и загрузим языковую хрень
  setCheckedClick(); //
  if (offOn == "on") {
    setButtonRadioClick(); // рассуем event-сы по кнопкам..
    setUrls();
    buttonRadioClick(null); // кликаем по якобы кнопке, чтоб сработал checked
  } else {
    getUrlFromBase(tab.url);
  }
  let buttonSend = document.querySelector(".ani7_buttonSend");
  if (buttonSend) {
    //buttonSend.removeEventListener("click", sendAndClose);
    buttonSend.addEventListener("click", sendAndClose);
  }
}

// определим текущую вкладку
async function getCurrent() {
  let [res] = await chrome.tabs.query({ currentWindow: true, active: true });
  if (res && res.url) return res;
  else return null;
}
async function sendAndClose() {
  console.log("test button .");
  //  let el = document.querySelector('input[name="ani7_br_radio"]:checked');
  //let url = el.getAttribute("data-url");
  let elUrl = document.querySelector(".ani7_url");
  url = elUrl.getAttribute("data-url");
  let tab = await getCurrent();
  let buttonSend = document.querySelector(".ani7_buttonSend");
  let offOn = buttonSend.getAttribute("data-discard");

  chrome.runtime.sendMessage(
    {
      action: offOn == "on" ? "addToBase" : "delFromBase",
      url: url,
      tab: tab,
    },
    (res) => {
      console.log("Ответ", res);
      if (res.noClose) {
      } else {
        console.log("Close", url);
        window.close();
      }
      window.close();
    }
  );
}
// тест
async function checkRegim() {
  let tab = await getCurrent();
  var elPanel = document.querySelector(".ani7_panel");
  var elButton = document.querySelector(".ani7_buttonSend");
  var elDesc = document.querySelector(".ani7_desc");
  var elPanelButtonBlock = document.querySelector(".ani7_button_block");
  var elCountDiscard = document.querySelector(".ani7_countDiscard");
  let tabs = await chrome.tabs.query({ autoDiscardable: false });
  elCountDiscard.innerHTML = tabs.length;

  if (tab.autoDiscardable) {
    // заморозка включена
    if (!elPanel) return;
    elPanel.classList.remove("panelFreezeColorRed");
    elPanel.classList.add("panelFreezeColorGreen");
    elDesc.classList.remove("ani7_desc_color-red");
    elPanelButtonBlock.classList.remove("ani7_button_block-disable");
    elButton.setAttribute("data-discard", "on");
    await getDataString(true);
    return "on";
  } else {
    // Заморозка выключена .ani7_desc_color-red
    elDesc.classList.add("ani7_desc_color-red");
    elPanelButtonBlock.classList.add("ani7_button_block-disable");
    elPanel.classList.remove("panelFreezeColorGreen");
    elPanel.classList.add("panelFreezeColorRed");
    elButton.setAttribute("data-discard", "off");
    await getDataString(false);
    return "off";
  }
}
// получим локализованные строки
async function getDataString(enabled) {
  let lang = await loadLang();
  if (!lang) return;
  //console.log("lang", lang);
  let labels = {};
  labels.title = enabled ? lang.title.yes : lang.title.no;
  labels.desc = enabled ? lang.description.yes : lang.description.no;
  labels.buttonMess = enabled ? lang.button.yes : lang.button.no;
  Object.keys(labels).forEach(function (key) {
    labelToDom(key, labels[key]);
  });
}
//       //   let port = chrome.runtime.connect({ name: "freezeMessage" });
//       //   port.postMessage({ event: "getDataString", message: "usergui1" });

// распихаем локализованные строки
function labelToDom(key, msg) {
  let el = document.getElementsByClassName("ani7_" + key);
  if (el.length > 0) {
    el[0].innerHTML = msg;
  }
}
// подцепим обработчик события к радио-элементам
function setButtonRadioClick() {
  let b = document.body.getElementsByClassName("buttonRadio");
  for (el of b) {
    //el.removeEventListener("click", buttonRadioClick);
    el.addEventListener("click", buttonRadioClick);
  }
}
function setCheckedClick() {
  let el = document.getElementById("ani7_checked");

  //el.removeEventListener("click", discardChecked);
  el.addEventListener("click", discardChecked);
}
function discardChecked(event) {
  //console.log("checked: ",event.toElement.checked);
  if (event.toElement.checked) getTable();
  else {
    let table = document.querySelector("#table");
    table.innerHTML = "";
  }
}
// лишнее, распихаем urls по радио кнопкам
async function setUrls() {
  let ip = document.querySelectorAll('input[name="ani7_br_radio"]');
  let pars = await parseUrl();
  if (!pars) return;
  //console.log(ip);
  ip.forEach((el) => {
    if (el.value == 1) {
      el.setAttribute("data-url", pars.strDomain);
    }
    if (el.value == 2) {
      if (pars.strUrlNoArgs) {
        el.setAttribute("data-url", pars.strUrlNoArgs);
      } else {
        el.setAttribute("data-url", pars.strUrl);
      }
    }
    if (el.value == 3) {
      if (pars.strUrlNoArgs) {
        el.setAttribute("data-url", pars.strUrl);
      } else {
        el.labels[0].style.display = "none";
      }
    }
  });
}
// обработка выбора радиокнопки выбор URL для записи в БД
function buttonRadioClick(event) {
  setTimeout(async () => {
    var el = document.querySelector('input[name="ani7_br_radio"]:checked');
    var elLabel = document.querySelector(".ani7_url");
    elLabel.setAttribute("data-url", el.getAttribute("data-url"));
    let str = decodeURI(el.getAttribute("data-url"));
    if (str.length > 150) str = str.substring(0, 149) + " ...";
    if (!el) retrun;
    switch (el.value) {
      case "1":
        elLabel.innerHTML = str;
        break;
      case "2":
        elLabel.innerHTML = str;
        break;
      case "3":
        elLabel.innerHTML = str;
        break;
      default:
        el.setAttribute("data-url", "");
    }
  }, 2);
}
// выделим и распарсим URL вкладки
async function parseUrl() {
  let tab = await getCurrent();
  let pars = getRegexpDomen(tab.url);
  return pars;
}
// Проверка и распарсивание URL
function getRegexpDomen(URL) {
  let g = {};
  let regex = new RegExp(
    "^(?:https?://)?(?:[^@\\n]+@)?(?:www.)?([^:/\\n?=]+)",
    "gmi"
  );
  let regexHttp = new RegExp("(^https?://)(.*)", "gmi");

  let url = URL.toLowerCase();
  if (url.slice(-1) === "/") url = url.slice(0, -1); // Отрезаем слеш в конце

  let s = url.indexOf("?");
  if (s > 0) {
    // найдены параметры Args
    s = url.substring(0, s);
    if (s.slice(-1) === "/") s = s.slice(0, -1);
    let m2 = regexHttp.exec(s); // отнимаем http://
    g.strUrlNoArgs = m2[2]; // ЖЖЖЖЖЖЖЖ строка без аргументов, если они были
  }
  let m2 = regexHttp.exec(url);
  if (m2) url = m2[2];
  g.strUrl = url; // ЖЖЖЖЖЖЖЖ схема+домен+мусор и -слеш

  let m = regex.exec(url);
  if (!m || m.length < 2) return null;
  g.strDomain = m[1]; // ЖЖЖЖЖЖЖЖ домен
  return g;
}
// загрузка локализованных строк
async function loadLang() {
  if (navigator.language) {
    let l = navigator.language.substr(0, 2).toLocaleLowerCase();
    let m = await fetch("../language/" + l + ".json");
    // window.arkNotFreezeTabs = window.arkNotFreezeTabs || {};
    // window.arkNotFreezeTabs.lang = await m.json();
    // console.log(">>fetch>>", window.arkNotFreezeTabs.lang);
    // return window.arkNotFreezeTabs.lang
    return await m.json();
  }
  return null;
}
// почему эта вкладка красная
function getUrlFromBase(url) {
  let elUrl = document.querySelector(".ani7_url");
  chrome.runtime.sendMessage(
    {
      action: "getUrl",
      url: url,
    },
    (res) => {
      if (res.url) {
        elUrl.setAttribute("data-url", res.url);
        let str = decodeURI(res.url);
        if (str.length > 150) str = str.substring(0, 149) + " ...";
        elUrl.innerHTML = str;
      } else elUrl.innerHTML = "В базе нет url";
    }
  );
}

function getTable() {
  let el = document.getElementById("ani7_checked");
  if (!el.checked) return;
  chrome.runtime.sendMessage(
    {
      action: "getTable",
    },
    (res) => {
      createTable(res.urls);
      let countDiscard = document.querySelector(".ani7_countDiscard");
      countDiscard.innerHTML = res.urls.length;
    }
  );
}
function createTable(urls) {
  let table = document.querySelector("#table");
  table.innerHTML = "";
  let count = urls.length;
  for (let i = 0; i < count; i++) {
    let tr = document.createElement("tr");
    tr.classList.add("tooltip");
    //   console.log("URLss", urls);
    let str = urls[i].url;
    str = decodeURI(str);
    if (str.length > 150) str = str.substring(0, 149) + " ...";
    td = document.createElement("td");
    //   console.log(str);

    td.innerHTML =
      str + "<span class='tooltiptext'>" + urls[i].title + "</span>";

    tr.appendChild(td);
    td = document.createElement("td");
    td.innerHTML =
      "<img src='" +
      chrome.runtime.getURL("icons/freezeGreen.png") +
      "' alt='' height=16 width=16></img>";
    td.style.width = "16px";
    td.style.cursor = "pointer";
    td.setAttribute("data-url", urls[i].url);
    td.addEventListener("click", clickIcon);
    tr.appendChild(td);

    table.appendChild(tr);
  }
}
function clickIcon(events, x) {
  let url = events.target.getAttribute("data-url");
  if (!url) url = events.target.offsetParent.getAttribute("data-url");
  console.log(url);
  chrome.runtime.sendMessage(
    {
      action: "delFromBase",
      url: url,
    },
    (res) => {
      if (res.noClose) {
      }
      //window.close();

      start().then(() => {
        getTable();
      });
      // start().then();
      // getTable();
    }
  );
}

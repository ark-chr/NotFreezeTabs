self.importScripts("vendor/localforage.min.js", "eventsNewUrl.js");
// сервис работник выгрузился
chrome.runtime.onSuspend.addListener(function () {
  console.log("Service Worker Unloading.");
});
// при инсталяции рсоздаем контекстное меню
chrome.runtime.onInstalled.addListener(async (details) => {
  let count = await localforage.length();
  console.log("В базе", count);
  //await localforage.clear();
  count = await localforage.length();
  console.log("В базе", count);
  await stepAllTabs(); // перечитаем все вкладки
  let tab = await getActiveTab();
  if (tab) await changeIcon(tab.id);
});

// нажатие иконки справа вверху, не сработает если всплывает окно или нет popup.html
chrome.action.onClicked.addListener(async (event) => {
  let tab = await getActiveTab();
  console.log("Нажал ", tab.url);
});

// меняем текст в иконке сразу во всех окнах
async function changeIcon2() {
  await chrome.action.setBadgeBackgroundColor({ color: "#7b062e" });
  let activeTabs = await stepAllActiveTabs();
  let tabsOff = await getDiscardTabsOff();
  let count = tabsOff.length;
  for (let i = 0; i < activeTabs.length; i++) {
    await chrome.action.setBadgeText({
      text: count > 0 ? "" + count : "",
      tabId: activeTabs[i],
    });
  }
  //console.log("activeTabs: ",activeTabs)
}
// устанавливаем параметры иконки
async function changeIcon(id) {
  await changeIcon2();
  let tab = await chrome.tabs.get(id);
  //console.log("Change url",tab.url);
  // let tabsOff = await getDiscardTabsOff(); // сколько вкладок не замораживается
  // let count = tabsOff.length;
  // if (count > 0)
  //   await chrome.action.setBadgeText({ text: "" + count, tabId: tab.id });
  // else await chrome.action.setBadgeText({ text: "", tabId: tab.id });
  // await chrome.action.setBadgeBackgroundColor({ color: "#7b062e" });

  if (tab.url.indexOf("chrome://") != -1) {
    await chrome.action.setIcon({
      path: "icons/freezeSilver.png",
      tabId: tab.id,
    });
    console.log("system tab...");
    // await chrome.action.setBadgeText({ text: "", tabId: tab.id });
    await chrome.action.setPopup({ popup: "popup/system.html" });
    return;
  }
  if (tab.autoDiscardable) {
    // On
    await chrome.action.setIcon({
      path: "icons/freezeGreen.png",
      tabId: tab.id,
    });
  } else {
    await chrome.action.setIcon({
      path: "icons/freezeRed.png",
      tabId: tab.id,
    });
  }

  await chrome.action.setPopup({ popup: "popup/popup.html" });
}
// ловим сообщение из popup
chrome.runtime.onMessage.addListener((mess, sender, sendResponse) => {
  if (chrome.runtime.id == sender.id) {
    // это наши
    // console.log("от туда", mess);
    if (mess.action == "addToBase") {
      setUrlToBase(mess).then(() => {
        sendResponse({ noClose: true });
      });
    }
    if (mess.action == "delFromBase") {
      delUrlFromBase(mess).then(() => {
        sendResponse({ noClose: true });
      });
    }
    if (mess.action == "getUrl") {
      // получить url на который сработает база данных
      //console.log("getUrl", mess);
      getUrlFromBase(mess.url).then((url) => {
        sendResponse({ url: url });
      });
    }
    if (mess.action == "getTable") {
      // получить url на который сработает база данных
      getDiscardUrl().then((urls) => {
        sendResponse({ urls: urls });
      });
    }
    return true; // Этим мы говорим что надо ждать Async операции, а не вырубать порт сразу
    // это оставит канал сообщения открытым для другого конца, пока не будет вызван sendResponse
  }
});

// все вкладки с включенной заморозкой
// async function getDiscardTabsOn() {
//   let tabs = await chrome.tabs.query({ autoDiscardable: true });
//   // tabs.forEach((tab) => {
//   //   console.log("замерзает ", tab.title, tab.url);
//   // });
//   return tabs.length;
// }
async function getDiscardUrl() {
  let tabs = await getDiscardTabsOff();
  let urls = [];
  if (tabs.length > 0) {
    for (let i = 0; i < tabs.length; i++) {
      let url = await getUrlFromBase(tabs[i].url); // что поймаем в базе
      urls.push({url:url,title:tabs[i].title});
    }
  }
  urls.sort(function (a, b) {
    if (a.url < b.url) return -1;
    if (a.url > b.url) return 1;
    // if(a.substring(0,6) == "https:") return -1
    // if(b.substring(0,6) == "https:") return -1
    return 0;
  });
  return urls;
}

// все вкладки с отключенной заморозкой
async function getDiscardTabsOff() {
  let tabs = await chrome.tabs.query({ autoDiscardable: false });
  return tabs;
}
// получим активную вкладку и если у нее есть url
async function getActiveTab() {
  let [res] = await chrome.tabs.query({ currentWindow: true, active: true });
  if(!res){
  let wins = await chrome.windows.getAll({ populate: true,windowTypes:["normal"]});
  for(let i=0;i<wins.length;i++){
    if(wins[i].focused){
      for(let j=0;j<wins[i].tabs.length;j++){
        if(wins[i].tabs[j].active){
          res = wins[i].tabs[j];
          console.log("test active tab",wins[i].tabs[j].id )
        }
      }
    }
  }
  }
  console.log("test", res);
  if (res && res.url) return res;
  else return null;
}
// получим URL из базы если он там есть
async function getUrlFromBase(url) {
  let urls = getRegexpDomen(url);
  // console.log("getUrlFromBase", url, urls);
  try {
    // определим на что поймали вкладку
    if (await localforage.getItem(urls.strUrl))
      // есть Url
      return urls.strUrl;
    else if (
      // есть путь без аргументов, потому что выяснили что их нет
      urls.strUrlNoArgs &&
      (await localforage.getItem(urls.strUrlNoArgs))
    )
      // аргументы откинем
      return urls.strUrlNoArgs;
    else if (await localforage.getItem(urls.strDomain))
      // есть домен
      return urls.strDomain;
    return null;
  } catch (e) {
    console.error("Error:", e);
  }
}
// Запись в базу
async function setUrlToBase(mess) {
  await localforage.setItem(mess.url, true);
  await stepAllTabs();
  //console.log("base add:", mess.url);
  let tab = await chrome.tabs.get(mess.tab.id);
  await changeIcon(tab.id);
}
// удаление из базы
async function delUrlFromBase(mess) {
  await localforage.removeItem(mess.url);
  await stepAllTabs();
  if (mess.tab) {
    // можем не передать tab
    let tab = await chrome.tabs.get(mess.tab.id);
    await changeIcon(tab.id);
  } else {
    let tab = await getActiveTab();
    await changeIcon(tab.id);
  }
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
// function getRegexpDomen(URL) {
//   // 1 путь со схемой
//   // 2 без схемы
//   let regex = new RegExp(
//     "^(?:https?://)?(?:[^@\\n]+@)?(?:www.)?([^:/\\n?=]+)",
//     "gmi"
//   );
//   let url = URL;

//   url = url.toLowerCase();
//   if (url.length > 2 && url.substring(url.length - 1) === "/")
//     url = url.substring(0, url.length - 1);

//   let s = url.indexOf("?");

//   let strUrlNoArgs = "";
//   if (s > 0) {
//     strUrlNoArgs = url.substring(0, s);
//     if (
//       strUrlNoArgs.length > 2 &&
//       strUrlNoArgs.substring(strUrlNoArgs.length - 1) === "/"
//     )
//       strUrlNoArgs = strUrlNoArgs.substring(0, strUrlNoArgs.length - 1);
//   } else {
//     // нет аргументов
//     strUrlNoArgs = "";
//   }

//   let m = regex.exec(url);
//   if (!m || m.length < 2) return null;

//   //
//   let regex2 = new RegExp("(^https?://)(.*)", "gmi");
//   let m2 = regex2.exec(url);
//   if (m2) url = m2[2];

//   m2 = regex2.exec(strUrlNoArgs);
//   if (m2) strUrlNoArgs = m2[2];
// //
//   let g = {};
//   g.strUrl = url; // схема+домен+мусор и -слеш
//   g.strUrlNoArgs = strUrlNoArgs; // без аргументов
//   g.strHttp = m[0]; // схема+домен
//   g.strDomain = m[1]; // домен

//   return g;
// }
// все вкладки с отключенной заморозкой из базы вкладок
// async function getDiscardTabs() {
//   let tabs = await chrome.tabs.query({ autoDiscardable: false });
//   tabs.forEach((tab) => {
//     console.log(tab.title, tab.url);
//   });
// }

// проверим все вкладки во всех окнах и установим что положено
async function stepAllTabs() {
  let wins = await chrome.windows.getAll({ populate: true });
  let d = new Date().toLocaleString();
  var promises = [];
  wins.forEach((win) => {
    win.tabs.forEach((tab) => {
      promises.push(changeTab(tab));
    });
  });
  await Promise.all(promises);
}
// получить все активные вкладки во всех окнах
async function stepAllActiveTabs() {
  let wins = await chrome.windows.getAll({ populate: true });
  let activeTabs = [];
  wins.forEach((win) => {
    win.tabs.forEach((tab) => {
      if (tab.active) {
        activeTabs.push(tab.id);
      }
    });
  });
  return activeTabs;
}

async function changeTab(tab) {
  if (!tab.url) return;
  let url = await getUrlFromBase(tab.url);
  // если есть в базе отключаем заморозку
  if (url) {
    await chrome.tabs.update(tab.id, { autoDiscardable: false });
    return true;
  }
  //если нет в базе включаем заморозку
  else {
    await chrome.tabs.update(tab.id, { autoDiscardable: true });
    return false;
  }
}

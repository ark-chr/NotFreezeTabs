async function checkEvents(id) {
  //let tab = await chrome.tabs.get(id);
  let tab = await checkGetTab(id);
  if (!tab) {
    console.log("empty", id);
    return;
  }
  try {
    await changeTab(tab);
  } catch (e) {
    console.log("changeTab: ", e.message);
  }
  try {
    await changeIcon(tab.id);
  } catch (e) {
    console.log("changeIcon: ", e.message);
  }
}

// #1 Будем ловить только смену URL
// срабатывает на новую вкладку (вероятно когда у нее меняется URL)
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  await checkEvents(tab.id);
});
// #2 когда вкладка заменяется другой вкладкой из-за предварительной отрисовки
// addedTabId заменяет removedTabId, // onReplaced !? может не быть такого ?
if (chrome.tabs.onReplaced) {
  chrome.tabs.onReplaced.addListener(async (addedTabId, removedTabId) => {
    //console.log(">>>:", addedTabId, removedTabId);
    await checkEvents(addedTabId);
  });
}
// #3 активируется вкладка , но url вкладки ещё может не быть
// поэтому такая свистопляска с таймерами
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  await checkEvents(activeInfo.tabId);
});
async function checkGetTab(id) {
  // не понятно, но не успевает чтото получить tab при переключении вкладок
  // соорудил тут , таймер
  let ex = 1000;
  let tab = null;
  for (let i = 0; i < ex; i++) {
    await new Promise((res) =>
      setTimeout(() => {
        res(true);
      }, 100)
    );
    try {
      tab = await chrome.tabs.get(id);
      if (tab && tab.url) {
        return tab;
      }
    } catch (e) {}
  }
  return null;
  // let interv = setInterval(async () => {
  //   //  я здесь надо чтото вроде nextTick()
  //   try {
  //     tab = await chrome.tabs.get(id);
  //     clearInterval(interv);
  //     if (tab && tab.url) {
  //       //await checkEvents(tab.id);
  //       return tab;
  //     }
  //   } catch (e) {
  //     // пропускаем cannot be edited
  //     if (
  //       e.message.indexOf("cannot be edited") == -1
  //       //  e.message.indexOf("No tab with id") == -1
  //     ) {
  //       console.log("checkGetTab: ", e.message);
  //       clearInterval(interv);
  //       return null;
  //     }
  //   }
  //   if (ex-- < 0) {
  //     clearInterval(interv);
  //     return null;
  //   }
  // }, 300);
}

// ловим создание окна и проверяем в нем все вкладки
// например при открытии после перезагрузки
chrome.windows.onCreated.addListener(async (win) => {
  console.log("winCreated", win);
  var promises = [];
  // таймер не нужен !! но и не помешает
  setTimeout(
    async (win) => {
      let win2 = await chrome.windows.get(win.id, { populate: true });
      if (win2.tabs) {
        win2.tabs.forEach(async (tab) => {
          promises.push(changeTab(tab));
        });
      }
    },
    100,
    win
  );
  await Promise.all(promises);
});
// изменение фокуса окна
chrome.windows.onFocusChanged.addListener(async (windowId) => {
  if (windowId == chrome.windows.WINDOW_ID_NONE) {
    // все окна потеряли фокус . в линукс при переключении окон происходит
  } else {
    try {
      await new Promise((a) => setTimeout(() => a(), 500));
      let tab = await getActiveTab();
      if (tab) await changeIcon(tab.id);
    } catch (e) {
      // user may be dragging a tab
      console.log("error", e);
    }
  }
});
// сервис работник выгрузился
chrome.runtime.onSuspend.addListener(function () {
  console.log("Service Worker Unloading.");
});

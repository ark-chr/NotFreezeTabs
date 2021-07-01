async function checkEvents(id) {
  let tab = await chrome.tabs.get(id);
  await changeTab(tab);
  await changeIcon(tab.id);
}

// #1 Будем ловить только смену URL
// срабатывает на новую вкладку (вероятно когда у нее меняется URL)
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.url) {
    // ловим смену URL // url появится только если меняется URL
    await checkEvents(tab.id);
  }
});
// #2 когда вкладка заменяется другой вкладкой из-за предварительной отрисовки
// addedTabId заменяет removedTabId, // onReplaced !? может не быть такого ?
if (chrome.tabs.onReplaced) {
  chrome.tabs.onReplaced.addListener(async (addedTabId, removedTabId) => {
    console.log("Когда же это срабатывает ?", addedTabId, removedTabId);
    try {
      let tab = await chrome.tabs.get(addedTabId);
      if (tab) {
        await checkEvents(tab.id);
      }
    } catch (e) {
      console.error("replaced а нужно ли? ", e);
    }
    // chrome.tabs.update(tabId, {autoDiscardable: false});
  });
}
// #3 активируется вкладка , но url вкладки ещё может не быть
// поэтому такая свистопляска с таймерами
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  let id = activeInfo.tabId;
  let ex = 1000;
  // не понятно, но не успевает чтото получить tab при переключении вкладок
  // соорудил тут , таймер
  let interv = setInterval(async () => {
    //  я здесь надо чтото вроде nextTick()
    let tab;
    try {
      tab = await chrome.tabs.get(id);
      clearInterval(interv);
      if (tab && tab.url) {
        await checkEvents(tab.id);
      }
    } catch (e) {
      // пропускаем cannot be edited
      if (e.message.indexOf("cannot be edited") == -1) {
        console.log("undef error: ", e.message);
        clearInterval(interv);
      }
    }
    if (ex-- < 0) {
      clearInterval(interv);
    }
  }, 50);
});
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

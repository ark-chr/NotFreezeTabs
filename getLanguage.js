// Загружаем языковой объект
// lang - имя файла
// если не указан lang , возьмет из системы (ru,en и т.д.)
// после загрузки в  Global объект self.i18x
function getLangI18(lang) {
  try {
    if (!lang) {
      if (navigator.language) {
        let l = navigator.language.substr(0, 2).toLocaleLowerCase();
        self.importScripts("language/" + l + ".js");
      }
    } else {
      self.importScripts("language/" + lang + ".js");
    }
  } catch (e) {
    console.error("Не загрузить языковой модуль");
  }
}
getLangI18();

// на выходе объект  self.i18x

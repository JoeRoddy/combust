const replaceAll = function(string, omit, place, prevstring) {
  if (prevstring && string === prevstring) return string;
  prevstring = string.replace(omit, place);
  return replaceAll(prevstring, omit, place, string);
};

const replaceTitleOccurrences = function(moduleTitle, data) {
  const ending = moduleTitle.substring(1);
  const capped = moduleTitle.charAt(0).toUpperCase() + ending;
  const lowered = moduleTitle.charAt(0).toLowerCase() + ending;

  data = replaceAll(data, "item", lowered);
  data = replaceAll(data, "Item", capped);
  data = replaceAll(data, "List" + capped, "ListItem"); //<ListItem /> (mobile)

  return data;
};

module.exports = {
  replaceAll,
  replaceTitleOccurrences
};

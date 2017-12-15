const fs = require("fs");

const currentDirIsCombustApp = () => {
  return fs.existsSync("./src/.combust");
};
const nonCombustAppErr =
  "Not a combust app. Change directories, or create one with: " +
  "combust create [appName]".cyan;

module.exports = {
  currentDirIsCombustApp,
  nonCombustAppErr
};

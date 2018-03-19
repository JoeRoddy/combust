const fs = require("fs");

const getProjectType = () => {
  //ghetto, replace with some config prop later
  return fs.existsSync("./src/components/reusable/SideMenu.js")
    ? "mobile"
    : "web";
};

const currentDirIsCombustApp = () => {
  return fs.existsSync("./src/.combust");
};
const nonCombustAppErr =
  "Not a combust app. Change directories, or create one with: " +
  "combust create [appName]".cyan;

/**
 * makes nested directories,
 * ie: mkdirSync("a/b/c");
 * @param {*} path
 */
function mkdirSync(path) {
  const dirs = path.split("/");
  let dir = "";
  dirs.forEach(subdir => {
    dir += subdir + "/";
    try {
      fs.mkdirSync(dir);
    } catch (e) {
      if (e.errno === 34) {
        mkdirSync(path.dirname(dir));
        mkdirSync(dir);
      }
    }
  });
}

module.exports = {
  getProjectType,
  currentDirIsCombustApp,
  nonCombustAppErr,
  mkdirSync
};

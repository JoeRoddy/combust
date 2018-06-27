const fs = require("fs");
const ncp = require("ncp").ncp;
ncp.limit = 16;

const getProjectType = () => {
  if (!isCurrentDirCombustApp()) throw nonCombustAppErr;
  return fs.existsSync("./shared/.combust")
    ? "dual"
    : //ghetto, replace with some config prop later
      fs.existsSync("./src/components/Routes.js")
      ? "mobile"
      : "web";
};

const isCurrentDirCombustApp = () => {
  return fs.existsSync("./src/.combust") || fs.existsSync("./shared/.combust");
};

const nonCombustAppErr =
  "Not a combust app. Change directories, or create one with: " +
  "combust create [projectTitle]".cyan;

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

/**
 * cp -r
 * @param {*} source
 * @param {*} destination
 * @param {*} callback
 */
function cpFolderRecursively(source, destination, callback) {
  try {
    ncp(source, destination, err => {
      return err ? callback(err) : callback();
    });
  } catch (err) {
    callback(err);
  }
}

module.exports = {
  cpFolderRecursively,
  getProjectType,
  isCurrentDirCombustApp,
  nonCombustAppErr,
  mkdirSync
};

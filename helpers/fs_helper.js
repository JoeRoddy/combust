const shell = require("shelljs");
const fs = require("fs");
const ncp = require("ncp").ncp;

ncp.limit = 16;

const getProjectType = () => {
  if (!isCurrentDirCombustApp()) throw nonCombustAppErr;
  return fs.existsSync("./shared/.combust")
    ? "dual"
    : //ghetto, replace with some config prop later
    fs.existsSync("./src/components/app/Routes.js")
    ? "mobile"
    : "web";
};

const isCurrentDirCombustApp = () => {
  return fs.existsSync("./src/.combust") || fs.existsSync("./shared/.combust");
};

const nonCombustAppErr =
  "Not a combust app. Change directories, or create one with: " +
  "combust create [projectTitle]".cyan;

const getConfiguredFirebaseProjectId = () => {
  const firebaseConfigPath = `./${
    getProjectType() === "dual" ? "shared" : "src"
  }/.combust/firebase.config.json`;
  const content = fs.readFileSync(firebaseConfigPath, "utf8");
  const firebaseConfig = JSON.parse(content);
  return firebaseConfig ? firebaseConfig.projectId : null;
};

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

function rmFolderRecursively(path) {
  var files = [];
  if (fs.existsSync(path)) {
    files = fs.readdirSync(path);
    files.forEach(function(file, index) {
      var curPath = path + "/" + file;
      if (fs.lstatSync(curPath).isDirectory()) {
        // recurse
        rmFolderRecursively(curPath);
      } else {
        // delete file
        fs.unlinkSync(curPath);
      }
    });
    fs.rmdirSync(path);
  }
}

/**
 * clones a git repository
 * @param {string} repoUrl
 * @param {string} projectTitle
 * @param {string} dualPlatFolder
 */
function cloneRepo(repoUrl, projectTitle, dualPlatFolder) {
  console.log("Cloning repository");
  shell.exec(
    `${
      dualPlatFolder ? `cd ${dualPlatFolder} &&` : ""
    } git init ${projectTitle} && cd ${projectTitle} && git pull ${repoUrl}`
  );
}

module.exports = {
  cpFolderRecursively,
  getConfiguredFirebaseProjectId,
  getProjectType,
  isCurrentDirCombustApp,
  nonCombustAppErr,
  mkdirSync,
  rmFolderRecursively,
  cloneRepo
};

const fs = require("fs");
const shell = require("shelljs");
const firebase = require("firebase");
const { nonCombustAppErr } = require("./fs_helper.js");

const getFirebaseProjects = (isExecutedByUser, callback) => {
  shell.exec("firebase list", { silent: true }, (someShit, stdout, stderr) => {
    if (stderr && stderr.includes("please run firebase login")) {
      return isExecutedByUser
        ? null
        : console.error(
            "You must log in to the Firebase CLI first.\n\nTo install it, run: " +
              "npm i -g firebase-tools".cyan +
              "\n\nTo login: " +
              "firebase login".cyan
          );
    } else if (stderr) {
      return isExecutedByUser ? null : console.log(stderr);
    }
    return getDatabasesFromFirebaseListOutput(stdout, callback);
  });
};

const currentDirIsCombustApp = () => {
  return fs.existsSync("./src/.combust");
};

const getFirebaseConfig = () => {
  let f;
  try {
    f = fs.readFileSync("src/.combust/config.js").toString();
  } catch (err) {
    throw nonCombustAppErr;
  }
  let config;
  try {
    config = f.substring(f.indexOf("{"), f.indexOf("}") + 1);
    config = eval("(" + config + ")");
  } catch (err) {
    throw "App not configured w/firebase, run; " + "combust configure".cyan;
  }
  return config;
};

const initializeFirebase = () => {
  const config = getFirebaseConfig();
  try {
    firebase.initializeApp(config);
    firebase.database(); //need this to test if working, initializeApp won't throw
    shell.exec(`firebase use --add ${config.projectId}`, { silent: true });
  } catch (err) {
    throw "Firebase app could not initialize, check your configuration @ " +
      `${process.cwd()}/src/.combust/config`.green;
  }
};

const loginWithMockAccount = () => {
  console.log("logging in");

  return firebase
    .auth()
    .signInWithEmailAndPassword("combustable@combust.com", "fakepass");
};

module.exports = {
  initializeFirebase,
  loginWithMockAccount,
  getFirebaseProjects,
  currentDirIsCombustApp
};

function getDatabasesFromFirebaseListOutput(stdout, callback) {
  let dbRows = stdout.split("\n").filter(row => {
    return row.includes("│ ");
  });
  dbRows.splice(0, 1); //remove label row
  let dbs = dbRows.map(row => {
    let [name, id, role] = row.split(" │ ").map(row => {
      return row.replace("│", "").trim();
    });
    return { name, id, role };
  });
  callback(null, dbs);
}

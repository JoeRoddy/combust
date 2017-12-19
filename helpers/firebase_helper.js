const fs = require("fs");
const shell = require("shelljs");
const firebase = require("firebase");
const { nonCombustAppErr } = require("./fs_helper.js");
const COMBUST_EMAIL = "do_not_delete@combustjs.org";
const COMBUST_PASS = "temporaryPass";

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
    return _getDatabasesFromFirebaseListOutput(stdout, callback);
  });
};

const currentDirIsCombustApp = () => {
  return fs.existsSync("./src/.combust");
};

const getUserAdmins = callback => {
  initializeFirebase();
  return new Promise((resolve, reject) => {
    return firebase
      .database()
      .ref("/users/serverInfo")
      .orderByChild("isAdmin")
      .equalTo(true)
      .once("value")
      .then(snap => {
        resolve(snap.val());
      })
      .catch(err => {
        reject(err);
      });
  });
};

const initializeFirebase = () => {
  const config = _getFirebaseConfig();
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

  //TODO: generate a pass and store it on client machine,
  //can't have same pass on every app

  //eventually, we can have them log in with their own user acct
  //(ie: combust login xxx) and save the pass in a local environment var.
  //this way we circumvent issues of multiple admins needing the same acct pass
  //for DO_NOT_DELETE.

  return firebase
    .auth()
    .signInWithEmailAndPassword(COMBUST_EMAIL, COMBUST_PASS)
    .catch(err => {
      if (
        err.message ===
        "There is no user record corresponding to this identifier. The user may have been deleted."
      ) {
        return _createMockAccountAndLogin();
      } else {
        return err.message;
      }
    });
};

module.exports = {
  initializeFirebase,
  loginWithMockAccount,
  getFirebaseProjects,
  currentDirIsCombustApp,
  getUserAdmins
};

function _getFirebaseConfig() {
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
}

function _createMockAccountAndLogin() {
  console.log("createMockAcct called");
  const auth = firebase.auth();
  return auth
    .createUserWithEmailAndPassword(COMBUST_EMAIL, COMBUST_PASS)
    .then(res => {
      auth.signInWithEmailAndPassword(COMBUST_EMAIL, COMBUST_PASS);
    });
}

function _getDatabasesFromFirebaseListOutput(stdout, callback) {
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

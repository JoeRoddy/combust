const fs = require("fs");
const shell = require("shelljs");
const firebase = require("firebase");
const { nonCombustAppErr } = require("./fs_helper.js");
const COMBUST_EMAIL = "do_not_delete@combustjs.org";
const COMBUST_PASS = "temporaryPass";

const getFirebaseProjects = (callback, isSilent) => {
  shell.exec("firebase list", { silent: true }, (someShit, stdout, stderr) => {
    if (!isSilent && stderr && stderr.includes("please run firebase login")) {
      return console.error(
        "\nYou must log in to the Firebase CLI first.\n\nTo install it, run: " +
          "npm i -g firebase-tools".cyan +
          "\n\nTo login: " +
          "firebase login".cyan
      );
    } else if (!isSilent && stderr) {
      return console.log(stderr);
    }
    return _getDatabasesFromFirebaseListOutput(stdout, callback);
  });
};

const currentDirIsCombustApp = () => {
  return fs.existsSync("./src/.combust");
};

const getUserAdmins = () => {
  initializeFirebase();
  return new Promise((resolve, reject) => {
    loginWithMockAccount()
      .then(onFulfilled => {
        console.log("abt to return promise");
        return firebase
          .database()
          .ref("/users/serverInfo")
          .orderByChild("isAdmin")
          .equalTo(true)
          .once("value")
          .then(snap => {
            const users = snap.val();
            users &&
              Object.keys(users).forEach(uid => {
                if (users[uid].DO_NOT_DELETE) {
                  //delete combust service admins
                  delete users[uid];
                }
              });
            resolve(users ? Object.keys(users) : []);
          })
          .catch(err => {
            console.log("err in .once:", err);
            reject(err);
          });
      })
      .catch(onRejected => {
        console.log("onReject:", onRejected);
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

function updateData(dataPath, json) {
  const localJsonFilePath = "./.delete_me.json";
  fs.writeFile(localJsonFilePath, json, err => {
    if (err) throw err;
    shell.exec(
      //execute from shell to circumvent db rules
      `firebase database:update ${dataPath} ${localJsonFilePath} --confirm`
    );
    fs.unlink(localJsonFilePath);
  });
}

function isFirebaseCliInstalled() {
  const { stdout, stderr } = shell.exec(`firebase`, { silent: true });
  return stderr ? false : true;
}

const firebaseCliErr =
  "\nFirst, install the firebase cli: " + "npm i -g firebase-tools".cyan;

module.exports = {
  initializeFirebase,
  loginWithMockAccount,
  getFirebaseProjects,
  isFirebaseCliInstalled,
  firebaseCliErr,
  currentDirIsCombustApp,
  getUserAdmins,
  updateData
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
  const auth = firebase.auth();
  return auth
    .createUserWithEmailAndPassword(COMBUST_EMAIL, COMBUST_PASS)
    .then(res => {
      _markAcctAsAdmin(res.uid);
      auth.signInWithEmailAndPassword(COMBUST_EMAIL, COMBUST_PASS);
    });
}

function _markAcctAsAdmin(uid) {
  if (!uid) return;
  updateData(
    `/users/serverInfo/${uid}/`,
    '{"isAdmin":true, "DO_NOT_DELETE": "COMBUST_SERVICE_RECORD" }'
  );
  return process.exit();
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

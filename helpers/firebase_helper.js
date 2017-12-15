const fs = require("fs");
const shell = require("shelljs");
const firebase = require("firebase");

const getFirebaseConfig = () => {
  let f;
  try {
    f = fs.readFileSync("src/.combust/config.js").toString();
  } catch (err) {
    throw "Not a combust app. Change directories, or create one with: " +
      "combust create web [appName]".cyan;
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
  loginWithMockAccount
};

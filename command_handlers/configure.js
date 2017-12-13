const api = require("../node_modules/firebase-tools/lib/api");
const firebaseLogin = require("../node_modules/firebase-tools/commands/login-ci.js");
const prompt = require("prompt");
const shell = require("shelljs");
const fs = require("fs");
const ora = require("ora");

module.exports = function() {
  firebaseLogin._action({}).then(result => {
    const token = result.tokens.access_token;
    api.setAccessToken(token);
    getProjects();
  });
};

getProjects = () => {
  let spinner = ora("Fetching your firebase apps").start();

  api
    .getProjects()
    .then(projects => {
      spinner.clear();
      spinner.stop();
      console.log("\nSelect a Firebase project:");
      const projectNames = projects && Object.keys(projects);
      projectNames.forEach((proj, i) => {
        console.log(i + ") " + proj);
      });
      getUserChoice(projectNames);
    })
    .catch(err => {
      console.log(err);
    });
};

function getUserChoice(projectNames) {
  console.log("\n");
  prompt.start();
  prompt.get(
    [
      {
        name: "Project Index",
        validator: /^[0-9]+$/,
        warning: "Project must be chosen by number"
      }
    ],
    (err, result) => {
      if (err) {
        return onErr(err);
      }
      spinner = ora("Fetching the configuration").start();
      const index = result["Project Index"];
      shell.exec("firebase use --add " + projectNames[index], { silent: true });
      shell.exec(
        "firebase setup:web",
        {
          silent: true,
          async: true
        },
        (code, stdout, stderr) => {
          spinner.clear();
          spinner.stop();
          if (stderr) {
            console.log("err:", stderr);
          } else {
            spinner = ora("Applying config").start();

            const patternStart = "firebase.initializeApp(";

            const config = stdout.substring(
              stdout.indexOf(patternStart) + patternStart.length,
              stdout.indexOf("});") + 1
            );
            writeConfigToFile(config);
            spinner.clear();
            spinner.stop();

            console.log(
              "\nApplied new configuration to: " +
                "src/.combust/config".green +
                "\n\nAwesome! Firebase should be all hooked up!".yellow
            );
          }
        }
      );
    }
  );

  onErr = err => {
    console.log(err);
    return 1;
  };
}

function writeConfigToFile(newConfig) {
  fs.writeFile(
    "./src/.combust/config.js",
    "export const firebaseConfig = " + newConfig,
    err => {
      err && console.log("err updating config:" + err);
    }
  );
}

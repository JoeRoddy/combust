const shell = require("shelljs");
const fs = require("fs");
const ora = require("ora");

const {
  getFirebaseProjects,
  isFirebaseCliInstalled,
  firebaseCliErr
} = require("../helpers/firebase_helper.js");
const {
  getProjectType,
  isCurrentDirCombustApp,
  nonCombustAppErr
} = require("../helpers/fs_helper.js");
const { getRadioInput } = require("../helpers/input_helper.js");

module.exports = function(dbSpecified) {
  if (!isCurrentDirCombustApp()) {
    return console.error(nonCombustAppErr);
  }
  if (!isFirebaseCliInstalled()) {
    return console.log(
      firebaseCliErr +
        "\nThen login with:                 " +
        "firebase login".cyan +
        "\nFinally, execute again:          " +
        "combust configure".cyan
    );
  }
  if (dbSpecified) {
    return setWorkingProject(dbSpecified);
  }
  getFirebaseProjects((err, projects) => {
    if (!projects) return null;
    if (err)
      return console.log("Error retrieving your firebase projects:\n", err);

    getUserChoice(projects, projectName => {
      const project = projects.find(p => p.name === projectName);
      setWorkingProject(project.id);
    });
  });
};

getUserChoice = (projectNames, callback) => {
  getRadioInput(
    {
      name: "applications",
      message: "Choose a firebase app to link to this project:",
      choices: projectNames
    },
    callback
  );
};

setWorkingProject = projectId => {
  spinner = ora("Fetching the configuration").start();
  shell.exec("firebase use --add " + projectId, {
    silent: true
  });

  shell.exec(
    `firebase setup:web --project ${projectId}`,
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
        writeOutputToFirebaseConfig(stdout);
      }
    }
  );
};

writeOutputToFirebaseConfig = stdout => {
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
      "src/.combust/firebase.config.json".green +
      "\n\nAwesome! Firebase should be all hooked up!".yellow
  );
};

writeConfigToFile = newConfig => {
  const topLevelDir = getProjectType() === "dual" ? "shared" : "src";
  fs.writeFile(
    `./${topLevelDir}/.combust/firebase.config.json`,
    newConfig,
    err => {
      err && console.log("err updating config:" + err);
    }
  );
};

//OLD WAY - might be necessary to use the api later
// const api = require("../node_modules/firebase-tools/lib/api");
// const firebaseLogin = require("../node_modules/firebase-tools/commands/login-ci.js");

// firebaseLogin._action({}).then(result => {
//   const token = result.tokens.access_token;
//   api.setAccessToken(token);
//   getProjects();
// });

// getProjects = () => {
//   let spinner = ora("Fetching your firebase apps").start();

//   api
//     .getProjects()
//     .then(projects => {
//       spinner.clear();
//       spinner.stop();
//       console.log("\nSelect a Firebase project:");
//       const projectNames = projects && Object.keys(projects);
//       projectNames.forEach((proj, i) => {
//         console.log(i + ") " + proj);
//       });
//       getUserChoice(projectNames);
//     })
//     .catch(err => {
//       console.log(err);
//     });
// };

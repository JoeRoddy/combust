const prompt = require("prompt");
const shell = require("shelljs");
const fs = require("fs");
const ora = require("ora");
const Radio = require("prompt-radio");

const {
  getFirebaseProjects,
  isFirebaseCliInstalled,
  firebaseCliErr
} = require("../helpers/firebase_helper.js");
const {
  currentDirIsCombustApp,
  nonCombustAppErr
} = require("../helpers/fs_helper.js");

module.exports = function(dbSpecified) {
  if (!currentDirIsCombustApp()) {
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

printAvailableProjects = projects => {
  projects.forEach((project, i) => {
    console.log(`(${i + 1}): ${project.id}`);
  });
};

getUserChoice = (projectNames, callback) => {
  const prompt = new Radio({
    name: "applications",
    message: "Select an application:",
    choices: projectNames
  });
  prompt.ask(answer => {
    if (answer === undefined) {
      //user pressed enter w/o selecting w/ space
      console.log(
        "\nErr: ".red +
          "Select an application with " +
          "space".green +
          ", confirm with " +
          "enter\n".green
      );
      return getUserChoice(projectNames, callback);
    } else {
      return callback(answer);
    }
  });
};

setWorkingProject = projectId => {
  spinner = ora("Fetching the configuration").start();
  shell.exec("firebase use --add " + projectId, {
    silent: true
  });
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
};

writeConfigToFile = newConfig => {
  fs.writeFile(
    "./src/.combust/config.js",
    "export const firebaseConfig = " + newConfig,
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

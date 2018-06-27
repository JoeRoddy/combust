const shell = require("shelljs");
const fs = require("fs");
const ora = require("ora");
const colors = require("colors");

const { getFirebaseProjects } = require("../helpers/firebase_helper.js");
const { getRadioInput } = require("../helpers/input_helper.js");
const { mkdirSync } = require("../helpers/fs_helper.js");

//eventually: mobile, web, && dual (mobile & web)
module.exports = (projectTitle, projectType) => {
  projectTitle = projectTitle || "myCombustApp";
  if (fs.existsSync(projectTitle)) {
    return console.error(
      "Err: ".red + "Directory " + projectTitle.cyan + " already exists."
    );
  }

  projectType
    ? cloneAndInstallProject(projectType, projectTitle)
    : promptForProjectType(projectType =>
        cloneAndInstallProject(projectType, projectTitle)
      );
};

cloneAndInstallProject = (
  projectType,
  projectTitle,
  optionalPath,
  callback
) => {
  const projectPath = optionalPath ? optionalPath + projectTitle : projectTitle;
  const repoUrl = repos[projectType];
  console.log("Cloning repository");
  shell.exec(
    `${
      optionalPath ? `cd ${optionalPath} &&` : ""
    } git init ${projectTitle} && cd ${projectTitle} && git pull ${repoUrl}`
  );

  projectType !== DUAL_PLATFORM &&
    getFirebaseProjects((err, projects) => {
      if (!err) {
        fs.writeFile(
          `${projectPath}/src/.combust/availApps.json`,
          JSON.stringify(projects),
          err => {
            if (err) throw err;
          }
        );
      }
    }, true);

  const spinner = ora("Installing npm dependencies").start();
  const { stdout, stderr, code } = shell.exec(
    `cd ${projectPath} && npm install --silent`,
    { async: true, silent: true },
    () => {
      spinner.clear();
      spinner.stop();
      if (projectType === DUAL_PLATFORM) {
        return createDualPlatProject(projectTitle);
      }
      if (!optionalPath) printSuccess(projectPath);
      callback && callback();
    }
  );
};

createDualPlatProject = projectTitle => {
  console.log("\nCreating web project..\n".yellow);
  cloneAndInstallProject(WEB, "web", projectTitle + "/", () => {
    console.log("\nCreating mobile project..\n".yellow);
    cloneAndInstallProject(MOBILE, "mobile", projectTitle + "/", () => {
      printSuccess(projectTitle);
    });
  });
};

promptForProjectType = callback => {
  getRadioInput(
    {
      name: "projectTypes",
      message: "Select a project type:",
      choices: [WEB, MOBILE, DUAL_PLATFORM]
    },
    callback
  );
};

const WEB = " Web";
const MOBILE = " Mobile";
const DUAL_PLATFORM = " Dual-platform (Web & Mobile)";

const repos = {
  [WEB]: "https://github.com/JoeRoddy/combust-web.git",
  [MOBILE]: "https://github.com/JoeRoddy/combust-mobile.git",
  [DUAL_PLATFORM]: "https://github.com/JoeRoddy/combust-dual-platform.git"
};

printSuccess = projectPath => {
  console.log(
    `\nInstallation complete!`.yellow +
      `\n\nCreated project at:` +
      `\n${process.cwd()}/${projectPath}`.green +
      "\n\nStart your app with:  " +
      `\ncd ${projectPath}\n`.cyan +
      `and`.white +
      `\nnpm start`.cyan
  );
};

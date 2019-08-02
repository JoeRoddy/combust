const fs = require("fs");
const shell = require("shelljs");
const ora = require("ora");
const colors = require("colors");

const { getFirebaseProjects } = require("../helpers/firebase_helper.js");
const { getRadioInput } = require("../helpers/input_helper.js");
const { cloneRepo } = require("../helpers/fs_helper.js");

module.exports = async (projectTitle, projectType) => {
  projectTitle = projectTitle || "myCombustApp";
  if (fs.existsSync(projectTitle)) return printProjExistsErr(projectTitle);

  projectType = projectType || (await promptForProjectType());
  cloneAndInstallProject(projectType, projectTitle);
};

cloneAndInstallProject = async (projectType, projectTitle, dualPlatFolder) => {
  projectType === DUAL_PLATFORM &&
    console.log("\nCreating root project..\n".yellow);

  const projectPath = dualPlatFolder
    ? dualPlatFolder + projectTitle
    : projectTitle;

  cloneRepo(repos[projectType], projectTitle, dualPlatFolder);
  await npmInstall(projectPath);

  if (projectType === DUAL_PLATFORM) {
    return createDualPlatSubProjects(projectTitle);
  }

  // solo plat completed
  !dualPlatFolder && printSuccess(projectPath);

  // tell dual plat process to move to next step
  return new Promise(resolve => resolve());
};

npmInstall = path => {
  return new Promise((resolve, reject) => {
    const spinner = ora("Installing npm dependencies").start();
    const { stdout, stderr, code } = shell.exec(
      `cd ${path} && npm install --silent`,
      { async: true, silent: true },
      () => {
        spinner.clear();
        spinner.stop();
        resolve();
      }
    );
  });
};

createDualPlatSubProjects = async projectTitle => {
  console.log("\nCreating web project..\n".yellow);
  await cloneAndInstallProject(WEB, "web", projectTitle + "/");
  console.log("\nCreating mobile project..\n".yellow);
  await cloneAndInstallProject(MOBILE, "mobile", projectTitle + "/");
  printSuccess(projectTitle);
};

promptForProjectType = () =>
  getRadioInput({
    name: "projectTypes",
    message: "Select a project type:",
    choices: [WEB, MOBILE, DUAL_PLATFORM]
  });

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

printProjExistsErr = projectTitle =>
  console.log(
    "Err: ".red + "Directory " + projectTitle.cyan + " already exists."
  );

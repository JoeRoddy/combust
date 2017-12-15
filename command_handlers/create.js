let shell = require("shelljs");
const ora = require("ora");
const colors = require("colors");

let repos = {
  web: "https://github.com/JoeRoddy/combust-web.git"
};

//eventually: mobile - web - desktop
module.exports = projectTitle => {
  // if (!Object.keys(repos).includes(projectType)) {
  //   return console.log(
  //     `Err: Unknown project type: ${projectType} - Supported project types: web (mobile, desktop support in future)`
  //   );
  // }
  projectTitle = projectTitle || `myCombustApp`;
  let repoUrl = repos["web"];
  console.log("Cloning repository");
  shell.exec(
    `git init ${projectTitle} && cd ${projectTitle} && git pull ${repoUrl}`
  );
  const spinner = ora("Installing npm dependencies").start();
  const {
    stdout,
    stderr,
    code
  } = shell.exec(
    `cd ${projectTitle} && npm install --silent`,
    { async: true, silent: true },
    () => {
      spinner.clear();
      spinner.stop();
      console.log(
        `\nInstallation complete!`.yellow +
          `\n\nCreated ${projectTitle} at ` +
          `\n${process.cwd()}/${projectTitle}`.green +
          "\n\nInstall new modules with:  " +
          "combust install [moduleName]".cyan +
          "\n\nStart your app with:  " +
          `cd ${projectTitle} && npm start`.cyan
      );
    }
  );
};

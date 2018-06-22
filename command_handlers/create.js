const shell = require("shelljs");
const fs = require("fs");
const ora = require("ora");
const colors = require("colors");
const { getFirebaseProjects } = require("../helpers/firebase_helper.js");

let repos = {
  web: "https://github.com/JoeRoddy/combust-web.git",
  mobile: "https://github.com/JoeRoddy/combust-mobile.git"
};

//eventually: mobile, web, && desktop
module.exports = (projectTitle, projectType = "web") => {
  if (fs.existsSync(projectTitle)) {
    return console.error(
      "Directory ".red + projectTitle.cyan + " already exists.".red
    );
  }

  projectTitle = projectTitle || `myCombustApp`;
  let repoUrl = repos[projectType];
  console.log("Cloning repository");
  shell.exec(
    `git init ${projectTitle} && cd ${projectTitle} && git pull ${repoUrl}`
  );
  getFirebaseProjects((err, projects) => {
    if (!err) {
      fs.writeFile(
        `${projectTitle}/src/.combust/availApps.json`,
        JSON.stringify(projects),
        err => {
          if (err) throw err;
        }
      );
    }
  }, true);

  const spinner = ora("Installing npm dependencies").start();
  const { stdout, stderr, code } = shell.exec(
    `cd ${projectTitle} && npm install --silent`,
    { async: true, silent: true },
    () => {
      spinner.clear();
      spinner.stop();
      console.log(
        `\nInstallation complete!`.yellow +
          `\n\nCreated project at:` +
          `\n${process.cwd()}/${projectTitle}`.green +
          "\n\nStart your app with:  " +
          `${
            projectType == "web"
              ? `cd ${projectTitle} && npm start`
              : `\ncd ${projectTitle}\n` + `and`.white + `\nnpm start`.cyan
          }`.cyan
      );
    }
  );
};

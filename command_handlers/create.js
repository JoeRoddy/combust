let shell = require("shelljs");
const ora = require("ora");

let repos = {
  web: "https://github.com/JoeRoddy/combust-web.git"
};

//eventually: mobile - web - desktop
module.exports = (projectType, projectTitle) => {
  if (!Object.keys(repos).includes(projectType)) {
    return console.log(
      `Err: Unknown project type: ${projectType} - Supported project types: web (mobile, desktop support in future)`
    );
  }
  projectTitle =
    projectTitle ||
    `myCombust${projectType.charAt(0).toUpperCase() +
      projectType.substring(1)}App`;
  let repoUrl = repos[projectType];
  console.log("Cloning repository");
  shell.exec(
    `git init ${projectTitle} && cd ${projectTitle} && git pull ${repoUrl}`
  );
  const spinner = ora("installing npm dependencies").start();
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
      console.log("Installation complete");
      console.log(`\n\nStart your app with: cd ${projectTitle} && npm start`);
    }
  );
};

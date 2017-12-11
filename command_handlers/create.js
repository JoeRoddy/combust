let shell = require("shelljs");
let repos = {
  web: "https://github.com/JoeRoddy/firespark-web.git"
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
  console.log("Installing npm dependencies");
  shell.exec(`cd ${projectTitle} && npm install --silent`);
  console.log("Installation complete");
  console.log(`\n\nStart up your app with: cd ${projectTitle} && npm start`);
};

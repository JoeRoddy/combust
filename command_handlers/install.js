let shell = require("shelljs");
//eventually: mobile - web - desktop
module.exports = moduleName => {
  if (!moduleName)
    return console.log(
      "Err: Must specify a moduleNameule: combust install moduleNameuleName\nView available moduleNameules here: http://www.example.com"
    );
  moduleName.toLowerCase();
  const firstCap = moduleName.charAt(0).toUpperCase() + moduleName.substring(1);
  console.info(`adding: ${moduleName}`);
  console.info("BREH");
  shell.exec(
    `mkdir ${moduleName} && touch ${moduleName}/${moduleName}.html && touch ${moduleName}/${firstCap}Service.js`
  );
};

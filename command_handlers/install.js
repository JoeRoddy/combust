let shell = require("shelljs");

module.exports = moduleName => {
  if (!moduleName)
    return console.error(
      "Err: Must specify a moduleNameule: combust install moduleNameuleName\nView available modules here: http://www.example.com"
    );
  moduleName.toLowerCase();
  const firstCap = moduleName.charAt(0).toUpperCase() + moduleName.substring(1);
  console.info(`adding: ${moduleName}`);

  //download npm contents and unzip into temp directory
  shell.exec(
    `mkdir -p temp && cd temp && npm pack combust-${moduleName} | awk '{print "./"$1}' | xargs tar -xvzf $1`
  );

  //extract files we need
  shell.exec(`mkdir -p stores && mkdir -p service`);
  shell.exec(`mv temp/package/Store.js ./stores/${firstCap}Store.js`);
  shell.exec(`mv temp/package/Service.js ./service/${firstCap}Service.js`);

  shell.exec(`rm -rf temp`);
};

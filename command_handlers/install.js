let shell = require("shelljs");

module.exports = moduleName => {
  if (!moduleName)
    return console.error(
      "Err: Must specify a module: combust install moduleName\nView available modules here: http://www.example.com"
    );
  moduleName.toLowerCase();
  const firstCap = moduleName.charAt(0).toUpperCase() + moduleName.substring(1);
  console.info(`adding: ${moduleName}`);

  //download npm contents and unzip into temp directory
  const {
    stdout,
    stderr,
    code
  } = shell.exec(
    `mkdir -p temp && cd temp && npm pack combust-${moduleName} | awk '{print "./"$1}' | xargs tar -xvzf $1`,
    { silent: true }
  );
  stderr && console.error(stderr);

  //extract files we need and move to src
  shell.exec(`mkdir -p src && mkdir -p src/stores && mkdir -p src/service`);
  shell.exec(`mv temp/package/Store.js src/stores/${firstCap}Store.js`);
  shell.exec(`mv temp/package/Service.js src/service/${firstCap}Service.js`);

  shell.exec(`rm -rf temp`);
};

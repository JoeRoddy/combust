let shell = require("shelljs");
const fs = require("fs");

function install(moduleName) {
  if (!moduleName)
    return console.error(
      "Err: Must specify a module: combust install moduleName\nView available modules here: http://www.example.com"
    );
  moduleName.toLowerCase();
  const firstCap = moduleName.charAt(0).toUpperCase() + moduleName.substring(1);
  console.info(`adding: ${moduleName}`);

  const storePath = `src/stores/${firstCap}Store.js`;
  const servicePath = `src/service/${firstCap}Service.js`;
  const componentsPath = `src/components/combust_examples/${moduleName}`;
  if (fs.existsSync(storePath) || fs.existsSync(servicePath)) {
    return console.info(moduleName + " already installed");
  }

  const tempFolder = "temp" + firstCap;
  //download npm contents and unzip into temp directory
  const {
    stdout,
    stderr,
    code
  } = shell.exec(
    `mkdir -p ${tempFolder} && cd ${tempFolder} && npm pack combust-${moduleName} | awk '{print "./"$1}' | xargs tar -xvzf $1`,
    { silent: true }
  );
  stderr && console.error(stderr);

  const instructions = JSON.parse(
    fs.readFileSync(`${tempFolder}/package/combust.json`, "utf8")
  );
  downloadDependencies(instructions.dependencies);

  console.log("about to extract files for " + storePath);
  //extract files we need and move to src
  shell.exec(`mkdir -p src && mkdir -p src/stores && mkdir -p src/service`);
  shell.exec(`mv ${tempFolder}/package/Store.js ${storePath}`);
  shell.exec(`mv ${tempFolder}/package/Service.js ${servicePath}`);
  shell.exec(
    `mkdir -p ${componentsPath} && mv ${tempFolder}/package/components/* ${componentsPath}`
  );

  //execute installation instructions
  const installInstructions = instructions ? instructions.installation : null;
  executeInstallInstructions(installInstructions);

  updateCombustConfig(moduleName);
  shell.exec(`rm -rf ${tempFolder}`);
}

function downloadDependencies(dependencies) {
  for (let dependency in dependencies) {
    install(dependency);
  }
}

function executeInstallInstructions(installInstructions) {
  console.log("exec install called w/:", installInstructions);
  installInstructions &&
    Object.keys(installInstructions).forEach(path => {
      const filePath = "src/" + path;
      let file = fs.readFileSync(filePath);

      const fileInstructions = installInstructions[path];
      Object.keys(fileInstructions).forEach(operation => {
        const linesToInsert = fileInstructions[operation];
        file = operationsMap[operation](file, linesToInsert);
      });

      fs.writeFileSync(filePath, file);
    });
}

function updateCombustConfig(moduleName) {
  const filePath = "src/.combust/init.js";
  let file = fs.readFileSync(filePath);
  const firstCap = moduleName.charAt(0).toUpperCase() + moduleName.substring(1);
  file = insertImports(file, [
    `import ${moduleName}Store from "../stores/${firstCap}Store"`
  ]);
  file = insertAfter(file, {
    pattern: "stores = {\n",
    code: [`\t${moduleName}Store,`]
  });

  fs.writeFileSync(filePath, file);
}

const operationsMap = {
  imports: insertImports,
  renderStart: insertAtRenderStart,
  renderEnd: insertAtRenderEnd,
  after: insertAfter,
  before: insertBefore,
  replace: replaceCode
};

function insertImports(file, code) {
  code.forEach(line => {
    file = line + "\n" + file;
  });
  return file;
}

function replaceCode(file, patternAndCode) {
  const { pattern, code } = patternAndCode;
  return file.replace(pattern, getCodeStrFromArr(code));
}

function insertAfter(file, patternAndCode) {
  const { pattern, code } = patternAndCode;
  const index = file.indexOf(pattern) + pattern.length;
  if (index < pattern.length) return file;
  return insertCodeAtIndex(file, code, index);
}

function insertBefore(file, patternAndCode) {
  const { pattern, code } = patternAndCode;
  const index = file.indexOf(pattern);
  return insertCodeAtIndex(file, code, index);
}

function insertAtRenderEnd(file, code) {
  const index = file.lastIndexOf("</");
  return insertCodeAtIndex(file, code, index);
}

function insertAtRenderStart(file, code) {
  const index = file.indexOf("<");
  return insertCodeAtIndex(file, code, index);
}

function insertCodeAtIndex(file, code, index) {
  code = getCodeStrFromArr(code);
  if (index < 0) return file;
  return [file.slice(0, index), code, file.slice(index)].join("");
}

function getCodeStrFromArr(codeArray) {
  let codeStr = "";
  codeArray &&
    codeArray.forEach(line => {
      codeStr += line + "\n";
    });
  return codeStr;
}

module.exports = install;

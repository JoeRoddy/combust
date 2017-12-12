let shell = require("shelljs");
const fs = require("fs");

module.exports = moduleName => {
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
    // return console.info(moduleName + " already installed");
  }

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
  shell.exec(`mv temp/package/Store.js ${storePath}`);
  shell.exec(`mv temp/package/Service.js ${servicePath}`);
  shell.exec(
    `mkdir -p ${componentsPath} && mv temp/package/components/* ${componentsPath}`
  );

  const instructions = JSON.parse(
    fs.readFileSync("temp/package/combust.json", "utf8")
  );
  const installInstructions = instructions ? instructions.installation : null;

  executeInstallInstructions(installInstructions);
  updateCombustConfig(moduleName);

  shell.exec(`rm -rf temp`);
};

function executeInstallInstructions(installInstructions) {
  // console.log("exec install called w/:", installInstructions);
  installInstructions &&
    Object.keys(installInstructions).forEach(path => {
      const filePath = "src/" + path;
      fs.readFile(filePath, "utf8", (err, file) => {
        if (err) {
          return console.error(err);
        }
        const fileInstructions = installInstructions[path];
        Object.keys(fileInstructions).forEach(operation => {
          const linesToInsert = fileInstructions[operation];
          file = operationsMap[operation](file, linesToInsert);
        });

        fs.writeFile(filePath, file, "utf-8", err => {
          if (err) throw err;
          console.log("added code to " + filePath);
        });
      });
    });
}

function updateCombustConfig(moduleName) {
  const filePath = "src/.combust/init.js";
  fs.readFile(filePath, "utf8", (err, file) => {
    if (err) {
      return console.error(err);
    }
    const firstCap =
      moduleName.charAt(0).toUpperCase() + moduleName.substring(1);

    file = insertImports(file, [
      `import ${moduleName}Store from "../stores/${firstCap}Store"`
    ]);
    file = insertAfter(file, [`\t${moduleName}Store,`], "stores = {\n");

    fs.writeFile(filePath, file, "utf-8", err => {
      if (err) throw err;
      console.log("added code to " + filePath);
    });
  });
}

const operationsMap = {
  imports: insertImports,
  renderStart: insertAtRenderStart,
  renderEnd: insertAtRenderEnd,
  after: insertAfter,
  before: insertBefore
};

function insertImports(file, code) {
  code.forEach(line => {
    file = line + "\n" + file;
  });
  return file;
}

function insertAfter(file, code, pattern) {
  const codeToAdd = getCodeStrFromArr(code);
  const index = file.indexOf(pattern) + pattern.length;
  if (index < pattern.length) return file;
  return insertCodeAtIndex(file, codeToAdd, index);
}

function insertBefore(file, code, pattern) {
  const codeToAdd = getCodeStrFromArr(code);
  const index = file.indexOf(pattern);
  return insertCodeAtIndex(file, codeToAdd, index);
}

function insertAtRenderEnd(file, code) {
  const codeToAdd = getCodeStrFromArr(code);
  const index = file.lastIndexOf("</");
  return insertCodeAtIndex(file, codeToAdd, index);
}

function insertAtRenderStart(file, code) {
  const codeToAdd = getCodeStrFromArr(code);
  const index = file.indexOf("<");
  return insertCodeAtIndex(file, codeToAdd, index);
}

function insertCodeAtIndex(file, code, index) {
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

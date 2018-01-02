const os = require("os");
const shell = require("shelljs");
const fs = require("fs");
const { getUserAdmins, updateData } = require("../helpers/firebase_helper");
const { mkdirSync } = require("../helpers/fs_helper");
const tar = require("tar");

function install(moduleName, isDependency) {
  if (!moduleName)
    return console.error(
      "Err: Must specify a module: combust install moduleName\nView available modules here: http://www.example.com"
    );
  moduleName.toLowerCase();

  const firstCap = moduleName.charAt(0).toUpperCase() + moduleName.substring(1);
  const storePath = `src/stores/${firstCap}Store.js`;
  const servicePath = `src/service/${firstCap}Service.js`;
  const componentsPath = `src/components/combust_examples/${moduleName}`;

  if (fs.existsSync(storePath) || fs.existsSync(servicePath)) {
    if (!isDependency) {
      console.info(`${moduleName} module already installed`.red);
    }
    return; //dependency already installed
  }
  const tempFolder = fs.mkdtempSync(os.tmpdir() + "/");

  //download npm contents and unzip into temp directory
  const { stdout, stderr } = shell.exec(`npm pack combust-${moduleName}`, {
    silent: true
  });
  stderr && console.error(stderr);
  const tgzFile = stdout.trim();
  tar
    .extract({
      file: tgzFile
    })
    .then(() => {
      fs.unlink(tgzFile);
      shell.exec(`mv package ${tempFolder}`);
      const instructions = JSON.parse(
        fs.readFileSync(`${tempFolder}/package/combust.json`, "utf8")
      );
      downloadDependencies(instructions.dependencies);

      //extract files we need and move to src
      mkdirSync("src/stores");
      mkdirSync("src/service");
      mkdirSync(componentsPath);
      shell.exec(`mv ${tempFolder}/package/Store.js ${storePath}`);
      shell.exec(`mv ${tempFolder}/package/Service.js ${servicePath}`);
      shell.exec(`mv ${tempFolder}/package/components/* ${componentsPath}`);

      //execute installation instructions
      const installInstructions = instructions
        ? instructions.installation
        : null;
      executeInstallInstructions(installInstructions);
      updateCombustConfig(moduleName);
      shell.exec(`rm -rf ${tempFolder}`);
      if (!isDependency) {
        console.log(
          `\n${moduleName}`.yellow + ` succesfully installed!`.yellow
        );
      }
    });
  return true;
}

function downloadDependencies(dependencies) {
  for (let dependency in dependencies) {
    let installCompleted = install(dependency, true);
    if (installCompleted) {
      console.log(dependency.yellow + " module installed as a dependency");
    }
  }
}

function executeInstallInstructions(installInstructions) {
  // console.log("exec install called w/:", installInstructions);
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

module.exports = {
  install,
  executeInstallInstructions
};

/**
 * TODO:
 * Putting this on the back burner.
 * This functionality would let modules have a predefined set
 * of data that could be inserted on install
 * ie: friends module could inject friend data.
 * it's closish to done, but there are some security issues to worry about,
 * plus the risk of accidentally overwriting a lot of user data
 */
function saveInstallData(installData, callback) {
  if (!installData) return callback();

  let finishedPromises = 0;
  let totalPromises = 0;
  let finishedWithTree = false;
  console.log("installData b4:", installData);

  const checkIfFinished = iterationCompleted => {
    if (
      (iterationCompleted ? ++finishedPromises : finishedPromises) >=
        totalPromises &&
      finishedWithTree
    ) {
      console.log("installData after:", installData);
      updateData("/", JSON.stringify(installData));
      return callback();
    }
  };

  const replacePlaceholders = val => {
    //iterate through object tree and replace
    //placeholders like $admins w/corresponding objs
    val &&
      Object.keys(val).forEach(key => {
        if (["$admins"].includes(key)) {
          console.log("found it!");
          totalPromises++;
          getReplacementKeysForPlaceholder("$admins")
            .then(keys => {
              console.log("admin keys:", keys);
              keys &&
                keys.forEach(adminId => {
                  val[adminId] = val["$admins"];
                });
              delete val["$admins"];
              checkIfFinished(true);
            })
            .catch(err => {
              console.log("err finding keys:", err);
              checkIfFinished(true);
            });
        } else if (typeof val[key] === "object") {
          replacePlaceholders(val[key]);
        }
      });
  };

  replacePlaceholders(installData);
  finishedWithTree = true;
  checkIfFinished();

  // console.log("installdata after:", installData);
}

var replaceMentKeysByPlaceholder = {};

function getReplacementKeysForPlaceholder(placeholder) {
  const placeholders = {
    $admins: getUserAdmins
  };
  console.log("called w:" + placeholder);

  return new Promise((resolve, reject) => {
    if (replaceMentKeysByPlaceholder.hasOwnProperty(placeholder)) {
      resolve(replaceMentKeysByPlaceholder[placeholder]);
    } else {
      placeholders[placeholder]()
        .then(res => {
          resolve(res);
        })
        .catch(err => {
          console.log(err);
          reject(err);
        });
    }
  });
}

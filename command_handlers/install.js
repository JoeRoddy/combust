const os = require("os");
const shell = require("shelljs");
const fs = require("fs");
const { getUserAdmins, updateData } = require("../helpers/firebase_helper");
const { mkdirSync } = require("../helpers/fs_helper");
const tar = require("tar");
const stripJsonComments = require("strip-json-comments");

let rules = {};

function install(moduleName, isDependency, callback) {
  if (!moduleName)
    return console.error(
      "Err: Must specify a module: combust install moduleName\nView available modules here: http://www.example.com"
    );
  moduleName.toLowerCase();

  const firstCap = moduleName.charAt(0).toUpperCase() + moduleName.substring(1);
  const storePath = `src/stores/`;
  const dbPath = `src/db/`;
  const componentsPath = `src/components/${moduleName}`;

  if (
    fs.existsSync(storePath + firstCap + "Store.js") ||
    fs.existsSync(storePath + firstCap + "s" + "Store.js") ||
    fs.existsSync(
      storePath + firstCap.substring(0, firstCap.length - 1) + "Store.js"
    )
  ) {
    //TODO: check if module is installed (in a less shitty way than this^)
    if (!isDependency) {
      console.info(`${moduleName} module already installed`.red);
    }
    return callback(null, "ALREADY_INSTALLED"); //dependency already installed
  }

  const tempFolder = "deleteMe" + moduleName;
  mkdirSync(tempFolder);

  //download npm contents and unzip into temp directory
  const { stdout, stderr } = shell.exec(`npm pack combust-${moduleName}`, {
    silent: true
  });
  if (stderr) {
    return console.error(
      "Error downloading the ".red +
        moduleName.cyan +
        " module.  ".red +
        `\nEnsure it exists by searching for "combust-${moduleName}" @ https://www.npmjs.com/search`
    );
  }

  let tgzFile = stdout.trim();
  shell.exec(`mv ${tgzFile} ${tempFolder}`);

  tar
    .extract({
      cwd: tempFolder,
      file: tempFolder + "/" + tgzFile
    })
    .then(() => {
      fs.unlink(tempFolder + "/" + tgzFile, err => {
        err && console.error(err);
      });

      let jsonData = fs.readFileSync(
        `${tempFolder}/package/combust.json`,
        "utf8"
      );

      let instructions = JSON.parse(jsonData);
      downloadDependencies(instructions.dependencies)
        .then(a => {
          const storeFile = fs.readdirSync(`${tempFolder}/package/stores`)[0];

          //extract files we need and move to src
          mkdirSync("src/stores");
          mkdirSync("src/db");
          mkdirSync(componentsPath);
          shell.exec(`mv -v ${tempFolder}/package/stores/* ${storePath}`, {
            silent: true
          });
          shell.exec(`mv -v ${tempFolder}/package/db/* ${dbPath}`, {
            silent: true
          });
          shell.exec(`mv ${tempFolder}/package/components/* ${componentsPath}`);

          if (instructions.rules) rules[moduleName] = instructions.rules;

          //execute installation instructions
          const installInstructions = instructions
            ? instructions.installation
            : null;
          executeInstallInstructions(installInstructions);
          updateCombustConfig(storeFile);
          shell.exec(`rm -rf ${tempFolder}`);
          if (!isDependency) {
            if (Object.keys(rules).length > 0) {
              updateDatabaseRules(rules);
            }
            console.log(
              `\n${moduleName}`.yellow + ` succesfully installed!\n`.yellow
            );
          } else {
            callback &&
              callback(null, `${moduleName} installed as a dependency`);
          }
        })
        .catch(err => {
          console.error(err);
        });
    });
  // return;
}

/**
 * synchronously downloads all dependencies, promise resolve when done or rejects onErr
 * @param {array} dependencies
 */
function downloadDependencies(dependencies) {
  const dependencyArr =
    typeof dependencies !== "undefined" && dependencies
      ? Object.keys(dependencies)
      : [];

  return new Promise((resolve, reject) => {
    if (dependencyArr.length === 0) {
      return resolve();
    }

    const installDependency = (dependency, callback) => {
      try {
        install(dependency, true, (err, res) => {
          if (err) {
            console.log(err);
          } else if (res !== "ALREADY_INSTALLED") {
            console.log(res);
          }
          callback(err, res);
        });
      } catch (err) {
        callback(err);
      }
    };

    let i = 0;

    const recursiveInstall = dependency => {
      installDependency(dependency, (err, res) => {
        if (err) return reject(err);
        i++;
        if (i < dependencyArr.length) {
          recursiveInstall(dependencyArr[i]);
        } else {
          resolve(); //all dependencies installed
        }
      });
    };

    recursiveInstall(dependencyArr[0]);
  });
}

function updateDatabaseRules(rules) {
  let dirtyJson = fs.readFileSync("database.rules.json", "utf8");
  let rulesFile = JSON.parse(stripJsonComments(dirtyJson));
  let currentRules = rulesFile.rules;

  //merge new rules into existing
  for (let moduleName in rules) {
    let module = rules[moduleName];
    currentRules[moduleName] = Object.assign(
      currentRules[moduleName] || {},
      rules[moduleName]
    );
  }

  //save & publish
  fs.writeFileSync("database.rules.json", JSON.stringify(rulesFile, null, 2));
  console.log("\npublishing new database rules");

  const { stdout, stderr, code } = shell.exec(
    "firebase deploy --only database",
    {
      silent: true
    }
  );
  if (stderr) {
    console.log(
      stderr.includes("Command requires authentication")
        ? "\nYou must be logged in to the Firebase CLI to publish rules.".red +
          "\nPlease run: " +
          "firebase login".cyan +
          "\nFollowed by: " +
          "firebase deploy --only database".cyan
        : stderr
    );
  } else {
    console.log(stdout);
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
        if (linesToInsert.pattern && /^win/.test(process.platform)) {
          linesToInsert.pattern = linesToInsert.pattern.replaceAll("\n", "\r");
        } //windows is funnnnnnnnnnn....
        file = operationsMap[operation](file, linesToInsert);
      });

      fs.writeFileSync(filePath, file);
    });
}

function updateCombustConfig(storeName) {
  const filePath = "src/.combust/init.js";
  let firstCap = storeName.substring(0, storeName.length - 3);
  let lowered = firstCap;
  lowered = lowered.charAt(0).toLowerCase() + lowered.substring(1);
  let file = fs.readFileSync(filePath);
  file = insertImports(file, [
    `import ${lowered} from "../stores/${firstCap}"`
  ]);
  file = insertAfter(file, {
    pattern: `stores = {${/^win/.test(process.platform) ? "\r" : "\n"}`,
    code: [`\t${lowered},`]
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
  executeInstallInstructions,
  updateDatabaseRules
};

String.prototype.replaceAll = function(search, replacement) {
  var target = this;
  return target.replace(new RegExp(search, "g"), replacement);
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

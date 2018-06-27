const shell = require("shelljs");
const fs = require("fs");
const ora = require("ora");
const tar = require("tar");
const stripJsonComments = require("strip-json-comments");
const tmp = require("tmp");

const { getUserAdmins, updateData } = require("../helpers/firebase_helper");
const {
  isCurrentDirCombustApp,
  mkdirSync,
  nonCombustAppErr,
  getProjectType
} = require("../helpers/fs_helper");
const { replaceTitleOccurrences } = require("../helpers/string_helper.js");

let rules = {};
let npmDependencies = {};

function install(moduleName, isDependency, callback) {
  if (!isCurrentDirCombustApp()) {
    return console.error(nonCombustAppErr);
  } else if (!moduleName)
    return console.error(
      "Err: Must specify a module: combust install moduleName\nView available modules here: http://www.example.com"
    );
  moduleName.toLowerCase();

  const firstCap = moduleName.charAt(0).toUpperCase() + moduleName.substring(1);
  const storePath = `src/stores/`;
  const dbPath = `src/db/`;
  const componentsPath = `src/components/${moduleName}`;
  const projectType = getProjectType();

  if (
    fs.existsSync(storePath + firstCap + "Store.js") ||
    fs.existsSync(storePath + firstCap + "s" + "Store.js") ||
    fs.existsSync(
      storePath + firstCap.substring(0, firstCap.length - 1) + "Store.js"
    )
  ) {
    //TODO: check if module is installed (in a less shitty way than this^)
    if (!isDependency) {
      return console.error(`${moduleName} module already installed`.red);
    }
    return callback(null, "ALREADY_INSTALLED"); //dependency already installed
  }

  const tmpObj = tmp.dirSync();
  const tempFolder = `${tmpObj.name}/${moduleName}`;
  mkdirSync(tempFolder);

  //download npm contents and unzip into temp directory
  const { stdout, stderr } = shell.exec(`npm pack combust-${moduleName}`, {
    silent: true
  });
  if (stderr && stderr.startsWith("npm ERR!")) {
    return console.error(
      "Error downloading the ".red +
        moduleName.cyan +
        " module.  ".red +
        `\nEnsure it exists on npm: https://www.npmjs.com/search?q=combust-${moduleName}`
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
      addNpmDependenciesToQue(instructions, projectType);
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
          if (instructions.rules) rules[moduleName] = instructions.rules;

          //execute installation instructions
          let installInstructions = instructions
            ? instructions[
                projectType === "mobile"
                  ? "installation_mobile"
                  : "installation"
              ]
            : null;
          if (projectType === "mobile" && !installInstructions) {
            console.log(
              "Mobile components not supplied for " +
                moduleName.cyan +
                " module"
            );
            createPlaceholderMobileComponent(moduleName);
            executeInstallInstructions(
              getDefaultInstallInstrucForMobile(moduleName)
            );
          } else {
            shell.exec(
              `mv ${tempFolder}/package/${
                projectType === "mobile" ? "mobile_components" : "components"
              }/* ${componentsPath}`
            );
            executeInstallInstructions(installInstructions);
          }

          updateCombustConfig(storeFile);
          shell.exec(`rm -rf ${tempFolder}`);
          if (!isDependency) {
            if (Object.keys(rules).length > 0) {
              updateDatabaseRules(rules);
            }
            installNpmDependencies(() => {
              console.log(
                `\n${moduleName}`.yellow + ` succesfully installed!\n`.yellow
              );
            });
          } else {
            callback &&
              callback(
                null,
                moduleName.cyan + " module installed as a dependency"
              );
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

function createPlaceholderMobileComponent(moduleName) {
  fs.readFile(
    __dirname + "/../templates/NoComponent.js",
    "utf8",
    (err, data) => {
      if (err && err.toString().startsWith("Error: EISDIR")) {
        return;
      } else if (err) throw err;
      const title =
        moduleName.charAt(0).toUpperCase() + moduleName.substring(1);
      data = replaceTitleOccurrences(title, data);

      const fileName = title + ".js";
      const filePath = `src/components/${moduleName}/${fileName}`;
      fs.writeFile(filePath, data, err => {
        console.log(
          err
            ? "err updating file:" + err
            : "Created placeholder component: " + filePath.cyan
        );
      });
    }
  );
}

/**
 * adds a template component for the module and adds it to
 * the application's sidemenu
 * @param {} moduleName
 */
function getDefaultInstallInstrucForMobile(moduleName) {
  const capped = moduleName.charAt(0).toUpperCase() + moduleName.substring(1);
  const lowered = moduleName.charAt(0).toLowerCase() + moduleName.substring(1);

  return {
    "components/Routes.js": {
      imports: [`import ${capped} from "./${lowered}/${capped}";`],
      after: {
        pattern: "const COMBUST_SCREENS = {",
        code: [`${capped}: { screen: ${capped}, path: "/${capped}" },`]
      }
    },
    "components/reusable/SideMenu.js": {
      after: {
        pattern: "const COMBUST_MENU_ITEMS = [",
        code: [
          `{
            title: "${capped}",
            icon: "check-circle",
            onPress: () => nav.navigate("${capped}", { userId: user.id })
          },`
        ]
      }
    }
  };
}

function updateDatabaseRules(rules) {
  const dbRulesPath = "./src/.combust/database.rules.json";
  let dirtyJson = fs.readFileSync(dbRulesPath, "utf8");
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
  fs.writeFileSync(dbRulesPath, JSON.stringify(rulesFile, null, 2));
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
    console.log("rules published".green);
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

function addNpmDependenciesToQue(instructions, projectType) {
  const npmDeps = instructions
    ? instructions[
        `npm_dependencies${
          projectType === "mobile" ? "_mobile" : "installation"
        }`
      ]
    : null;
  npmDependencies = Object.assign(npmDependencies, npmDeps);
}

function installNpmDependencies(callback = () => {}) {
  if (Object.keys(npmDependencies).length === 0) return callback();
  const spinner = ora("Installing npm dependencies").start();
  let dependencyString = ``;
  for (let key in npmDependencies) {
    dependencyString += `${key}@${npmDependencies[key]} `;
  }
  const { stdout, stderr, code } = shell.exec(
    `npm install --silent --save ${dependencyString}`,
    { async: true, silent: true },
    () => {
      spinner.clear();
      spinner.stop();
      callback();
    }
  );
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
  //can be either a single replace -> replace: {pattern:"...", code:[".."]}
  //or an array of replacements -> replace: [{},{}]
  const replaceRules = Array.isArray(patternAndCode)
    ? patternAndCode
    : [patternAndCode];
  replaceRules.forEach(pAndC => {
    const { pattern, code } = pAndC;
    file = file.replace(pattern, getCodeStrFromArr(code));
  });

  return file;
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

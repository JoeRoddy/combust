const shell = require("shelljs");
const fs = require("fs");
const ora = require("ora");
const tar = require("tar");
const stripJsonComments = require("strip-json-comments");
const tmp = require("tmp");

const { getUserAdmins, updateData } = require("../helpers/firebase_helper");
const {
  cpFolderRecursively,
  rmFolderRecursively,
  cloneRepo,
  isCurrentDirCombustApp,
  mkdirSync,
  nonCombustAppErr,
  getConfiguredFirebaseProjectId,
  getProjectType
} = require("../helpers/fs_helper");
const { replaceTitleOccurrences } = require("../helpers/string_helper.js");

let rules = {};
let mobileNpmDependencies = {};
let webNpmDependencies = {};
let isDualProject = false;

async function install(moduleName, isDependency, callback) {
  if (!isCurrentDirCombustApp()) {
    return console.error(nonCombustAppErr);
  } else if (!moduleName)
    return console.error(
      "Err: Must specify a module: combust install moduleName\nView available modules here: https://joeroddy.github.io/combust/modules.html"
    );
  [moduleName, devPath] = moduleName.split("_dev@");
  moduleName = moduleName.toLowerCase();
  const projectType = getProjectType();
  isDualProject = projectType === "dual";
  const storePath = isDualProject ? `shared/stores/` : `src/stores/`;
  const dbPath = isDualProject ? `shared/db` : `src/db/`;

  if (checkIfModuleAlreadyInstalled({ moduleName, storePath, isDependency })) {
    return isDependency
      ? callback(null, "ALREADY_INSTALLED")
      : console.error(`${moduleName} module already installed`.red);
  }

  const tmpObj = tmp.dirSync();
  const tempFolder = `${tmpObj.name}/${moduleName}`;
  mkdirSync(tempFolder);

  try {
    await getModuleFiles(moduleName, tempFolder, devPath);
    let jsonData = fs.readFileSync(
      `${tempFolder}/package/combust.json`,
      "utf8"
    );

    let instructions = JSON.parse(jsonData);
    let {
      cloudFunctions,
      componentsPath,
      dependencies,
      installedIfExists
    } = instructions;

    if (
      installedIfExists &&
      checkIfModuleAlreadyInstalled({ installedIfExists })
    ) {
      return isDependency
        ? callback(null, "ALREADY_INSTALLED")
        : console.error(`${moduleName} module already installed`.red);
    }

    addNpmDependenciesToQue(instructions, projectType);
    await downloadDependencies(dependencies);

    const cloudFunctionsExist = cloudFunctions ? true : false;
    if (cloudFunctionsExist && !fs.existsSync("./functions/index.js")) {
      applyBaseCloudFunctions();
    }

    const componentsExist = fs.existsSync(`${tempFolder}/package/components/`);
    const storesExist = fs.existsSync(`${tempFolder}/package/stores/`);
    const dbExists = fs.existsSync(`${tempFolder}/package/db/`);
    componentsPath =
      componentsPath ||
      (componentsExist ? `src/components/${moduleName}` : null);

    if (isDualProject) {
      ["web", "mobile"].forEach(platform => {
        storesExist && mkdirSync(`${platform}/src/stores`);
        dbExists && mkdirSync(`${platform}/src/db`);
        componentsPath && mkdirSync(`${platform}/${componentsPath}`);
        cloudFunctionsExist && mkdirSync(`${platform}/functions/api`);
      });
    } else {
      storesExist && mkdirSync("src/stores");
      dbExists && mkdirSync("src/db");
      componentsPath && mkdirSync(componentsPath);
      cloudFunctionsExist && mkdirSync("functions/api");
    }

    //extract files we need and move to src
    if (storesExist) {
      const storeFile = fs.readdirSync(`${tempFolder}/package/stores/`)[0];
      updateStoresInit(storeFile);
      shell.exec(`mv -v ${tempFolder}/package/stores/* ${storePath}`, {
        silent: true
      });
    }
    dbExists &&
      shell.exec(`mv -v ${tempFolder}/package/db/* ${dbPath}`, {
        silent: true
      });
    cloudFunctionsExist &&
      shell.exec(`mv -v ${tempFolder}/package/api/* functions/api/`, {
        silent: true
      });

    if (instructions.rules) rules[moduleName] = instructions.rules;

    insertComponentsAndExecuteInstructions({
      instructions,
      projectType,
      moduleName,
      tempFolder,
      componentsPath
    });

    shell.exec(`rm -rf ${tempFolder}`);

    if (cloudFunctionsExist) deployCloudFunctions();
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
        callback(null, moduleName.cyan + " module installed as a dependency");
    }
  } catch (err) {
    console.log(err);
  }
}

//download npm contents and unzip into temp directory
function getModuleFiles(moduleName, tempFolder, devPath) {
  if (devPath) {
    console.log("INSTALLING WITH DEV_MODE");
    mkdirSync(tempFolder + "/package");
    return new Promise((resolve, reject) => {
      cpFolderRecursively(devPath, tempFolder + "/package", err => {
        err ? console.log(err[0].message) : resolve();
      });
    });
  }
  const { stdout, stderr } = shell.exec(`npm pack combust-${moduleName}`, {
    silent: true
  });
  if (stderr && stderr.startsWith("npm ERR!")) {
    return new Promise((res, reject) => {
      reject(
        "Error downloading the ".red +
          moduleName.cyan +
          " module.  ".red +
          `\nEnsure it exists on npm: https://www.npmjs.com/search?q=combust-${moduleName}`
      );
    });
  }

  let tgzFile = stdout.trim();
  shell.exec(`mv ${tgzFile} ${tempFolder}`);

  return tar
    .extract({
      cwd: tempFolder,
      file: tempFolder + "/" + tgzFile
    })
    .then(() => {
      // delete the zip file
      fs.unlink(tempFolder + "/" + tgzFile, err => err && console.error(err));
    });
}

function insertComponentsAndExecuteInstructions(context) {
  const {
    componentsPath,
    instructions,
    projectType,
    moduleName,
    tempFolder
  } = context;
  const platforms = isDualProject ? ["web", "mobile"] : [projectType];
  platforms.forEach(platform => {
    const installInstructions = instructions
      ? instructions[
          platform === "mobile" ? "installation_mobile" : "installation"
        ]
      : null;
    if (platform === "mobile" && !installInstructions) {
      console.log(
        "Mobile components not supplied for " + moduleName.cyan + " module"
      );
      componentsPath && createPlaceholderMobileComponent(moduleName);
      executeInstallInstructions(getDefaultInstallInstrucForMobile(moduleName));
    } else {
      componentsPath &&
        shell.exec(
          `mv ${tempFolder}/package/${
            platform === "mobile" ? "mobile_components" : "components"
          }/* ${isDualProject ? platform + "/" : ""}${componentsPath}`
        );
      executeInstallInstructions(
        installInstructions,
        isDualProject ? platform : null
      );
    }
  });
}

/**
 * synchronously downloads all dependencies, promise resolves when done or rejects onErr
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
      const filePath = `${
        isDualProject ? "mobile/" : ""
      }src/components/${moduleName}/${fileName}`;
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
    "components/app/Routes.js": {
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
  const isDual = getProjectType() === "dual";
  const dbRulesPath = `./config/firebase/database.rules.json`;
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
  const rulesContent = JSON.stringify(rulesFile, null, 2);
  fs.writeFileSync(dbRulesPath, rulesContent);
  // if (isDual) {
  //   fs.writeFileSync(`./web/src/.combust/database.rules.json`, rulesContent);
  // }

  const projectId = getConfiguredFirebaseProjectId();
  if (!projectId)
    return console.log(
      "\nApp not yet configured, skipping rules publishing.  To publish firebase rules manually, run:\n" +
        "firebase deploy --only database".cyan
    );

  console.log("\npublishing new database rules");
  const { stdout, stderr, code } = shell.exec(
    `${
      isDual ? "cd web &&" : ""
    }firebase deploy --only database --project ${projectId}`,
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

/**
 * executes install instructions for web or mobile
 * @param {Object} installInstructions
 * @param {string} dualProjectPlatform - web | mobile - unneccessary if not dual plat
 */
function executeInstallInstructions(installInstructions, dualProjectPlatform) {
  const pathPrefix = dualProjectPlatform ? `${dualProjectPlatform}/` : "";
  installInstructions &&
    Object.keys(installInstructions).forEach(path => {
      const filePath = `${pathPrefix}${path}`;
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
  if (!instructions) return;

  const addWebDependenciesToQue = () => {
    const newNpmDeps = instructions.npm_dependencies;
    webNpmDependencies = Object.assign(webNpmDependencies, newNpmDeps);
  };
  const addMobileDependenciesToQue = () => {
    const newNpmDeps = instructions.npm_dependencies_mobile;
    mobileNpmDependencies = Object.assign(mobileNpmDependencies, newNpmDeps);
  };

  if (projectType === "web" || projectType === "dual") {
    addWebDependenciesToQue();
  }
  if (projectType === "mobile" || projectType === "dual") {
    addMobileDependenciesToQue();
  }
}

function installNpmDependencies(callback = () => {}) {
  const projectType = getProjectType();
  const platformsToInstall =
    projectType === "dual" ? ["web", "mobile"] : [projectType];

  //move to promises eventually,
  //basically doing the same thing w/callbacks here
  let currentPlatformIndex = 0;
  const recursiveInstall = platform => {
    installNpmDependenciesForPlatform(platform, () => {
      currentPlatformIndex++;
      if (currentPlatformIndex < platformsToInstall.length) {
        recursiveInstall(platformsToInstall[currentPlatformIndex]);
      } else {
        //done
        callback();
      }
    });
  };

  recursiveInstall(platformsToInstall[0]);
}

function installNpmDependenciesForPlatform(platform, callback) {
  const npmDependencies =
    platform === "web" ? webNpmDependencies : mobileNpmDependencies;
  if (Object.keys(npmDependencies).length === 0) return callback();
  const spinner = ora(
    `Installing npm dependencies${isDualProject ? ` for ${platform}` : ""}`
  ).start();

  let dependencyString = ``;
  for (let key in npmDependencies) {
    dependencyString += `${key}@${npmDependencies[key]} `;
  }
  const { stdout, stderr, code } = shell.exec(
    `${
      isDualProject ? `cd ${platform} &&` : ""
    }npm install --silent --save ${dependencyString}`,
    { async: true, silent: true },
    () => {
      spinner.clear();
      spinner.stop();
      callback();
    }
  );
}

function updateStoresInit(storeName) {
  const filePath = `${isDualProject ? "shared" : "src"}/.combust/init.js`;
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
  replace: replaceCode,
  fileEnd: insertAtEndOfFile
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

function insertAtEndOfFile(file, code) {
  code.forEach(line => {
    file = file + "\n" + line;
  });
  return file;
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

function applyBaseCloudFunctions() {
  console.log("Setting up cloud functions..\n".green);
  cloneRepo(
    "https://github.com/JoeRoddy/combust-cloud-functions.git",
    "functions"
  );
  shell.exec("cd functions && npm i", { silent: true });
  rmFolderRecursively("functions/.git");
  let file = fs.readFileSync("functions/index.js", "utf8");
  file = replaceCode(file, {
    pattern: 'databaseURL: ""',
    code: [
      `databaseURL: "https://${getConfiguredFirebaseProjectId()}.firebaseio.com"`
    ]
  });
  fs.writeFileSync("functions/index.js", file);
}

function deployCloudFunctions() {
  console.log(
    "\nDeploying new cloud functions.. this may take a minute..".green
  );
  shell.exec("firebase deploy --only functions");
}

function determineApiFileName(moduleName) {
  // user-search => userSearch
  return moduleName
    .split("-")
    .reverse()
    .reduce(
      (s, name, i) =>
        (name += i === 0 ? s : s.charAt(0).toUpperCase() + s.slice(1))
    );
}

//TODO: check if module is installed (in a less shitty way than this^)
function checkIfModuleAlreadyInstalled({
  moduleName,
  storePath,
  installedIfExists
}) {
  if (installedIfExists) {
    // combust module explicitly states files to check
    for (let i = 0; i < installedIfExists.length; i++) {
      if (fs.existsSync(installedIfExists[i])) return true;
    }
  } else {
    // make some guesses on files to check
    if (
      fs.existsSync(`${storePath}${moduleName}Store.js`) ||
      fs.existsSync(`${storePath}${moduleName}sStore.js`) ||
      fs.existsSync(
        `${storePath}${moduleName.substring(0, moduleName.length - 1)}Store.js`
      ) ||
      fs.existsSync(`functions/api/${determineApiFileName(moduleName)}Api.js`)
    ) {
      return true;
    }
  }
  return false;
}

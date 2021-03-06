const fs = require("fs");
const ncp = require("ncp");

const {
  executeInstallInstructions,
  updateDatabaseRules,
  addStoreToInitFile
} = require("../command_handlers/install.js");
const {
  isCurrentDirCombustApp,
  mkdirSync,
  nonCombustAppErr,
  getProjectType
} = require("../helpers/fs_helper.js");
const {
  replaceAll,
  replaceTitleOccurrences
} = require("../helpers/string_helper.js");

const templatePath = __dirname + "/../templates/";

module.exports = (moduleTitle, fieldsAndVals) => {
  if (!isCurrentDirCombustApp()) {
    return console.error(nonCombustAppErr);
  }

  const missing = fieldsAndVals.find(fieldValPair => {
    return !fieldValPair.includes(":");
  });
  if (missing) {
    return console.error(
      "Field:DataType pairs must have a colon, issue with argument:",
      missing
    );
  }

  const fieldsObjArr = convertToObjArray(fieldsAndVals);
  const projectType = getProjectType();
  createFiles(moduleTitle, fieldsObjArr, projectType);
  addNewRoutes(moduleTitle, projectType);
};

const convertToObjArray = function(fieldsAndVals) {
  return fieldsAndVals.map(fieldValPair => {
    let [fieldName, dataType, defaultValue] = fieldValPair.split(":");
    const validDataTypes = ["text", "string", "number", "boolean", "image"];
    if (!validDataTypes.includes(dataType)) {
      throw `Probem with data type: ${dataType}\nValid data types: ${validDataTypes.join(
        ", "
      )}`;
    }

    return {
      fieldName,
      dataType,
      defaultValue
    };
  });
};

// TODO: make this less disgusting
const createFiles = function(moduleTitle, fieldsAndVals, projectType) {
  const singularTitle =
    moduleTitle.charAt(moduleTitle.length - 1).toUpperCase() === "S"
      ? moduleTitle.substring(0, moduleTitle.length - 1)
      : moduleTitle;
  const capped =
    singularTitle.charAt(0).toUpperCase() + singularTitle.substring(1);
  const componentFolderTitle = singularTitle.toLowerCase() + "s";

  const isDual = projectType === "dual";

  //atm this writes the db && store files to 'shared' twice on dual plats
  const platforms = isDual ? ["web", "mobile"] : [projectType];

  ["db/", "stores/", "components/"].forEach(folder => {
    const isComponentFolder = folder === "components/";

    platforms.forEach(platform => {
      const fullTemplateFolderPath = `${templatePath + folder}${
        isComponentFolder ? platform + "/" : ""
      }`;
      const destinationFolder = isDual
        ? isComponentFolder
          ? `./${platform}/src/${folder}${componentFolderTitle}`
          : `./shared/${folder}`
        : `./src/${folder}${
            isComponentFolder ? `/${componentFolderTitle}` : ""
          }`;

      if (isComponentFolder) {
        //prepare directories
        mkdirSync(destinationFolder);
        if (platform === "web") {
          try {
            ncp(
              //cp -r
              templatePath + "components/web/styles/",
              destinationFolder + "/styles/",
              function(err) {
                if (err) return console.error(err);
                fs.rename(
                  `${destinationFolder}/styles/Items.scss`,
                  `${destinationFolder}/styles/${capped}s.scss`,
                  err => {
                    err && console.error(err);
                  }
                );
              }
            );
          } catch (err) {
            console.log(err);
          }
        }
      }

      fs.readdir(fullTemplateFolderPath, (err, files) => {
        files &&
          files.forEach(file => {
            fs.readFile(fullTemplateFolderPath + file, "utf8", (err, data) => {
              if (err && err.toString().startsWith(readFolderErr)) {
                return;
              } else if (err) throw err;

              data = replaceTitleOccurrences(singularTitle, data);
              data = insertFieldsAndDefaultVals(data, fieldsAndVals);

              let fileName = file.replace("item", singularTitle);
              fileName = fileName.replace("Item", capped);
              const fileDestinationPath = `${destinationFolder}/${fileName}`;

              fs.writeFile(fileDestinationPath, data, err => {
                console.log(
                  err ? "err updating file:" + err : "created file: " + fileName
                );
              });
              if (folder === "stores/") {
                addStoreToInitFile(fileName);
              }
            });
          });
      });
    });
  });

  createDbRules(singularTitle);
};

const insertFieldsAndDefaultVals = function(fileData, fieldsAndVals) {
  const fieldsPattern = "const fields = {};";
  const defaultsPattern = "let defaultFields = {};";
  let fields = {};
  let defaults = {};
  fieldsAndVals.forEach(fieldObj => {
    fields[fieldObj.fieldName] = fieldObj.dataType;
    if (fieldObj.defaultValue) {
      defaults[fieldObj.fieldName] = fieldObj.defaultValue;
    }
  });

  fileData = replaceAll(
    fileData,
    defaultsPattern,
    "let defaultFields = " + JSON.stringify(defaults)
  );

  return replaceAll(
    fileData,
    fieldsPattern,
    "const fields = " + JSON.stringify(fields)
  );
};

const addNewRoutes = function(moduleTitle, projectType) {
  const isDualPlat = projectType === "dual";
  const platforms = isDualPlat ? ["web", "mobile"] : [projectType];
  platforms.forEach(platform => {
    const singularTitle =
      moduleTitle.charAt(moduleTitle.length - 1).toUpperCase() === "S"
        ? moduleTitle.substring(0, moduleTitle.length - 1)
        : moduleTitle;
    const ending = singularTitle.substring(1);
    const capitalizedTitle = singularTitle.charAt(0).toUpperCase() + ending;
    const lowerCaseTitle = singularTitle.charAt(0).toLowerCase() + ending;
    const instructions =
      platform === "mobile"
        ? getInstructionsForMobileRoutes(capitalizedTitle, lowerCaseTitle)
        : getInstructionsForWebRoutes(capitalizedTitle, lowerCaseTitle);

    executeInstallInstructions(instructions, isDualPlat ? platform : null);
  });
};

const getInstructionsForWebRoutes = function(capped, lowered) {
  return {
    "src/components/app/Routes.jsx": {
      imports: [
        `import ${capped}s from "../${lowered}s/${capped}s";`,
        `import Create${capped} from "../${lowered}s/Create${capped}";`,
        `import ${capped} from '../${lowered}s/${capped}';`
      ],
      renderEnd: [
        `<Route path="/${lowered}sByUser/:userId" component={${capped}s} />`,
        `<Route path="/create${capped}/" component={Create${capped}} />`,
        `<Route path="/${lowered}/:${lowered}Id" component={${capped}} />`
      ]
    },
    "src/components/app/Navbar.jsx": {
      after: {
        pattern: "const additionalLinks = [",
        code: [
          `<Link to={"/${lowered}sByUser/" + (userStore?userStore.userId:"")}>My ${capped}s</Link>,`
        ]
      }
    }
  };
};

const getInstructionsForMobileRoutes = function(capped, lowered) {
  return {
    "src/components/app/Routes.js": {
      imports: [
        `import ${capped}s from "../${lowered}s/${capped}s";`,
        `import Create${capped} from "../${lowered}s/Create${capped}";`,
        `import ${capped} from '../${lowered}s/${capped}';`
      ],
      after: {
        pattern: "const COMBUST_SCREENS = {",
        code: [
          `${capped}: { screen: ${capped}, path: "/${capped}" },`,
          `${capped}sByUser: { screen: ${capped}s, path: "/${capped}sByUser" },`,
          `Create${capped}: { screen: Create${capped}, path: "/Create${capped}" }`
        ]
      }
    },
    "src/components/reusable/SideMenu.js": {
      after: {
        pattern: "const COMBUST_MENU_ITEMS = [",
        code: [
          `{
            title: "My ${capped}s",
            icon: "check-circle",
            onPress: () => nav.navigate("${capped}sByUser", { userId: user.id })
          },`
        ]
      }
    }
  };
};

const createDbRules = function(moduleName) {
  fs.readFile(templatePath + "rules.json", "utf8", (err, data) => {
    let rules = replaceAll(data, "item", moduleName);
    rules = JSON.parse(rules);
    updateDatabaseRules(rules);
  });
};

const readFolderErr = "Error: EISDIR";

const shell = require("shelljs");
const fs = require("fs");
const {
  executeInstallInstructions,
  updateDatabaseRules
} = require("../command_handlers/install.js");
const { getFirebaseProjects } = require("../helpers/firebase_helper.js");
const {
  currentDirIsCombustApp,
  mkdirSync,
  nonCombustAppErr
} = require("../helpers/fs_helper.js");
const ncp = require("ncp");
const path = require("path");
const templatePath = __dirname + "/../templates/";

module.exports = (moduleTitle, fieldsAndVals) => {
  if (!currentDirIsCombustApp()) {
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
  createFiles(moduleTitle, fieldsObjArr);
  addNewRoutes(moduleTitle);
};

const convertToObjArray = function(fieldsAndVals) {
  return fieldsAndVals.map(fieldValPair => {
    let [fieldName, dataType, defaultValue] = fieldValPair.split(":");
    const validDataTypes = ["text", "string", "number", "boolean", "image"];
    if (!validDataTypes.includes(dataType)) {
      throw `Probem with data type: ${dataType}\nValid data types: ${validDataTypes.join(', ')}`;
    }

    return {
      fieldName,
      dataType,
      defaultValue
    };
  });
};

const createFiles = function(moduleTitle, fieldsAndVals) {
  const singularTitle =
    moduleTitle.charAt(moduleTitle.length - 1).toUpperCase() === "S"
      ? moduleTitle.substring(0, moduleTitle.length - 1)
      : moduleTitle;

  const capped =
    singularTitle.charAt(0).toUpperCase() + singularTitle.substring(1);
  ["service/", "stores/", "components/"].forEach(folder => {
    const folderPath = templatePath + folder;
    if (folder === "components/") {
      const componentPath = `./src/${folder}${singularTitle.toLowerCase()}s`;
      mkdirSync(componentPath);
      try {
        ncp(
          //cp -r
          templatePath + "components/styles/",
          componentPath + "/styles/",
          function(err) {
            if (err) return console.error(err);
            fs.rename(
              `${componentPath}/styles/Items.css`,
              `${componentPath}/styles/${capped}s.css`,
              err => {
                err && console.error(err);
              }
            );
            fs.rename(
              `${componentPath}/styles/Items.scss`,
              `${componentPath}/styles/${capped}s.scss`,
              err => {
                err && console.error(err);
              }
            );
          }
        );
      } catch (err) {
        console.log(err);
      }
      folder += singularTitle.toLowerCase() + "s";
    }
    fs.readdir(folderPath, (err, files) => {
      files &&
        files.forEach(file => {
          fs.readFile(folderPath + file, "utf8", (err, data) => {
            if (err && err.toString().startsWith(readFolderErr)) {
              return;
            } else if (err) throw err;

            data = replaceTitleOccurrences(singularTitle, data);
            data = insertFieldsAndDefaultVals(data, fieldsAndVals);
            const fileName = file.replace("Item", capped);

            fs.writeFile(`./src/${folder}/${fileName}`, data, err => {
              console.log(
                err ? "err updating file:" + err : "created file: " + fileName
              );
            });
          });
        });
    });
  });
  createDbRules(singularTitle);
};

const replaceTitleOccurrences = function(moduleTitle, data) {
  const ending = moduleTitle.substring(1);
  const capped = moduleTitle.charAt(0).toUpperCase() + ending;
  const lowered = moduleTitle.charAt(0).toLowerCase() + ending;

  data = replaceAll(data, "item", lowered);
  data = replaceAll(data, "Item", capped);
  return data;
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

const addNewRoutes = function(moduleTitle) {
  const singularTitle =
    moduleTitle.charAt(moduleTitle.length - 1).toUpperCase() === "S"
      ? moduleTitle.substring(0, moduleTitle.length - 1)
      : moduleTitle;

  const ending = singularTitle.substring(1);
  const capped = singularTitle.charAt(0).toUpperCase() + ending;
  const lowered = singularTitle.charAt(0).toLowerCase() + ending;

  const instructions = {
    "components/Routes.jsx": {
      imports: [
        `import ${capped}s from "./${lowered}s/${capped}s";`,
        `import Create${capped} from "./${lowered}s/Create${capped}";`,
        `import ${capped} from './${lowered}s/${capped}';`
      ],
      renderEnd: [
        `<Route path="/${lowered}sByUser/:userId" component={${capped}s} />`,
        `<Route path="/create${capped}/" component={Create${capped}} />`,
        `<Route path="/${lowered}/:${lowered}Id" component={${capped}} />`
      ]
    },
    "components/Navbar.jsx": {
      after: {
        pattern: "const additionalLinks = [",
        code: [
          `<Link to={"/${lowered}sByUser/" + (userStore?userStore.userId:"")}>My ${capped}s</Link>,`
        ]
      }
    }
  };

  executeInstallInstructions(instructions);
};

const createDbRules = function(moduleName) {
  fs.readFile(templatePath + "rules.json", "utf8", (err, data) => {
    let rules = replaceAll(data, "item", moduleName);
    rules = JSON.parse(rules);
    updateDatabaseRules(rules);
  });
};

const replaceAll = function(string, omit, place, prevstring) {
  if (prevstring && string === prevstring) return string;
  prevstring = string.replace(omit, place);
  return replaceAll(prevstring, omit, place, string);
};

const readFolderErr = "Error: EISDIR";

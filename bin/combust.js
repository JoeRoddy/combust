#! /usr/bin/env node
var shell = require("shelljs");
var yargs = require("yargs");
let create = require("../command_handlers/create.js");
let { install } = require("../command_handlers/install.js");
let configure = require("../command_handlers/configure.js");
let generate = require("../command_handlers/generate.js");

require("yargs") // eslint-disable-line
  .command(
    "create [title]",
    "create a project",
    yargs => {
      yargs.positional("title", {
        describe: "project title",
        default: null
      });
    },
    argv => {
      create(argv.title);
    }
  )
  .command(
    "install [module]",
    "install a combust module",
    yargs => {
      yargs.positional("module", {
        describe: "module to add"
      });
    },
    argv => {
      install(argv.module);
    }
  )
  .command(
    "configure [projectId]",
    "configure firebase project",
    yargs => {
      yargs.positional("projectId", {
        describe: "optional: firebase projectId",
        default: null
      });
    },
    argv => {
      configure(argv.projectId);
    }
  )
  .command(
    "generate [moduleTitle] [field:dataType:defaultValue]",
    "create a new combust module with a list of data fields and default values",
    yargs => {
      yargs.positional("moduleTitle", {
        describe: "module title",
        default: null
      });
      yargs.positional("field:defaultValue", {
        describe: "ex: firstName:'' score:0",
        default: null
      });
    },
    argv => {
      if (!argv.moduleTitle) {
        return console.error(
          "Missing title, specify: generate [moduleTitle] [field:dataType:defaultValue]"
        );
      }
      const fields = [argv["field:dataType:defaultValue"]].concat(
        argv._.slice(1)
      );
      generate(argv.moduleTitle, fields);
    }
  )
  .demand(1, "must provide a valid command")
  .help("h")
  .alias("h", "help").argv;

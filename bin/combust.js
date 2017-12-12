#! /usr/bin/env node
var shell = require("shelljs");
var yargs = require("yargs");
let create = require("../command_handlers/create.js");
let install = require("../command_handlers/install.js");

require("yargs") // eslint-disable-line
  .command(
    "install [module]",
    "install a module: users, login, chat",
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
    "create [projectType] [projectTitle]",
    "create project: web, mobile, desktop\nproject title (optional)",

    yargs => {
      yargs.positional("projectType", {
        describe: "project type",
        default: "web"
      });
      yargs.positional("projectTitle", {
        describe: "project title",
        default: null
      });
    },
    argv => {
      if (!argv.projectType) {
        return console.error(
          "Missing project type, specify: combust create (web | mobile) projectTitle"
        );
      }

      let projectType = argv.projectType.toLowerCase();
      create(projectType, argv.projectTitle);
    }
  )
  .command("command2", "example", yargs => {
    shell.exec("echo do stuff");
  })
  .demand(1, "must provide a valid command")
  .help("h")
  .alias("h", "help").argv;
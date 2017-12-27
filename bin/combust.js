#! /usr/bin/env node
var shell = require("shelljs");
var yargs = require("yargs");
let create = require("../command_handlers/create.js");
let { install } = require("../command_handlers/install.js");
let configure = require("../command_handlers/configure.js");
let createAdmin = require("../command_handlers/admin.js");
let generate = require("../command_handlers/generate.js");

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
    "admin [email]",
    "mark a user account as admin",
    yargs => {
      yargs.positional("projectType", {
        describe: "project type",
        default: "web"
      });
    },
    argv => {
      createAdmin(argv.email);
    }
  )
  .command(
    "generate [moduleTitle] [field:dataType:defaultValue]",
    "create a new firebase service with a list of fields and their defaults",
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
  .command("command2", "example", yargs => {
    shell.exec("echo do stuff");
  })
  .demand(1, "must provide a valid command")
  .help("h")
  .alias("h", "help").argv;

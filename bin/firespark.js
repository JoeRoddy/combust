#! /usr/bin/env node

var shell = require("shelljs");
var yargs = require("yargs");

require("yargs") // eslint-disable-line
  .command(
    "add [module]",
    "add a module: users, login, chat",
    yargs => {
      yargs.positional("module", {
        describe: "module to add",
        default: "chat"
      });
    },
    argv => {
      let mod = argv.module;
      mod.toLowerCase();
      const firstCap = mod.charAt(0).toUpperCase() + mod.substring(1);
      console.info(`adding: ${mod}`);
      shell.exec(
        `mkdir ${mod} && touch ${mod}/${mod}.html && touch ${mod}/${firstCap}Service.js`
      );
    }
  )
  .command("command2", "example", yargs => {
    shell.exec("echo do stuff");
  })
  .demand(1, "must provide a valid command")
  .help("h")
  .alias("h", "help").argv;

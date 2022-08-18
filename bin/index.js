#!/usr/bin/env node
const path = require("path")
const package = require(path.join(__dirname, "../package.json"))
const { main } = require("../dist/main")

const app = Object.keys(package.bin)[0]

// https://www.npmjs.com/package/yargs
const { argv } = require("yargs")
  .option("verbose", {
    alias: "v",
    type: "boolean",
    description: "Run with verbose logging",
  })
  .option("ls", {
    type: "string",
    description: "Lists imports",
  })
  .option("check", {
    type: "string",
    description: "Check imports",
  })
  .usage(`Usage: ${app} <command>`)
  .epilog(['https://art-ws.org', package.description ?? "", 'Copyright 2022'].join(', '))
  .example(`${app} ls`, 'List imports')

main({ argv, app }).catch((e) => {
  console.error(e)
  process.exit(1)
})

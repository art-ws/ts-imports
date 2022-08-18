import { cosmiconfigSync } from "cosmiconfig"
import { Argv, getCommandHandler } from "./commands"
import chalk from "chalk"

export async function main(args: { argv: Argv; app: string }) {
  const { argv, app } = args
  const explorerSync = cosmiconfigSync(app)
  const loaded = explorerSync.search()
  const cmd = argv._[0]
  const config = loaded?.config ?? {}
  try {
    const handler = getCommandHandler(cmd, argv, config)
    const exitCode = (await handler()) ?? 0
    process.exit(exitCode)
  } catch (e) {
    const err = e as Error;
    console.error(chalk.red(err.message))
    throw e 
  }
}

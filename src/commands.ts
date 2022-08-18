import { listDependencies, listSourceFiles } from "./core/functions"

export interface Argv {
  _: CommandName[]
  cwd: string
  v: boolean
  n: boolean
  refs: boolean
  rel: boolean
  filter: string
}

export interface Config {}

export type CommandHandler = () => Promise<number>

const rls = (argv: Argv, cwd: string, isDepsOnly: boolean) => {
  listDependencies({
    cwd,
    isVerbose: !!argv.v,
    isRefs: !!argv.refs,
    isNums: !!argv.n,
    isRel: !!argv.rel,
    filter: argv.filter,
    isDepsOnly,
  })
}
export class CommandsController {
  constructor(public argv: Argv, public config: Config, public cwd: string) {}

  async ls(): Promise<number> {
    const { cwd, argv } = this
    listSourceFiles({
      cwd,
      isVerbose: !!argv.v,
      isRefs: !!argv.refs,
      isNums: !!argv.n,
      isRel: !!argv.rel,
      filter: argv.filter,
    })
    return 0
  }
  async rls(): Promise<number> {
    rls(this.argv, this.cwd, false)
    return 0
  }

  async deps(): Promise<number> {
    rls(this.argv, this.cwd, true)
    return 0
  }
}

type CommandName = keyof CommandsController

export function getCommandHandler(
  cmd: CommandName,
  argv: Argv,
  config: Config
): CommandHandler {
  const cwd = argv.cwd || process.cwd()
  const ctrl = new CommandsController(argv, config, cwd)
  const fn = (ctrl[cmd] as Function).bind(ctrl)
  return fn as CommandHandler
}

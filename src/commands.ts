import { listSourceFiles } from "./core/functions";


export interface Argv  {
  _: CommandName[]
  cwd: string
}

export interface Config {  
} 

export type CommandHandler = () => Promise<number>

export class CommandsController {
  constructor(public argv: Argv, public config: Config, public cwd: string){
  }

  async ls(): Promise<number>{
    listSourceFiles(this.cwd);
    return 0;
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
  const fn = (ctrl[cmd] as Function).bind(ctrl); 
  return fn as CommandHandler
}

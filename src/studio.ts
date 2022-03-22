import '@dxworks/ktextensions'

import {Command} from 'commander'
import {studioInit} from './commands/init'
import {_package} from './utils'
import {studioList} from './commands/list'
import * as fs from 'fs'
import {studioFolder} from './constants'
import {studioStart, studioStop} from './commands/start-stop'
import {studioUpdate} from './commands/update'

fs.mkdirSync(studioFolder, {recursive: true})

export const studioCommand = new Command()
  .name('studio')
  .description(_package.description)
  .version(_package.version, '-v, -version, --version, -V')
  .addCommand(studioInit)
  .addCommand(studioList)
  .addCommand(studioStart)
  .addCommand(studioStop)
  .addCommand(studioUpdate)

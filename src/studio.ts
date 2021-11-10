import '@dxworks/ktextensions'

import {Command} from 'commander'
import {studioInit} from './commands/init'
import {_package} from './utils'

export const studioCommand = new Command()
  .name('studio')
  .description(_package.description)
  .version(_package.version, '-v, -version, --version, -V')
  .addCommand(studioInit)






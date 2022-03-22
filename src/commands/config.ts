import {Command} from 'commander'
import {getAssetFile} from '../utils'
import fs from 'fs'
import {studioConfigDefaultsFile} from '../constants'
import YAML from 'yaml'

export const studioConfig = new Command()
  .name('config')
  .description('Stets up default configuration values files')
  .action(printConfig)


function printConfig() {
  //
}

export function getDefaultValue(key: string): any {
  const path = fs.existsSync(studioConfigDefaultsFile) ? studioConfigDefaultsFile : getAssetFile('config/defaults.yml')
  const configContent = fs.readFileSync(path).toString()
  const config = YAML.parse(configContent)
  if (config)
    return config[key]

  return undefined
}
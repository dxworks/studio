import {Command} from 'commander'
import path from 'path'
import {log} from '@dxworks/cli-common'
import chalk from 'chalk'
import {execSync} from 'child_process'
import {getDockerComposeFilePath, validateProjectFolder} from '../utils'
import {StudioStartOptions} from './start-stop'

export type StudioUpdateOptions = {
  project: string
  file?: string
  latest: boolean
}

export const studioUpdate = new Command()
  .name('update')
  .aliases(['pull'])
  .description('Updates the latest docker images')
  .option('-p, --project <project>', 'the name of the project to update', process.cwd())
  .option('-f, --file <file>', 'the docker-compose file to use')
  .option('-l, --latest', 'update to the latest version of all tools')
  .action(pull)


function pull(options: StudioStartOptions) {
  const {location} = validateProjectFolder(options)
  const dockerComposeFilePath = getDockerComposeFilePath(options, location)

  const command = `docker-compose -f ${dockerComposeFilePath} pull`
  const cwd = path.dirname(dockerComposeFilePath)
  log.info(`Running command ${chalk.yellow(command)} in ${chalk.yellow(cwd)}`)
  execSync(command, {cwd: cwd, stdio: 'inherit'})
}
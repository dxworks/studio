import {Command} from 'commander'
import chalk from 'chalk'
import path from 'path'
import {log} from '@dxworks/cli-common'
import {execSync} from 'child_process'
import {getDockerComposeFilePath, validateProjectFolder} from '../utils'

export type StudioStartOptions = {
  project: string
  file?: string
}

export const studioStart = new Command()
  .name('start')
  .aliases(['up'])
  .description('Starts services for a specified project')
  .argument('[services...]', 'the name of the project and the name of the folder that will be generated', [])
  .option('-p, --project <project>', 'the name of the project to start', process.cwd())
  .option('-f, --file [file]', 'the docker-compose file to use')
  .action(start)

export const studioStop = new Command()
  .name('stop')
  .aliases(['down'])
  .description('Stops services for a specified project')
  .argument('[services...]', 'the name of the project and the name of the folder that will be generated', [])
  .option('-p, --project <project>', 'the name of the project to stop', process.cwd())
  .option('-f, --file <file>', 'the docker-compose file to use')
  .action(stop)

function start(services: string[], options: StudioStartOptions) {
  const {projectID, location} = validateProjectFolder(options)
  const dockerComposeFilePath = getDockerComposeFilePath(options, location)

  const command = `docker-compose -f ${dockerComposeFilePath} up -d ${services.join(' ')}`
  const cwd = path.dirname(dockerComposeFilePath)
  log.info(`Running command ${chalk.yellow(command)} in ${chalk.yellow(cwd)}`)
  execSync(command, {cwd: cwd, stdio: 'inherit'})

  log.info('Successfully started containers')
  log.info(`Visit chronos1 at https://chronos1.${projectID}.`)
  log.info(`Visit chronos at https://chronos.${projectID}.localhost`)
  log.info(`Visit illustry at https://illustry.${projectID}.localhost`)
}

function stop(services: string[], options: StudioStartOptions) {
  const {location} = validateProjectFolder(options)
  const dockerComposeFilePath = getDockerComposeFilePath(options, location)

  const command = `docker-compose -f ${dockerComposeFilePath} down ${services.join(' ')}`
  const cwd = path.dirname(dockerComposeFilePath)
  log.info(`Running command ${chalk.yellow(command)} in ${chalk.yellow(cwd)}`)
  execSync(command, {cwd: cwd, stdio: 'inherit'})
}

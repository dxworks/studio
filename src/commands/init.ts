import template from 'string-template'
import * as fs from 'fs'
import * as fse from 'fs-extra'
import * as path from 'path'
import {Command} from 'commander'
import {dxworksHubDir, log, updateDxworksHub} from '@dxworks/cli-common'
import {getAssetFile} from '../utils'
import chalk from 'chalk'
import getPort from 'get-port'
import inquirer from 'inquirer'

export type StudioInitOptions = {
  dir: string
  chronosTag: string
  chronosPort?: string
  chronos1Tag: string
  chronos1Port?: string
  chronosDockerRegistry?: string
  network: string
  force: boolean
  inspectorGitTag?: string
  inspectorGitPort?: string
}

export const studioInit = new Command()
  .name('init')
  .description('Initializes an analysis folder for a ')
  .argument('<projectID>', 'the name of the project and the name of the folder that will be generated')
  .option('-d, --dir <dir>', `the folder where to create the ${chalk.yellow('\${projectID}')} folder`, process.cwd())
  .option('-ct, --chronos-tag <chronosTag>', 'the chronos docker tag', 'latest')
  .option('-cp, --chronos-port <chronosPort>', 'the chronos port')

  .option('-c1t, --chronos1-tag <chronos1Tag>', 'the chronos1 docker tag', 'latest')
  .option('-c1p, --chronos1-port <chronos1Port>', 'the chronos1 port')


  .option('-cr, --chronos-docker-registry <chronosDockerRegistry>', 'the link to the docker registry where the chronos images exist', process.env['CHRONOS_DOCKER_REGISTRY'])
  .option('--network <network>', 'the docker network on which the containers should exist', 'traefiknet')
  .option('-f, --force', 'whether to force the project creation by overwriting the existing folder', false)
  // .option('-igt, --inspector-git-tag <inspectorGitTag>', 'the inspector git docker tag', 'latest')
  // .option('-igp, --inspector-git-port <inspectorGitPort>', 'the inspector git port', 'latest')
  .action(init)

export async function init(projectID: string, options: StudioInitOptions) {
  const projectFolder = path.resolve(options.dir, projectID)
  if (fs.existsSync(projectFolder) && !options.force) {
    log.error(chalk.red(`Error: project ${projectID} already exists in ${projectFolder}`))
    log.info(chalk.red(`Use ${chalk.yellow('--force')} to overwrite the folder`))
    process.exit(1)
  }
  log.info(`Creating new folder ${projectID}`)
  fs.mkdirSync(projectFolder, {recursive: true})


  const chronosFolder = path.resolve(projectFolder, 'chronos')
  const dataFolder = path.resolve(chronosFolder, 'data')
  const chronosDataFolder = path.resolve(dataFolder, 'chronos2')
  fs.mkdirSync(chronosDataFolder, {recursive: true})
  const chronos1DataFolder = path.resolve(dataFolder, 'chronos')
  fs.mkdirSync(chronos1DataFolder, {recursive: true})
  // const inspectorGitDataFolder = path.resolve(dataFolder, '.inspectorgit')
  // fs.mkdirSync(inspectorGitDataFolder, {recursive: true})

  await fillOptions(options)
  writeDockerCompose(chronosFolder, options, projectID)
  writeDockerEnvFile(chronosFolder, projectID)

  await fillChronosDefinitions(chronosDataFolder)

}

function writeDockerCompose(chronosFolder: string, options: StudioInitOptions, projectID: string) {
  const chronosDockerComposeAsset = `init/chronos-docker-compose.yml`
  const dockerComposeTemplateString = fs.readFileSync(getAssetFile(chronosDockerComposeAsset), 'utf-8')

  const dockerComposeFile = path.resolve(chronosFolder, 'docker-compose.yml')
  fs.writeFileSync(dockerComposeFile, template(dockerComposeTemplateString, {...options, projectID: projectID}))
}

function writeDockerEnvFile(chronosFolder: string, projectID: string) {
  const envFile = path.resolve(chronosFolder, '.env')
  fs.writeFileSync(envFile, `COMPOSE_PROJECT_NAME=${projectID}`)
}

async function fillChronosDefinitions(chronosDataFolder: string) {
  try {
    await updateDxworksHub()
  } catch (e: any) {
    log.warn('Could not update dxworks hub repo')
  }

  fse.copySync(path.resolve(dxworksHubDir, 'chronos2'), chronosDataFolder, {preserveTimestamps: true, recursive: true})
}

async function fillOptions(options: StudioInitOptions) {
  if (!options.chronosPort) {
    options.chronosPort = await getFreeRandomPort()
    log.info(`Allocating ${options.chronosPort} for chronos`)
  }
  if (!options.chronos1Port) {
    log.info(`Allocating ${options.chronos1Port} for chronos1`)
    options.chronos1Port = await getFreeRandomPort()
  }
  if(!options.chronosDockerRegistry) {
    log.info(`Chronos docker registry not found in environment variable ${chalk.yellow('CHRONOS_DOCKER_REGISTRY')}`)
    const answer = await inquirer.prompt({
      type: 'input',
      name: 'chronosDockerRegistry',
      message: 'Please enter the location where chronos docker registry is located: '
    })
    options.chronosDockerRegistry = answer.chronosDockerRegistry
  }

}

async function getFreeRandomPort(): Promise<string> {
  return await getPort({port: getPort.makeRange(3000, 4000)}) + ''
}




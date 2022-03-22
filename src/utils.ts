import path from 'path'
import {log} from '@dxworks/cli-common'
import {getProjects} from './commands/list'
import chalk from 'chalk'
import fs from 'fs'
import {StudioStartOptions} from './commands/start-stop'
import {DXW_STUDIO_PROJECT_METADATA_FILE} from './constants'

// eslint-disable-next-line @typescript-eslint/no-var-requires
export const _package = require('../package.json')


export function getAssetFile(assetName: string): string {
  return path.join(__dirname, 'assets', assetName)
}

export function validateProjectFolder(options: StudioStartOptions): { projectID: string, location: string } {
  if (!folderIsValidProject(options.project)) {
    log.warn(`Folder ${options.project} is not a valid studio project folder, checking if it is a valid project name`)
    const projects = getProjects()
    const projectPath = projects[options.project]
    if (projectPath && folderIsValidProject(projectPath)) {
      return {projectID: options.project, location: projectPath}
    } else {
      log.error(`Project ${options.project} is also not a valid registered project`)
      log.error(`Use ${chalk.yellow('studio ls')} to list all registered projects`)
      process.exit(1)
    }
  } else {
    return {projectID: getProjectIDFrom(options.project), location: options.project}
  }
}

export function getDockerComposeFilePath(options: StudioStartOptions, location: string): string {
  if (options.file) {
    if (fs.existsSync(options.file))
      return path.resolve(options.file)
    else
      log.info(`Provided file ${chalk.yellow(path.resolve(options.file))} does not exist. Falling back to default compose file...`)
  }
  const defaultDockerComposePath = getDefaultDockerComposeFormFolderProject(location)
  if (!fs.existsSync(defaultDockerComposePath)) {
    log.error(`No ${chalk.yellow('docker-compose.yml')} file found at ${defaultDockerComposePath}`)
    log.error(`Please create it or specify a valid compose file via the ${chalk.yellow('--file | -f')} option`)
    process.exit(1)
  }
  return defaultDockerComposePath
}

function folderIsValidProject(folder: string): boolean {
  return fs.existsSync(path.resolve(folder, DXW_STUDIO_PROJECT_METADATA_FILE))
}

function getDefaultDockerComposeFormFolderProject(folder: string): string {
  const composeFile = JSON.parse(fs.readFileSync(path.resolve(folder, DXW_STUDIO_PROJECT_METADATA_FILE)).toString()).composeFile
  if (composeFile) return composeFile
  // if the compose file is not in the project description file, return the legacy compose file
  return path.resolve(folder, 'chronos', 'docker-compose.yml')
}

function getProjectIDFrom(folder: string): string {
  return JSON.parse(fs.readFileSync(path.resolve(folder, DXW_STUDIO_PROJECT_METADATA_FILE)).toString()).projectID
}
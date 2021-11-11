import {Command} from "commander";
// @ts-ignore
import * as Compose from 'dockerode-compose'
import chalk from "chalk";
import {getProjects} from "./list";
import * as fs from "fs";
import path from "path";
import {log} from "@dxworks/cli-common";
import {DXW_STUDIO_PROJECT_METADATA_FILE} from "../constants";
import {execSync} from "child_process";

export type StudioStartOptions = {
    project: string
    file?: string
}

export const studioStart = new Command()
    .name('start')
    .aliases(['up'])
    .description('Starts services for a specified project')
    .argument('[services...]', 'the name of the project and the name of the folder that will be generated', [])
    .option('-p, --project <project>', `the folder where to create the ${chalk.yellow('\${projectID}')} folder`, process.cwd())
    .option('-f, --file <project>', `the docker-compose file to run`)
    .action(start)

export const studioStop = new Command()
    .name('stop')
    .aliases(['down'])
    .description('Stops services for a specified project')
    .argument('[services...]', 'the name of the project and the name of the folder that will be generated', [])
    .option('-p, --project <project>', `the folder where to create the ${chalk.yellow('\${projectID}')} folder`, process.cwd())
    .option('-f, --file <project>', `the docker-compose file to run`)
    .action(stop)

function validateProjectFolder(options: StudioStartOptions): { projectID: string, location: string } {
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

function getDockerComposeFilePath(options: StudioStartOptions, location: string) {
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

function start(services: string[], options: StudioStartOptions) {
    const {projectID, location} = validateProjectFolder(options);
    const dockerComposeFilePath = getDockerComposeFilePath(options, location)

    // const dockerode = new Dockerode()
    // const compose = new Compose(dockerode, dockerComposeFilePath, projectID)
    // compose.up()

    const command = `docker-compose -f ${dockerComposeFilePath} up -d ${services.join(' ')}`
    let cwd = path.dirname(dockerComposeFilePath)
    log.info(`Running command ${chalk.yellow(command)} in ${chalk.yellow(cwd)}`)
    execSync(command, {cwd: cwd, stdio: 'inherit'})

    log.info('Successfully started containers')
    log.info(`Visit chronos1 at https://chronos1.${projectID}.localhost`)
    log.info(`Visit chronos at https://chronos.${projectID}.localhost`)
}

function stop(services: string[], options: StudioStartOptions) {
    const {projectID, location} = validateProjectFolder(options);
    const dockerComposeFilePath = getDockerComposeFilePath(options, location)

    const command = `docker-compose -f ${dockerComposeFilePath} down ${services.join(' ')}`
    let cwd = path.dirname(dockerComposeFilePath)
    log.info(`Running command ${chalk.yellow(command)} in ${chalk.yellow(cwd)}`)
    execSync(command, {cwd: cwd, stdio: 'inherit'})
}

function folderIsValidProject(folder: string): boolean {
    return fs.existsSync(path.resolve(folder, DXW_STUDIO_PROJECT_METADATA_FILE))
}

function getDefaultDockerComposeFormFolderProject(folder: string): string {
    return path.resolve(folder, 'chronos', 'docker-compose.yml')
}

function getProjectIDFrom(folder: string): string {
    return JSON.parse(fs.readFileSync(path.resolve(folder, DXW_STUDIO_PROJECT_METADATA_FILE)).toString()).projectID
}
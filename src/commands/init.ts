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
import {CHRONOS_DOCKER_REGISTRY, DXW_STUDIO_PROJECT_METADATA_FILE, latest, studioProjectsFile} from '../constants'
import Dockerode from 'dockerode'
import {execSync} from 'child_process'

export type StudioInitOptions = {
    dir: string
    flat: boolean
    chronosTag: string
    chronosPort?: string
    chronos1Tag: string
    chronos1Port?: string
    chronosDockerRegistry: string
    network: string
    force: boolean
    illustryTag: string
    illustryPort?: string
    inspectorGitTag?: string
    inspectorGitPort?: string
}

const docker = new Dockerode()

export const studioInit = new Command()
    .name('init')
    .description('Initializes an analysis folder for a project')
    .argument('<projectID>', 'the name of the project and the name of the folder that will be generated')
    .option('-d, --dir <dir>', `the folder where to create the ${chalk.yellow('${projectID}')} folder`, process.cwd())
    .option('--flat', 'does not create a new folder, but initializes the project in the folder specified by --dir', false)
    .option('-ct, --chronos-tag <chronosTag>', 'the chronos docker tag', latest)
    .option('-cp, --chronos-port <chronosPort>', 'the chronos port')

    .option('-c1t, --chronos1-tag <chronos1Tag>', 'the chronos1 docker tag', latest)
    .option('-c1p, --chronos1-port <chronos1Port>', 'the chronos1 port')

    .option('-it, --illustry-tag <illustryTag>', 'the illustry docker tag', latest)
    .option('-ip, --illustry-port <illustryPort>', 'the illustry port')

    .option('-cr, --chronos-docker-registry <chronosDockerRegistry>', 'the link to the docker registry where the chronos images exist', process.env[CHRONOS_DOCKER_REGISTRY])
    .option('--network <network>', 'the docker network on which the containers should exist', 'traefiknet')
    .option('-f, --force', 'whether to force the project creation by overwriting the existing folder', false)
    // .option('-igt, --inspector-git-tag <inspectorGitTag>', 'the inspector git docker tag', 'latest')
    // .option('-igp, --inspector-git-port <inspectorGitPort>', 'the inspector git port', 'latest')
    .action(init)

export async function init(projectID: string, options: StudioInitOptions): Promise<void> {
    const projectFolder = options.flat ? path.resolve(options.dir) : path.resolve(options.dir, projectID)
    if (fs.existsSync(projectFolder) && !options.force) {
        log.error(chalk.red(`Error: project ${projectID} already exists in ${projectFolder}`))
        log.info(chalk.red(`Use ${chalk.yellow('--force')} to overwrite the folder`))
        process.exit(1)
    }
    log.info(`Creating new folder ${projectID}`)
    fs.mkdirSync(projectFolder, {recursive: true})


    const studioFolder = path.resolve(projectFolder, 'studio')
    const dataFolder = path.resolve(studioFolder, 'data')
    const chronosDataFolder = path.resolve(dataFolder, 'chronos2')
    fs.mkdirSync(chronosDataFolder, {recursive: true})
    const chronos1DataFolder = path.resolve(dataFolder, 'chronos')
    fs.mkdirSync(chronos1DataFolder, {recursive: true})
    const illustryDataFolder = path.resolve(dataFolder, 'illustry_mongo')
    fs.mkdirSync(illustryDataFolder, {recursive: true})


    await fillOptions(options)

    await tryRegisterProject(projectID, projectFolder, options)

    writeDockerCompose(studioFolder, options, projectID)
    writeDockerEnvFile(studioFolder, projectID)

    await fillChronosDefinitions(chronosDataFolder)

    log.info(`Successfully initialized project ${chalk.yellow(projectID)} at location ${chalk.yellow(projectFolder)}`)
}

async function getDockerImageVersion(imageUrl: string, chronosTag: string): Promise<string> {
    if (chronosTag !== 'latest') return chronosTag
    const image = `${imageUrl}:${chronosTag}`
    console.log('pulling image ' + image)
    execSync(`docker pull ${image}`)
    const inspect = await docker.getImage(image).inspect()
    let version = inspect.Config?.Labels?.version
    if(!version) version = 'latest'
    return version
}

async function tryRegisterProject(projectID: string, projectFolder: string, options: StudioInitOptions) {
    try {
        let projects = {} as any
        if (fs.existsSync(studioProjectsFile)) {
            projects = JSON.parse(fs.readFileSync(studioProjectsFile).toString())
        }
        projects[projectID] = projectFolder
        const chronosVersion = await getDockerImageVersion(`${options.chronosDockerRegistry}/chronos`, options.chronosTag)
        const chronos1Version = await getDockerImageVersion(`${options.chronosDockerRegistry}/chronos1`, options.chronos1Tag)
        const illustryVersion = await getDockerImageVersion('dxworks/illustry', options.illustryTag)
        options.chronosTag = chronosVersion
        options.chronos1Tag = chronos1Version
        options.illustryTag = illustryVersion

        fs.writeFileSync(studioProjectsFile, JSON.stringify(projects, null, 2))
        fs.writeFileSync(path.resolve(projectFolder, DXW_STUDIO_PROJECT_METADATA_FILE), JSON.stringify({
            projectID,
            chronos: {
                portUrl: `https://localhost:${options.chronosPort}`,
                traefikUrl: `https://chronos.${projectID}.localhost`,
                version: chronosVersion,
            },
            chronos1: {
                portUrl: `https://localhost:${options.chronos1Port}`,
                traefikUrl: `https://chronos1.${projectID}.localhost`,
                version: chronos1Version,
            },
            illustry: {
                portUrl: `https://localhost:${options.illustryPort}`,
                traefikUrl: `https://illustry.${projectID}.localhost`,
                version: illustryVersion,
            },
            composeFile: 'studio/docker-compose.yml',
        }, null, 2))
        log.info(`Successfully registered project ${projectID} with location ${projectFolder} in studio database`)
    } catch (e) {
        // ignore
        console.log(e)
        log.warn('Error registering project in studio database')
    }
}

function writeDockerCompose(studioFolder: string, options: StudioInitOptions, projectID: string) {
    const dockerComposeAsset = 'init/docker-compose.yml'
    const mongoInitAsset = 'init/mongo-init.js'
    const dockerComposeTemplateString = fs.readFileSync(getAssetFile(dockerComposeAsset), 'utf-8')

    const dockerComposeFile = path.resolve(studioFolder, 'docker-compose.yml')
    const mongoInitFile = path.resolve(studioFolder, 'mongo-init.js')
    fs.writeFileSync(dockerComposeFile, template(dockerComposeTemplateString, {...options, projectID: projectID}))
    fs.copyFileSync(getAssetFile(mongoInitAsset), mongoInitFile)
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

    fse.copySync(path.resolve(dxworksHubDir, 'chronos2'), chronosDataFolder, {
        preserveTimestamps: true,
        recursive: true,
    })
}

async function fillOptions(options: StudioInitOptions) {
    if (!options.chronosPort) {
        options.chronosPort = await getFreeRandomPort()
        log.info(`Allocating ${options.chronosPort} for chronos`)
    }
    if (!options.chronos1Port) {
        options.chronos1Port = await getFreeRandomPort()
        log.info(`Allocating ${options.chronos1Port} for chronos1`)
    }
    if (!options.illustryPort) {
        options.illustryPort = await getFreeRandomPort()
        log.info(`Allocating ${options.illustryPort} for illustry`)
    }
    if (!options.chronosDockerRegistry) {
        log.info(`Chronos docker registry not found in environment variable ${chalk.yellow(CHRONOS_DOCKER_REGISTRY)}`)
        const answer = await inquirer.prompt({
            type: 'input',
            name: 'chronosDockerRegistry',
            message: 'Please enter the location where chronos docker registry is located: ',
        })
        options.chronosDockerRegistry = answer.chronosDockerRegistry
    }

}

async function getFreeRandomPort(): Promise<string> {
    return await getPort({port: getPort.makeRange(3000, 4000)}) + ''
}




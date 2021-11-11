import {homedir} from "os";
import path from "path";

export const latest = 'latest'

export const CHRONOS_DOCKER_REGISTRY = 'CHRONOS_DOCKER_REGISTRY'

export const DXW_STUDIO_PROJECT_METADATA_FILE = '.dxw-studio-project'

export const studioFolder = path.resolve(homedir(), '.dxw', 'studio')
export const studioProjectsFile = path.resolve(studioFolder, 'projects.json')
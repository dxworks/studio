import {homedir} from 'os'
import path from 'path'

export const DXW_STUDIO_PROJECT_METADATA_FILE = '.dxw-studio-project'

export const studioFolder = path.resolve(homedir(), '.dxw', 'studio')
export const studioProjectsFile = path.resolve(studioFolder, 'projects.json')
export const studioConfigDefaultsFile = path.resolve(studioFolder, 'defaults.yml')
export const dockerComposeYmlTemplate = path.resolve(studioFolder, 'docker-compose.template.yml')

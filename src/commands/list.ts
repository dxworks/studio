import {Command} from "commander";
import {studioProjectsFile} from "../constants";
import fs from "fs";

export const studioList = new Command()
    .name('list')
    .aliases(['ls', 'l', 'll'])
    .description('Lists all registered projects created with studio init')
    .action(list)

function list() {
    const projects = getProjects()
    // @ts-ignore
    console.table(Object.keys(projects).reduce((a, it) => ({...a, [it]: {location: projects[it]}}), {}))
}

export function getProjects(): { [projectID: string]: string } {
    try {
        return JSON.parse(fs.readFileSync(studioProjectsFile).toString())
    } catch (e: any) {
        return {}
    }
}

import * as semver from 'semver';

const NEST_MS_VERSION_8_3_1 = '8.3.1';

function loadDependencyVersion(): string {
   try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const json = require(`${process.cwd()}/node_modules/@nestjs/microservices/package.json`);
    return json.version;
   } catch(e) {
     throw new Error(`Not found @nestjs/microservices. Please install it !`);
   }
}

export function isGTEV8_3_1() {
    return semver.gte(NEST_MS_VERSION_8_3_1,loadDependencyVersion());
}

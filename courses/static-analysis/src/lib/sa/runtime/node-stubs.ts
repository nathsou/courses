/** Stand-ins for Node built-ins that typescript-eslint imports but never needs when it is handed a ready-made program. */
const unsupported = (name: string) => () => {
  throw new Error(`${name} is not available in the browser`);
};
export const existsSync = () => false;
export const readFileSync = unsupported('fs.readFileSync');
export const statSync = unsupported('fs.statSync');
export const realpathSync = (p: string) => p;
export const readdirSync = () => [];
export const platform = () => 'browser';
export const EOL = '\n';
export const homedir = () => '/';
export const tmpdir = () => '/tmp';
export const fileURLToPath = (u: string) => String(u).replace(/^file:\/\//, '');
export const pathToFileURL = (p: string) => new URL(`file://${p}`);
export const createRequire = () => unsupported('module.createRequire');
const stub = { existsSync, readFileSync, statSync, realpathSync, readdirSync, platform, EOL, homedir, tmpdir, fileURLToPath, pathToFileURL, createRequire, promises: {} };
export default stub;

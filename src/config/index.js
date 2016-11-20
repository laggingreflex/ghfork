import os from 'os';
import path from 'path';
import fs from 'fs-promise';
import yargs from 'yargs';
import _ from 'lodash';
import { input } from '../utils/prompt';
import { hiddenProp } from '../utils/object';
import { printHelp } from '../utils/help';
import defaults from './defaults';

const { argv } = yargs.options(defaults);

if (argv.h || argv.help) {
  printHelp(true);
}

class Config {
  constructor(args) {
    const config = this;
    hiddenProp(config, 'args');
    hiddenProp(config, 'password');
    hiddenProp(config, 'configFile');
    hiddenProp(config, 'configFileContents');
    hiddenProp(config, 'configFileNotExistsFlag');
    hiddenProp(config, 'urls');
    hiddenProp(config, 'root');
    hiddenProp(config, 'here');
    hiddenProp(config, 'rmRf');
    hiddenProp(config, 'pullRequest');
    hiddenProp(config, 'editConfig');
    hiddenProp(config, 'loggedIn');

    config.args = args;

    config.configFile = args.configFile || args.f || path.resolve(os.homedir(), '.gfork');
    if (config.configFile) {
      let configFileContents;
      try {
        configFileContents = fs.readFileSync(config.configFile, 'utf8');
        try {
          configFileContents = JSON.parse(configFileContents);
        } catch (error) {
          throw new Error(`Couldn't parse config file's (${config.configFile}) contents as valid JSON. ` + error.message);
        }
        config.configFileContents = configFileContents;
        Object.assign(config, config.configFileContents);
      } catch (error) {
        config.configFileNotExistsFlag = true;
        // throw new Error(`Couldn't read config file: "${config.configFile}" ` + error.message);
        // console.error(`Couldn't read config file: "${config.configFile}"`);
      }
    }

    config.username = args.username || args.u || config.username;
    config.password = args.password || args.p || config.password;

    config.root = process.cwd();

    config.here = args.here || args._.includes('.');
    if (args._.includes('.')) {
      args._ = args._.filter(a => a !== '.');
    }

    config.forksDir = args.forksDir || args.forkDir || args.fd || args.F || config.forksDir;
    if (config.forksDir === true) {
      throw new Error(`forksDir path must be a string.`);
    }
    if (config.here) {
      delete config.forksDir;
    }
    if (args.nm || args.N) {
      config.forksDir = 'node_modules';
    }

    config.rmRf = args.rmRf || args.rmrf || args.rm || args.R;

    config.urls = args._;

    if (config.urls.length > 1 && config.here) {
      throw new Error(`Can't clone multiple repos in the same dir.`);
    }
    if (config.urls.length < 1 && config.here) {
      config.urls = [path.basename(config.root)];
    }

    config.token = args.token || args.t || config.token;
    config.tokenNote = args.tokenNote || args.n || config.tokenNote || 'Token for gfork';

    config.remote = args.remote || args.r || config.remote || 'src';
    config.domain = args.domain || args.d || config.domain || 'github.com';

    config.command = args.command || args.cmd || args.c || config.command;
    config.rootDirCommand = args.rootDirCommand || args.rdc || config.rootDirCommand;

    config.pullRequest = args.pullRequest || args.pr || args.p;

    config.editConfig = args.editConfig || args.e
  }

  async saveToFile(silent) {
    const config = this;
    const args = config.args;

    for (const key in config)
      if (config.propertyIsEnumerable(key) && !(config[key] && config[key].length))
        delete config[key];

    try {
      await fs.outputFile(config.configFile, JSON.stringify(config, null, 2));
    } catch (error) {
      throw new Error(`Couldn't save to file "${config.configFile}". ` + error.message);
    }
    silent || console.log(`Config saved successfully to file "${config.configFile}"`);
    return config;
  }

  async editOne(setting, message) {
    const config = this;
    const prev = config[setting];
    message = message || (_.capitalize(_.startCase(setting)) + ':')
    const new1 = await input(message, config[setting]);
    config[setting] = new1;
    if (new1 === prev) {
      return false;
    } else if (!new1 || !new1.length) {
      return false;
    } else {
      return false;
    }
  }

  async edit() {
    const config = this;

    if (config.editConfig) {
      const passedArgs = Object.keys(config.args).filter(arg => Object.keys(config).includes(arg));
      if (passedArgs.length) {
        await Promise.all(passedArgs.map(::config.editOne));
        await config.saveToFile();
        return;
      }
    }

    if (!config.token) {
      if (!await this.editOne('tokenNote')) {
        await this.editOne('token');
      }
    }
    if (config.forksDir) {
      await this.editOne('forksDir', 'Directory to put new forks in:');
      if (config.command) {
        await this.editOne('rootDirCommand', 'Command to run in rootDir after cloning:');
      }
    } else {
      await this.editOne('command', 'Command to run after cloning:');
      await this.editOne('forksDir', 'Directory to put new forks in:');
      if (config.forksDir) {
        await this.editOne('rootDirCommand', 'Command to run in rootDir after cloning:');
      }
    }
    // await this.editOne('tokenNote', 'Token note:');
    await this.editOne('remote', 'Name for original remote:');
    await this.editOne('domain', 'Domain name:');
    // await this.editOne('username', 'Your username:');

    await config.saveToFile();
    return config;
  }
}

export default new Config(argv);
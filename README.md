# Hyper config

Config wrapper with merge, references, string macros, tagging.

``` javascript
var HyperConfig = require('hyper-config');
```
## Api

HyperConfig(object):
  env: environment name
  project: project name

* addConfig(object): deep merge js object to config
* addConfigPath(string): add path to directory with yml or json config files. Config file name format: [project#]config.env.(yml|json). If env in file name == 'all', loads file for any environment option. If project == 'all' or not present, loads file for any project option.
* build(): build config and return config session object:
  * get(string): get config part by dot-separated path string or undefined if wrong path
  * getByTag(string): return array with config parts, marked by tag

## Merge configs

``` javascript
var HyperConfig = require('hyper-config');

var defaultConfig = {
  logger: {
    transports: {
      console: {
        proc: 'console.log'
      },
      file: {
        fileName: 'test'
      }
    }
  }
};
var envConfig = {};
if (process.env.NODE_ENV === 'development') {
  envConfig = {
    logger: {
      file: {
        fileName: 'test-dev'
      }
    }
  };
}

var config = HyperConfig()
  .addConfig(defaultConfig);
  .addConfig(envConfig)
  .build();

console.log(config.get('logger.transports.file.fileName')); // test-dev in development, test in other
console.log(config.get('wrongpath')); // undefined

```

## References and macros

``` javascript
var HyperConfig = require('hyper-config');

var defaultConfig = {
  console: {
    proc: 'console.log',
    name: '@common.name',
    obj: '@common.data',
    email: '@common.name@-name@@mail.test'
  },
  common: {
    name: 'test',
    data: {
      name: 'test data'
    }
  }
};

var config = HyperConfig()
  .addConfig(defaultConfig);
  .build();

console.log(config.get('console.name')); // test
console.log(config.get('console.obj.data')); // test data
config.get('common.data').name = 'test 2 data';
console.log(config.get('console.obj.data')); // test 2 data
console.log(config.get('console.email')); // test-name@mail.test
```

## Tagging

``` javascript
var HyperConfig = require('hyper-config');

var defaultConfig = {
  console: {
    proc: 'console.log',
    '@tags': ['t2', 't1']
  },
  file: {
    name: 'testfile',
    '@tags': ['t1']
  },
  some: {
    name: 'testsome'
  }
};

var config = HyperConfig()
  .addConfig(defaultConfig);
  .build();

console.log(config.getByTag('t1')); // [{proc: 'console.log'}, {name: 'testfile'}]
console.log(config.getByTag('t2')); // [{proc: 'console.log'}]
console.log(config.getByTag('someTag')); // []
```

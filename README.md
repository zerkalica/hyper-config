# Hyper config

Config wrapper with merging, references, string macros, tagging, etc.

``` javascript
var HyperConfig = require('hyper-config');
```

## Api

* HyperConfig(object):
  * refLabel: string, '~' - reference label to config parts
  * annotationLabel: string, '@' - annotation label, mark control config parts
  * macroBegin: string, '{' - used in macro string replacement
  * macroEnd: string, '}' - used in macro string replacement

* addConfig(object): deep merge js object to config
* build(): build config and return config session object:
  * get(string): get config part by dot-separated path string or undefined if wrong path
  * getByTag(string): return array with config parts, marked by tag

## Overview
* ~<path> - link to parts of config
* ~{path} - replacement macro string
* ~disable - command to delete this config object branch
* @tag - array of tag names, group by provided tag names

```json
"section": {
  "subsection": {
    "value": "test"
  },
  "name1": {
    "value": 123,
    "param": "~{section.subsection.value}/qweqwe",
    "param2": "~~test/~~{section.subsection.value}",
    "@tag": ["tag1", "tag2"]
  },
  "name2": {
    "ref": "~section.name1"
  },
  "name3": {
    "val": "test"
  }
},

"section2.subsection2.name1": {
  "value": "example"
}
```

```js
//init.js
var Config = HyperConfig().addConfig(require('./config.json'));

Config.addConfig({
  section: {
    name3: '~disable'
  }
});

var config = Config.build();

console.log(config.get('section.subsection')); //{value: 'test'}
console.log(config.get('section.subsection.qweiweruhwitur')); // undefined
console.log(config.get('section2.subsection2.name1.value')); // example
console.log(config.get('section.name1.param')); // test/qweqwe
console.log(config.get('section.name1.param2')); // ~test/~{section.subsection.value}
console.log(config.get('section.name2.ref')); // {value: 123, param: 'test/qweqwe'}
console.log(config.get('section.name3')); // undefined
console.log(config.getByTag('tag1')); // [{value: 123, param: 'test/qweqwe'}]
```

## Merge configs

```javascript
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

var someConfig = {
  'logger.transports.file.fileName': 'test-some'
};
// expands to {logger: {transports: { file: {fileName: 'test'}}}}

var config = HyperConfig()
  .addConfig(defaultConfig);
  .addConfig(envConfig)
  .addConfig(someConfig)
  .build();

console.log(config.get('logger.transports.file.fileName')); // test-some in development, test in other
console.log(config.get('wrongpath')); // undefined

```

## References and macros

```javascript
var HyperConfig = require('hyper-config');

var defaultConfig = {
  console: {
    proc: 'console.log',
    name: '~common.name',
    obj: '~common.data',
    email: '~common.name@-name@@mail.test'
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

```javascript
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

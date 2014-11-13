var expect = require('./test-helpers').expect;
var HyperConfig = require('../lib/hyper-config');

describe('hyper-config', function () {
  var hc;
  var testTags = ['testTag1', 'testTag2'];
  var testConfig = [
    {
      'logger': {
        'transports': [
          '~x.transport1',
          '~x.transport2'
        ],
        'some': {
          'del': 't~~e~~st/~{x.ref1}/~{x.ref2}/path',
          'email': 'test@m~~ail.test'
        },
        'some2': {
          'email': 'test@m~~ail.test'
        }
      }
    },
    {
      'x': {
        'ref1': 'testref1',
        'ref2': 'testref2',
        'transport1': {
          'name': 'tr1',
        },
        'transport2': {
          'name': 'tr2',
        },
      },
      'logger.some2.email2.test': {
        'tt': 'test string'
      }
    },
    {
      'logger': {
        'some': '~disable'
      }
    },

    {
      'm': {
        'val': 'm',
        '@tags': ['testTag1']
      },
      's': {
        'val': 'r',
        '@tags': ['testTag1']
      }
    }
  ];

  describe('#build', function () {
    var c;
    beforeEach(function () {
      var hc = new HyperConfig({
        tags: testTags
      });
      hc.addConfig(testConfig[0]);
      hc.addConfig(testConfig[1]);
      hc.addConfig(testConfig[2]);
      c = hc.build();
    });

    it('should resolve references', function () {
      expect(c.get('logger.transports.0')).to.be.deep.equal(testConfig[1].x['transport1']);
      expect(c.get('logger.transports.1')).to.be.deep.equal(testConfig[1].x['transport2']);
    });

    it('should build real memory-references to config parts', function () {
      expect(c.get('logger.transports.0')).to.be.equal(c.get('x.transport1'));
      expect(c.get('logger.transports.1')).not.to.be.equal(c.get('x.transport1'));
    });

    it('should replace ~~ to ~', function () {
      expect(c.get('logger.some2.email')).to.be.equal('test@m~ail.test');
    });

    it('should resolve dot-path to object', function () {
      expect(c.get('logger.some2.email2')).to.be.deep.equal({
        test: {
          tt: 'test string'
        }
      });
    });

    it('should remove config parts, marked as ~disable', function () {
      var hc = new HyperConfig();
      hc.addConfig(testConfig[0]);
      var c = hc.build();
      expect(c.get('logger')).to.have.property('some');

      hc = new HyperConfig();
      hc.addConfig(testConfig[0]);
      hc.addConfig(testConfig[2]);
      expect(hc._config.get(['logger','some'])).to.be.equal('~disable');
      c = hc.build();
      expect(c.get('logger')).not.to.have.property('some');
    });

    it('should expand string tokens from config parts', function () {
      var hc = new HyperConfig({tags: ['testTag1']});
      hc.addConfig(testConfig[0]);
      hc.addConfig(testConfig[1]);
      var c = hc.build();
      expect(c.get('logger.some.del')).to.be.equal('t~e~st/testref1/testref2/path');
    });

    it('should get data array by tag name', function () {
      var hc = new HyperConfig({tags: ['testTag1']});
      hc.addConfig(testConfig[3]);
      var c = hc.build();

      var data = [ { val: 'm', '@tags': [ 'testTag1' ] }, { val: 'r', '@tags': [ 'testTag1' ] } ];

      expect(c.getByTag('testTag1')).to.be.deep.equal(data);
    });
  });
});

/* global Parser */

self.importScripts('termlib_parser.js');

const builder = {};

builder.generate = (os, path, sarg = '') => {
  if (os.mac) {
    if (path && path.startsWith('/')) {
      return {
        command: path,
        args: sarg ? builder.parse(sarg) : ['&Expanded-URLs;']
      };
    }
    const args = sarg ? builder.parse(sarg) : ['-a', path || 'firefox', '&Expanded-URLs;'];
    return {
      command: 'open',
      args
    };
  }
  else if (os.linux) {
    const args = sarg ? builder.parse(sarg) : ['&Expanded-URLs;'];
    return {
      command: path || 'firefox',
      args
    };
  }
  else {
    if (path) {
      const args = sarg ? builder.parse(sarg) : ['&Expanded-URLs;'];
      return {
        command: path,
        args
      };
    }
    else {
      // Firefox is not detaching the process on Windows
      const cmd = sarg ? `firefox ${sarg}` : `firefox "&Separated-URLs;"`;
      if (navigator.userAgent.includes('Firefox')) {
        return {
          command: 'cmd',
          args: ['/s/c', 'start /WAIT', cmd]
        };
      }
      return {
        command: 'cmd',
        args: ['/s/c', 'start', cmd],
        options: {
          windowsVerbatimArguments: true
        }
      };
    }
  }
};

builder.parse = cmd => {
  const termref = {
    lineBuffer: cmd
  };
  const parser = new Parser();
  // fixes https://github.com/andy-portmen/external-application-button/issues/5
  parser.escapeExpressions = {};
  parser.optionChars = {};
  parser.parseLine(termref);

  return termref.argv;
};

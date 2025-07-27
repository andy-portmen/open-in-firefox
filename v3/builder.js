/* global Parser */

self.importScripts('termlib_parser.js');

const builder = {};

builder.generate = (os, prefs, sarg = '') => {
  if (os.mac) {
    if (prefs.path && prefs.path.startsWith('/')) {
      return {
        command: prefs.path,
        args: sarg ? builder.parse(sarg) : ['&Expanded-URLs;']
      };
    }
    const args = sarg ? builder.parse(sarg) : ['-a', prefs.path || 'firefox', '&Expanded-URLs;'];
    return {
      command: 'open',
      args
    };
  }
  else if (os.linux) {
    const args = sarg ? builder.parse(sarg) : ['&Expanded-URLs;'];
    return {
      command: prefs.path || 'firefox',
      args
    };
  }
  else {
    if (prefs.path) {
      const args = sarg ? builder.parse(sarg) : ['&Expanded-URLs;'];
      return {
        command: prefs.path,
        args,
        options: {
          windowsVerbatimArguments: true,
          shell: prefs.path.includes(' '),
          windowsHide: true
        }
      };
    }
    else {
      // Firefox is not detaching the process on Windows
      const cmd = sarg ? `firefox ${sarg}` : `firefox &Separated-URLs;`;
      if (navigator.userAgent.includes('Firefox')) {
        return {
          command: 'cmd',
          args: ['/s/c', 'start /WAIT', cmd],
          options: {
            windowsVerbatimArguments: true,
            shell: false
          }
        };
      }
      return {
        command: 'cmd',
        args: ['/s/c', 'start', cmd],
        options: {
          windowsVerbatimArguments: true,
          shell: false
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

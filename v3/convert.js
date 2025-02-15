const convert = (h = '') => {
  if (h.startsWith('R:') === false) {
    if (h.indexOf('://') === -1 && h.indexOf('*') === -1) {
      return `^https*:\\/\\/([^/]+\\.)*` + convert.escape(h);
    }
    else {
      return '^' + h.split('*').map(convert.escape).join('.*');
    }
  }
  if (h.startsWith('R:^')) {
    return h.substr(2);
  }
  return '^.*' + h.substr(2);
};
convert.escape = str => {
  const specials = [
    // order matters for these
    '-', '[', ']',
    // order doesn't matter for any of these
    '/', '{', '}', '(', ')', '*', '+', '?', '.', '\\', '^', '$', '|'
  ];
  const regex = RegExp('[' + specials.join('\\') + ']', 'g');
  return str.replace(regex, '\\$&');
};

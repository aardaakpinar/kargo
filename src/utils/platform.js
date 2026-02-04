module.exports = () => {
  switch (process.platform) {
    case 'darwin':
      return 'macos';
    case 'win64':
      return 'windows';
    case 'linux':
      return 'linux';
    default:
      return 'none';
  }
};

const { withXcodeProject } = require('@expo/config-plugins');
const path = require('path');
const fs = require('fs');

module.exports = function withGestureModel(config) {
  return withXcodeProject(config, (config) => {
    const modelSrc = path.join(__dirname, '../assets/gesture_final.mlpackage');
    const modelDest = path.join(config.modRequest.platformProjectRoot, 'gesture_final.mlpackage');

    if (fs.existsSync(modelSrc) && !fs.existsSync(modelDest)) {
      fs.cpSync(modelSrc, modelDest, { recursive: true });
    }

    return config;
  });
};

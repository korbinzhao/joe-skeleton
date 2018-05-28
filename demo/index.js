const getSkeleton = require('../src/index');
const path = require('path');

getSkeleton({
  name: 'freeshipping',
  url: 'http://market.wapa.taobao.com/app/nozomi/app-free-shipping/main/index.html',
  outputPath: path.join(__dirname, 'output'),
  templatePath: path.join(__dirname, 'template/index.html'),
  viewport: '375x810'
});

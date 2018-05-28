#! /usr/bin/env node

const program = require('commander');
const getSkeleton = require('../src/index');

program
  .version('0.0.1')
  .option('-n, --name [name]', 'Add the specified name of page [name]', 'pagename')
  .option('-u, --url [url]', 'Add the specified url of page [url]', '')
  .option('-o, --outputpath [outputpath]', 'Add the specified output path of the skeleton [outputpath]', '')
  .option('-t, --templatepath [templatepath]', 'Add the specified template file path [templatepath]', './demo/template/index.html')
  .option('-v, --viewport [viewport]', 'Add the specified device size [viewport] you want to open the page', '375x812')
  .parse(process.argv);

const name = program.name;
const url = program.url;
const outputpath = program.outputpath;
const templatepath = program.templatepath;
const viewport = program.viewport;

if(!url){
  console.log(`url 不能为空!`);
  return false;
}

const params = {
  name,
  url,
  outputPath: outputpath,
  templatePath: templatepath,
  viewport
};

console.log(`the getSkeleton params is ${JSON.stringify(params)}`);

getSkeleton(params);

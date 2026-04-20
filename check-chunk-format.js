var fs = require('fs');
var text = fs.readFileSync('D:/Roaming/ioftv-deploy-20260413050837/dist/original/static/js/LSD.bighome.0693d7eae3642f7e93a4.js', 'utf8');
console.log('Length:', text.length);
console.log('First 200 chars:', JSON.stringify(text.slice(0, 200)));
console.log('Last 200 chars:', JSON.stringify(text.slice(-200)));
var idx = text.indexOf('webpackJsonp');
console.log('webpackJsonp at:', idx);
if (idx >= 0) {
  console.log('Context:', JSON.stringify(text.slice(idx, idx + 300)));
}

const fs = require('node:fs');
const crypto = require('node:crypto');
const library = Buffer.from(fs.readFileSync('.three-module-transfer.b64', 'utf8'), 'base64');
const sha = crypto.createHash('sha1').update(`blob ${library.length}\0`).update(library).digest('hex');
if (sha !== '9807b610d02fd0a1833fa7ceae44239652c78f3c') throw new Error('Three.js source checksum mismatch');
const esm = library.toString('utf8');
const bindingsByName = new Map(esm.slice(esm.lastIndexOf('export{') + 7, esm.lastIndexOf('};')).split(',').map(entry => {
  const [local, name = local] = entry.trim().split(' as ');
  return [name, local];
}));
const file = 'Ashlar-Bastion.html';
const html = fs.readFileSync(file, 'utf8');
const [prefix, script] = html.split('<script type="module">\n');
const body = script.slice(script.indexOf('function run(THREE) {'), script.lastIndexOf('</script>')).trimEnd();
const used = [...new Set(Array.from(body.matchAll(/\bTHREE\.(\w+)/g), match => match[1]))].sort();
const bindings = used.map(name => {
  if (!bindingsByName.has(name)) throw new Error(`Missing Three.js export: ${name}`);
  return `  ${name}: ${bindingsByName.get(name)}`;
}).join(',\n');
const bootstrap = `
{
const THREE = {
${bindings}
};
${body}

try {
  run(THREE);
} catch (failure) {
  const error = document.querySelector('#error');
  error.hidden = false;
  error.textContent = 'Ashlar Bastion needs WebGL to run.';
  console.error(failure);
}
}
`;
const license = "The MIT License\n\nCopyright © 2010-2023 three.js authors\n\nPermission is hereby granted, free of charge, to any person obtaining a copy\nof this software and associated documentation files (the \"Software\"), to deal\nin the Software without restriction, including without limitation the rights\nto use, copy, modify, merge, publish, distribute, sublicense, and/or sell\ncopies of the Software, and to permit persons to whom the Software is\nfurnished to do so, subject to the following conditions:\n\nThe above copyright notice and this permission notice shall be included in\nall copies or substantial portions of the Software.\n\nTHE SOFTWARE IS PROVIDED \"AS IS\", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR\nIMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,\nFITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE\nAUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER\nLIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,\nOUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN\nTHE SOFTWARE.";
fs.writeFileSync(file, prefix + '<script type="module">\n/*\n' + license + '\n*/\n' + esm + bootstrap + '</script>\n</body>\n</html>\n');


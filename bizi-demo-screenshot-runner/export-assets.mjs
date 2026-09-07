import fs from 'node:fs/promises';
import path from 'node:path';
const out='/tmp/bizi-launch-assets';
const files=['01-home-care-packages.png','02-care3-personalisation.png','03-patient-experience.png','04-care3-unified-intake.png','05-human-takeover.png','06-care3-website.png','07-care3-website-form.png','08-website-enquiry-crm.png'];
for(const name of files){const data=await fs.readFile(path.join(out,name));const b=data.toString('base64'),n=Math.ceil(b.length/2400);console.log(`ASSET_META|${name}|${data.length}|${b.length}|${n}`);for(let i=0;i<n;i++)console.log(`ASSET_CHUNK|${name}|${i+1}|${n}|${b.slice(i*2400,(i+1)*2400)}`);console.log(`ASSET_DONE|${name}|${n}`)}
console.log('ASSET_EXPORT_COMPLETE');

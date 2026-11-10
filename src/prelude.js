/* opened through the helper: say what we are, so the window gets a name and an icon */
if(location.protocol==='http:'||location.protocol==='https:'){
  try{const l=document.createElement('link');l.rel='manifest';l.href='manifest.json';
      document.head.appendChild(l);}catch(e){}}

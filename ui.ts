import './ui.css'

document.getElementById('import').onclick = () => {
  const frameName = document.getElementById('frame-name') as HTMLInputElement;
  const idDiff = document.getElementById('id-diff') as HTMLInputElement;
  parent.postMessage({ pluginMessage: { type: 'import', frameName: frameName.value, idDiff: idDiff.value } }, '*');
};

document.getElementById('cancel').onclick = () => {
  parent.postMessage({ pluginMessage: { type: 'cancel' } }, '*');
};

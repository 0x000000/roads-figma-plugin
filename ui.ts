import './ui.css'

document.getElementById('import').onclick = () => {
  const frameName = document.getElementById('frame-name') as HTMLInputElement;
  parent.postMessage({ pluginMessage: { type: 'import', frameName: frameName.value } }, '*');
};

document.getElementById('cancel').onclick = () => {
  parent.postMessage({ pluginMessage: { type: 'cancel' } }, '*');
};

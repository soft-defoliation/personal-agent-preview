'use strict';
const el = id => document.getElementById(id);
let selected = null;
let installPrompt;
const viewport = window.visualViewport;
const clock = () => Math.abs(el('timeline').scrollHeight - el('timeline').clientHeight - el('timeline').scrollTop) < 100;
function revealLatest() { el('timeline').scrollTop = el('timeline').scrollHeight; }
function tuneViewport() {
  const follow = clock();
  if (viewport && Math.abs(viewport.scale - 1) < 0.01) {
    document.documentElement.style.setProperty('--visual-height', Math.floor(viewport.height) + 'px');
  } else {
    document.documentElement.style.removeProperty('--visual-height');
  }
  if (follow) revealLatest();
}
viewport?.addEventListener('resize', tuneViewport);
tuneViewport();

function update() {
  const draft = el('draft');
  const follow = clock();
  // Do not suppress IME composition or interpret Enter as Send.
  draft.style.height = 'auto';
  draft.style.height = draft.scrollHeight + 2 + 'px';
  el('send').disabled = !draft.value.trim() && !selected;
  if (follow) revealLatest();
}
function fileCard() {
  el('file-card').hidden = !selected;
  el('file-name').textContent = selected?.name ?? '';
  el('file-size').textContent = selected ? selected.size.toLocaleString('zh-CN') + ' 字节 · 本地预览' : '';
  update();
}
function addMessage(text, own) {
  const message = document.createElement('p');
  message.className = own ? 'message user' : 'message';
  message.textContent = text;
  el('messages').append(message);
}
el('draft').addEventListener('input', update);
el('attach').addEventListener('click', () => el('file').click());
el('file').addEventListener('change', event => {
  const picker = event.currentTarget;
  const file = picker.files?.[0];
  picker.value = ''; // same-file reselection works; cancellation preserves current draft
  if (!file) return;
  const error = !/\.(md|txt)$/iu.test(file.name) ? '请选择 .md 或 .txt 文件。'
    : file.size > 4 * 1024 * 1024 ? '预览只接受不超过 4 MiB 的文件。' : '';
  el('file-error').textContent = error;
  el('file-error').hidden = !error;
  if (error) return;
  selected = { name: file.name, size: file.size }; // never read the bytes in preview
  fileCard();
});
el('remove').addEventListener('click', () => {
  selected = null;
  el('file-error').hidden = true;
  fileCard();
  el('attach').focus();
});
el('compose').addEventListener('submit', event => {
  event.preventDefault();
  const text = el('draft').value.trim();
  if (!text && !selected) return;
  el('intro').hidden = true;
  addMessage([text, selected ? '附件：' + selected.name : ''].filter(Boolean).join('\n'), true);
  addMessage(selected ? '预览：已在本页识别文件名和大小，文件没有上传。' : '预览：消息只显示在本页，未发送给小赫。', false);
  selected = null;
  el('file-error').hidden = true;
  el('draft').value = '';
  fileCard();
  revealLatest();
});

const standalone = matchMedia('(display-mode: standalone)');
const setup = el('setup');
const installDialog = el('install');
const installNow = el('install-now');
let installed = false;
let prompting = false;

function renderInstall() {
  const canInstall = Boolean(installPrompt);
  setup.hidden = installed || standalone.matches;
  setup.disabled = prompting;
  setup.textContent = canInstall ? '安装' : '安装说明';
  setup.classList.toggle('can-install', canInstall);
  installNow.hidden = setup.hidden || prompting || !canInstall;
  if (setup.hidden && installDialog.open) installDialog.close();
}

async function requestInstall() {
  if (setup.hidden || prompting) return;
  const prompt = installPrompt;
  if (!prompt) {
    if (!installDialog.open) installDialog.showModal();
    return;
  }
  installPrompt = undefined; // Each browser prompt can be used only once.
  prompting = true;
  if (installDialog.open) installDialog.close();
  renderInstall();
  try {
    // Invoke in this click, without awaiting any other work first.
    await prompt.prompt();
  } catch {
    if (!setup.hidden && !installDialog.open) installDialog.showModal();
  } finally {
    prompting = false;
    renderInstall();
  }
}

setup.removeAttribute('aria-label');
setup.removeAttribute('title');
setup.addEventListener('click', requestInstall);
installNow.addEventListener('click', requestInstall);
window.addEventListener('beforeinstallprompt', event => {
  if (setup.hidden || typeof event.prompt !== 'function') return;
  event.preventDefault();
  installPrompt = event;
  renderInstall();
});
window.addEventListener('appinstalled', () => {
  installed = true;
  installPrompt = undefined;
  renderInstall();
});
standalone.addEventListener?.('change', renderInstall);
renderInstall();
if (window.isSecureContext && /^https?:$/.test(location.protocol) && 'serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js', {scope:'./'}).catch(() => {});
}

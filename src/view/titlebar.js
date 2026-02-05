const html = require('xou');
const vxv = require('vxv');
const betterUrl = require('./utils/betterURL');
const { ipcRenderer } = require('electron');

const topbarStyle = vxv`
width: 100%;
-webkit-app-region: drag;

& .bar {
  border-bottom: solid #BDBDBD 1px;
  background: white;
  display: flex;
  align-items: center;
  padding: 0 10px;
}

& .controls {
  display: flex;
  -webkit-app-region: no-drag;
  align-items: center;
  gap: 5px;
}

& .control-button {
  background: none;
  border: none;
  width: 30px;
  height: 30px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  color: #616161;
  line-height: 1;
  padding: 0;
  margin: 0;
}

& .control-button:hover {
  background: #f0f0f0;
}

& .bg {
  display: flex;
  justify-content: center;
  flex-direction: column;
  height: 40px;
  text-align: center;
  color: #616161;
  flex: 1;
}

& .input {
  text-align: center;
  background: white;
  color: #616161;
  padding: 5px 10px;
  width: 550px;
  margin: 7px auto 0px auto;
  border: solid transparent 1px;
  border-radius: 3px;
  outline: none;
  transition: all .3s;
  -webkit-app-region: no-drag;
  left: 0px;
  right: 0px;
  top: 0px;
  position: fixed;

  &:hover, &:focus {
    border: solid #BDBDBD 1px;
    background: #FAFAFA;
  }

  &::-moz-selection { background: yellow; }
  &::selection { background: yellow; }
}
`;

console.log(topbarStyle);

module.exports = (emitter, state) => {
  let width = document.body.clientWidth - 300;
  if (width > 500) width = 500;

  const element = html`
    <div>
      <div id="titlebar" class="${topbarStyle}">
        <div class="controls">
          <button class="control-button" id="minimize">
            <svg width="12" height="2" viewBox="0 0 12 2" xmlns="http://www.w3.org/2000/svg">
              <rect width="12" height="2" fill="#616161"/>
            </svg>
          </button>
          <button class="control-button" id="maximize">
            <svg width="12" height="12" viewBox="0 0 12 12" xmlns="http://www.w3.org/2000/svg">
              <rect x="1" y="1" width="10" height="10" stroke="#616161" fill="none" stroke-width="1"/>
            </svg>
          </button>
          <button class="control-button" id="close">
            <svg width="12" height="12" viewBox="0 0 12 12" xmlns="http://www.w3.org/2000/svg">
              <line x1="1" y1="1" x2="11" y2="11" stroke="#616161" stroke-width="1"/>
              <line x1="11" y1="1" x2="1" y2="11" stroke="#616161" stroke-width="1"/>
            </svg>
          </button>
        </div>
        <span class="bg"></span>
        <input type="text" class="input urlbar" style="width: ${width}px" value="${state.url}" />
      </div>
    </div>
  `;

  document.body.appendChild(element);

  // Add event listeners for control buttons
  document.getElementById('minimize').addEventListener('click', () => {
    ipcRenderer.send('minimize-window');
  });

  document.getElementById('maximize').addEventListener('click', () => {
    ipcRenderer.send('maximize-window');
  });

  document.getElementById('close').addEventListener('click', () => {
    ipcRenderer.send('close-window');
  });

  emitter.on('titlebar-title-updated', () => {
    if (!state.hovering) {
      document.querySelector('.urlbar').value = state.title;
    }
  });

  emitter.on('titlebar-url-updated', () => {
    if (state.hovering) {
      document.querySelector('.urlbar').value = betterUrl(state.url);
    }
  });

  document.querySelector('.urlbar').addEventListener('mouseover', () => {
    document.querySelector('.urlbar').value = betterUrl(state.url);
    document.querySelector('.urlbar').focus();
    document.querySelector('.urlbar').select();

    state.hovering = true;
  });

  document.querySelector('.urlbar').addEventListener('click', () => {
    document.querySelector('.urlbar').focus();
    document.querySelector('.urlbar').select();
  });

  document.querySelector('.urlbar').addEventListener('mouseleave', () => {
    document.querySelector('.urlbar').value = state.title;
    document.querySelector('.urlbar').blur();

    emitter.emit('webview-set-focus');
    state.hovering = false;
  });

  document.querySelector('.urlbar').addEventListener(
    'keydown',
    ev => {
      if (ev.key === 'Enter') {
        ev.preventDefault();
        emitter.emit('navigate', {
          slug: document.querySelector('.urlbar').value,
          expand: ev.ctrlKey
        });
      }
    },
    false
  );
};

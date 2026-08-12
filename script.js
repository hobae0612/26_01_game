import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, orderBy, limit } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { translations } from "./translations.js";

const firebaseConfig = {
  apiKey: "AIzaSyDVkGcSI3ZyoF_sth-plU200HocMc1aAqQ",
  authDomain: "game-7c003.firebaseapp.com",
  projectId: "game-7c003",
  storageBucket: "game-7c003.firebasestorage.app",
  messagingSenderId: "835050268988",
  appId: "1:835050268988:web:a284c5b0687eb9c1771639",
  measurementId: "G-VXTCVTK81T"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ==========================================
// State & Defaults
// ==========================================

// Default: left=triangle(3keys), right=square(4keys)
const DEFAULT_SQUARE_KEYS = ['r', 'e', 'd', 'f'];   // 4 commands
const DEFAULT_TRIANGLE_KEYS = ['ArrowUp', 'ArrowLeft', 'ArrowRight']; // 3 commands

let currentShapeMode = 'default'; // 'default' | 'swapped'

// leftSequence / rightSequence always refers to PHYSICAL left/right hand
let leftSequence = [...DEFAULT_TRIANGLE_KEYS];
let rightSequence = [...DEFAULT_SQUARE_KEYS];

let audioSettings = {
    masterVol: 1,
    masterMute: false,
    sfxVol: 1,
    sfxMute: false,
    bgmVol: 0.5,
    bgmMute: false
};

// BGM track state
let bgmTracks = [];        // loaded from bgm/manifest.json
let currentBgmTrack = ''; // currently selected filename
let bgmAudio = null;      // HTMLAudioElement

// Game State
let currentTheme = 'light';
let currentLang = 'US';
let t = translations[currentLang] || translations['US'];

let isPlaying = false;
let score = 0;
let time = 60;
let leftIndex = 0;
let rightIndex = 0;
let leftTotalInputs = 0;
let rightTotalInputs = 0;

let timerInterval = null;
// Variables removed for simultaneous start

// ==========================================
// DOM Elements
// ==========================================

// Screens
const lobbyScreen = document.getElementById('lobby-screen');
const mainGame = document.getElementById('main-game');

// Top / Bottom Bars
const scoreEl = document.getElementById('score');
const timeEl = document.getElementById('time');
const leftStatus = document.getElementById('left-status');
const rightStatus = document.getElementById('right-status');
const squareProgress = document.getElementById('square-progress');
const triangleProgress = document.getElementById('triangle-progress');
const leftInst = document.getElementById('left-inst');
const rightInst = document.getElementById('right-inst');
const ruleLeftKeys = document.getElementById('rule-left-keys');
const ruleRightKeys = document.getElementById('rule-right-keys');

// Modals
const gameOverModal = document.getElementById('game-over-modal');
const rulesModal = document.getElementById('rules-modal');
const rankingModal = document.getElementById('ranking-modal');
const optionsModal = document.optionsModal; // Wait, handled by generic close

// Lobby Buttons
document.getElementById('btn-start-game').addEventListener('click', startGame);
document.getElementById('btn-how-to-play').addEventListener('click', () => openModal('rules-modal'));
document.getElementById('btn-ranking').addEventListener('click', () => { 
    openModal('ranking-modal'); 
    rankingsData = []; // 매번 새롭게 불러오기 위해 배열 초기화
    renderRanking(1); 
});
document.getElementById('btn-options').addEventListener('click', openOptionsModal);

// Game Over Buttons
document.getElementById('restart-btn').addEventListener('click', startGame);
document.getElementById('go-lobby-btn').addEventListener('click', goToLobby);
document.getElementById('save-ranking-btn').addEventListener('click', async () => {
    playSound('click');
    const nation = document.getElementById('player-nation').value;
    const nickname = document.getElementById('player-nickname').value;
    
    if (!nickname.trim()) {
        alert(t.alert_nickname);
        return;
    }
    
    // 폼과 저장 버튼 숨기기 (중복 저장 방지)
    document.querySelector('.ranking-form').style.display = 'none';
    document.getElementById('save-ranking-btn').style.display = 'none';

    try {
        await addDoc(collection(db, "rankings"), {
            nation: nation,
            nickname: nickname,
            score: score,
            timestamp: new Date()
        });
        console.log("Ranking saved successfully!");
    } catch (e) {
        console.error("Error adding document: ", e);
        alert(t.alert_error);
    }
});

// Close Modal Buttons
document.querySelectorAll('.close-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        playSound('click');
        const target = e.target.getAttribute('data-target');
        closeModal(target);
    });
});

// ==========================================
// LocalStorage & Init
// ==========================================

function init() {
    setupCustomDropdowns();
    loadSettings();
    applyLanguage();
    loadBgmManifest(); // load track list; populates selector when ready
}

function applyLanguage() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (t[key]) {
            if (el.tagName === 'INPUT' && el.hasAttribute('placeholder')) {
                el.placeholder = t[key];
            } else {
                el.innerHTML = t[key];
            }
        }
    });

    // Translate titles
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
        const key = el.getAttribute('data-i18n-title');
        if (t[key]) el.title = t[key];
    });

    updateInstructionsUI();
    if(!document.getElementById('ranking-modal').classList.contains('hidden')) {
        if(window.renderRanking) window.renderRanking(currentRankPage);
    }
}

function loadSettings() {
    const savedLeft = localStorage.getItem('leftSequence');
    if (savedLeft) leftSequence = JSON.parse(savedLeft);
    
    const savedRight = localStorage.getItem('rightSequence');
    if (savedRight) rightSequence = JSON.parse(savedRight);

    const savedAudio = localStorage.getItem('audioSettings');
    if (savedAudio) audioSettings = JSON.parse(savedAudio);

    const savedLang = localStorage.getItem('language');
    if (savedLang) {
        currentLang = savedLang;
        t = translations[currentLang] || translations['US'];
    }

    currentTheme = 'light';
    localStorage.setItem('theme', 'light');

    const savedShapeMode = localStorage.getItem('shapeMode');
    if (savedShapeMode) {
        currentShapeMode = savedShapeMode;
    }

    const savedBgmTrack = localStorage.getItem('bgmTrack');
    if (savedBgmTrack) currentBgmTrack = savedBgmTrack;

    applyTheme();
    applyShapeMode(false); // apply without resetting custom key bindings
}

function applyTheme() {
    if (currentTheme === 'light') {
        document.body.classList.add('light-mode');
    } else {
        document.body.classList.remove('light-mode');
    }
}

function saveSettings() {
    localStorage.setItem('leftSequence', JSON.stringify(leftSequence));
    localStorage.setItem('rightSequence', JSON.stringify(rightSequence));
    localStorage.setItem('audioSettings', JSON.stringify(audioSettings));
    localStorage.setItem('language', currentLang);
    localStorage.setItem('theme', currentTheme);
    localStorage.setItem('shapeMode', currentShapeMode);
    localStorage.setItem('bgmTrack', currentBgmTrack);
}

/**
 * Apply the current shape mode to the game UI.
 * - 'default': left hand = square(4 keys), right hand = triangle(3 keys)
 * - 'swapped': left hand = triangle(3 keys), right hand = square(4 keys)
 * @param {boolean} resetKeys  When true, reset sequences to defaults for the mode.
 */
function applyShapeMode(resetKeys = true) {
    const leftContainer = document.getElementById('left-shape-container');
    const rightContainer = document.getElementById('right-shape-container');
    const leftLabel = document.getElementById('left-hand-label');
    const rightLabel = document.getElementById('right-hand-label');

    if (currentShapeMode === 'swapped') {
        // swapped: Left side shows SQUARE shape, right side shows TRIANGLE shape
        if (leftContainer) {
            leftContainer.className = 'shape-container square-container';
            rebuildNodes(leftContainer, 'l', 4, ['top-right', 'top-left', 'bottom-left', 'bottom-right'],
                '<svg class="lines" viewBox="0 0 100 100"><path class="shape-path" d="M 80 20 L 20 20 L 20 80 L 80 80 Z" fill="none" stroke-width="4"/><path class="shape-progress" id="square-progress" d="M 80 20 L 20 20 L 20 80 L 80 80 Z" fill="none" stroke-width="4" stroke-dasharray="240" stroke-dashoffset="240"/></svg>');
        }
        if (rightContainer) {
            rightContainer.className = 'shape-container triangle-container';
            rebuildNodes(rightContainer, 'r', 3, ['top', 'bottom-left-tri', 'bottom-right-tri'],
                '<svg class="lines" viewBox="0 0 100 100"><path class="shape-path" d="M 50 20 L 20 80 L 80 80 Z" fill="none" stroke-width="4"/><path class="shape-progress" id="triangle-progress" d="M 50 20 L 20 80 L 80 80 Z" fill="none" stroke-width="4" stroke-dasharray="194.16" stroke-dashoffset="194.16"/></svg>');
        }
        if (leftLabel) { leftLabel.setAttribute('data-i18n', 'left_hand_square'); leftLabel.innerHTML = t.left_hand_square || t.left_hand; }
        if (rightLabel) { rightLabel.setAttribute('data-i18n', 'right_hand_triangle'); rightLabel.innerHTML = t.right_hand_triangle || t.right_hand; }

        if (resetKeys) {
            leftSequence = [...DEFAULT_SQUARE_KEYS];
            rightSequence = [...DEFAULT_TRIANGLE_KEYS];
        }
    } else {
        // Default: Left side shows TRIANGLE shape, right side shows SQUARE shape
        if (leftContainer) {
            leftContainer.className = 'shape-container triangle-container';
            // Rebuild nodes for triangle (3 nodes)
            rebuildNodes(leftContainer, 'l', 3, ['top', 'bottom-left-tri', 'bottom-right-tri'],
                '<svg class="lines" viewBox="0 0 100 100"><path class="shape-path" d="M 50 20 L 20 80 L 80 80 Z" fill="none" stroke-width="4"/><path class="shape-progress" id="triangle-progress" d="M 50 20 L 20 80 L 80 80 Z" fill="none" stroke-width="4" stroke-dasharray="194.16" stroke-dashoffset="194.16"/></svg>');
        }
        if (rightContainer) {
            rightContainer.className = 'shape-container square-container';
            // Rebuild nodes for square (4 nodes)
            rebuildNodes(rightContainer, 'r', 4, ['top-right', 'top-left', 'bottom-left', 'bottom-right'],
                '<svg class="lines" viewBox="0 0 100 100"><path class="shape-path" d="M 80 20 L 20 20 L 20 80 L 80 80 Z" fill="none" stroke-width="4"/><path class="shape-progress" id="square-progress" d="M 80 20 L 20 20 L 20 80 L 80 80 Z" fill="none" stroke-width="4" stroke-dasharray="240" stroke-dashoffset="240"/></svg>');
        }
        if (leftLabel) { leftLabel.setAttribute('data-i18n', 'left_hand_triangle'); leftLabel.innerHTML = t.left_hand_triangle || t.left_hand; }
        if (rightLabel) { rightLabel.setAttribute('data-i18n', 'right_hand_square'); rightLabel.innerHTML = t.right_hand_square || t.right_hand; }

        if (resetKeys) {
            leftSequence = [...DEFAULT_TRIANGLE_KEYS];
            rightSequence = [...DEFAULT_SQUARE_KEYS];
        }
    }
    updateInstructionsUI();
}

/**
 * Rebuild the node divs inside a shape container.
 * Preserves the SVG (provided as svgHtml) and creates N nodes with given CSS classes.
 */
function rebuildNodes(container, prefix, count, cssClasses, svgHtml) {
    // Remove all existing children
    container.innerHTML = '';
    for (let i = 0; i < count; i++) {
        const node = document.createElement('div');
        node.className = `node ${cssClasses[i]}`;
        node.id = `node-${prefix}${i + 1}`;
        node.innerText = '?';
        
        // Add touch and click support
        const handleInteraction = (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!isPlaying) return;
            const mappedKey = prefix === 'l' ? leftSequence[i] : rightSequence[i];
            handleGameInput(mappedKey);
        };
        node.addEventListener('touchstart', handleInteraction, {passive: false});
        node.addEventListener('click', handleInteraction);

        container.appendChild(node);
    }
    container.insertAdjacentHTML('beforeend', svgHtml);
}

function formatKeyName(key) {
    if (key === 'ArrowUp') return '↑';
    if (key === 'ArrowLeft') return '←';
    if (key === 'ArrowRight') return '→';
    if (key === 'ArrowDown') return '↓';
    if (key === ' ') return 'Space';
    return key.toUpperCase();
}

function updateInstructionsUI() {
    const lStr = leftSequence.map(formatKeyName).join(' ');
    const rStr = rightSequence.map(formatKeyName).join(' ');
    
    leftInst.innerHTML = `${leftSequence.map(formatKeyName).join(' ')} <span data-i18n="inst_repeat">${t.inst_repeat}</span>`;
    rightInst.innerHTML = `${rightSequence.map(formatKeyName).join(' ')} <span data-i18n="inst_repeat">${t.inst_repeat}</span>`;
    
    ruleLeftKeys.innerHTML = lStr;
    ruleRightKeys.innerHTML = rStr;
    
    // Update node labels (count depends on current sequences)
    for(let i = 0; i < leftSequence.length; i++) {
        const node = document.getElementById(`node-l${i+1}`);
        if(node) node.innerText = formatKeyName(leftSequence[i]);
    }
    for(let i = 0; i < rightSequence.length; i++) {
        const node = document.getElementById(`node-r${i+1}`);
        if(node) node.innerText = formatKeyName(rightSequence[i]);
    }
}

// ==========================================
// Audio Synthesis (Web Audio API)
// ==========================================
const AudioContext = window.AudioContext || window.webkitAudioContext;
let audioCtx = new AudioContext();

function playSound(type) {
    if (audioSettings.masterMute || audioSettings.sfxMute) return;
    if (audioCtx.state === 'suspended') audioCtx.resume();
    
    const vol = audioSettings.masterVol * audioSettings.sfxVol;
    if (vol <= 0) return;

    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    gainNode.gain.setValueAtTime(vol * 0.1, audioCtx.currentTime); // 0.1 base volume to not be too loud

    let duration = 0.1;

    switch(type) {
        case 'click':
            osc.type = 'sine';
            osc.frequency.setValueAtTime(600, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(300, audioCtx.currentTime + 0.1);
            duration = 0.1;
            break;
        case 'start':
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(440, audioCtx.currentTime);
            osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.1);
            duration = 0.3;
            break;
        case 'correct':
            osc.type = 'sine';
            osc.frequency.setValueAtTime(800, audioCtx.currentTime);
            duration = 0.05;
            break;
        case 'wrong':
        case 'gameover':
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(150, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(50, audioCtx.currentTime + 0.3);
            duration = 0.3;
            break;
    }

    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    osc.start(audioCtx.currentTime);
    osc.stop(audioCtx.currentTime + duration);
}

// ── BGM: real MP3 playback via HTMLAudioElement ──────────────────────────

/**
 * Load bgm/manifest.json and populate the track selector.
 * Add new tracks by editing manifest.json only — no code changes needed.
 */
async function loadBgmManifest() {
    try {
        const res = await fetch('bgm/manifest.json');
        const data = await res.json();
        bgmTracks = data.tracks || [];
        // Fall back to first track if saved track is no longer listed
        if (bgmTracks.length > 0 && !bgmTracks.includes(currentBgmTrack)) {
            currentBgmTrack = bgmTracks[0];
        } else if (!currentBgmTrack && bgmTracks.length > 0) {
            currentBgmTrack = bgmTracks[0];
        }
        populateBgmTrackSelect();
    } catch(e) {
        console.warn('BGM manifest load failed:', e);
    }
}

/** Rebuild the BGM track <select> with current bgmTracks list. */
function populateBgmTrackSelect() {
    const sel = document.getElementById('bgm-track-select');
    if (!sel) return;
    sel.innerHTML = '';
    bgmTracks.forEach(filename => {
        const opt = document.createElement('option');
        opt.value = filename;
        opt.textContent = filename.replace(/\.mp3$/i, ''); // show name without extension
        if (filename === currentBgmTrack) opt.selected = true;
        sel.appendChild(opt);
    });
}

function toggleBGM(play) {
    if (play) {
        if (!currentBgmTrack) return;
        // Reuse existing audio element if it's already the right track
        if (!bgmAudio || bgmAudio.dataset.track !== currentBgmTrack) {
            if (bgmAudio) { bgmAudio.pause(); bgmAudio = null; }
            bgmAudio = new Audio(`bgm/${encodeURIComponent(currentBgmTrack)}`);
            bgmAudio.dataset.track = currentBgmTrack;
            bgmAudio.loop = true;
        }
        updateBGMVolume();
        bgmAudio.play().catch(() => {}); // ignore autoplay policy errors silently
    } else {
        if (bgmAudio) {
            bgmAudio.pause();
            bgmAudio.currentTime = 0;
        }
    }
}

/** Switch to a different BGM track, resuming playback if BGM was active. */
function switchBgmTrack(filename) {
    const wasPlaying = bgmAudio && !bgmAudio.paused;
    if (bgmAudio) { bgmAudio.pause(); bgmAudio = null; }
    currentBgmTrack = filename;
    if (wasPlaying) toggleBGM(true);
}

function updateBGMVolume() {
    if (!bgmAudio) return;
    if (audioSettings.masterMute || audioSettings.bgmMute) {
        bgmAudio.volume = 0;
    } else {
        bgmAudio.volume = Math.min(1, audioSettings.masterVol * audioSettings.bgmVol);
    }
}


// ==========================================
// Modals & Navigation
// ==========================================

function openModal(id) {
    document.getElementById(id).classList.remove('hidden');
    const modalContent = document.querySelector(`#${id} .glass-effect`);
    if(modalContent) {
        setTimeout(() => modalContent.dispatchEvent(new Event('scroll')), 10);
    }
}

function closeModal(id) {
    document.getElementById(id).classList.add('hidden');
}

function goToLobby() {
    playSound('click');
    closeModal('game-over-modal');
    mainGame.classList.add('hidden');
    lobbyScreen.classList.remove('hidden');
    // toggleBGM(false); // Removed to keep BGM playing in lobby
}

// ==========================================
// Options Logic
// ==========================================

let tempLeftSeq = [];
let tempRightSeq = [];

function openOptionsModal() {
    playSound('click');
    tempLeftSeq = [...leftSequence];
    tempRightSeq = [...rightSequence];

    // Reset editing state
    activeEditNode = null;

    // Always open on the 일반 (General) tab
    switchOptionsTab('general');

    // Sync mode toggle buttons to current shape mode
    syncModeButtons(currentShapeMode);

    // Determine which shape is on which hand
    const leftIsSquare  = currentShapeMode === 'default';
    const rightIsSquare = currentShapeMode === 'swapped';

    // Build mini shape previews
    buildKeyInputs('opt-left-container',  'l', tempLeftSeq,  t.opt_left_key  || '왼손 키 변경',  leftIsSquare  ? 'square' : 'triangle', 'left-panel');
    buildKeyInputs('opt-right-container', 'r', tempRightSeq, t.opt_right_key || '오른손 키 변경', rightIsSquare ? 'square' : 'triangle', 'right-panel');

    // Populate audio
    document.getElementById('vol-master').value = audioSettings.masterVol;
    document.getElementById('vol-sfx').value = audioSettings.sfxVol;
    document.getElementById('vol-bgm').value = audioSettings.bgmVol;

    updateMuteBtnUI('mute-master', audioSettings.masterMute);
    updateMuteBtnUI('mute-sfx', audioSettings.sfxMute);
    updateMuteBtnUI('mute-bgm', audioSettings.bgmMute);

    // Populate BGM track selector (tracks may already be loaded from manifest)
    populateBgmTrackSelect();
    const trackSel = document.getElementById('bgm-track-select');
    if (trackSel && !trackSel._listenerAttached) {
        trackSel.addEventListener('change', (e) => switchBgmTrack(e.target.value));
        trackSel._listenerAttached = true;
    }

    document.getElementById('language-select').value = currentLang;
    syncCustomDropdown('language-select');
    document.getElementById('theme-select').value = currentTheme;
    syncCustomDropdown('theme-select');

    openModal('options-modal');
}

// ==========================================
// Visual Key-Bind Editor
// ==========================================

let activeEditNode = null; // { prefix, index, hintEl }

/**
 * Build a mini interactive game-board (shape + clickable nodes) for key binding.
 * @param {string} containerId  - Parent container id
 * @param {string} prefix       - 'l' | 'r'
 * @param {Array}  seq          - Key sequence array (tempLeftSeq / tempRightSeq)
 * @param {string} titleText    - Section title
 * @param {string} shapeType    - 'square' | 'triangle'
 * @param {string} panelClass   - 'left-panel' | 'right-panel'
 */
function buildKeyInputs(containerId, prefix, seq, titleText, shapeType, panelClass) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';

    const isSquare = shapeType === 'square';

    // ---- Outer panel card ----
    const panel = document.createElement('div');
    panel.className = `key-bind-panel ${panelClass}`;

    // Title
    const title = document.createElement('div');
    title.className = 'key-bind-panel-title';
    title.innerText = titleText;
    panel.appendChild(title);

    // ---- Mini shape wrapper ----
    const shapeDiv = document.createElement('div');
    shapeDiv.className = `shape-container ${isSquare ? 'square-container' : 'triangle-container'} key-shape-mini`;

    // Node CSS position classes
    const nodeClasses = isSquare
        ? ['top-right', 'top-left', 'bottom-left', 'bottom-right']
        : ['top', 'bottom-left-tri', 'bottom-right-tri'];

    seq.forEach((key, i) => {
        const node = document.createElement('div');
        node.className = `node ${nodeClasses[i]}`;
        node.id = `key-node-${prefix}${i + 1}`;
        node.innerText = formatKeyName(key);
        node.addEventListener('click', (e) => {
            e.stopPropagation();
            // Deselect any previously active node
            deactivateKeyEdit();
            // Activate this node
            node.classList.add('key-edit-active');
            hintEl.innerText = t.opt_key_listening || '키를 눌러주세요…';
            hintEl.classList.add('listening');
            activeEditNode = { prefix, index: i, hintEl };
        });
        shapeDiv.appendChild(node);
    });

    // SVG outline
    const svgHtml = isSquare
        ? '<svg class="lines" viewBox="0 0 100 100"><path class="shape-path" d="M 80 20 L 20 20 L 20 80 L 80 80 Z" fill="none" stroke-width="4"/></svg>'
        : '<svg class="lines" viewBox="0 0 100 100"><path class="shape-path" d="M 50 20 L 20 80 L 80 80 Z" fill="none" stroke-width="4"/></svg>';
    shapeDiv.insertAdjacentHTML('beforeend', svgHtml);

    panel.appendChild(shapeDiv);

    // ---- Hint text ----
    const hintEl = document.createElement('p');
    hintEl.className = 'key-press-hint';
    hintEl.innerText = t.opt_key_click_hint || '노드를 클릭하세요';
    panel.appendChild(hintEl);

    container.appendChild(panel);
}

/** Remove active state from any editing node. */
function deactivateKeyEdit() {
    document.querySelectorAll('.node.key-edit-active').forEach(n => n.classList.remove('key-edit-active'));
    if (activeEditNode) {
        activeEditNode.hintEl.innerText = t.opt_key_click_hint || '노드를 클릭하세요';
        activeEditNode.hintEl.classList.remove('listening');
    }
    activeEditNode = null;
}

/** Global keydown: captures key presses while an options node is selected for editing. */
document.addEventListener('keydown', (e) => {
    if (!activeEditNode) return;
    if (document.getElementById('options-modal').classList.contains('hidden')) return;
    e.preventDefault();

    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    const { prefix, index } = activeEditNode;
    const activeSeq = prefix === 'l' ? tempLeftSeq : tempRightSeq;
    const oldKey = activeSeq[index];

    if (oldKey !== key) {
        // Swap if key is already used elsewhere
        const existingLIdx = tempLeftSeq.indexOf(key);
        if (existingLIdx !== -1) {
            tempLeftSeq[existingLIdx] = oldKey;
            const el = document.getElementById(`key-node-l${existingLIdx + 1}`);
            if (el) el.innerText = formatKeyName(oldKey);
        } else {
            const existingRIdx = tempRightSeq.indexOf(key);
            if (existingRIdx !== -1) {
                tempRightSeq[existingRIdx] = oldKey;
                const el = document.getElementById(`key-node-r${existingRIdx + 1}`);
                if (el) el.innerText = formatKeyName(oldKey);
            }
        }
        activeSeq[index] = key;
        const activeEl = document.getElementById(`key-node-${prefix}${index + 1}`);
        if (activeEl) activeEl.innerText = formatKeyName(key);
    }

    deactivateKeyEdit();
});

// Clicking outside a node while options modal open cancels active edit
document.getElementById('options-modal').addEventListener('click', (e) => {
    if (activeEditNode && !e.target.classList.contains('node')) {
        deactivateKeyEdit();
    }
});

/**
 * Resets temp key sequences and rebuilds both mini shape previews
 * for the given shape mode ('default' | 'swapped').
 * Called both from the native change event and directly from the
 * custom dropdown option-click handler so it fires reliably.
 */
function rebuildKeyBindForShapeMode(newMode) {
    // Cancel any active key-edit before rebuilding
    deactivateKeyEdit();

    // Reset temp sequences to the defaults for the newly selected mode
    if (newMode === 'swapped') {
        tempLeftSeq  = [...DEFAULT_SQUARE_KEYS];   // left = square   (4 keys)
        tempRightSeq = [...DEFAULT_TRIANGLE_KEYS]; // right = triangle (3 keys)
    } else {
        tempLeftSeq  = [...DEFAULT_TRIANGLE_KEYS]; // left = triangle (3 keys)
        tempRightSeq = [...DEFAULT_SQUARE_KEYS];   // right = square  (4 keys)
    }

    const leftIsSquare  = newMode === 'swapped';
    const rightIsSquare = newMode === 'default';

    buildKeyInputs(
        'opt-left-container', 'l', tempLeftSeq,
        t.opt_left_key || '왼손 키 변경',
        leftIsSquare  ? 'square' : 'triangle',
        'left-panel'
    );
    buildKeyInputs(
        'opt-right-container', 'r', tempRightSeq,
        t.opt_right_key || '오른손 키 변경',
        rightIsSquare ? 'square' : 'triangle',
        'right-panel'
    );
}

function updateMuteBtnUI(id, isMuted) {
    document.getElementById(id).innerText = isMuted ? '🔇' : '🔊';
}

// Key input listeners are now handled dynamically in buildKeyInputs()

// Audio Sliders
['master', 'sfx', 'bgm'].forEach(type => {
    document.getElementById(`vol-${type}`).addEventListener('input', (e) => {
        audioSettings[`${type}Vol`] = parseFloat(e.target.value);
        if(type === 'bgm' || type === 'master') updateBGMVolume();
    });

    document.getElementById(`mute-${type}`).addEventListener('click', () => {
        audioSettings[`${type}Mute`] = !audioSettings[`${type}Mute`];
        updateMuteBtnUI(`mute-${type}`, audioSettings[`${type}Mute`]);
        if(type === 'bgm' || type === 'master') updateBGMVolume();
    });
});

document.getElementById('save-options-btn').addEventListener('click', () => {
    playSound('click');
    leftSequence = [...tempLeftSeq];
    rightSequence = [...tempRightSeq];
    
    currentLang = document.getElementById('language-select').value;
    t = translations[currentLang] || translations['US'];

    const newShapeMode = document.getElementById('shape-select').value;
    if (newShapeMode !== currentShapeMode) {
        currentShapeMode = newShapeMode;
        // Reset key sequences to defaults for the new mode
        if (currentShapeMode === 'swapped') {
            leftSequence = [...DEFAULT_SQUARE_KEYS];
            rightSequence = [...DEFAULT_TRIANGLE_KEYS];
        } else {
            leftSequence = [...DEFAULT_TRIANGLE_KEYS];
            rightSequence = [...DEFAULT_SQUARE_KEYS];
        }
        applyShapeMode(false); // apply visual changes without overwriting sequences we just set
    }

    // Save selected BGM track
    const trackSel = document.getElementById('bgm-track-select');
    if (trackSel && trackSel.value) switchBgmTrack(trackSel.value);

    saveSettings();
    applyLanguage();
    closeModal('options-modal');
});

// ==========================================
// Ranking Logic
// ==========================================

let currentRankPage = 1;
const itemsPerPage = 10;
window.rankingsData = []; // 전역에서 접근 가능하도록 window 객체에 할당

async function fetchRankings() {
    try {
        const q = query(collection(db, "rankings"), orderBy("score", "desc"), limit(100));
        const querySnapshot = await getDocs(q);
        rankingsData = [];
        let rank = 1;
        querySnapshot.forEach((doc) => {
            rankingsData.push({ id: doc.id, rank: rank++, ...doc.data() });
        });
    } catch (e) {
        console.error("Error fetching rankings: ", e);
    }
}

window.renderRanking = async function(page) {
    currentRankPage = page;
    const tbody = document.getElementById('ranking-tbody');
    const pagination = document.getElementById('pagination');
    
    tbody.innerHTML = `<tr><td colspan="4" style="text-align: center;">${t.loading}</td></tr>`;
    
    if (rankingsData.length === 0) {
        await fetchRankings();
    }
    
    tbody.innerHTML = '';
    
    const start = (page - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const pageData = rankingsData.slice(start, end);

    if (pageData.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align: center;">${t.no_ranking}</td></tr>`;
    } else {
        pageData.forEach(item => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${item.rank}</td>
                <td>${item.nation}</td>
                <td>${item.nickname}</td>
                <td style="color: #00f3ff; font-weight: bold;">${item.score}</td>
            `;
            tbody.appendChild(tr);
        });
    }

    // Pagination
    const maxPage = Math.max(1, Math.ceil(rankingsData.length / itemsPerPage));
    let pageHTML = '';
    
    if (page > 1) {
        pageHTML += `<button class="page-btn" onclick="changeRankPage(-1)">&#60;</button>`;
    } else {
        pageHTML += `<button class="page-btn disabled">&#60;</button>`;
    }
    
    pageHTML += `<span>${page}</span>`;
    
    if (page < maxPage) {
        pageHTML += `<button class="page-btn" onclick="changeRankPage(1)">&#62;</button>`;
    } else {
        pageHTML += `<button class="page-btn disabled">&#62;</button>`;
    }
    
    pagination.innerHTML = pageHTML;
}

window.changeRankPage = function(delta) {
    playSound('click');
    const newPage = currentRankPage + delta;
    const maxPage = Math.max(1, Math.ceil(rankingsData.length / itemsPerPage));
    if (newPage >= 1 && newPage <= maxPage) {
        renderRanking(newPage);
    }
}

// ==========================================
// Game Logic
// ==========================================

function startGame() {
    playSound('start');
    toggleBGM(true); // start bgm
    
    lobbyScreen.classList.add('hidden');
    closeModal('game-over-modal');
    mainGame.classList.remove('hidden');

    isPlaying = true;
    score = 0;
    time = 60;
    leftIndex = 0;
    rightIndex = 0;
    leftTotalInputs = 0;
    rightTotalInputs = 0;
    
    // Variables cleared
    clearInterval(timerInterval);
    
    scoreEl.innerText = score;
    timeEl.innerText = time;
    mainGame.classList.remove('shake');
    
    updateVisuals();
    leftStatus.innerText = t.in_progress;
    rightStatus.innerText = t.in_progress;
    
    timerInterval = setInterval(() => {
        time--;
        timeEl.innerText = time;
        if (time <= 0) {
            gameOver(t.time_up);
        }
    }, 1000);
}

function gameOver(reason) {
    isPlaying = false;
    clearInterval(timerInterval);
    // Variables cleared
    mainGame.classList.add('shake');
    
    playSound('gameover');
    // toggleBGM(false); // Removed to keep BGM playing after game over
    
    document.getElementById('game-over-reason').innerHTML = reason;
    document.getElementById('final-score-value').innerText = score;
    
    // 랭킹 등록 국가를 현재 설정된 언어와 동기화 (예: 언어가 USA면 국가도 USA로)
    const nationSel = document.getElementById('player-nation');
    if (nationSel) {
        nationSel.value = currentLang;
        // 커스텀 드롭다운 사용 시 UI 동기화
        if (typeof syncCustomDropdown === 'function') syncCustomDropdown('player-nation');
    }

    setTimeout(() => {
        openModal('game-over-modal');
    }, 500);
}

window.addEventListener('keydown', (e) => {
    // Prevent default actions for gameplay keys (especially arrows)
    if(isPlaying && rightSequence.includes(e.key)) {
        e.preventDefault();
    }
    
    if (!isPlaying) return;

    const allowedKeys = [...leftSequence, ...rightSequence];
    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;

    // Determine normalized key (matching what's in arrays)
    const normalizedKey = leftSequence.includes(key) ? key : (rightSequence.includes(key) ? key : e.key);

    handleGameInput(normalizedKey);
});

function handleGameInput(normalizedKey) {
    if (!isPlaying) return;

    const allowedKeys = [...leftSequence, ...rightSequence];
    if (!allowedKeys.includes(normalizedKey)) {
         gameOver(t.wrong_key);
         return;
    }

    let isCorrect = false;

    if (leftSequence.includes(normalizedKey)) {
        if (normalizedKey === leftSequence[leftIndex]) {
            leftIndex = (leftIndex + 1) % leftSequence.length;
            leftTotalInputs++;
            score += 10;
            isCorrect = true;

            if (leftTotalInputs - rightTotalInputs >= 4) {
                gameOver(t.right_rest);
                return;
            }
        } else {
            playSound('wrong');
            gameOver(t.left_wrong);
            return;
        }
    }

    if (rightSequence.includes(normalizedKey)) {
        if (normalizedKey === rightSequence[rightIndex]) {
            rightIndex = (rightIndex + 1) % rightSequence.length;
            rightTotalInputs++;
            score += 10;
            isCorrect = true;

            if (rightTotalInputs - leftTotalInputs >= 4) {
                gameOver(t.left_rest);
                return;
            }
        } else {
            playSound('wrong');
            gameOver(t.right_wrong);
            return;
        }
    }

    if (isCorrect) playSound('correct');

    scoreEl.innerText = score;
    updateVisuals();
}

function updateVisuals() {
    document.querySelectorAll('.node').forEach(n => {
        n.classList.remove('active');
        n.classList.remove('expected');
    });

    const expectedLeftId = `node-l${leftIndex + 1}`;
    const expectedRightId = `node-r${rightIndex + 1}`;
    
    const leftNode = document.getElementById(expectedLeftId);
    const rightNode = document.getElementById(expectedRightId);
    if (leftNode) leftNode.classList.add('expected');
    if (rightNode) rightNode.classList.add('expected');

    // Progress bars: square always uses 240 dasharray with 4 steps, triangle uses 220 with 3 steps
    const squareProgress = document.getElementById('square-progress');
    const triangleProgress = document.getElementById('triangle-progress');
    const leftContainer = document.getElementById('left-shape-container');
    const rightContainer = document.getElementById('right-shape-container');

    if (currentShapeMode === 'swapped') {
        // left=square(4 nodes), right=triangle(3 nodes)
        if (squareProgress) {
            squareProgress.style.strokeDashoffset = 240 - (leftIndex * 60);
        }
        if (triangleProgress) {
            triangleProgress.style.strokeDashoffset = 194.16 - (rightIndex * (194.16 / 3));
        }
    } else {
        // left=triangle(3 nodes), right=square(4 nodes)
        if (triangleProgress) {
            triangleProgress.style.strokeDashoffset = 194.16 - (leftIndex * (194.16 / 3));
        }
        if (squareProgress) {
            squareProgress.style.strokeDashoffset = 240 - (rightIndex * 60);
        }
    }

    // Toggle completed class
    if (leftContainer) {
        if (leftIndex === 0 && leftTotalInputs > 0) {
            leftContainer.classList.add('completed');
        } else {
            leftContainer.classList.remove('completed');
        }
    }
    if (rightContainer) {
        if (rightIndex === 0 && rightTotalInputs > 0) {
            rightContainer.classList.add('completed');
        } else {
            rightContainer.classList.remove('completed');
        }
    }
}

window.startGame = startGame;
window.goToLobby = goToLobby;

// Initial setup call
init();

// Auto-start BGM on first interaction for lobby BGM
const startBGMOnce = () => {
    toggleBGM(true);
    document.removeEventListener('click', startBGMOnce);
    document.removeEventListener('keydown', startBGMOnce);
    document.removeEventListener('touchstart', startBGMOnce);
};
document.addEventListener('click', startBGMOnce);
document.addEventListener('keydown', startBGMOnce);
document.addEventListener('touchstart', startBGMOnce);

// ── Options Tab Switching ──────────────────────────────────────────────────

/**
 * Activate the tab with the given key ('general' | 'controls' | 'sound').
 */
function switchOptionsTab(tabKey) {
    document.querySelectorAll('.options-tab').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabKey);
    });
    document.querySelectorAll('.options-tab-panel').forEach(panel => {
        panel.classList.toggle('active', panel.id === `tab-${tabKey}`);
    });
}

// Wire up tab button clicks
document.querySelectorAll('.options-tab').forEach(btn => {
    btn.addEventListener('click', () => {
        playSound('click');
        deactivateKeyEdit(); // cancel any pending key edit when switching tabs
        switchOptionsTab(btn.dataset.tab);
    });
});

// Options: Immediate Language Change
document.getElementById('language-select').addEventListener('change', (e) => {
    currentLang = e.target.value;
    t = translations[currentLang] || translations['US'];
    applyLanguage();
    // Rebuild key-bind panels immediately so their text updates with the new language
    if (!document.getElementById('options-modal').classList.contains('hidden')) {
        const leftIsSquare  = currentShapeMode === 'swapped';
        const rightIsSquare = currentShapeMode === 'default';
        buildKeyInputs('opt-left-container',  'l', tempLeftSeq,  t.opt_left_key  || '왼손 키 변경',  leftIsSquare  ? 'square' : 'triangle', 'left-panel');
        buildKeyInputs('opt-right-container', 'r', tempRightSeq, t.opt_right_key || '오른손 키 변경', rightIsSquare ? 'square' : 'triangle', 'right-panel');
    }
});

// Options: Immediate Theme Change
document.getElementById('theme-select').addEventListener('change', (e) => {
    currentTheme = e.target.value;
    applyTheme();
});

// Options: Immediate Shape-Mode Change → rebuild key-bind previews live
document.getElementById('shape-select').addEventListener('change', (e) => {
    rebuildKeyBindForShapeMode(e.target.value);
});

// ── Mode Toggle Buttons ───────────────────────────────────────────────────

/** Sync the active class on the two mode toggle buttons to the given mode. */
function syncModeButtons(mode) {
    document.querySelectorAll('.mode-toggle-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.mode === mode);
    });
}

// Wire up mode toggle button clicks
document.querySelectorAll('.mode-toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const newMode = btn.dataset.mode;
        syncModeButtons(newMode);
        // Update the hidden select and fire its change event
        const sel = document.getElementById('shape-select');
        sel.value = newMode;
        sel.dispatchEvent(new Event('change'));
    });
});

// Modals: Custom Scrollbar Implementation
document.querySelectorAll('.glass-effect').forEach(modal => {
    const thumb = document.createElement('div');
    thumb.className = 'custom-scrollbar-thumb';
    modal.appendChild(thumb);
    
    let scrollTimeout;
    let isHoveringThumb = false;
    
    const updateScrollbar = () => {
        const contentHeight = modal.scrollHeight;
        const viewHeight = modal.clientHeight;
        
        if (contentHeight <= viewHeight) {
            thumb.style.display = 'none';
            return;
        } else {
            thumb.style.display = 'block';
        }
        
        const scrollRatio = viewHeight / contentHeight;
        const thumbHeight = Math.max(viewHeight * scrollRatio, 30);
        const maxScrollTop = Math.max(contentHeight - viewHeight, 1); // Prevent division by zero
        
        const scrollY = modal.scrollTop;
        const thumbTop = scrollY + (scrollY / maxScrollTop) * (viewHeight - thumbHeight - 40) + 20; // 20px padding top/bottom
        
        thumb.style.height = `${thumbHeight}px`;
        thumb.style.top = `${thumbTop}px`;
        
        thumb.classList.add('visible');
        
        clearTimeout(scrollTimeout);
        if (!isHoveringThumb) {
            scrollTimeout = setTimeout(() => {
                thumb.classList.remove('visible');
            }, 800);
        }
    };

    modal.addEventListener('scroll', updateScrollbar);
    window.addEventListener('resize', updateScrollbar);

    thumb.addEventListener('mouseenter', () => {
        isHoveringThumb = true;
        clearTimeout(scrollTimeout);
        thumb.classList.add('visible');
    });
    
    thumb.addEventListener('mouseleave', () => {
        isHoveringThumb = false;
        scrollTimeout = setTimeout(() => {
            thumb.classList.remove('visible');
        }, 800);
    });
});

// ==========================================
// Custom Dropdown Logic
// ==========================================

function setupCustomDropdowns() {
    document.querySelectorAll('select.custom-input').forEach(select => {
        select.style.display = 'none';
        
        const wrapper = document.createElement('div');
        wrapper.className = 'custom-select-wrapper';
        select.parentNode.insertBefore(wrapper, select);
        wrapper.appendChild(select);
        
        const trigger = document.createElement('div');
        trigger.className = 'custom-select-trigger';
        wrapper.appendChild(trigger);
        
        const optionsContainer = document.createElement('div');
        optionsContainer.className = 'custom-options';
        wrapper.appendChild(optionsContainer);
        
        Array.from(select.options).forEach(option => {
            const customOption = document.createElement('div');
            customOption.className = 'custom-option';
            customOption.dataset.value = option.value;
            customOption.innerHTML = option.innerHTML;
            if (option.hasAttribute('data-i18n')) {
                customOption.setAttribute('data-i18n', option.getAttribute('data-i18n'));
            }
            
            customOption.addEventListener('click', () => {
                select.value = option.value;
                trigger.innerHTML = customOption.innerHTML;
                if (customOption.hasAttribute('data-i18n')) {
                    trigger.setAttribute('data-i18n', customOption.getAttribute('data-i18n'));
                } else {
                    trigger.removeAttribute('data-i18n');
                }
                
                optionsContainer.querySelectorAll('.custom-option').forEach(opt => opt.classList.remove('selected'));
                customOption.classList.add('selected');
                wrapper.classList.remove('open');
                // Restore portaled container
                if (optionsContainer._origParent) {
                    optionsContainer._origParent.appendChild(optionsContainer);
                    delete optionsContainer._origParent;
                }
                optionsContainer.style.cssText = '';
                
                select.dispatchEvent(new Event('change'));
            });
            optionsContainer.appendChild(customOption);
        });

        trigger.addEventListener('click', (e) => {
            e.stopPropagation();

            // Close all other dropdowns and restore them
            document.querySelectorAll('.custom-select-wrapper').forEach(w => {
                if (w !== wrapper) {
                    w.classList.remove('open');
                    const body = document.body;
                    const orphan = body.querySelector(`.custom-options[data-uid="${w.dataset.uid}"]`);
                    if (orphan && orphan._origParent) {
                        orphan._origParent.appendChild(orphan);
                        delete orphan._origParent;
                        orphan.style.cssText = '';
                    }
                }
            });

            wrapper.classList.toggle('open');

            if (wrapper.classList.contains('open')) {
                // getBoundingClientRect() relative to the visual viewport
                const rect = trigger.getBoundingClientRect();

                // Use visualViewport if available (handles pinch-zoom and keyboard-up on mobile)
                const vvScale  = window.visualViewport ? window.visualViewport.scale  : 1;
                const vvOffX   = window.visualViewport ? window.visualViewport.offsetLeft : 0;
                const vvOffY   = window.visualViewport ? window.visualViewport.offsetTop  : 0;

                const left   = rect.left / vvScale + vvOffX;
                const top    = rect.top  / vvScale + vvOffY;
                const bottom = rect.bottom / vvScale + vvOffY;
                const width  = rect.width  / vvScale;

                const availableBelow = window.innerHeight - bottom - 8;
                const availableAbove = top - 8;
                const listHeight = Math.min(240, Math.max(availableBelow, availableAbove));
                const openAbove = availableBelow < 100 && availableAbove > availableBelow;

                // Portal to <body> — escapes backdrop-filter stacking context
                optionsContainer._origParent = wrapper;
                document.body.appendChild(optionsContainer);

                optionsContainer.style.cssText = '';
                optionsContainer.style.position   = 'fixed';
                optionsContainer.style.width      = width + 'px';
                optionsContainer.style.left       = left + 'px';
                optionsContainer.style.maxHeight  = listHeight + 'px';
                optionsContainer.style.zIndex     = '10000';
                optionsContainer.style.opacity    = '1';
                optionsContainer.style.visibility = 'visible';
                optionsContainer.style.transform  = 'translateY(0)';

                if (openAbove) {
                    optionsContainer.style.top    = '';
                    optionsContainer.style.bottom = (window.innerHeight - top + 4) + 'px';
                } else {
                    optionsContainer.style.top    = (bottom + 4) + 'px';
                    optionsContainer.style.bottom = '';
                }

                const selectedOpt = optionsContainer.querySelector('.custom-option.selected');
                if (selectedOpt) {
                    optionsContainer.scrollTop = selectedOpt.offsetTop - optionsContainer.clientHeight / 2 + selectedOpt.clientHeight / 2;
                }
            } else {
                if (optionsContainer._origParent) {
                    optionsContainer._origParent.appendChild(optionsContainer);
                    delete optionsContainer._origParent;
                }
                optionsContainer.style.cssText = '';
            }
        });
        
        const selectedOption = select.options[select.selectedIndex];
        // Guard: skip if select has no options (e.g. dynamically populated selects)
        if (!selectedOption) return;
        trigger.innerHTML = selectedOption.innerHTML;
        if (selectedOption.hasAttribute('data-i18n')) {
            trigger.setAttribute('data-i18n', selectedOption.getAttribute('data-i18n'));
        }
        
        const initialCustomOption = optionsContainer.querySelector(`.custom-option[data-value="${selectedOption.value}"]`);
        if(initialCustomOption) initialCustomOption.classList.add('selected');
    });

    document.addEventListener('click', () => {
        document.querySelectorAll('.custom-select-wrapper').forEach(w => {
            w.classList.remove('open');
        });
        // Restore any portaled dropdown containers back to their wrappers
        document.querySelectorAll('.custom-options').forEach(opts => {
            if (opts._origParent) {
                opts._origParent.appendChild(opts);
                delete opts._origParent;
                opts.style.cssText = '';
            }
        });
    });
}

function syncCustomDropdown(selectId) {
    const select = document.getElementById(selectId);
    if(!select) return;
    const wrapper = select.closest('.custom-select-wrapper');
    if(!wrapper) return;
    
    const trigger = wrapper.querySelector('.custom-select-trigger');
    const optionsContainer = wrapper.querySelector('.custom-options');
    const selectedOption = select.options[select.selectedIndex];
    
    if(!selectedOption) return;
    
    trigger.innerHTML = selectedOption.innerHTML;
    if (selectedOption.hasAttribute('data-i18n')) {
        trigger.setAttribute('data-i18n', selectedOption.getAttribute('data-i18n'));
    } else {
        trigger.removeAttribute('data-i18n');
    }
    
    optionsContainer.querySelectorAll('.custom-option').forEach(opt => opt.classList.remove('selected'));
    const initialCustomOption = optionsContainer.querySelector(`.custom-option[data-value="${selectedOption.value}"]`);
    if(initialCustomOption) initialCustomOption.classList.add('selected');
}

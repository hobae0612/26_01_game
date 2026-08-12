const fs = require('fs');

const fontFace = `
@font-face {
    font-family: 'Pretendard';
    src: url('https://cdn.jsdelivr.net/gh/projectnoonnu/pretendard@1.0/Pretendard-Thin.woff2') format('woff2');
    font-weight: 100;
    font-display: swap;
}

@font-face {
    font-family: 'Pretendard';
    src: url('https://cdn.jsdelivr.net/gh/projectnoonnu/pretendard@1.0/Pretendard-ExtraLight.woff2') format('woff2');
    font-weight: 200;
    font-display: swap;
}

@font-face {
    font-family: 'Pretendard';
    src: url('https://cdn.jsdelivr.net/gh/projectnoonnu/pretendard@1.0/Pretendard-Light.woff2') format('woff2');
    font-weight: 300;
    font-display: swap;
}

@font-face {
    font-family: 'Pretendard';
    src: url('https://cdn.jsdelivr.net/gh/projectnoonnu/pretendard@1.0/Pretendard-Regular.woff2') format('woff2');
    font-weight: 400;
    font-display: swap;
}

@font-face {
    font-family: 'Pretendard';
    src: url('https://cdn.jsdelivr.net/gh/projectnoonnu/pretendard@1.0/Pretendard-Medium.woff2') format('woff2');
    font-weight: 500;
    font-display: swap;
}

@font-face {
    font-family: 'Pretendard';
    src: url('https://cdn.jsdelivr.net/gh/projectnoonnu/pretendard@1.0/Pretendard-SemiBold.woff2') format('woff2');
    font-weight: 600;
    font-display: swap;
}

@font-face {
    font-family: 'Pretendard';
    src: url('https://cdn.jsdelivr.net/gh/projectnoonnu/pretendard@1.0/Pretendard-Bold.woff2') format('woff2');
    font-weight: 700;
    font-display: swap;
}

@font-face {
    font-family: 'Pretendard';
    src: url('https://cdn.jsdelivr.net/gh/projectnoonnu/pretendard@1.0/Pretendard-ExtraBold.woff2') format('woff2');
    font-weight: 800;
    font-display: swap;
}

@font-face {
    font-family: 'Pretendard';
    src: url('https://cdn.jsdelivr.net/gh/projectnoonnu/pretendard@1.0/Pretendard-Black.woff2') format('woff2');
    font-weight: 900;
    font-display: swap;
}
`;

function injectFont(file) {
    let content = fs.readFileSync(file, 'utf8');
    if (!content.includes("@font-face")) {
        content = fontFace + '\n' + content;
    }
    content = content.replace(/font-family:\s*'Inter',\s*sans-serif;/g, "font-family: 'Pretendard', 'Inter', sans-serif;");
    
    // Also, ensure mobile buttons and desktop buttons match styles exactly
    if (file.includes('mobile')) {
        content = content.replace(/\.m-btn\s*\{[^}]+\}/, `.m-btn {
    width: 260px;
    height: 52px;
    border: 1px solid var(--border-medium);
    outline: none;
    color: var(--text-main);
    background: var(--glass-bg);
    cursor: pointer;
    border-radius: 12px;
    font-size: 1.1rem;
    font-weight: 600;
    margin-top: 16px;
    transition: background 0.2s ease, border-color 0.2s ease, transform 0.1s ease;
    display: flex;
    justify-content: center;
    align-items: center;
    box-shadow: 0 2px 6px rgba(0,0,0,0.03);
    font-family: inherit;
    margin-left: auto;
    margin-right: auto;
}`);
        // Ensure m-modal looks like desktop glass-effect
        content = content.replace(/\.m-modal\s*\{[^}]+\}/, `.m-modal {
    width: 90%;
    max-width: 600px;
    background: var(--glass-bg);
    border: 1px solid var(--border-medium);
    border-radius: 24px;
    padding: 30px;
    padding-bottom: 40px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.1);
    color: var(--text-main);
    max-height: 85vh;
    overflow-y: auto;
}`);
    }
    fs.writeFileSync(file, content);
}

injectFont('style.css');
injectFont('mobile-style.css');

// Fix mobile-app.js to toggle body light-mode
let js = fs.readFileSync('mobile-app.js', 'utf8');
if (!js.includes('document.body.classList')) {
    js = js.replace(/const currentTheme = ref\('light'\);/, 
`const currentTheme = ref('light');
    watch(currentTheme, (val) => {
      if (val === 'light') {
        document.body.classList.add('light-mode');
      } else {
        document.body.classList.remove('light-mode');
      }
    }, { immediate: true });`);
    fs.writeFileSync('mobile-app.js', js);
}

const fs = require('fs');

function processFile(file) {
    let content = fs.readFileSync(file, 'utf8');

    // 1. Remove gradients
    // Replace linear-gradient text with solid color
    content = content.replace(/background:\s*linear-gradient\([^,]+,\s*var\(--accent-cyan\),\s*var\(--accent-magenta\)\);/g, 'background: var(--accent-cyan);');
    // Radial gradients
    content = content.replace(/background:\s*radial-gradient\([^)]+\);/g, 'background: transparent;');
    
    // Title gradient text removal
    content = content.replace(/-webkit-text-fill-color:\s*transparent;/g, '');
    content = content.replace(/background:\s*linear-gradient\(90deg,\s*var\(--accent-cyan\),\s*var\(--accent-magenta\)\);/g, 'color: var(--text-main);');

    // 2. Fix white text on bright pastel backgrounds
    content = content.replace(/color:\s*#ffffff;/gi, 'color: #333333;');

    // 3. Fix margins/padding "저장 및 닫기 아래까지 배경색이 적용 안됨"
    // Usually caused by missing padding-bottom on the scrollable container or the wrapper.
    if (file.includes('style.css')) {
        content = content.replace(/\.glass-effect\s*\{[^}]+\}/, (match) => {
            if (!match.includes('padding-bottom')) {
                return match.replace(/padding:\s*[^;]+;/, '$& padding-bottom: 40px;');
            }
            return match;
        });
    }

    fs.writeFileSync(file, content);
    console.log("Processed " + file);
}

processFile('style.css');
if (fs.existsSync('mobile-style.css')) {
    processFile('mobile-style.css');
}

// Fix theme variable definitions in style.css to support dark mode properly
let style = fs.readFileSync('style.css', 'utf8');

// Replace the top :root and body.light-mode
const rootRegex = /:root\s*\{[\s\S]*?\}(?=\s*body\.light-mode)/;
const lightModeRegex = /body\.light-mode\s*\{[\s\S]*?\}(?=\s*\* \{)/;

const lightVars = `
    --bg-main: #F7F6F2;
    --text-main: #333333;
    --text-muted: #666666;
    --text-dark: #888888;
    
    --accent-cyan: #87CEEB; /* 하늘색 */
    --accent-cyan-glow: rgba(135, 206, 235, 0.4);
    --accent-cyan-glow-light: rgba(135, 206, 235, 0.05);
    
    --accent-magenta: #FFB3A7; /* 살구색/핑크색 */
    --accent-magenta-glow: rgba(255, 179, 167, 0.4);
    --accent-magenta-glow-light: rgba(255, 179, 167, 0.05);
    
    --border-light: #E5E7EB;
    --border-medium: #D1D5DB;
    
    --glass-bg: #F2F3F5; /* 밝은 회색 */
    --modal-overlay: rgba(230, 230, 230, 0.85);
    
    --box-bg: rgba(0, 0, 0, 0.03);
    --box-bg-hover: rgba(0, 0, 0, 0.06);
    --node-bg: #ffffff;
    --node-border: #E5E7EB;
    
    --btn-bg: #ffffff;
    --btn-bg-hover: #E5E7EB;
    
    --scrollbar-thumb: #D1D5DB;
    --warning-bg: rgba(255, 170, 0, 0.05);
    --warning-border: rgba(255, 170, 0, 0.2);
    
    --icon-filter: brightness(0.2);
    --shape-path: #D1D5DB;
`;

const darkVars = `
    --bg-main: #2C2C2C;
    --text-main: #F7F6F2;
    --text-muted: #CCCCCC;
    --text-dark: #AAAAAA;
    
    --accent-cyan: #87CEEB;
    --accent-cyan-glow: rgba(135, 206, 235, 0.4);
    --accent-cyan-glow-light: rgba(135, 206, 235, 0.05);
    
    --accent-magenta: #FFB3A7;
    --accent-magenta-glow: rgba(255, 179, 167, 0.4);
    --accent-magenta-glow-light: rgba(255, 179, 167, 0.05);
    
    --border-light: #444444;
    --border-medium: #555555;
    
    --glass-bg: #3A3A3A;
    --modal-overlay: rgba(0, 0, 0, 0.85);
    
    --box-bg: rgba(255, 255, 255, 0.03);
    --box-bg-hover: rgba(255, 255, 255, 0.06);
    --node-bg: #444444;
    --node-border: #555555;
    
    --btn-bg: #444444;
    --btn-bg-hover: #555555;
    
    --scrollbar-thumb: #666666;
    --warning-bg: rgba(255, 170, 0, 0.1);
    --warning-border: rgba(255, 170, 0, 0.3);
    
    --icon-filter: invert(1);
    --shape-path: #555555;
`;

// Inject variables
if (rootRegex.test(style) && lightModeRegex.test(style)) {
    style = style.replace(rootRegex, ':root {' + darkVars + '}'); // root is dark by default
    style = style.replace(lightModeRegex, 'body.light-mode {' + lightVars + '}');
} else {
    // Just replace the first two blocks
    let newStyle = ':root {' + darkVars + '}\nbody.light-mode {' + lightVars + '}\n' + style.substring(style.indexOf('* {'));
    style = newStyle;
}

fs.writeFileSync('style.css', style);
console.log("Updated variables in style.css");

// Same for mobile-style.css
if (fs.existsSync('mobile-style.css')) {
    let mstyle = fs.readFileSync('mobile-style.css', 'utf8');
    const mRootRegex = /:root\s*\{[\s\S]*?\}(?=\s*body\.light-mode)/;
    const mLightModeRegex = /body\.light-mode\s*\{[\s\S]*?\}(?=\s*\* \{)/;
    if (mRootRegex.test(mstyle) && mLightModeRegex.test(mstyle)) {
        mstyle = mstyle.replace(mRootRegex, ':root {' + darkVars + '}');
        mstyle = mstyle.replace(mLightModeRegex, 'body.light-mode {' + lightVars + '}');
    } else {
        let newStyle = ':root {' + darkVars + '}\nbody.light-mode {' + lightVars + '}\n' + mstyle.substring(mstyle.indexOf('* {'));
        mstyle = newStyle;
    }
    
    // Fix mobile background cut off: .m-modal padding
    mstyle = mstyle.replace(/\.m-modal\s*\{[^}]+\}/, (match) => {
        if (!match.includes('padding-bottom')) {
            return match.replace(/padding:\s*[^;]+;/, '$& padding-bottom: 40px;');
        }
        return match;
    });

    fs.writeFileSync('mobile-style.css', mstyle);
    console.log("Updated variables in mobile-style.css");
}

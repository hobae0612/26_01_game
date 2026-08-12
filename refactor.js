const fs = require('fs');

let js = fs.readFileSync('script.js', 'utf8');

// 1. Refactor keydown logic into handleGameInput
const keydownLogic = `window.addEventListener('keydown', (e) => {
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
}`;

js = js.replace(/window\.addEventListener\('keydown', \(e\) => \{[\s\S]*?updateVisuals\(\);\n\}\);/, keydownLogic);

// 2. Add touch/click events to rebuildNodes
// I need to find rebuildNodes function and add the event listeners
const rebuildNodesTarget = `function rebuildNodes(container, prefix, count, cssClasses, svgHtml) {
    // Remove all existing children
    container.innerHTML = '';
    for (let i = 0; i < count; i++) {
        const node = document.createElement('div');
        node.className = \`node \${cssClasses[i]}\`;
        node.id = \`node-\${prefix}\${i + 1}\`;
        node.innerText = '?';
        container.appendChild(node);
    }
    container.insertAdjacentHTML('beforeend', svgHtml);
}`;

const rebuildNodesNew = `function rebuildNodes(container, prefix, count, cssClasses, svgHtml) {
    // Remove all existing children
    container.innerHTML = '';
    for (let i = 0; i < count; i++) {
        const node = document.createElement('div');
        node.className = \`node \${cssClasses[i]}\`;
        node.id = \`node-\${prefix}\${i + 1}\`;
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
}`;

js = js.replace(rebuildNodesTarget, rebuildNodesNew);

fs.writeFileSync('script.js', js);

const fs = require('fs');

let js = fs.readFileSync('script.js', 'utf8');

// 1. Fix stroke-dasharray and stroke-dashoffset for triangle from 220 to 194.16
js = js.replace(/stroke-dasharray="220" stroke-dashoffset="220"/g, 'stroke-dasharray="194.16" stroke-dashoffset="194.16"');

// 2. Fix updateVisuals logic
const oldUpdateVisuals = `    if (currentShapeMode === 'swapped') {
        // left=square(4 nodes), right=triangle(3 nodes)
        if (squareProgress) {
            const sq = 240 - (leftIndex * 60);
            squareProgress.style.strokeDashoffset = (leftIndex === 0 && score > 0) ? 0 : sq;
        }
        if (triangleProgress) {
            const tri = 220 - (rightIndex * (220/3));
            triangleProgress.style.strokeDashoffset = (rightIndex === 0 && score > 0) ? 0 : tri;
        }
    } else {
        // left=triangle(3 nodes), right=square(4 nodes)
        if (triangleProgress) {
            const tri = 220 - (leftIndex * (220/3));
            triangleProgress.style.strokeDashoffset = (leftIndex === 0 && score > 0) ? 0 : tri;
        }
        if (squareProgress) {
            const sq = 240 - (rightIndex * 60);
            squareProgress.style.strokeDashoffset = (rightIndex === 0 && score > 0) ? 0 : sq;
        }
    }`;

const newUpdateVisuals = `    if (currentShapeMode === 'swapped') {
        // left=square(4 nodes), right=triangle(3 nodes)
        if (squareProgress) {
            const sq = 240 - (leftIndex * 60);
            squareProgress.style.strokeDashoffset = (leftIndex === 0 && leftTotalInputs > 0) ? 0 : sq;
        }
        if (triangleProgress) {
            const tri = 194.16 - (rightIndex * (194.16/3));
            triangleProgress.style.strokeDashoffset = (rightIndex === 0 && rightTotalInputs > 0) ? 0 : tri;
        }
    } else {
        // left=triangle(3 nodes), right=square(4 nodes)
        if (triangleProgress) {
            const tri = 194.16 - (leftIndex * (194.16/3));
            triangleProgress.style.strokeDashoffset = (leftIndex === 0 && leftTotalInputs > 0) ? 0 : tri;
        }
        if (squareProgress) {
            const sq = 240 - (rightIndex * 60);
            squareProgress.style.strokeDashoffset = (rightIndex === 0 && rightTotalInputs > 0) ? 0 : sq;
        }
    }`;

js = js.replace(oldUpdateVisuals, newUpdateVisuals);

// 3. Fix completed class toggling (same bug with score > 0)
const oldCompleted = `    // Toggle completed class
    if (leftContainer) {
        if (leftIndex === 0 && score > 0) {
            leftContainer.classList.add('completed');
        } else {
            leftContainer.classList.remove('completed');
        }
    }
    if (rightContainer) {
        if (rightIndex === 0 && score > 0) {
            rightContainer.classList.add('completed');
        } else {
            rightContainer.classList.remove('completed');
        }
    }`;

const newCompleted = `    // Toggle completed class
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
    }`;

js = js.replace(oldCompleted, newCompleted);

fs.writeFileSync('script.js', js);

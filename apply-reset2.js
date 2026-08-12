const fs = require('fs');

let js = fs.readFileSync('script.js', 'utf8');

const oldUpdateVisuals = `    if (currentShapeMode === 'swapped') {
        // left=square(4 nodes), right=triangle(3 nodes)
        if (squareProgress) {
            const drawn = (leftIndex === 0 && leftTotalInputs > 0) ? 4 : (leftIndex === 0 ? 0 : leftIndex - 1);
            squareProgress.style.strokeDashoffset = 240 - (drawn * 60);
        }
        if (triangleProgress) {
            const drawn = (rightIndex === 0 && rightTotalInputs > 0) ? 3 : (rightIndex === 0 ? 0 : rightIndex - 1);
            triangleProgress.style.strokeDashoffset = 194.16 - (drawn * (194.16 / 3));
        }
    } else {
        // left=triangle(3 nodes), right=square(4 nodes)
        if (triangleProgress) {
            const drawn = (leftIndex === 0 && leftTotalInputs > 0) ? 3 : (leftIndex === 0 ? 0 : leftIndex - 1);
            triangleProgress.style.strokeDashoffset = 194.16 - (drawn * (194.16 / 3));
        }
        if (squareProgress) {
            const drawn = (rightIndex === 0 && rightTotalInputs > 0) ? 4 : (rightIndex === 0 ? 0 : rightIndex - 1);
            squareProgress.style.strokeDashoffset = 240 - (drawn * 60);
        }
    }`;

const newUpdateVisuals = `    if (currentShapeMode === 'swapped') {
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
    }`;

if (js.includes(oldUpdateVisuals)) {
    js = js.replace(oldUpdateVisuals, newUpdateVisuals);
    fs.writeFileSync('script.js', js);
    console.log('Successfully updated script.js');
} else {
    console.log('Could not find the target code block.');
}

const fs = require('fs');
let css = fs.readFileSync('style.css', 'utf8');

const mediaQuery = `
/* ========================================== */
/* Mobile Responsive Design                   */
/* ========================================== */
@media (max-width: 1024px) {
    .game-area {
        flex-direction: column !important;
        align-items: center;
        justify-content: center;
    }
    .split {
        width: 100%;
        min-height: auto;
        padding: 10px;
    }
    .shape-container {
        transform: scale(0.85);
        margin: 0 auto;
    }
    .top-stats-bar {
        padding: 10px 20px;
        gap: 20px;
    }
    .top-nav-btns {
        left: 20px;
        gap: 10px;
    }
    .top-nav-btns .icon-btn {
        width: 36px;
        height: 36px;
    }
    .nav-img {
        width: 20px;
        height: 20px;
    }
    .stat-inline-label {
        font-size: 0.8rem;
    }
    .stat-inline-val {
        font-size: 2rem;
    }
    .game-title {
        font-size: 2.5rem;
    }
    .options-modal {
        width: 95%;
        padding: 20px;
    }
    /* Disable hover effects on touch devices */
    @media (hover: none) {
        .node:hover {
            transform: translate(-50%, -50%);
            box-shadow: none;
        }
    }
}

@media (max-width: 600px) {
    .shape-container {
        transform: scale(0.7);
    }
    .top-stats-bar {
        gap: 10px;
    }
    .game-title {
        font-size: 2rem;
    }
}
`;

fs.appendFileSync('style.css', '\n' + mediaQuery);

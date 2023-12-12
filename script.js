const Colors = {
    RED: 'red',
    ORANGE: 'orange',
    YELLOW: 'yellow',
    GREEN: 'green',
    BLUE: 'blue',
    INDIGO: 'indigo',
    VIOLET: 'violet',
    BLACK: 'black',
    WHITE: 'white',
};

const Effects = {
    DECREASE: 'decrease-effect',
    INCREASE: 'increase-effect',
    ROTATE: '',
    STAGGER: 'stagger-effect',
};

class ColorSquare {
    constructor(size, colorCount) {
        this.size = size;
        this.colorCount = colorCount;
        this.generateSquare();
    }

    generateSquare() {
        const baseColors = [Colors.RED, Colors.ORANGE, Colors.YELLOW, Colors.GREEN, Colors.BLUE, Colors.INDIGO, Colors.VIOLET, Colors.BLACK, Colors.WHITE];
        const numberOfColors = this.colorCount;
        const totalCells = this.size * this.size;
        const usedColors = [];

        for (let i = 0; i < numberOfColors; i++) {
            const randomIndex = Math.floor(Math.random() * baseColors.length);
            const randomColor = baseColors.splice(randomIndex, 1)[0];
            usedColors.push(randomColor);
        }

        for (let i = numberOfColors; i < totalCells; i++) {
            const randomIndex = Math.floor(Math.random() * numberOfColors);
            usedColors[i] = usedColors[randomIndex];
        }

        this.cellColors = usedColors;
    }

    createCellElement(squareElement, index) {
        const cellElement = document.createElement('div');
        cellElement.classList.add('cell');
        const color = this.cellColors[index];
        cellElement.style.setProperty('--cell-color', color);
        squareElement.appendChild(cellElement);
    }
}

let currentUsername = '';
let currentLevel = 1;
let currentStep = 0;
let currentPoints = 0;
let userStatistics;
let levelsConfig;
let currentTimer = 0;
let timerInterval;
let maxAttempts = 0;
let currentAttempts = 0;

async function loadSettings() {
    const response = await fetch('settings.json');
    const settings = await response.json();
    return settings;
}

loadSettings().then((settings) => {
    levelsConfig = settings;

    const levelButtonsContainer = document.getElementById('level-buttons');
    Object.keys(levelsConfig).forEach((levelNumber) => {
        const levelButton = document.createElement('button');
        levelButton.textContent = `Уровень ${levelNumber}`;

        const levelToCheck = Number(levelNumber);
        const isLevelEnabled = userStatistics && userStatistics.level >= levelToCheck || levelToCheck === 1;
        levelButton.disabled = !isLevelEnabled;

        levelButton.addEventListener('click', () => startLevel(levelToCheck));
        levelButtonsContainer.appendChild(levelButton);
    });

    const showStatsButton = document.createElement('button');
    showStatsButton.textContent = 'Показать статистику';
    showStatsButton.id = 'showStatsButton';
    showStatsButton.addEventListener('click', () => showStats());
    levelButtonsContainer.appendChild(showStatsButton);
});

function startGame() {
    const usernameInput = document.getElementById('username');
    const username = usernameInput.value.trim();

    if (username) {
        const mainContentContainer = document.getElementById('main-content');
        const levelButtonsContainer = document.getElementById('level-buttons');

        mainContentContainer.style.display = 'none';
        levelButtonsContainer.style.display = 'flex';

        currentUsername = username;
        userStatistics = JSON.parse(localStorage.getItem('statistics')) || {};
        userStatistics = userStatistics[currentUsername] || {};

        if (!userStatistics.level) {
            userStatistics.level = 1;
            userStatistics.points = 0;
            const statisticsMap = JSON.parse(localStorage.getItem('statistics')) || {};
            statisticsMap[currentUsername] = userStatistics;
            localStorage.setItem('statistics', JSON.stringify(statisticsMap));

        }

        currentPoints = Math.max(0, userStatistics.points);
        currentLevel = userStatistics.level;

        updateLevelButtonStatus();
    } else {
        alert('Имя не может быть пустым!!!');
    }
}

function startLevel(selectedLevel) {
    const levelButtonsContainer = document.getElementById('level-buttons');
    levelButtonsContainer.style.display = 'none';

    const gameContentContainer = document.getElementById('game-content');
    gameContentContainer.style.display = 'flex';

    const backButton = document.getElementById('back-to-menu');
    backButton.style.display = 'block';

    clearGameElements();
    currentStep = 0;

    currentLevel = selectedLevel;

    const levelSettings = levelsConfig[currentLevel];

    maxAttempts = levelsConfig[currentLevel]?.maxAttempts || 3;
    currentAttempts = maxAttempts;
    updateAttemptsDisplay();

    userStatistics = JSON.parse(localStorage.getItem('statistics'));
    userStatistics = userStatistics[currentUsername];
    updatePoints(Math.max(0, userStatistics.points));

    currentTimer = levelSettings.timer;
    timerInterval = setInterval(updateTimer, 1000);
    updateTimerDisplay();

    generateLevel(levelSettings?.steps[currentStep]);
}

function generateLevel(stepConfig) {
    const targetSquare = new ColorSquare(stepConfig.size, stepConfig.colorCount);
    const squares = Array.from({ length: stepConfig.squaresCount - 1 }, () => new ColorSquare(stepConfig.size, stepConfig.colorCount));

    squares.splice(Math.floor(Math.random() * squares.length), 0, targetSquare);

    const targetSquareContainer = document.getElementById('square-container');
    const targetSquareElement = document.createElement('div');
    targetSquareElement.classList.add('square');
    targetSquareContainer.appendChild(targetSquareElement);

    targetSquareElement.style.gridTemplateColumns = `repeat(${targetSquare.size}, 1fr)`;

    for (let i = 0; i < targetSquare.size * targetSquare.size; i++) {
        targetSquare.createCellElement(targetSquareElement, i);
    }

    const gameContainer = document.getElementById('game-container');

    const squaresWithEffects = getRandomSquares(squares, Math.floor(stepConfig.squaresCount / 2));

    squares.forEach((square, index) => {
        const gameSquareElement = document.createElement('div');
        gameSquareElement.classList.add('game-square');
        gameContainer.appendChild(gameSquareElement);

        if (squaresWithEffects.includes(square)) {
            applyEffect(gameSquareElement, stepConfig.effects);
        }

        gameSquareElement.style.gridTemplateColumns = `repeat(${square.size}, 1fr)`;

        for (let i = 0; i < square.size * square.size; i++) {
            const gameCellElement = document.createElement('div');
            gameCellElement.classList.add('game-cell');
            const color = square.cellColors[i];
            gameCellElement.style.setProperty('--cell-color', color);

            gameCellElement.addEventListener('click', () => checkSelection(index));
            gameSquareElement.appendChild(gameCellElement);
        }
    });

    function checkSelection(index) {
        const square = document.querySelectorAll('.game-square')[index];

        setTimeout(() => {
            square.classList.remove('glow-green', 'glow-red');
        }, 500);

        if (squares[index] === targetSquare) {
            currentPoints += stepConfig.pointsForCorrectAnswer;
            updatePoints(currentPoints);

            currentStep++;
            setTimeout(() => startNextStep(), 1000);

            square.classList.add('glow-green');

            disableClicking();
        } else {
            currentAttempts--;

            if (currentAttempts <= 0) {
                clearInterval(timerInterval);
                alert('У вас закончились попытки. Возвращение в меню.');
                backToMenu();
                return;
            }

            updateAttemptsDisplay();

            const penaltyPoints = stepConfig.penaltyForIncorrectAnswer;
            currentPoints -= penaltyPoints;
            currentPoints = Math.max(0, currentPoints);
            updatePoints(currentPoints);

            square.classList.add('glow-red');
        }

        userStatistics.points = currentPoints;
        userStatistics.level = Math.max(currentLevel, userStatistics.level);
        const statisticsMap = JSON.parse(localStorage.getItem('statistics')) || {};
        statisticsMap[currentUsername] = userStatistics;
        localStorage.setItem('statistics', JSON.stringify(statisticsMap));
    }
}

function startNextStep() {
    if (currentStep < levelsConfig[currentLevel]?.steps.length) {
        clearGameElements();
        generateLevel(levelsConfig[currentLevel]?.steps[currentStep]);
    } else {
        clearInterval(timerInterval);
        alert('Удача улыбнулась тебе! Уровень пройден.');
        backToMenu(true);
        updateLevelButtonStatus();
    }
}

function backToMenu(levelPassed = false) {
    clearInterval(timerInterval);

    const levelButtonsContainer = document.getElementById('level-buttons');
    const gameContentContainer = document.getElementById('game-content');
    const backButton = document.getElementById('back-to-menu');
    const statsContainer = document.getElementById('stats-container');

    if (levelButtonsContainer) {
        levelButtonsContainer.style.display = 'flex';
    }

    if (gameContentContainer) {
        gameContentContainer.style.display = 'none';
    }

    if (backButton) {
        backButton.style.display = 'none';
    }

    if (statsContainer) {
        statsContainer.style.display = 'none';
    }

    currentStep = 0;

    userStatistics.level = Math.max(userStatistics.level, currentLevel);
    userStatistics.level = Math.min(Object.keys(levelsConfig).length, userStatistics.level + (levelPassed ? 1 : 0));
    const statisticsMap = JSON.parse(localStorage.getItem('statistics')) || {};
    statisticsMap[currentUsername] = userStatistics;
    localStorage.setItem('statistics', JSON.stringify(statisticsMap));

    clearGameElements();
}

function showStats() {
    const mainContentContainer = document.getElementById('main-content');
    const levelButtonsContainer = document.getElementById('level-buttons');
    const statsContainer = document.getElementById('stats-container');

    mainContentContainer.style.display = 'none';
    levelButtonsContainer.style.display = 'none';

    statsContainer.style.display = 'flex';

    loadPlayerStats();
}

function loadPlayerStats() {
    const statsTableBody = document.getElementById('stats-body');
    statsTableBody.innerHTML = '';

    const statisticsMap = JSON.parse(localStorage.getItem('statistics')) || {};

    const playerStatsArray = Object.keys(statisticsMap).map(playerName => ({
        name: playerName,
        points: statisticsMap[playerName].points || 0,
        level: statisticsMap[playerName].level || 1
    }));

    playerStatsArray.sort((a, b) => {
        if (b.points !== a.points) {
            return b.points - a.points;
        }
        if (b.level !== a.level) {
            return b.level - a.level;
        }
        return a.name.localeCompare(b.name);
    });

    playerStatsArray.forEach(playerStats => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${playerStats.name}</td>
            <td>${playerStats.points}</td>
            <td>${playerStats.level}</td>
        `;
        statsTableBody.appendChild(row);
    });
}

function updateTimer() {
    currentTimer--;

    if (currentTimer <= 0) {
        clearInterval(timerInterval);
        alert('А уже все... Время вышло!');
        backToMenu();
    }

    updateTimerDisplay();
}

function disableClicking() {
    const gameCells = document.querySelectorAll('.game-cell');
    gameCells.forEach((cell) => {
        cell.style.pointerEvents = 'none';
    });
}

function updateTimerDisplay() {
    const timerElement = document.getElementById('timer');
    timerElement.textContent = currentTimer;
}

function updateAttemptsDisplay() {
    const attemptsElement = document.getElementById('attempts');
    attemptsElement.textContent = currentAttempts;
}

function updatePoints(points) {
    const pointsContainer = document.getElementById('points-container');
    pointsContainer.textContent = `Баллы: ${points}`;
}

function clearGameElements() {
    const targetSquareContainer = document.getElementById('square-container');
    const gameContainer = document.getElementById('game-container');
    targetSquareContainer.innerHTML = '';
    gameContainer.innerHTML = '';
}

function updateLevelButtonStatus() {
    const levelButtonsContainer = document.getElementById('level-buttons');
    const levelButtons = levelButtonsContainer.querySelectorAll('button');

    levelButtons.forEach((levelButton, index) => {
        if (levelButton.id !== 'showStatsButton') {
            const levelNumber = index + 1;
            const isLevelEnabled = userStatistics && userStatistics.level >= levelNumber || levelNumber === 1;
            levelButton.disabled = !isLevelEnabled;

            if (!isLevelEnabled) {
                levelButton.classList.add('disabled-button');
            } else {
                levelButton.classList.remove('disabled-button');
            }
        }
    });
}

function getRandomSquares(squares, count) {
    const shuffledSquares = squares.slice().sort(() => Math.random() - Math.random());
    return shuffledSquares.slice(0, count);
}

function applyEffect(square, effects) {
    const appliedEffects = square.classList;

    effects = effects.sort(() => Math.random() - Math.random());
    effects.forEach((effect) => {
        const effectUpperCase = effect.toUpperCase();

        if (appliedEffects.length == 1) {
            switch (effectUpperCase) {
                case 'ROTATE':
                    const randomRotation = Math.floor(Math.random() * 360);
                    square.style.transform = `rotate(${randomRotation}deg)`;
                    break;
                default:
                    square.classList.add(Effects[effectUpperCase]);
            }
        }
    });
}

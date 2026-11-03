// ============================================================
// MONSTER TRUCK STUNT RACING
// COMPLETE GA.js
// ============================================================


// ============================================================
// CANVAS
// ============================================================

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");


// ============================================================
// MENU ELEMENTS
// ============================================================

const mainMenu = document.getElementById("mainMenu");
const carMenu = document.getElementById("carMenu");

const startButton = document.getElementById("startButton");
const raceButton = document.getElementById("raceButton");

const menuButton = document.getElementById("menuButton");

const gameHUD = document.getElementById("gameHUD");

const scoreText = document.getElementById("score");
const highScoreText = document.getElementById("highScore");
const trickScoreText = document.getElementById("trickScore");

const overlay = document.getElementById("overlay");
const overlayText = document.getElementById("overlayText");


// ============================================================
// SOUND SYSTEM
// ============================================================

// Your four sound files

const engineSound =
    new Audio("Source/engine.mp3");

const trickSound =
    new Audio("Source/trick.mp3");

const musicSound =
    new Audio("Source/music.mp3");

const gameOverSound =
    new Audio("Source/gameover.mp3");


// ============================================================
// SOUND SETTINGS
// ============================================================

engineSound.loop = true;
musicSound.loop = true;

engineSound.volume = 0.60;
trickSound.volume = 0.75;
musicSound.volume = 0.70;
gameOverSound.volume = 0.68;


// ============================================================
// SOUND DEBUGGING
// ============================================================

engineSound.addEventListener(
    "error",
    function () {
        console.error(
            "ENGINE SOUND ERROR:",
            engineSound.src
        );
    }
);

trickSound.addEventListener(
    "error",
    function () {
        console.error(
            "TRICK SOUND ERROR:",
            trickSound.src
        );
    }
);

musicSound.addEventListener(
    "error",
    function () {
        console.error(
            "MUSIC SOUND ERROR:",
            musicSound.src
        );
    }
);

gameOverSound.addEventListener(
    "error",
    function () {
        console.error(
            "GAME OVER SOUND ERROR:",
            gameOverSound.src
        );
    }
);


// ============================================================
// SOUND FUNCTIONS
// ============================================================

function playMusic() {

    musicSound.play()
        .then(function () {

            console.log("Music playing");

        })
        .catch(function (error) {

            console.log(
                "Music waiting for user interaction."
            );

        });

}


function stopMusic() {

    musicSound.pause();

    musicSound.currentTime = 0;

}


function startEngine() {

    engineSound.play()
        .then(function () {

            console.log("Engine playing");

        })
        .catch(function () {

            console.log(
                "Engine waiting for user interaction."
            );

        });

}


function stopEngine() {

    engineSound.pause();

    engineSound.currentTime = 0;

}


function playTrickSound() {

    trickSound.currentTime = 0;

    trickSound.play()
        .then(function () {

            console.log("Trick sound playing");

        })
        .catch(function () {

            console.log(
                "Trick sound could not play."
            );

        });

}


function playGameOverSound() {

    gameOverSound.currentTime = 0;

    gameOverSound.play()
        .then(function () {

            console.log(
                "Game over sound playing"
            );

        })
        .catch(function () {

            console.log(
                "Game over sound could not play."
            );

        });

}


// ============================================================
// CAR SELECTION
// ============================================================

let selectedCar = "red";

const carCards =
    document.querySelectorAll(".car-card");


carCards.forEach(function (card) {

    card.addEventListener(
        "click",
        function () {

            selectedCar =
                this.dataset.car;

            carCards.forEach(
                function (otherCard) {

                    otherCard.classList.remove(
                        "selected"
                    );

                }
            );

            this.classList.add(
                "selected"
            );

        }
    );

});


// ============================================================
// CAR DATA
// ============================================================

const cars = {

    red: {

        name: "FIRE BEAST",

        color: "#c8102e",

        secondary: "#d4af37",

        speed: 6,

        jump: -19

    },

    blue: {

        name: "THUNDER",

        color: "#277da1",

        secondary: "#90e0ef",

        speed: 7,

        jump: -20

    },

    green: {

        name: "JUNGLE KING",

        color: "#2a9d8f",

        secondary: "#a7c957",

        speed: 5.5,

        jump: -21

    }

};


// ============================================================
// START BUTTON
// ============================================================

if (startButton) {

    startButton.addEventListener(
        "click",
        function () {

            mainMenu.classList.add(
                "hidden"
            );

            carMenu.classList.remove(
                "hidden"
            );

            // Start music after user click
            playMusic();

        }
    );

}


// ============================================================
// RACE BUTTON
// ============================================================

if (raceButton) {

    raceButton.addEventListener(
        "click",
        function () {

            carMenu.classList.add(
                "hidden"
            );

            if (gameHUD) {

                gameHUD.classList.remove(
                    "hidden"
                );

            }

            startGame();

        }
    );

}


// ============================================================
// MENU BUTTON
// ============================================================

if (menuButton) {

    menuButton.addEventListener(
        "click",
        function () {

            // Stop the game
            gameRunning = false;
            gameOver = false;

            // Stop all game audio
            stopEngine();
            stopMusic();

            // Hide game over overlay
            if (overlay) {
                overlay.classList.add(
                    "hidden"
                );
            }

            // Hide game HUD
            if (gameHUD) {
                gameHUD.classList.add(
                    "hidden"
                );
            }

            // Hide truck selection menu
            if (carMenu) {
                carMenu.classList.add(
                    "hidden"
                );
            }

            // Show main menu
            mainMenu.classList.remove(
                "hidden"
            );

        }
    );

}

// ============================================================
// IMAGES
// ============================================================

const coolImg = new Image();

coolImg.src = "assets/Cool.jpg";


const hotImg = new Image();

hotImg.src = "assets/Hot.jpg";


// ============================================================
// CANVAS SIZE
// ============================================================

let groundY = 160;


function resizeCanvas() {

    canvas.width =
        window.innerWidth;

    canvas.height =
        window.innerHeight;

    groundY =
        Math.floor(
            canvas.height * 0.75
        );

    if (!truck.jumping) {

        truck.y =
            groundY -
            truck.height;

    }

}


window.addEventListener(
    "resize",
    resizeCanvas
);


// ============================================================
// TRUCK
// ============================================================

const truck = {

    x: 70,

    y: 0,

    width: 90,

    height: 65,

    velocityY: 0,

    jumping: false,

    rotation: 0,

    wheelRotation: 0,

    suspension: 0

};


// ============================================================
// PHYSICS
// ============================================================

const GRAVITY = 0.9;


// ============================================================
// GAME VARIABLES
// ============================================================

let gameRunning = false;

let gameOver = false;

let frame = 0;

let score = 0;

let trickScore = 0;

let speed = 6;

let obstacles = [];

let groundOffset = 0;


// ============================================================
// HIGH SCORE
// ============================================================

let highScore = 0;

try {

    highScore =
        Number(
            localStorage.getItem(
                "monsterTruckHighScore"
            )
        ) || 0;

} catch (error) {

    highScore = 0;

}


if (highScoreText) {

    highScoreText.textContent =
        highScore;

}


// ============================================================
// TRICK VARIABLES
// ============================================================

let trickActive = false;

let trickDirection = 0;

let trickProgress = 0;

let trickMessage = "";

let trickMessageTimer = 0;


// ============================================================
// CLOUDS
// ============================================================

let clouds = [

    {
        x: 100,
        y: 100,
        r: 18
    },

    {
        x: 300,
        y: 160,
        r: 14
    },

    {
        x: 500,
        y: 80,
        r: 20
    },

    {
        x: 750,
        y: 130,
        r: 16
    },

    {
        x: 1000,
        y: 90,
        r: 18
    }

];


// ============================================================
// RESET GAME
// ============================================================

function resetGame() {

    const car =
        cars[selectedCar];

    speed =
        car.speed;

    frame = 0;

    score = 0;

    trickScore = 0;

    obstacles = [];

    groundOffset = 0;

    truck.x = 70;

    truck.y =
        groundY -
        truck.height;

    truck.velocityY = 0;

    truck.jumping = false;

    truck.rotation = 0;

    truck.wheelRotation = 0;

    truck.suspension = 0;

    trickActive = false;

    trickDirection = 0;

    trickProgress = 0;

    trickMessage = "";

    trickMessageTimer = 0;


    if (scoreText) {

        scoreText.textContent =
            "0";

    }


    if (trickScoreText) {

        trickScoreText.textContent =
            "0";

    }

}


// ============================================================
// START GAME
// ============================================================

function startGame() {

    resetGame();

    gameRunning = true;

    gameOver = false;

    if (overlay) {

        overlay.classList.add(
            "hidden"
        );

    }

    // Start engine
    startEngine();

    requestAnimationFrame(
        gameLoop
    );

}


// ============================================================
// JUMP
// ============================================================

function jump() {

    if (!gameRunning) {
        return;
    }

    if (gameOver) {
        return;
    }

    if (!truck.jumping) {

        const car =
            cars[selectedCar];

        // Higher jump

        truck.velocityY =
            car.jump;

        truck.jumping = true;

        truck.rotation = 0;

        trickProgress = 0;

    }

}


// ============================================================
// PERFORM TRICK
// ============================================================

function performTrick(direction) {

    if (!gameRunning) {
        return;
    }

    if (gameOver) {
        return;
    }

    if (!truck.jumping) {
        return;
    }

    if (trickActive) {
        return;
    }


    trickActive = true;

    trickDirection =
        direction;

    trickProgress = 0;

}


// ============================================================
// UPDATE TRICK
// ============================================================

function updateTrick() {

    if (!trickActive) {

        return;

    }


    // Visible flip speed

    const rotationSpeed =
        0.22;


    trickProgress +=
        rotationSpeed;


    truck.rotation =
        trickDirection *
        trickProgress;


    // Complete 360 degrees

    if (
        trickProgress >=
        Math.PI * 2
    ) {

        truck.rotation =
            trickDirection *
            Math.PI * 2;

        trickActive = false;


        // Points

        const bonus = 500;

        score += bonus;

        trickScore += bonus;


        // Message

        if (
            trickDirection === 1
        ) {

            trickMessage =
                "FRONT FLIP! +500";

        } else {

            trickMessage =
                "BACKFLIP! +500";

        }


        trickMessageTimer = 100;


        // Sound

        playTrickSound();


        // HUD

        if (scoreText) {

            scoreText.textContent =
                score;

        }

        if (trickScoreText) {

            trickScoreText.textContent =
                trickScore;

        }

    }

}


// ============================================================
// LANDING
// ============================================================

function handleLanding() {

    if (trickActive) {

        trickMessage =
            "TRICK FAILED!";

        trickMessageTimer =
            60;

        trickActive = false;

        trickProgress = 0;

    }


    truck.jumping = false;

    truck.rotation = 0;

}


// ============================================================
// GAME OVER
// ============================================================

function endGame() {

    if (gameOver) {
        return;
    }

    gameRunning = false;

    gameOver = true;


    // Stop engine

    stopEngine();


    // Game over sound

    playGameOverSound();


    // High score

    if (
        score >
        highScore
    ) {

        highScore =
            score;

        if (highScoreText) {

            highScoreText.textContent =
                highScore;

        }

        try {

            localStorage.setItem(
                "monsterTruckHighScore",
                highScore
            );

        } catch (error) {

            // Ignore

        }

    }


    // Game over screen

    if (overlayText) {

        overlayText.textContent =
            "CRASH! SCORE: " +
            score;

    }


    if (overlay) {

        overlay.classList.remove(
            "hidden"
        );

    }

}


// ============================================================
// SPAWN OBSTACLE
// ============================================================

function spawnObstacle() {

    // Taller obstacles

    const height =
        55 +
        Math.random() * 35;


    const width =
        25 +
        Math.random() * 15;


    obstacles.push({

        x:
            canvas.width + 50,

        y:
            groundY -
            height,

        width:
            width,

        height:
            height

    });

}


// ============================================================
// UPDATE GAME
// ============================================================

function update() {

    frame++;


    // ========================================================
    // TRICKS
    // ========================================================

    updateTrick();


    // ========================================================
    // GROUND
    // ========================================================

    groundOffset -=
        speed;


    if (
        groundOffset <
        -40
    ) {

        groundOffset +=
            40;

    }


    // ========================================================
    // CLOUDS
    // ========================================================

    clouds.forEach(
        function (cloud) {

            cloud.x -=
                speed * 0.2;


            if (
                cloud.x <
                -50
            ) {

                cloud.x =
                    canvas.width + 50;

                cloud.y =
                    50 +
                    Math.random() *
                    150;

            }

        }
    );


    // ========================================================
    // TRUCK PHYSICS
    // ========================================================

    truck.velocityY +=
        GRAVITY;

    truck.y +=
        truck.velocityY;


    truck.wheelRotation +=
        speed * 0.08;


    // ========================================================
    // SUSPENSION
    // ========================================================

    if (truck.jumping) {

        truck.suspension = 0;

    } else {

        truck.suspension =
            Math.sin(
                frame * 0.25
            ) * 2;

    }


    // ========================================================
    // LANDING
    // ========================================================

    if (
        truck.y >=
        groundY -
        truck.height
    ) {

        truck.y =
            groundY -
            truck.height;

        truck.velocityY =
            0;

        handleLanding();

    }


    // ========================================================
    // OBSTACLE SPAWNING
    // ========================================================

    const spawnRate =
        Math.max(
            55,
            105 -
            Math.floor(
                speed * 5
            )
        );


    if (
        frame %
        spawnRate ===
        0
    ) {

        spawnObstacle();

    }


    // ========================================================
    // MOVE OBSTACLES
    // ========================================================

    obstacles.forEach(
        function (obstacle) {

            obstacle.x -=
                speed;

        }
    );


    // ========================================================
    // REMOVE OLD OBSTACLES
    // ========================================================

    obstacles =
        obstacles.filter(
            function (obstacle) {

                return (
                    obstacle.x +
                    obstacle.width >
                    -20
                );

            }
        );


    // ========================================================
    // COLLISION
    // ========================================================

    const hitbox = {

        x:
            truck.x + 12,

        y:
            truck.y + 10,

        width:
            truck.width - 24,

        height:
            truck.height - 15

    };


    for (
        const obstacle of
        obstacles
    ) {

        if (

            hitbox.x <
            obstacle.x +
            obstacle.width

            &&

            hitbox.x +
            hitbox.width >
            obstacle.x

            &&

            hitbox.y <
            obstacle.y +
            obstacle.height

            &&

            hitbox.y +
            hitbox.height >
            obstacle.y

        ) {

            endGame();

            return;

        }

    }


    // ========================================================
    // SCORE
    // ========================================================

    score++;


    if (scoreText) {

        scoreText.textContent =
            score;

    }


    // ========================================================
    // DIFFICULTY
    // ========================================================

    if (
        score > 0 &&
        score % 250 === 0
    ) {

        speed +=
            0.5;

    }


    // ========================================================
    // TRICK MESSAGE
    // ========================================================

    if (
        trickMessageTimer > 0
    ) {

        trickMessageTimer--;

    }

}


// ============================================================
// DRAW BACKGROUND
// ============================================================

function drawBackground() {

    ctx.clearRect(
        0,
        0,
        canvas.width,
        canvas.height
    );


    const gradient =
        ctx.createLinearGradient(
            0,
            0,
            0,
            groundY
        );


    gradient.addColorStop(
        0,
        "#182848"
    );


    gradient.addColorStop(
        1,
        "#4b6cb7"
    );


    ctx.fillStyle =
        gradient;


    ctx.fillRect(
        0,
        0,
        canvas.width,
        groundY
    );


    // Cool image

    if (
        coolImg.complete &&
        coolImg.naturalWidth > 0
    ) {

        ctx.globalAlpha =
            0.35;

        ctx.drawImage(
            coolImg,
            0,
            0,
            canvas.width,
            groundY
        );

        ctx.globalAlpha =
            1;

    }

}


// ============================================================
// DRAW CLOUDS
// ============================================================

function drawClouds() {

    ctx.fillStyle =
        "rgba(255,255,255,0.35)";


    clouds.forEach(
        function (cloud) {

            ctx.beginPath();

            ctx.arc(
                cloud.x,
                cloud.y,
                cloud.r,
                0,
                Math.PI * 2
            );

            ctx.arc(
                cloud.x +
                cloud.r * 0.8,
                cloud.y + 4,
                cloud.r * 0.7,
                0,
                Math.PI * 2
            );

            ctx.arc(
                cloud.x -
                cloud.r * 0.8,
                cloud.y + 4,
                cloud.r * 0.6,
                0,
                Math.PI * 2
            );

            ctx.fill();

        }
    );

}


// ============================================================
// DRAW GROUND
// ============================================================

function drawGround() {

    ctx.fillStyle =
        "#202020";


    ctx.fillRect(
        0,
        groundY,
        canvas.width,
        canvas.height -
        groundY
    );


    ctx.strokeStyle =
        "#ffffff";

    ctx.lineWidth = 3;


    ctx.beginPath();

    ctx.moveTo(
        0,
        groundY
    );

    ctx.lineTo(
        canvas.width,
        groundY
    );

    ctx.stroke();


    // Moving ground marks

    ctx.strokeStyle =
        "#555";

    ctx.lineWidth = 2;


    for (
        let x =
            groundOffset;

        x <
        canvas.width;

        x += 40
    ) {

        ctx.beginPath();

        ctx.moveTo(
            x,
            groundY + 10
        );

        ctx.lineTo(
            x + 20,
            groundY + 10
        );

        ctx.stroke();

    }

}


// ============================================================
// DRAW WHEEL
// ============================================================

function drawWheel(
    x,
    y,
    radius
) {

    ctx.save();

    ctx.translate(
        x,
        y
    );

    ctx.rotate(
        truck.wheelRotation
    );


    // Tire

    ctx.fillStyle =
        "#111";

    ctx.beginPath();

    ctx.arc(
        0,
        0,
        radius,
        0,
        Math.PI * 2
    );

    ctx.fill();


    // Rim

    ctx.fillStyle =
        "#888";

    ctx.beginPath();

    ctx.arc(
        0,
        0,
        radius * 0.55,
        0,
        Math.PI * 2
    );

    ctx.fill();


    // Spokes

    ctx.strokeStyle =
        "#222";

    ctx.lineWidth = 2;


    for (
        let i = 0;
        i < 8;
        i++
    ) {

        const angle =
            i *
            Math.PI /
            4;

        ctx.beginPath();

        ctx.moveTo(
            0,
            0
        );

        ctx.lineTo(
            Math.cos(angle) *
            radius *
            0.5,

            Math.sin(angle) *
            radius *
            0.5
        );

        ctx.stroke();

    }


    // Hub

    ctx.fillStyle =
        "#ddd";

    ctx.beginPath();

    ctx.arc(
        0,
        0,
        radius * 0.18,
        0,
        Math.PI * 2
    );

    ctx.fill();


    ctx.restore();

}


// ============================================================
// DRAW MONSTER TRUCK
// ============================================================

function drawMonsterTruck() {

    const car =
        cars[selectedCar];


    const x =
        truck.x;

    const y =
        truck.y +
        truck.suspension;

    const w =
        truck.width;

    const h =
        truck.height;


    // Shadow

    ctx.save();

    ctx.globalAlpha =
        truck.jumping
            ? 0.15
            : 0.4;

    ctx.fillStyle =
        "#000";

    ctx.beginPath();

    ctx.ellipse(
        x + w / 2,
        groundY + 5,
        45,
        8,
        0,
        0,
        Math.PI * 2
    );

    ctx.fill();

    ctx.restore();


    // Rotate truck

    ctx.save();

    ctx.translate(
        x + w / 2,
        y + h / 2
    );

    ctx.rotate(
        truck.rotation
    );

    ctx.translate(
        -(x + w / 2),
        -(y + h / 2)
    );


    // Suspension

    ctx.strokeStyle =
        "#222";

    ctx.lineWidth = 5;

    ctx.beginPath();

    ctx.moveTo(
        x + 20,
        y + 42
    );

    ctx.lineTo(
        x + 22,
        y + 53
    );

    ctx.moveTo(
        x + 67,
        y + 42
    );

    ctx.lineTo(
        x + 64,
        y + 53
    );

    ctx.stroke();


    // Wheels

    drawWheel(
        x + 20,
        y + 54,
        16
    );

    drawWheel(
        x + 68,
        y + 54,
        16
    );


    // Body

    ctx.fillStyle =
        car.color;

    ctx.strokeStyle =
        "#111";

    ctx.lineWidth = 4;

    ctx.beginPath();

    ctx.moveTo(
        x + 5,
        y + 27
    );

    ctx.lineTo(
        x + 13,
        y + 12
    );

    ctx.lineTo(
        x + 52,
        y + 10
    );

    ctx.lineTo(
        x + 76,
        y + 27
    );

    ctx.lineTo(
        x + 78,
        y + 44
    );

    ctx.lineTo(
        x + 5,
        y + 44
    );

    ctx.closePath();

    ctx.fill();

    ctx.stroke();


    // Cabin

    ctx.fillStyle =
        "#191919";

    ctx.beginPath();

    ctx.moveTo(
        x + 38,
        y + 12
    );

    ctx.lineTo(
        x + 53,
        y + 12
    );

    ctx.lineTo(
        x + 68,
        y + 26
    );

    ctx.lineTo(
        x + 38,
        y + 26
    );

    ctx.closePath();

    ctx.fill();


    // Window

    ctx.strokeStyle =
        "#aaa";

    ctx.lineWidth = 2;

    ctx.beginPath();

    ctx.moveTo(
        x + 42,
        y + 15
    );

    ctx.lineTo(
        x + 52,
        y + 15
    );

    ctx.lineTo(
        x + 62,
        y + 23
    );

    ctx.lineTo(
        x + 42,
        y + 23
    );

    ctx.closePath();

    ctx.stroke();


    // Side stripe

    ctx.fillStyle =
        car.secondary;

    ctx.beginPath();

    ctx.moveTo(
        x + 8,
        y + 30
    );

    ctx.lineTo(
        x + 43,
        y + 26
    );

    ctx.lineTo(
        x + 70,
        y + 32
    );

    ctx.lineTo(
        x + 8,
        y + 39
    );

    ctx.closePath();

    ctx.fill();


    // Door

    ctx.strokeStyle =
        "#222";

    ctx.lineWidth = 2;

    ctx.beginPath();

    ctx.moveTo(
        x + 40,
        y + 26
    );

    ctx.lineTo(
        x + 40,
        y + 43
    );

    ctx.stroke();


    // Door handle

    ctx.fillStyle =
        "#111";

    ctx.fillRect(
        x + 29,
        y + 30,
        7,
        2
    );


    // Headlight

    ctx.fillStyle =
        "#fff2a8";

    ctx.beginPath();

    ctx.arc(
        x + 73,
        y + 28,
        4,
        0,
        Math.PI * 2
    );

    ctx.fill();


    // Bumper

    ctx.fillStyle =
        "#888";

    ctx.fillRect(
        x + 69,
        y + 41,
        12,
        5
    );


    // Roof lights

    ctx.fillStyle =
        "#d4af37";

    ctx.beginPath();

    ctx.arc(
        x + 18,
        y + 10,
        3,
        0,
        Math.PI * 2
    );

    ctx.arc(
        x + 27,
        y + 9,
        3,
        0,
        Math.PI * 2
    );

    ctx.arc(
        x + 36,
        y + 9,
        3,
        0,
        Math.PI * 2
    );

    ctx.fill();


    // Exhaust

    ctx.strokeStyle =
        "#555";

    ctx.lineWidth = 4;

    ctx.beginPath();

    ctx.moveTo(
        x + 11,
        y + 16
    );

    ctx.lineTo(
        x + 8,
        y + 5
    );

    ctx.stroke();


    // Smoke

    if (
        !truck.jumping &&
        frame % 8 < 4
    ) {

        ctx.fillStyle =
            "rgba(255,255,255,0.3)";

        ctx.beginPath();

        ctx.arc(
            x + 6,
            y + 4,
            4,
            0,
            Math.PI * 2
        );

        ctx.arc(
            x,
            y - 2,
            3,
            0,
            Math.PI * 2
        );

        ctx.fill();

    }


    ctx.restore();

}


// ============================================================
// DRAW OBSTACLES
// ============================================================

function drawObstacles() {

    obstacles.forEach(
        function (obstacle) {

            ctx.fillStyle =
                "#c8102e";

            ctx.fillRect(
                obstacle.x,
                obstacle.y,
                obstacle.width,
                obstacle.height
            );


            ctx.fillStyle =
                "#ff8585";

            ctx.fillRect(
                obstacle.x + 3,
                obstacle.y + 3,
                4,
                obstacle.height - 6
            );


            // Warning stripes

            ctx.strokeStyle =
                "#d4af37";

            ctx.lineWidth = 3;


            for (
                let y =
                    obstacle.y + 8;

                y <
                obstacle.y +
                obstacle.height;

                y += 12
            ) {

                ctx.beginPath();

                ctx.moveTo(
                    obstacle.x,
                    y
                );

                ctx.lineTo(
                    obstacle.x +
                    obstacle.width,
                    y - 6
                );

                ctx.stroke();

            }

        }
    );

}


// ============================================================
// DRAW TRICK MESSAGE
// ============================================================

function drawTrickMessage() {

    if (
        trickMessageTimer <= 0
    ) {

        return;

    }


    const alpha =
        Math.min(
            1,
            trickMessageTimer / 25
        );


    ctx.save();

    ctx.globalAlpha =
        alpha;

    ctx.textAlign =
        "center";

    ctx.font =
        "bold 34px Courier New";

    ctx.lineWidth = 6;

    ctx.strokeStyle =
        "#111";

    ctx.fillStyle =
        "#d4af37";


    ctx.strokeText(
        trickMessage,
        canvas.width / 2,
        canvas.height * 0.3
    );


    ctx.fillText(
        trickMessage,
        canvas.width / 2,
        canvas.height * 0.3
    );


    ctx.restore();

}


// ============================================================
// DRAW GAME
// ============================================================

function draw() {

    drawBackground();

    drawClouds();

    drawGround();

    drawObstacles();

    drawMonsterTruck();

    drawTrickMessage();

}


// ============================================================
// GAME LOOP
// ============================================================

function gameLoop() {

    if (!gameRunning) {

        return;

    }


    update();

    draw();


    if (gameRunning) {

        requestAnimationFrame(
            gameLoop
        );

    }

}


// ============================================================
// KEYBOARD CONTROLS
// ============================================================

document.addEventListener(
    "keydown",
    function (event) {

        // Jump

        if (
            event.code === "Space" ||
            event.code === "ArrowUp"
        ) {

            event.preventDefault();

            jump();

        }


        // Backflip

        if (
            event.code === "ArrowLeft"
        ) {

            event.preventDefault();

            performTrick(-1);

        }


        // Front flip

        if (
            event.code === "ArrowRight"
        ) {

            event.preventDefault();

            performTrick(1);

        }

    }
);


// ============================================================
// MOUSE
// ============================================================

canvas.addEventListener(
    "mousedown",
    function () {

        jump();

    }
);


// ============================================================
// TOUCH
// ============================================================

canvas.addEventListener(
    "touchstart",
    function (event) {

        event.preventDefault();

        jump();

    },
    {
        passive: false
    }
);


// ============================================================
// INITIALIZE
// ============================================================

resizeCanvas();

draw();


// ============================================================
// PRELOAD SOUNDS
// ============================================================

engineSound.load();
trickSound.load();
musicSound.load();
gameOverSound.load();

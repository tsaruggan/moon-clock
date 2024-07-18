import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { format, addMinutes } from 'date-fns';

// Constants & Global Variables

// Three.js components
let scene;
let camera;
let renderer;
let geometry;
let material;
let directionalLight;
let controls;
let moon;

let fileLoader = new THREE.FileLoader();
let textureLoader = new THREE.TextureLoader();

const TEXTURE_MAP_PATH = '../maps/texture_map.png';
const NORMAL_MAP_PATH = '../maps/normal_map.png';
const VERTEX_SHADER_PATH = '../shaders/vertex_shader.glsl';
const FRAGMENT_SHADER_PATH = '../shaders/fragment_shader.glsl';

const INITIAL_SCALE_FACTOR = 0.0075;
const INITIAL_X_ROTATION = 0;
const INITIAL_Y_ROTATION = 0;
const INITIAL_Z_ROTATION = 0;

// Datetime + Phase stuff
let currentDate;
let initialLibration;
let timeTravelIntervalId;
const TIME_TRAVEL_SPEED = 1; // ms
const TIME_TRAVEL_INCREMENT = 10; // mins
const TIME_TRAVEL_STEP = 60; // mins
const LIBRATION_EFFECT = 3;
const PHASE_LIGHT_SCALE = 10;


// Setup & Initialization

function init(assets) {
    // Scene setup
    scene = new THREE.Scene();

    // Camera setup
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(5, 0, 0);
    camera.lookAt(0, 0, 0);

    // Renderer setup
    renderer = new THREE.WebGLRenderer({
        antialias: true,
        preserveDrawingBuffer: true
    });
    renderer.setClearColor(0x000000, 1);
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // Light setup
    directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);

    // Geometry setup
    geometry = new THREE.SphereGeometry(2, 64, 64);

    // Material setup
    material = new THREE.ShaderMaterial({
        glslVersion: THREE.GLSL3,
        uniforms: {
            textureMap: { value: assets.textureMap, type: 't' },
            normalMap: { value: assets.normalMap, type: 't' },
            lightPosition: { value: directionalLight.position, type: 'v3' },
            uvScale: { type: 'v2', value: new THREE.Vector2(1.0, 1.0)}
        },
        vertexShader: assets.vertexShader,
        fragmentShader: assets.fragmentShader
    });

    // Mesh setup
    moon = new THREE.Mesh(geometry, material);
    moon.geometry.computeTangents();
    moon.position.set(0, 0, 0);
    moon.rotation.x = INITIAL_X_ROTATION;
    moon.rotation.y = INITIAL_Y_ROTATION;
    moon.rotation.z = INITIAL_Z_ROTATION;
    scene.add(moon);

    // Orbit controls setup
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    // Datetime + Phase setup
    currentDate = new Date();
    document.getElementById('dateTimePicker').value = format(currentDate, "yyyy-MM-dd'T'HH:mm");
    initialLibration = calculateMoonLibration(currentDate);
    moon.scale.setScalar(initialLibration.apparentSize / INITIAL_SCALE_FACTOR);
    updateScene();

    // Event listener setup

    // Datetime picker event listener
    document.getElementById('dateTimePicker').addEventListener('input', (event) => {
        const dateTime = new Date(event.target.value);
        if (!isNaN(dateTime)) {
            currentDate = dateTime;
            updateScene();
        }
        disableResetButton(false);
    });

    // Orbit Controls event listener
    controls.addEventListener('start', () => {
        disableResetButton(false);
    });

    // Left button event listeners
    document.getElementById('leftButton').addEventListener('mousedown', () => {
        adjustDateTime(-TIME_TRAVEL_STEP);
        timeTravelIntervalId = setInterval(() => adjustDateTime(-TIME_TRAVEL_INCREMENT), TIME_TRAVEL_SPEED);
    });

    document.getElementById('leftButton').addEventListener('mouseup', () => {
        clearInterval(timeTravelIntervalId);
    });

    document.getElementById('leftButton').addEventListener('mouseleave', () => {
        clearInterval(timeTravelIntervalId);
    });

    // Right button event listeners
    document.getElementById('rightButton').addEventListener('mousedown', () => {
        adjustDateTime(TIME_TRAVEL_STEP);
        timeTravelIntervalId = setInterval(() => adjustDateTime(TIME_TRAVEL_INCREMENT), TIME_TRAVEL_SPEED);
    });

    document.getElementById('rightButton').addEventListener('mouseup', () => {
        clearInterval(timeTravelIntervalId);
    });

    document.getElementById('rightButton').addEventListener('mouseleave', () => {
        clearInterval(timeTravelIntervalId);
    });

    // GitHub button event listener
    document.getElementById('githubButton').addEventListener('click', () => {
        window.open('https://github.com/tsaruggan/moon-clock', '_blank');
    });

    // Reset button event listener
    document.getElementById('resetButton').addEventListener('click', () => {
        currentDate = new Date();
        document.getElementById('dateTimePicker').value = format(currentDate, "yyyy-MM-dd'T'HH:mm");
        disableResetButton(true)
        moon.position.set(0, 0, 0);
        controls.reset();
        updateScene();
    });
}

// Animation loop

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}

// Helper functions

// Calculate moon phase angle using datetime
function getMoonPhaseAngle(datetime) {
    const year = datetime.getUTCFullYear();
    const month = datetime.getUTCMonth() + 1; // months are 0-indexed
    const day = datetime.getUTCDate() + (datetime.getUTCHours() / 24) + (datetime.getUTCMinutes() / 1440); // Include hours and minutes for smoothness

    // Convert the date to Julian Days
    const jd = (367 * year) - Math.floor((7 * (year + Math.floor((month + 9) / 12))) / 4) + Math.floor((275 * month) / 9) + day + 1721013.5;

    // Calculate the number of days since the known new moon
    const knownNewMoonJD = 2451550.1; // Julian Day of a known new moon
    const daysSinceKnownNewMoon = jd - knownNewMoonJD;

    // Calculate the number of new moons since the known new moon
    const lunations = daysSinceKnownNewMoon / 29.53058867;

    // Calculate the moon phase angle
    const moonPhaseAngle = (lunations - Math.floor(lunations)) * 2 * Math.PI;

    return moonPhaseAngle;
}

// Update the moon phase lighting
function updateMoonPhase(datetime) {
    const moonPhaseAngle = getMoonPhaseAngle(datetime);

    // Calculate the light position based on the moon phase angle
    const lightX = -Math.sin(moonPhaseAngle) * PHASE_LIGHT_SCALE;
    const lightY = 0; // Keep the light on the same plane as the moon for simplicity
    const lightZ = Math.cos(moonPhaseAngle) * PHASE_LIGHT_SCALE;

    // Update lighting
    directionalLight.position.set(lightX, lightY, lightZ);
}

// Calculate the moon's libration and apparent size
function calculateMoonLibration(datetime) {
    const daysSinceJ2000 = (datetime - new Date(Date.UTC(2000, 0, 1, 12, 0, 0))) / (1000 * 60 * 60 * 24);

    // Mean anomaly of the moon (degrees)
    const meanAnomaly = (134.963 + 13.064993 * daysSinceJ2000) % 360;

    // Mean elongation of the moon (degrees)
    const meanElongation = (297.850 + 12.190749 * daysSinceJ2000) % 360;

    // Moon's distance from Earth in Earth radii
    const distance = 60.4 - 3.3 * Math.cos(meanAnomaly * Math.PI / 180) - 0.6 * Math.cos(2 * meanElongation * Math.PI / 180);

    // Apparent size (degrees)
    const apparentSize = 0.5181 * (1 / distance);

    // Libration in longitude (degrees)
    const librationLongitude = 6.289 * Math.sin(meanAnomaly * Math.PI / 180);

    // Libration in latitude (degrees)
    const librationLatitude = 5.128 * Math.sin(meanElongation * Math.PI / 180);

    return { librationLongitude, librationLatitude, apparentSize };
}

// Update the current date by a given number of minutes
function adjustDateTime(minutes) {
    currentDate = addMinutes(currentDate, minutes);
    document.getElementById('dateTimePicker').value = format(currentDate, "yyyy-MM-dd'T'HH:mm");
    disableResetButton(false);
    updateScene();
}

// Enable/disable the reset button
function disableResetButton(disabled) {
    const resetButton = document.getElementById('resetButton');
    resetButton.disabled = disabled;
}

// Update the moon's appeareance using rotation / libration / apparent size / phase based on current date
function updateScene() {
    updateMoonPhase(currentDate);
    moon.rotation.x = INITIAL_X_ROTATION;
    moon.rotation.y = INITIAL_Y_ROTATION;
    moon.rotation.z = INITIAL_Z_ROTATION;

    const { librationLongitude, librationLatitude, apparentSize } = calculateMoonLibration(currentDate);
    moon.rotation.x += -THREE.MathUtils.degToRad(librationLatitude * LIBRATION_EFFECT);
    moon.rotation.y += THREE.MathUtils.degToRad(librationLongitude * LIBRATION_EFFECT);
    moon.scale.setScalar(apparentSize / INITIAL_SCALE_FACTOR);
}

// Load assets
function loadTexture(path) {
    return new Promise((resolve, reject) => {
        textureLoader.load(path, (data) => resolve(data), undefined, reject);
    });
}
function loadShader(path) {
    return new Promise((resolve, reject) => {
        fileLoader.load(path, (data) => resolve(data), undefined, reject);
    });
}

// Main
Promise.all([
    loadTexture(TEXTURE_MAP_PATH),
    loadTexture(NORMAL_MAP_PATH),
    loadShader(VERTEX_SHADER_PATH),
    loadShader(FRAGMENT_SHADER_PATH)
]).then(([textureMap, normalMap, vertexShader, fragmentShader]) => {
    const assets = { textureMap, normalMap, vertexShader, fragmentShader };
    init(assets); // First initialize with loaded textures + shaders
    animate(); // Start animation loop
}).catch(error => {
    console.error('Error loading assets:', error);
});

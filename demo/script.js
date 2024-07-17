import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { format, addHours, addMinutes } from 'date-fns';

// Constants
const INITIAL_SCALE_FACTOR = 0.0075; // Adjust this value to control the initial size
const INITIAL_X_ROTATION = 0; // Adjust this value for the initial X rotation
const INITIAL_Y_ROTATION = 0; // Adjust this value for the initial Y rotation
const INITIAL_Z_ROTATION = 0; // Adjust this value for the initial Z rotation

// Scene setup
const scene = new THREE.Scene();

// Camera setup
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(5, 0, 0); // Position the camera along the X-axis
camera.lookAt(0, 0, 0); // Point the camera at the center of the scene

// Renderer setup
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Sphere geometry and material for the moon
const geometry = new THREE.SphereGeometry(2, 64, 64);
const textureLoader = new THREE.TextureLoader();
const texture = textureLoader.load('../maps/texture_map.png');
const normalMap = textureLoader.load('../maps/normal_map.png');
const displacementMap = textureLoader.load('../maps/displacement_map.png');

const material = new THREE.MeshStandardMaterial({
    map: texture,
    normalMap: normalMap,
    displacementMap: displacementMap,
    displacementScale: 0.025,
    displacementBias: -0.05,
    metalness: 0,
    roughness: 1,
    side: THREE.DoubleSide
});

const moon = new THREE.Mesh(geometry, material);
scene.add(moon);

// Light setup
const ambientLight = new THREE.AmbientLight(0xffffff, 0.05); // Dim ambient light
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5); // Strong directional light
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = 2048;
directionalLight.shadow.mapSize.height = 2048;
scene.add(directionalLight);

// Orbit controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// Micellaneous variables
let intervalId; // used for button longpress
let resetVisibility = false; // used to display reset button

// Function to calculate the moon phase angle
function getMoonPhaseAngle(date) {
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth() + 1; // months are 0-indexed
    const day = date.getUTCDate();

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

// Function to update the moon phase lighting
function updateMoonPhase(date) {
    const moonPhaseAngle = getMoonPhaseAngle(date);

    // Calculate the light position based on the moon phase angle
    const lightX = -Math.sin(moonPhaseAngle) * 10; // Adjust distance as needed
    const lightY = 0; // Keep the light on the same plane as the moon for simplicity
    const lightZ = Math.cos(moonPhaseAngle) * 10; // Adjust distance as needed

    directionalLight.position.set(lightX, lightY, lightZ);
}

// Function to calculate the moon's libration and apparent size
function calculateMoonLibration(date) {
    const daysSinceJ2000 = (date - new Date(Date.UTC(2000, 0, 1, 12, 0, 0))) / (1000 * 60 * 60 * 24);

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

// Get & attach current date
let currentDate = new Date();
document.getElementById('dateTimePicker').value = format(new Date(), "yyyy-MM-dd'T'HH:mm");

// Initial scene update with librartion & apparent size adjustment
const initialLibration = calculateMoonLibration(currentDate);
moon.rotation.x = INITIAL_X_ROTATION;
moon.rotation.y = INITIAL_Y_ROTATION;
moon.rotation.z = INITIAL_Z_ROTATION;
moon.scale.setScalar(initialLibration.apparentSize / INITIAL_SCALE_FACTOR);
updateScene();

// Update the moon's appeareance using rotation / libration / apparent size / phase based on current date
function updateScene() {
    updateMoonPhase(currentDate);

    moon.rotation.x = INITIAL_X_ROTATION;
    moon.rotation.y = INITIAL_Y_ROTATION;
    moon.rotation.z = INITIAL_Z_ROTATION;

    const { librationLongitude, librationLatitude, apparentSize } = calculateMoonLibration(currentDate);
    moon.rotation.x += -THREE.MathUtils.degToRad(librationLatitude * 3);
    moon.rotation.y += THREE.MathUtils.degToRad(librationLongitude * 3);
    moon.scale.setScalar(apparentSize / INITIAL_SCALE_FACTOR);
}

// Event listener for datetime picker input
document.getElementById('dateTimePicker').addEventListener('input', (event) => {
    const dateTime = new Date(event.target.value);
    if (!isNaN(dateTime)) {
        currentDate = dateTime;
        updateScene();
    }

    // Show the reset button
    resetVisibility = true; 
    setResetVisibility();
});

// Function to adjust the datetime by a given number of minutes
function adjustDateTime(minutes) {
    currentDate = addMinutes(currentDate, minutes); // Adjust the date by given minutes

    // Update the datetime picker value with local time
    document.getElementById('dateTimePicker').value = format(currentDate, "yyyy-MM-dd'T'HH:mm");

    // Show the reset button
    resetVisibility = true; 
    setResetVisibility(); 

    updateScene();
}

// Function to enable/disable reset button based on current state
function setResetVisibility() {
    const resetButton = document.getElementById('resetButton');
    resetButton.disabled = !resetVisibility;
}

// Event listener for ThreeJS Orbit Controls
controls.addEventListener('start', () => {
    resetVisibility = true;
    setResetVisibility();
});

// Event listeners for the left button
document.getElementById('leftButton').addEventListener('mousedown', () => {
    adjustDateTime(-60); // Adjust by -1 hour immediately
    intervalId = setInterval(() => adjustDateTime(-2), 1); // Adjust by -10 minute every 100ms
});

document.getElementById('leftButton').addEventListener('mouseup', () => {
    clearInterval(intervalId);
});

document.getElementById('leftButton').addEventListener('mouseleave', () => {
    clearInterval(intervalId);
});

// Event listeners for the right button
document.getElementById('rightButton').addEventListener('mousedown', () => {
    adjustDateTime(60); // Adjust by +1 hour immediately
    intervalId = setInterval(() => adjustDateTime(2), 1); // Adjust by +10 minute every 100ms
});

document.getElementById('rightButton').addEventListener('mouseup', () => {
    clearInterval(intervalId);
});

document.getElementById('rightButton').addEventListener('mouseleave', () => {
    clearInterval(intervalId);
});

// Event listener for GitHub link button
document.getElementById('githubButton').addEventListener('click', function() {
    window.open('https://github.com/tsaruggan/moon-clock', '_blank');
});

// Event listener for reset button
document.getElementById('resetButton').addEventListener('click', (event) => {
    currentDate = new Date(); // Reset datetime to current date and time

    // Update the datetime picker value with local time
    document.getElementById('dateTimePicker').value = format(currentDate, "yyyy-MM-dd'T'HH:mm");

    resetVisibility = false; // Hide reset button after resetting datetime
    setResetVisibility(); // Update visibility of reset button

    moon.position.set(0, 0, 0); // Reset moon position to initial
    controls.reset(); // Reset OrbitControls to initial settings
    updateScene(); // Update the scene
});


// Function to animate the scene
function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}

animate();

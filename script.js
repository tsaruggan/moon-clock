import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// Scene setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Sphere geometry and material
const geometry = new THREE.SphereGeometry(2, 64, 64);

// Load texture (specular and normal maps)
const textureLoader = new THREE.TextureLoader();
const texture = textureLoader.load('./maps/texture_map.png'); // Adjust the path accordingly
const specularMap = textureLoader.load('./maps/specular_map.png'); // Adjust the path accordingly
const normalMap = textureLoader.load('./maps/normal_map.png'); // Adjust the path accordingly
const displacementMap = textureLoader.load('./maps/displacement_map.png'); // Adjust the path accordingly

const material = new THREE.MeshStandardMaterial({
    map: texture,
    normalMap: normalMap,
    displacementMap: displacementMap,
    displacementScale: 0.025, // Lower value for a smoother effect
    displacementBias: -0.05, // Adjust the displacement baseline
    metalness: 0, // Adjust the metalness value as needed
    roughness: 1, // Adjust the roughness value as needed
    side: THREE.DoubleSide // Render both sides of the geometry
});

const moon = new THREE.Mesh(geometry, material);
scene.add(moon);

// Light setup
const ambientLight = new THREE.AmbientLight(0xffffff, 0.1); // Dim ambient light
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5); // Strong directional light
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = 2048; // Shadow map resolution
directionalLight.shadow.mapSize.height = 2048;
scene.add(directionalLight);

// Camera position
camera.position.z = 4;

// Orbit controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

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
    const lightX = Math.cos(moonPhaseAngle) * 10; // Adjust distance as needed
    const lightY = 0; // Keep the light on the same plane as the moon for simplicity
    const lightZ = Math.sin(moonPhaseAngle) * 10; // Adjust distance as needed

    directionalLight.position.set(lightX, lightY, lightZ);

    // Orient the moon correctly (initial guess)
    moon.rotation.y = Math.PI * 3 / 2; // Rotate the moon to face the camera correctly

    console.log(`Moon rotation (y): ${moon.rotation.y}`);
}

// Update moon phase for the current date
let currentDate = new Date();

function updateDateDisplay() {
    const dateDisplay = document.getElementById('dateDisplay');
    dateDisplay.textContent = currentDate.toDateString();
}

function updateScene() {
    updateMoonPhase(currentDate);
    updateDateDisplay();
}

// Event listeners for buttons
document.getElementById('prevDay').addEventListener('click', () => {
    currentDate.setDate(currentDate.getDate() - 1);
    updateScene();
});

document.getElementById('nextDay').addEventListener('click', () => {
    currentDate.setDate(currentDate.getDate() + 1);
    updateScene();
});

// Initial scene update
updateScene();

// Animation function
function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
    renderer.shadowMap.enabled = true;
}

animate();

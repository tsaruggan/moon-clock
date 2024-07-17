import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { format, addMinutes } from 'date-fns';

// Constants
const INITIAL_SCALE_FACTOR = 0.0075;
const INITIAL_X_ROTATION = 0;
const INITIAL_Y_ROTATION = 0;
const INITIAL_Z_ROTATION = 0;

// Three.js components
let scene, camera, renderer, textureLoader, geometry, texture, normalMap, material, ambientLight, directionalLight, controls, moon, currentDate, initialLibration, intervalId, resetVisibility;

function init(shaders) {
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
    // ambientLight = new THREE.AmbientLight(0xffffff, 10);
    // scene.add(ambientLight);

    directionalLight = new THREE.DirectionalLight(0xffffff, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);

    // Create moon
    textureLoader = new THREE.TextureLoader();
    texture = textureLoader.load('../maps/texture_map.png');
    normalMap = textureLoader.load('../maps/normal_map.png');

    // Sphere geometry
    geometry = new THREE.SphereGeometry(2, 64, 64);

    // Shader material
    material = new THREE.ShaderMaterial({
        glslVersion: THREE.GLSL3,
        uniforms: {
            textureMap: { value: texture, type: 't' },
            normalMap: { value: normalMap, type: 't' },
            lightPosition: { value: directionalLight.position, type: 'v3' },
            uvScale: { type: 'v2', value: new THREE.Vector2(1.0, 1.0)}
        },
        vertexShader: shaders.vertexShaderSource,
        fragmentShader: shaders.fragmentShaderSource
    });

    // Create mesh
    moon = new THREE.Mesh(geometry, material);
    moon.geometry.computeTangents();
    moon.position.set(0, 0, 0);
    moon.rotation.set(0, 0, 0);
    scene.add(moon);


    // Orbit controls setup
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    // Initialize current date
    currentDate = new Date();
    document.getElementById('dateTimePicker').value = format(currentDate, "yyyy-MM-dd'T'HH:mm");

    // Initial moon appearance
    initialLibration = calculateMoonLibration(currentDate);
    moon.rotation.x = INITIAL_X_ROTATION;
    moon.rotation.y = INITIAL_Y_ROTATION;
    moon.rotation.z = INITIAL_Z_ROTATION;
    moon.scale.setScalar(initialLibration.apparentSize / INITIAL_SCALE_FACTOR);
    updateScene();

    // Event listeners
    document.getElementById('dateTimePicker').addEventListener('input', (event) => {
        const dateTime = new Date(event.target.value);
        if (!isNaN(dateTime)) {
            currentDate = dateTime;
            updateScene();
        }
        resetVisibility = true;
        setResetVisibility();
    });

    controls.addEventListener('start', () => {
        resetVisibility = true;
        setResetVisibility();
    });

    // Left button events
    document.getElementById('leftButton').addEventListener('mousedown', () => {
        adjustDateTime(-60);
        intervalId = setInterval(() => adjustDateTime(-2), 1);
    });

    document.getElementById('leftButton').addEventListener('mouseup', () => {
        clearInterval(intervalId);
    });

    document.getElementById('leftButton').addEventListener('mouseleave', () => {
        clearInterval(intervalId);
    });

    // Right button events
    document.getElementById('rightButton').addEventListener('mousedown', () => {
        adjustDateTime(60);
        intervalId = setInterval(() => adjustDateTime(2), 1);
    });

    document.getElementById('rightButton').addEventListener('mouseup', () => {
        clearInterval(intervalId);
    });

    document.getElementById('rightButton').addEventListener('mouseleave', () => {
        clearInterval(intervalId);
    });

    // GitHub button event
    document.getElementById('githubButton').addEventListener('click', () => {
        window.open('https://github.com/tsaruggan/moon-clock', '_blank');
    });

    // Reset button event
    document.getElementById('resetButton').addEventListener('click', () => {
        currentDate = new Date();
        document.getElementById('dateTimePicker').value = format(currentDate, "yyyy-MM-dd'T'HH:mm");
        resetVisibility = false;
        setResetVisibility();
        moon.position.set(0, 0, 0);
        controls.reset();
        updateScene();
    });

    // Micellaneous variables
    intervalId; // used for button longpress
    resetVisibility = false; // used to display reset button
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}

// Helper functions
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

function adjustDateTime(minutes) {
    currentDate = addMinutes(currentDate, minutes);
    document.getElementById('dateTimePicker').value = format(currentDate, "yyyy-MM-dd'T'HH:mm");
    resetVisibility = true;
    setResetVisibility();
    updateScene();
}

// Function to enable/disable reset button based on current state
function setResetVisibility() {
    const resetButton = document.getElementById('resetButton');
    resetButton.disabled = !resetVisibility;
}

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

// Load shaders
function loadShader(url) {
    return new Promise((resolve, reject) => {
        const loader = new THREE.FileLoader();
        loader.load(url, (data) => resolve(data), undefined, reject);
    });
}

// Start initialization process after shaders are loaded
Promise.all([
    loadShader('../shaders/vertex_shader.glsl'),
    loadShader('../shaders/fragment_shader.glsl')
]).then(([vertexShaderSource, fragmentShaderSource]) => {
    const shaders = { vertexShaderSource, fragmentShaderSource };
    init(shaders); // Call initialization function with loaded shaders
    animate(); // Start animation loop
}).catch(error => {
    console.error('Error loading shaders:', error);
});

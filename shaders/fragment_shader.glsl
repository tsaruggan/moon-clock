// Constants
const float MIN_LIGHT_INTENSITY = 0.05;

// Uniform variables
uniform sampler2D textureMap; // Texture map for surface color
uniform sampler2D normalMap; // Normal map for surface normals

// Varying variables received from vertex shader
varying vec2 vUv; // Texture coordinates
varying mat3 tbn; // Tangent-binormal-normal matrix
varying vec3 vLightVector; // Vector to light source in view space

// Output variables
out vec4 FragColor;

void main() {
    // Transform texture coordinate of normal map to a range (-1, 1)
    vec3 normalCoordinate = texture2D(normalMap, vUv).xyz * 2.0 - 1.0;

    // Transform the normal vector (RGB values) relative to tangent space
    vec3 normal = normalize(tbn * normalCoordinate.rgb);

    // Lighting intensity = dot product of normal vector & vertex-to-light vector,
    float intensity = max(MIN_LIGHT_INTENSITY, dot(normal, vLightVector)); // Clamped to min intensity
    vec4 vLighting = vec4(intensity, intensity, intensity, 1.0);

    // Compute final fragment color after applying lighting
    FragColor = texture2D(textureMap, vUv) * vLighting;
}

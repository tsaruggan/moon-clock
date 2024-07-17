#version 330

// Attribute variables
attribute vec4 tangent; // Tangent attribute for normal mapping

// Uniform variables
uniform vec2 uvScale; // Scale factor for texture coordinates
uniform vec3 lightPosition; // Position of the light source

// Varying variables passed to fragment shader
varying vec2 vUv; // Texture coordinates
varying mat3 tbn; // Tangent-binormal-normal matrix
varying vec3 vLightVector; // Vector to light source in view space

void main() {
    // Calculate scaled texture coordinates
    vUv = uvScale * uv;

    /** 
    Create tangent-binormal-normal matrix used to transform
    coordinates from object space to tangent space.

    The TBN matrix ensures correct lighting calculations 
    relative to the surface's local orientation.
    */
    vec3 vNormal = normalize(normalMatrix * normal); // Object-space normal
    vec3 vTangent = normalize(normalMatrix * tangent.xyz); // Object-space tangent
    vec3 vBinormal = normalize(cross(vNormal, vTangent) * tangent.w); // Object-space binormal
    tbn = mat3(vTangent, vBinormal, vNormal);

    /** 
    Calculate the vertex-to-light vector.
    
    This is the normalized direction vector to light source.
    */
    vec4 vLightPosition = viewMatrix * vec4(lightPosition, 1.0); // Light position in view space
    vec4 vVertexPosition = modelViewMatrix * vec4(position, 1.0); // Vertex position in view space
    vLightVector = normalize(vLightPosition.xyz - vVertexPosition.xyz);

    // Compute final vertex position in clip space
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
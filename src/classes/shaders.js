/**
 * Contains vertex and fragment (pixel) shaders
 */
class Shaders {
    
}

////////////////
// Libraries //
//////////////

/**
 * Shader library code
 * @type  {Object}
 */
Shaders.libs = {};

/**
 * GLSL textureless classic 2D noise "cnoise",
 * with an RSL-style periodic variant "pnoise".
 * Author:  Stefan Gustavson (stefan.gustavson@liu.se)
 * Version: 2011-08-22
 *
 * Many thanks to Ian McEwan of Ashima Arts for the
 * ideas for permutation and gradient selection.
 *
 * Copyright (c) 2011 Stefan Gustavson. All rights reserved.
 * Distributed under the MIT license. See LICENSE file.
 * https://github.com/stegu/webgl-noise
 */
Shaders.libs.classicnoise2D = `
    
    vec4 mod289(vec4 x)
    {
      return x - floor(x * (1.0 / 289.0)) * 289.0;
    }
    
    vec4 permute(vec4 x)
    {
      return mod289(((x*34.0)+1.0)*x);
    }
    
    vec4 taylorInvSqrt(vec4 r)
    {
      return 1.79284291400159 - 0.85373472095314 * r;
    }
    
    vec2 fade(vec2 t) {
      return t*t*t*(t*(t*6.0-15.0)+10.0);
    }
    
    // Classic Perlin noise
    float cnoise(vec2 P)
    {
      vec4 Pi = floor(P.xyxy) + vec4(0.0, 0.0, 1.0, 1.0);
      vec4 Pf = fract(P.xyxy) - vec4(0.0, 0.0, 1.0, 1.0);
      Pi = mod289(Pi); // To avoid truncation effects in permutation
      vec4 ix = Pi.xzxz;
      vec4 iy = Pi.yyww;
      vec4 fx = Pf.xzxz;
      vec4 fy = Pf.yyww;
    
      vec4 i = permute(permute(ix) + iy);
    
      vec4 gx = fract(i * (1.0 / 41.0)) * 2.0 - 1.0 ;
      vec4 gy = abs(gx) - 0.5 ;
      vec4 tx = floor(gx + 0.5);
      gx = gx - tx;
    
      vec2 g00 = vec2(gx.x,gy.x);
      vec2 g10 = vec2(gx.y,gy.y);
      vec2 g01 = vec2(gx.z,gy.z);
      vec2 g11 = vec2(gx.w,gy.w);
    
      vec4 norm = taylorInvSqrt(vec4(dot(g00, g00), dot(g01, g01), dot(g10, g10), dot(g11, g11)));
      g00 *= norm.x;  
      g01 *= norm.y;  
      g10 *= norm.z;  
      g11 *= norm.w;  
    
      float n00 = dot(g00, vec2(fx.x, fy.x));
      float n10 = dot(g10, vec2(fx.y, fy.y));
      float n01 = dot(g01, vec2(fx.z, fy.z));
      float n11 = dot(g11, vec2(fx.w, fy.w));
    
      vec2 fade_xy = fade(Pf.xy);
      vec2 n_x = mix(vec2(n00, n01), vec2(n10, n11), fade_xy.x);
      float n_xy = mix(n_x.x, n_x.y, fade_xy.y);
      return 2.3 * n_xy;
    }
    
    // Classic Perlin noise, periodic variant
    float pnoise(vec2 P, vec2 rep)
    {
      vec4 Pi = floor(P.xyxy) + vec4(0.0, 0.0, 1.0, 1.0);
      vec4 Pf = fract(P.xyxy) - vec4(0.0, 0.0, 1.0, 1.0);
      Pi = mod(Pi, rep.xyxy); // To create noise with explicit period
      Pi = mod289(Pi);        // To avoid truncation effects in permutation
      vec4 ix = Pi.xzxz;
      vec4 iy = Pi.yyww;
      vec4 fx = Pf.xzxz;
      vec4 fy = Pf.yyww;
    
      vec4 i = permute(permute(ix) + iy);
    
      vec4 gx = fract(i * (1.0 / 41.0)) * 2.0 - 1.0 ;
      vec4 gy = abs(gx) - 0.5 ;
      vec4 tx = floor(gx + 0.5);
      gx = gx - tx;
    
      vec2 g00 = vec2(gx.x,gy.x);
      vec2 g10 = vec2(gx.y,gy.y);
      vec2 g01 = vec2(gx.z,gy.z);
      vec2 g11 = vec2(gx.w,gy.w);
    
      vec4 norm = taylorInvSqrt(vec4(dot(g00, g00), dot(g01, g01), dot(g10, g10), dot(g11, g11)));
      g00 *= norm.x;  
      g01 *= norm.y;  
      g10 *= norm.z;  
      g11 *= norm.w;  
    
      float n00 = dot(g00, vec2(fx.x, fy.x));
      float n10 = dot(g10, vec2(fx.y, fy.y));
      float n01 = dot(g01, vec2(fx.z, fy.z));
      float n11 = dot(g11, vec2(fx.w, fy.w));
    
      vec2 fade_xy = fade(Pf.xy);
      vec2 n_x = mix(vec2(n00, n01), vec2(n10, n11), fade_xy.x);
      float n_xy = mix(n_x.x, n_x.y, fade_xy.y);
      return 2.3 * n_xy;
    }
`;

/////////////////////
// Vertex shaders //
///////////////////

/**
 * Vertex shaders list
 * @type  {Object}
 */
Shaders.vertex = {};

/**
 * Plain no-op
 */
Shaders.vertex.plain = `
    varying vec3 vNormal;

    void main() {
        vNormal = normal;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

/**
 * Waves on surface
 */
Shaders.vertex.wavy = `
    uniform float time;
    uniform float amplitude;
    varying vec3 vNormal;
    
    // Pseudorandom function
    float pRandom (vec3 coords) {
        return fract(sin(dot(coords.xyz, vec3(12.9898, 78.233, 12.9898))) * 43758.5453);
    }

    void main() {
        vNormal = normal;
        const float waveHeight = 0.01;
        const float waveRes = 25.0;
        const float speed = 2.0;
        
        vec3 pos = position + normal * waveHeight
            * (
                sin(position.x * waveRes + 0.0 + time * speed)
                + cos(position.y * waveRes + 3.0 + time * speed)
                + cos(position.z * waveRes + 6.0 + time * speed)
            );
        
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
`;

/**
 * Ragged waves
 */
Shaders.vertex.ragged = `
    varying vec3 vNormal;
    uniform float time;
    uniform float amplitude;
    
    // Pseudorandom function
    float pRandom (vec3 coords) {
        return fract(sin(dot(coords.xyz, vec3(12.9898, 78.233, 12.9898))) * 43758.5453);
    }

    void main() {
        vNormal = normal;
        float waveHeight = 0.04;
        float waveRes = 25.0;
        
        vec3 pos = position + normal * waveHeight * 0.01 * pow(amplitude, 3.0)
            * (
                sin(position.x * waveRes + 0.0 + time + 0.1 * amplitude)
                + cos(position.y * waveRes + 3.0 + time + 0.1 * amplitude)
                + cos(position.z * waveRes + 6.0 + time + 0.1 * amplitude)
            )
            * sin(pRandom(position));
             
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
`;

/**
 * Face extrusion
 */
Shaders.vertex.extruded = `
    varying vec3 vNormal;
    uniform float time;
    uniform float amplitude;
    uniform vec3 earthOrigin;
    
    // Pseudorandom function
    float pRandom (vec3 coords) {
        return fract(sin(dot(coords.xyz, vec3(12.9898, 78.233, 12.9898))) * 43758.5453);
    }

    void main() {
        vNormal = normal;
        const float extrudeHeight = 2.5;
        vec3 finalPosition;
        
        // Radius vector starting at object origin and pointing towards current vertex
        // We will use it to detect vertices whose normals point outwards 
        vec3 refNormal = normalize(position - earthOrigin);
        
        // Extrude faces whose normals point outwards
        if (length(refNormal - normal) < 1.4) {
            finalPosition = position + normal * pow(amplitude, 2.0) * extrudeHeight / 900.0;
            // finalPosition = position + normal * pow(amplitude, 2.0) * extrudeHeight * sin(pRandom(position)) / 900.0;
        } else {
            finalPosition = position;
        }
             
        gl_Position = projectionMatrix * modelViewMatrix * vec4(finalPosition, 1.0);
    }
`;

/**
 * Pulsating
 */
Shaders.vertex.pulsating = `
    uniform float amplitude;
    varying vec3 vNormal;

    void main() {
        vNormal = normal;
        
        vec3 pos = position + normal * amplitude / 64.0; 
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
`;


////////////////////
// Pixel shaders //
//////////////////

/**
 * Pixel shaders list
 * @type  {Object}
 */
Shaders.pixel = {};  // Pixel shaders

/**
 * Sunlike
 */
Shaders.pixel.sunny = `
    varying vec3 vNormal;
    uniform float time;
    
    void main() {
    
        vec3 ambientLight = vec3(0.2, 0.2, 0.0);  // Ambient yellow
        
        // Positional light data type
        struct Light {
            vec3 position;      // Position in 3D
            vec3 color;         // Color code
            float illumFactor;  // How much this light shines upon current pixel
        };
        
        
        // Define positional lights
        Light lights[5];
        
        lights[0].position = normalize(vec3(0.0,  1.0,  0.5));  // Top
        lights[1].position = normalize(vec3(0.0, -1.0,  0.5));  // Bottom
        lights[2].position = normalize(vec3(0.0,  0.0,  1.0));  // Front
        lights[3].position = normalize(vec3(1.0,  0.0, -0.5));  // Right
        lights[4].position = normalize(vec3(-1.0, 0.0, -0.5));  // Left
        
        lights[0].color = vec3(1.0, 0.0, 0.0);  // Red
        lights[1].color = vec3(1.0, 0.5, 0.0);  // Orange
        lights[2].color = vec3(0.35, 0.35, 0.0);  // Yellow   
        lights[3].color = vec3(0.0, 1.0, 0.0);  // Green
        lights[4].color = vec3(1.0, 0.0, 1.0);  // Violet
        
        // Compute light illumination factors for every light
        for (int i = 0; i < 5; i++) {
            lights[i].illumFactor = max(0.0, dot(vNormal, lights[i].position));
        }
        
        // Reduce everything to a color vector by multiplying R, G & B components of lights
        // by their illumination factors and adding it all up
        vec3 illum = vec3(0.0);
        for (int n = 0; n < 3; n++) {
            for (int i = 0; i < 5; i++) {
                illum[n] += lights[i].color[n] * lights[i].illumFactor;
            }
        }
        
        // Add ambient light and output
        illum = illum + ambientLight;
        gl_FragColor = vec4(illum, 1.0);
    }
`;

/**
 * Waterlike naive
 */
Shaders.pixel.oceanicLow = `
    varying vec3 vNormal;
    uniform float time;
    
    void main() {
    
        vec3 ambientLight = vec3(0.2, 0.2, 0.0);  // Ambient yellow
        
        // Positional light data type
        struct Light {
            vec3 position;      // Position in 3D
            vec3 color;         // Color code
            float illumFactor;  // How much this light shines upon current pixel
        };
        
        
        // Define positional lights
        Light lights[6];
        
        vec3 cyan = vec3(0.0, 0.5, 0.5);
        vec3 blue = vec3(0.0, 0.0, 1.0);
        vec3 black = vec3(0.0, 0.0, 0.0);
        
        lights[0].position = normalize(vec3(0.0,  1.0,  0.0));   // Top
        lights[1].position = normalize(vec3(0.0, -1.0,  0.0));   // Bottom
        lights[2].position = normalize(vec3(0.0,  0.0,  1.0));   // Front
        lights[3].position = normalize(vec3(0.0,  0.0,  -1.0));  // Back
        lights[4].position = normalize(vec3(1.0,  0.0, 0.0));    // Right
        lights[5].position = normalize(vec3(-1.0, 0.0, 0.0));    // Left
        
        lights[0].color = cyan;
        lights[1].color = blue;
        lights[2].color = blue;
        lights[3].color = blue;
        lights[4].color = blue;
        lights[5].color = cyan;
        
        // Compute light illumination factors for every light
        for (int i = 0; i < 6; i++) {
            lights[i].illumFactor = max(0.0, dot(vNormal, lights[i].position));
        }
        
        // Reduce everything to a color vector by multiplying R, G & B components of lights
        // by their illumination factors and adding it all up
        vec3 illum = vec3(0.0);
        for (int n = 0; n < 3; n++) {
            for (int i = 0; i < 6; i++) {
                illum[n] += lights[i].color[n] * lights[i].illumFactor;
            }
        }
        
        // Add ambient light and output
        illum = illum + ambientLight;
        gl_FragColor = vec4(illum, 1.0);
    }
`;



/**
 * Waterlike
 */
Shaders.pixel.oceanic = `
    varying vec3 vNormal;
    uniform float time;
    uniform float screenHeight;
    varying vec4 vVertexPosition;
    
    void main() {
    
        vec3 ambientLight = vec3(0.0, 0.0, 0.1);  // Ambient blue
        
        // Positional light data type
        struct Light {
            vec3 position;      // Position in 3D
            vec3 color;         // Color code
            float illumFactor;  // How much this light shines upon current pixel
        };
        
        // Define positional lights
        const int lightsLength = 6;
        Light lights[lightsLength];
        
        vec3 cyan = vec3(0.0, 0.75, 1.0);
        vec3 blue = vec3(0.0, 0.0, 1.0);
        vec3 darkBlue = vec3(0.0, 0.0, 0.4);
        vec3 black = vec3(0.0, 0.0, 0.0);
        
        lights[0].position = normalize(vec3(0.0,  1.0,  0.0));   // Top
        lights[1].position = normalize(vec3(0.0, -1.0,  0.0));   // Bottom
        lights[2].position = normalize(vec3(0.0,  0.0,  1.0));   // Front
        lights[3].position = normalize(vec3(0.0,  0.0,  -1.0));  // Back
        lights[4].position = normalize(vec3(1.0,  0.0, 0.0));    // Right
        lights[5].position = normalize(vec3(-1.0, 0.0, 0.0));    // Left
        
        lights[0].color = cyan;
        lights[1].color = cyan;
        lights[2].color = blue;
        lights[3].color = blue;
        lights[4].color = cyan;
        lights[5].color = cyan;
        
        // Compute light illumination factors for every light
        for (int i = 0; i < lightsLength; i++) {
            lights[i].illumFactor = max(0.0, dot(vNormal, lights[i].position));
        }
        
        // Reduce everything to a color vector by multiplying R, G & B components of lights
        // by their illumination factors and adding it all up
        vec3 illum = vec3(0.0);
        for (int n = 0; n < 3; n++) {
            for (int i = 0; i < lightsLength; i++) {
                illum[n] += lights[i].color[n] * lights[i].illumFactor;
            }
        }
        
        // Add ambient light and output
        illum = illum + ambientLight;
        gl_FragColor = vec4(illum, 0.8);
        
        // gl_FragColor = eyePos;
    }
`;

/**
 * Party tiem
 */
Shaders.pixel.disco = `
    varying vec3 vNormal;
    uniform float time;
    
    void main() {
    
        vec3 ambientLight = vec3(0.2, 0.2, 0.0);  // Ambient yellow
        
        // Positional light data type
        struct Light {
            vec3 position;      // Position in 3D
            vec3 color;         // Color code
            float illumFactor;  // How much this light shines upon current pixel
        };
        
        
        // Define positional lights
        Light lights[5];
        
        lights[0].position = normalize(vec3(0.0,  1.0,  0.5));  // Top
        lights[1].position = normalize(vec3(0.0, -1.0,  0.5));  // Bottom
        lights[2].position = normalize(vec3(0.0,  0.0,  1.0));  // Front
        lights[3].position = normalize(vec3(1.0,  0.0, -0.5));  // Right
        lights[4].position = normalize(vec3(-1.0, 0.0, -0.5));  // Left
        
        lights[0].color = vec3(1.0, 0.0, 0.0);  // Red
        lights[1].color = vec3(1.0, 0.5, 0.0);  // Orange
        lights[2].color = vec3(0.35, 0.35, 0.0);  // Yellow   
        lights[3].color = vec3(0.0, 0.8, 0.0);  // Green
        lights[4].color = vec3(0.8, 0.0, 0.8);  // Violet
        
        // Rotate lights around y axis with time
        for (int i = 0; i < 5; i++) {
            lights[i].position[0] = lights[i].position[0] * sin(time);  // X
            lights[i].position[2] = lights[i].position[2] * sin(time);  // Z
        }
        
        // Compute light illumination factors for every light
        for (int i = 0; i < 5; i++) {
            lights[i].illumFactor = max(0.0, dot(vNormal, lights[i].position));
        }
        
        // Reduce everything to a color vector by multiplying R, G & B components of lights
        // by their illumination factors and adding it all up
        vec3 illum = vec3(0.0);
        for (int n = 0; n < 3; n++) {
            for (int i = 0; i < 5; i++) {
                illum[n] += lights[i].color[n] * lights[i].illumFactor;
            }
        }
        
        // Add ambient light and output
        illum = illum + ambientLight;
        gl_FragColor = vec4(illum, 1.0);
    }
`;

/**
 * White pixel stars on transparent background
 */
Shaders.pixel.starry = `
    varying vec3 vNormal;
    
    // Pseudorandom noise function
    float pRandom (vec2 coords) {
        return fract(sin(dot(coords.xy, vec2(12.9898, 78.233))) * 43758.5453);
    }
    
    // Start
    void main() {
        
        vec2 coords = vec2(gl_FragCoord[0], gl_FragCoord[1]);
        if (pRandom(coords) > 0.99) {
            gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);  // Draw a star
        } else {
            gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0);  // Draw nothing
        }
    }
`;

/**
 * Screen-mapped starfield texture that scrolls
 */
Shaders.pixel.scrollingStars = `
    uniform float time;
    uniform sampler2D starFieldTexture;
    uniform float screenHeight;
    varying vec3 vNormal;
    
    void main() {
        
        // Map the texture to screen space and scroll
        gl_FragColor = texture2D(starFieldTexture, vec2(gl_FragCoord.x / screenHeight + time / 32.0, gl_FragCoord.y / screenHeight));
    }
`;

export default Shaders;
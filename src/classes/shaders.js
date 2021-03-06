/**
 * Contains vertex and fragment (pixel) shaders
 */
class Shaders {}

  ///////////////
 // Libraries //
///////////////

/**
 * Shader library code
 * @type  {Object}
 */
Shaders.libs = {};

/**
 * That number, you know
 */
Shaders.libs.PI = `
    #define PI 3.1415926535897932384626433832795
`;

/**
 * Analysis resolution settings
 */
Shaders.libs.resolutionSettings = `
    #define amplitudeResolution 64
    #define frequencyResolution 128
`;

  ////////////////////
 // Vertex shaders //
////////////////////

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
    varying vec3 vWorldNormal;
    
    // Pseudorandom function
    float pRandom (vec3 coords) {
        return fract(sin(dot(coords.xyz, vec3(12.9898, 78.233, 12.9898))) * 43758.5453);
    }

    void main() {
        vNormal = normal;                 // Vertex normal
        vec4 worldNormal4 = modelMatrix * vec4(normal, 1.0);  
        vWorldNormal = worldNormal4.xyz;  // World space normal
        
        const float waveHeight = 0.01;  // Wave height
        const float waveRes = 25.0;     // Wave resolution
        const float speed = 2.0;        // Wave movement speed
        
        // Wave & output
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
 * Outward face extrusion
 */
Shaders.vertex.extruded = `
    ${Shaders.libs.PI}
    ${Shaders.libs.resolutionSettings}
    varying vec3 vNormal;
    uniform float time;
    uniform float amplitude;
    uniform float amplitudes[32];
    uniform float frequency;
    uniform float frequencies[32];
    uniform vec3 earthOrigin;
    varying vec3 vPosition;
    
    // Pseudorandom function
    float pRandom (vec3 coords) {
        return fract(sin(dot(coords.xyz, vec3(12.9898, 78.233, 12.9898))) * 43758.5453);
    }

    void main() {
        vNormal = normal;                 // Vertex normal
        vPosition = position;             // Vertex position
        const float extrudeHeight = 2.5;  // Fixed height modifier for extrusions
        const vec3 rippleStartNormal = vec3(0.0, 1.0, 0.0);  // Vector pointing at the starting point of extrusion ripples 
        const float fireSpeed = 0.00001;  // Speed of spike movement
        float polarCoordPosition;         // Position of a vertex in polar coordinate system with origin at rippleStartNormal angle;
        vec3 refNormal;                   // Radius vector starting at object origin and pointing towards the current vertex. We will use
                                          // it to detect vertices whose normals point outwards
        float extrusionFactor;            // Dynamic extrusion height modifier
        vec3 finalPosition;               // End result
        
        refNormal = normalize(position - earthOrigin);
        // polarCoordPosition = acos(dot(rippleStartNormal, refNormal)) / PI;  // Origin at pole
        polarCoordPosition = abs((acos(dot(rippleStartNormal, refNormal)) / PI) - 0.5) * 2.0;  // Origin at equator
        extrusionFactor = frequencies[int(polarCoordPosition * float(frequencyResolution))] / 19.0;

        // Extrude faces whose normals point outwards
        if (length(refNormal - normal) < 1.4) {
            float fireComponent = sin(pRandom(vec3(time * fireSpeed, position.x, position.y)));
            finalPosition = position + refNormal * pow(extrusionFactor, 3.3) * extrudeHeight * fireComponent/ 40000.0;  // Fire
            // finalPosition = position + refNormal * pow(extrusionFactor, 3.0) * extrudeHeight / 16384.0; // Crystal
        } else {
            finalPosition = position;
        }
             
        gl_Position = projectionMatrix * modelViewMatrix * vec4(finalPosition, 1.0);
    }
`;

  ////////////////////
 // Pixel shaders //
///////////////////

/**
 * Pixel shaders list
 * @type  {Object}
 */
Shaders.pixel = {};  // Pixel shaders

/**
 * Waterlike, with depth, legacy
 * @todo make water under camera transparent too, z-clip stuff perhaps
 * @todo add wave speculars
 */
Shaders.pixel.oceanicLegacy =  `
    const int gradientColorCount = 3;                 // Number of gradient colors in use

    uniform float time;
    uniform float screenHeight;
    uniform float amplitude;
    uniform float streak;
    uniform vec3 oceanOrigin;                         // Object center in world space
    uniform vec3 gradientColors[gradientColorCount];  // Array of colors for radial gradient
    uniform float gradientStops[gradientColorCount];  // Color positions for radial gradient 
    varying vec3 vNormal;                             // Surface normal in object space
    varying vec3 vWorldNormal;                        // Surface normal in world space
    
    void main() {
    
        float depth;           // Apparent water depth at point
        float gradientPoint;   // Position of the current point within the gradient, 0..1
        vec3 gradientFactors;  // How much of every gradient color is at this point 
        vec3 gradient;         // Computed gradient color for current pixel
        float luminance;       // Additional light emission
    
        vec3 cameraDirection = normalize(cameraPosition - oceanOrigin);  // Points from object center to camera
        depth = 1.0 - length(vWorldNormal - cameraDirection);            // Depth increases towards object center
        gradientPoint = (1.0 - depth);                                   // Gradient goes from depth to shallow
        luminance = streak / 128.0;                                      // Make it glow on streak
        
        // Compute gradient factors based on gradient stops and current point's position 
        for (int grad = 0; grad < gradientColorCount; grad++) {
            gradientFactors[grad] = 1.0 - abs(gradientStops[grad] - gradientPoint);
        }
        
        // Compute gradient by multiplying R, G & B components of gradient colors
        // by their gradient factors and adding it all up
        for (int col = 0; col < 3; col++) {
            for (int grad = 0; grad < gradientColorCount; grad++) {
                gradient[col] += gradientColors[grad][col] * gradientFactors[grad];
            }
        }
   
        // Add luminance and depth, and output
        gl_FragColor = vec4(gradient + luminance, pow(depth, 0.8) * 3.0);
    }
`;

/**
 * Waterlike, with depth, hue changes and luminance per amplitude
 * @todo make water under camera transparent too, z-clip stuff perhaps
 * @todo add wave speculars
 */
Shaders.pixel.oceanic =  `
    const int gradientColorCount = 3;                 // Number of gradient colors in use

    uniform float time;
    uniform float screenHeight;
    uniform float frequency;
    uniform float amplitude;
    uniform float streak;
    uniform vec3 oceanOrigin;                         // Object center in world space
    uniform vec3 gradientColors[gradientColorCount];  // Array of colors for radial gradient
    uniform float gradientStops[gradientColorCount];  // Color positions for radial gradient 
    varying vec3 vNormal;                             // Surface normal in object space
    varying vec3 vWorldNormal;                        // Surface normal in world space
    
    void main() {
    
        float depth;           // Apparent water depth at point
        float gradientPoint;   // Position of the current point within the gradient, 0..1
        vec3 gradientFactors;  // How much of every gradient color is at this point 
        vec3 gradient;         // Computed gradient color for current pixel
        float luminance;       // Additional light emission
    
        vec3 cameraDirection = normalize(cameraPosition - oceanOrigin);  // Points from object center to camera
        depth = 1.0 - length(vWorldNormal - cameraDirection);            // Depth increases towards object center
        gradientPoint = (1.0 - depth);                                   // Gradient goes from depth to shallow
        luminance = frequency;                         // Make it glow a bit per amplitude
        
        // Compute gradient factors based on gradient stops and current point's position 
        for (int grad = 0; grad < gradientColorCount; grad++) {
            gradientFactors[grad] = 1.0 - abs(gradientStops[grad] - gradientPoint);
        }
        
        // Compute gradient by multiplying R, G & B components of gradient colors
        // by their gradient factors and adding it all up
        for (int col = 0; col < 3; col++) {
            for (int grad = 0; grad < gradientColorCount; grad++) {
                gradient[col] += gradientColors[grad][col] * gradientFactors[grad];
            }
        }
   
        vec3 staticColor = gradient - luminance;
        // vec3 variedColor = vec3(staticColor.r + sin(time), staticColor.g + sin(time), staticColor.b + sin(time));
   
        // Add luminance and depth, and output
        gl_FragColor = vec4(gradient - luminance, pow(depth, 0.8) * 3.0);
    }
`;

/**
 * Party tiem
 * @todo alternative shader for mobile or fix mobile other way
 */
Shaders.pixel.disco = `
    varying vec3 vNormal;
    uniform float time;
    uniform vec3 earthOrigin;
    varying vec3 vPosition;
    
    void main() {
    
        // Radius vector starting at object origin and pointing towards the current vertex
        // We will use it to determine illumination factor for every light 
        vec3 refNormal = normalize(vPosition - earthOrigin);
        
        float opacity = 1.0;  // Pixel opacity
        float shadow  = 0.0;  // Simple fake shadow modifier
    
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
            lights[i].illumFactor = max(0.0, dot(refNormal, lights[i].position));
        }
        
        // Reduce everything to a color vector by multiplying R, G & B components of lights
        // by their illumination factors and adding it all up
        vec3 illum = vec3(0.0);
        for (int n = 0; n < 3; n++) {
            for (int i = 0; i < 5; i++) {
                illum[n] += lights[i].color[n] * lights[i].illumFactor;
            }
        }
        
        // Draw outward pointing transparent and dark, all others opaque and bright
        float outwardness = 1.0 - length(refNormal - vNormal);
        if (outwardness > 0.2) {
            opacity = 1.0 - outwardness;
            shadow = 0.0;
        } else {
            opacity = 1.0;
            shadow = outwardness;
        }
        
        // Add ambient light and shadow, and output
        illum = (illum + ambientLight) * (1.0 - shadow);
        gl_FragColor = vec4(illum, opacity);
    }
`;

/**
 * Screen-mapped scrolling, twinkling stars
 */
Shaders.pixel.scrollingStars = `
    uniform float time;
    uniform sampler2D starFieldTexture;
    uniform float screenHeight;
    varying vec3 vNormal;
    
    // Pseudorandom noise function
    float pRandom (vec2 coords) {
        return fract(sin(dot(coords.xy, vec2(12.9898, 78.233))) * 43758.5453);
    }
    
    void main() {
        
        // Determine whether to twinkle
        float twinkleFactor;
        vec2 coords = vec2(gl_FragCoord.x, gl_FragCoord.y);
        if (pRandom(coords * time) > 0.93) {
            twinkleFactor = 0.0;
        } else {
            twinkleFactor = 1.0;
        }
        
        // Map the texture to screen space and scroll
        vec4 stars = texture2D(starFieldTexture, vec2(gl_FragCoord.x / screenHeight + time / 32.0, gl_FragCoord.y / screenHeight));
        vec4 twinklingStars = stars * twinkleFactor; 
        gl_FragColor = twinklingStars;
    }
`;

export default Shaders;
import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader.js';
import { VignetteShader } from 'three/examples/jsm/shaders/VignetteShader.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import * as Tone from 'tone';


const OrthographicGridHomepage = () => {
  const mountRef = useRef(null);
  const clockRef = useRef(new THREE.Clock());
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const composerRef = useRef(null);
  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseRef = useRef(new THREE.Vector2());
  const hoveredTileRef = useRef(null);
  const tilesRef = useRef([]);
  const isGrabbingRef = useRef(false);
  const initialMousePositionRef = useRef(new THREE.Vector2());
  const rotationRef = useRef(new THREE.Euler(0, 0, 0));
  const synthRef = useRef(null);
  const reverbRef = useRef(null);

  
  const [volume, setVolume] = useState(-12);
  const [reverbDecay, setReverbDecay] = useState(30);
  const [reverbPreDelay, setReverbPreDelay] = useState(0.1);
  const [reverbWet, setReverbWet] = useState(1);

  const debounceTimeoutRef = useRef(null);

  const updateReverb = useCallback(() => {
    if (synthRef.current && reverbRef.current) {
      // Disconnect the old reverb
      synthRef.current.disconnect(reverbRef.current);
      reverbRef.current.dispose();

      // Create a new reverb with updated parameters
      reverbRef.current = new Tone.Reverb({
        decay: reverbDecay,
        preDelay: reverbPreDelay,
        wet: reverbWet
      }).toDestination();

      // Connect the synth to the new reverb
      synthRef.current.connect(reverbRef.current);
    }
  }, [reverbDecay, reverbPreDelay, reverbWet]);

  const debouncedUpdateReverb = useCallback(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    debounceTimeoutRef.current = setTimeout(() => {
      updateReverb();
    }, 100); // Debounce for 100ms
  }, [updateReverb]);

  useEffect(() => {


    const loader = new FontLoader();
    loader.load('/font.json', (font) => {
      // Function to create text mesh
      const createTextMesh = (text, size) => {
        const textGeometry = new TextGeometry(text, {
          font: font,
          size: size,
          height: 1,
          curveSegments: 12,
          bevelEnabled: false,
        });
        
        const textMaterial = new THREE.MeshBasicMaterial({ color: 0xA084E8 });
        const textMesh = new THREE.Mesh(textGeometry, textMaterial);

        textGeometry.computeBoundingBox();
        const textWidth = textGeometry.boundingBox.max.x - textGeometry.boundingBox.min.x;
        textMesh.position.set(-textWidth / 1.5, 0, 0);
        textMesh.rotation.x = Math.PI / -2;

        return textMesh;
      };

      // Create "trypablo" text
      const trypabloMesh = createTextMesh('trypab', 16);
      scene.add(trypabloMesh);

      // Create "lo" text
      const loMesh = createTextMesh('lo', 16);
      
      // Position "lo" text relative to "trypablo"
      trypabloMesh.geometry.computeBoundingBox();
      const trypabloWidth = trypabloMesh.geometry.boundingBox.max.x - trypabloMesh.geometry.boundingBox.min.x;
      loMesh.position.set(trypabloWidth /   3, 0, 0); // Adjust the '2' value to change spacing between texts
      
      scene.add(loMesh);
    });

    
    

    

    
    
     // Initialize Tone.js
     synthRef.current = new Tone.PolySynth(Tone.Synth).toDestination();
     reverbRef.current = new Tone.Reverb({
      decay: reverbDecay,
      preDelay: reverbPreDelay,
      wet: reverbWet
    }).toDestination();
     synthRef.current.connect(reverbRef.current);
     
     // Set initial volume
     synthRef.current.volume.value = volume;
 
    
    Tone.start();

    // D# minor scale
    const dSharpMinorScale = ['D#4', 'F4', 'F#4', 'G#4', 'A#4', 'B4', 'C#5', 'D#5'];
    const { current: mount } = mountRef;
    const { current: clock } = clockRef;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    sceneRef.current = scene;

    const aspect = window.innerWidth / window.innerHeight;
    const frustumSize = 100;
    const camera = new THREE.OrthographicCamera(
      frustumSize * aspect / -2,
      frustumSize * aspect / 2,
      frustumSize / 2,
      frustumSize / -2,
      0.1,
      2000
    );
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    mount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Create composer
    const composer = new EffectComposer(renderer);
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);

    // Add Vignette pass
    const vignettePass = new ShaderPass(VignetteShader);
    vignettePass.uniforms['offset'].value = 0.95;
    vignettePass.uniforms['darkness'].value = 1.4;
    composer.addPass(vignettePass);

    const fxaaPass = new ShaderPass(FXAAShader);
    fxaaPass.uniforms['resolution'].value.set(1 / (window.innerWidth * window.devicePixelRatio), 1 / (window.innerHeight * window.devicePixelRatio));
    composer.addPass(fxaaPass);
    composerRef.current = composer;

    // Grid
    const size = 240;
    const divisions = 45;
    const gridColor = new THREE.Color(0xFFFFFF); // Color for grid lines
    const crossColor = new THREE.Color(0xBDBDBD); // Color for corner crosses

    // Combine grid lines and crosses into one geometry
    const gridAndCrossGeometry = new THREE.BufferGeometry();
    const combinedPositions = [];
    const combinedColors = [];

    // Create main grid lines
    for (let i = 0; i <= divisions; i++) {
      const position = (i / divisions - 0.5) * size;
      
      // Vertical lines
      combinedPositions.push(position, 0, -size / 2, position, 0, size / 2);
      
      // Horizontal lines
      combinedPositions.push(-size / 2, 0, position, size / 2, 0, position);
      
      // Add colors for main grid lines (using gridColor)
      for (let j = 0; j < 4; j++) {
        combinedColors.push(gridColor.r, gridColor.g, gridColor.b, 0.15); // Grid line color
      }
    }

    // Create corner crosses
    const crossSize = size / divisions / 6;
    const crossYPosition = 0.01; // Slightly above the grid

    for (let i = 0; i <= divisions; i++) {
      for (let j = 0; j <= divisions; j++) {
        const x = (i / divisions - 0.5) * size;
        const z = (j / divisions - 0.5) * size;

        combinedPositions.push(
          x - crossSize, crossYPosition, z,
          x + crossSize, crossYPosition, z,
          x, crossYPosition, z - crossSize,
          x, crossYPosition, z + crossSize
        );

        // Add colors for corner crosses (using crossColor)
        for (let k = 0; k < 4; k++) {
          combinedColors.push(crossColor.r, crossColor.g, crossColor.b, 0.4); // Cross color
        }
      }
    }

    // Convert positions and colors arrays into Float32Arrays for the geometry
    const positions = new Float32Array(combinedPositions);
    const colors = new Float32Array(combinedColors);

    // Set positions and colors attributes for the BufferGeometry
    gridAndCrossGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    gridAndCrossGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 4));

    // Create a material that uses vertex colors
    const material = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.7
    });

    // Create the mesh and add it to the scene
    const gridAndCross = new THREE.LineSegments(gridAndCrossGeometry, material);
    scene.add(gridAndCross);


      

    // Create individual tiles for hovering
    const tileMaterial = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0 });
    const tiles = [];
    const tileSize = (size / divisions) * 0.94; // Make tiles 90% of the grid cell size
    for (let i = 0; i < divisions; i++) {
      for (let j = 0; j < divisions; j++) {
        const geometry = new THREE.PlaneGeometry(tileSize, tileSize);
        const tile = new THREE.Mesh(geometry, tileMaterial.clone());
        tile.position.set(
          (i - divisions / 2 + 0.5) * (size / divisions),
          0.01,
          (j - divisions / 2 + 0.5) * (size / divisions)
        );
        tile.rotation.x = -Math.PI / 2;
        scene.add(tile);
        tiles.push(tile);
        tile.fadeOutTimeoutId = null;
        tile.fadeStartTime = null;
      }
    }
    tilesRef.current = tiles;


    
    // Camera position
    camera.position.set(30, 35, 50);
    camera.lookAt(0, 0, 0);

    // Animation
    const animate = () => {
      requestAnimationFrame(animate);
      composer.render();
    
      const currentTime = clock.getElapsedTime();
    
      tilesRef.current.forEach(tile => {
        if (tile.fadeStartTime !== null) {
          const timeSinceFadeStart = currentTime - tile.fadeStartTime;
          const fadeDuration = 1; // 1 second fade duration
    
          if (timeSinceFadeStart < fadeDuration) {
            tile.material.opacity = 1 - (timeSinceFadeStart / fadeDuration);
          } else {
            tile.material.opacity = 0;
            tile.material.color.setHex(0x000000);
            tile.fadeStartTime = null;
          }
        }
      });
    
      // Apply rotation to the scene
      scene.rotation.setFromVector3(rotationRef.current);
    
      // Gradually return rotation to original position when mouse is not down
      if (!isGrabbingRef.current) {
        rotationRef.current.y *= 0.9;
      }
    };
    animate();

    const handleMouseMove = (event) => {
      const { current: mouse } = mouseRef;
      const { current: raycaster } = raycasterRef;
      const { current: tiles } = tilesRef;
    
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
      if (isGrabbingRef.current) {
        const deltaX = mouse.x - initialMousePositionRef.current.x;
    
        // Limit rotation to a maximum of 15 degrees (0.26 radians) in each direction
        rotationRef.current.y = Math.max(Math.min(deltaX * 0.5, 0.26), -0.26);
      } else {
        raycaster.setFromCamera(mouse, camera);

        const intersects = raycaster.intersectObjects(tiles);
        const colorPalette = [0xA084E8, 0x33BBC5, 0x85E6C5, 0xC8FFE0];

        if (intersects.length > 0) {
          const newHoveredTile = intersects[0].object;
          if (newHoveredTile !== hoveredTileRef.current) {
            if (hoveredTileRef.current) {
              hoveredTileRef.current.fadeStartTime = clock.getElapsedTime();
            }
            hoveredTileRef.current = newHoveredTile;
            const randomColor = colorPalette[Math.floor(Math.random() * colorPalette.length)];
            hoveredTileRef.current.material.color.setHex(randomColor);
            hoveredTileRef.current.material.opacity = 1;
            hoveredTileRef.current.fadeStartTime = null;
          }
        } else if (hoveredTileRef.current) {
          hoveredTileRef.current.fadeStartTime = clock.getElapsedTime();
          hoveredTileRef.current = null;
        }
      }
    };

    const handleMouseDown = (event) => {
      isGrabbingRef.current = true;
      initialMousePositionRef.current.set(
        (event.clientX / window.innerWidth) * 2 - 1,
        -(event.clientY / window.innerHeight) * 2 + 1
      );

      const notesToPlay = [];
      for (let i = 0; i < 4; i++) {
        const randomNote = dSharpMinorScale[Math.floor(Math.random() * dSharpMinorScale.length)];
        notesToPlay.push(randomNote);
      }
      synthRef.current.triggerAttackRelease(notesToPlay, "8n");

    };

    const handleMouseUp = () => {
      isGrabbingRef.current = false;
    };

    // Resize handler
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const aspect = width / height;

      camera.left = frustumSize * aspect / -2;
      camera.right = frustumSize * aspect / 2;
      camera.top = frustumSize / 2;
      camera.bottom = frustumSize / -2;
      camera.updateProjectionMatrix();

      renderer.setSize(width, height);
      composer.setSize(width, height);
      fxaaPass.uniforms['resolution'].value.set(1 / (width * window.devicePixelRatio), 1 / (height * window.devicePixelRatio));
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      mount.removeChild(renderer.domElement);
      synthRef.current.dispose();
      reverbRef.current.dispose();
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }

    };
  }, []);

  useEffect(() => {
    if (reverbRef.current) {
      reverbRef.current.decay = reverbDecay;
      reverbRef.current.preDelay = reverbPreDelay;
      reverbRef.current.wet.value = reverbWet;
    }
  }, [reverbDecay, reverbPreDelay, reverbWet]);

  useEffect(() => {
    debouncedUpdateReverb();
  }, [reverbDecay, reverbPreDelay, reverbWet, debouncedUpdateReverb]);

  useEffect(() => {
    if (synthRef.current) {
      synthRef.current.volume.value = volume;
    }
  }, [volume]);

  return (
    <div ref={mountRef} style={{ width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        textAlign: 'center',
        color: 'white',
        fontFamily: 'Arial, sans-serif',
        zIndex: 10
      }}>
        <h1>Welcome to My Grid Universe</h1>
        <p>Explore the infinite possibilities</p>
        <p>Click and drag to rotate the grid and hear the D# minor scale!</p>
      </div>
      <div style={{
        position: 'absolute',
        bottom: '20px',
        left: '20px',
        color: 'white',
        fontFamily: 'Arial, sans-serif',
        zIndex: 10
      }}>
        <div>
          <label htmlFor="reverbDecay">Reverb Decay: </label>
          <input
            type="range"
            id="reverbDecay"
            min="1"
            max="30"
            step="0.1"
            value={reverbDecay}
            onChange={(e) => setReverbDecay(parseFloat(e.target.value))}
            onMouseDown={(event) => event.stopPropagation()}
          />
        </div>
        <div>
          <label htmlFor="reverbPreDelay">Reverb Pre-Delay: </label>
          <input
            type="range"
            id="reverbPreDelay"
            min="0"
            max="1"
            step="0.01"
            value={reverbPreDelay}
            onChange={(e) => setReverbPreDelay(parseFloat(e.target.value))}
            onMouseDown={(event) => event.stopPropagation()}
          />
        </div>
        <div>
          <label htmlFor="reverbWet">Reverb Wet/Dry: </label>
          <input
            type="range"
            id="reverbWet"
            min="0"
            max="1"
            step="0.01"
            value={reverbWet}
            onChange={(e) => setReverbWet(parseFloat(e.target.value))}
            onMouseDown={(event) => event.stopPropagation()}
          />
        </div>
        <div>
          <label htmlFor="volume">Volume: </label>
          <input
            type="range"
            id="volume"
            min="-60"
            max="0"
            step="1"
            value={volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            onMouseDown={(event) => event.stopPropagation()}
          />
        </div>
      </div>
    </div>
      
  );
};

export default OrthographicGridHomepage;
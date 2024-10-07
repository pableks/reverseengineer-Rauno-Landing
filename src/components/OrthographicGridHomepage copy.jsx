import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader.js';

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

  useEffect(() => {
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
    const fxaaPass = new ShaderPass(FXAAShader);
    fxaaPass.uniforms['resolution'].value.set(1 / (window.innerWidth * window.devicePixelRatio), 1 / (window.innerHeight * window.devicePixelRatio));
    composer.addPass(fxaaPass);
    composerRef.current = composer;

    // Grid
    const size = 300;
    const divisions = 40;
    const gridHelper = new THREE.GridHelper(size, divisions, 0xffffff, 0xffffff);
    gridHelper.position.y = 0;
    scene.add(gridHelper);

    // Create individual tiles for hovering
    const tileMaterial = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0 });
    const tiles = [];
    for (let i = 0; i < divisions; i++) {
      for (let j = 0; j < divisions; j++) {
        const geometry = new THREE.PlaneGeometry(size / divisions, size / divisions);
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
    camera.position.set(50, 50, 50);
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
    };
    animate();

    const handleMouseMove = (event) => {
      const { current: mouse } = mouseRef;
      const { current: raycaster } = raycasterRef;
      const { current: tiles } = tilesRef;

      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);

      const intersects = raycaster.intersectObjects(tiles);

      if (intersects.length > 0) {
        const newHoveredTile = intersects[0].object;
        if (newHoveredTile !== hoveredTileRef.current) {
          if (hoveredTileRef.current) {
            // Start fade out for the previously hovered tile
            hoveredTileRef.current.fadeStartTime = clock.getElapsedTime();
          }
          hoveredTileRef.current = newHoveredTile;
          hoveredTileRef.current.material.color.setHex(0xffffff);
          hoveredTileRef.current.material.opacity = 1;
          hoveredTileRef.current.fadeStartTime = null;
        }
      } else if (hoveredTileRef.current) {
        // Start fade out for the previously hovered tile when mouse leaves all tiles
        hoveredTileRef.current.fadeStartTime = clock.getElapsedTime();
        hoveredTileRef.current = null;
      }
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

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      mount.removeChild(renderer.domElement);
    };
  }, []);

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
      </div>
    </div>
  );
};

export default OrthographicGridHomepage;
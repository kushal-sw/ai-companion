// 3D avatar renderer — Three.js + @pixiv/three-vrm
// → Loads VRM model, runs idle animations (breath, blink, sway)
// → Receives expression + gesture props from App.jsx
// → Plays keyframe gesture animations (wave, nod, clap, etc.)
// → Smooth expression blending via Expressions.jsx
// → Lip sync: mouth animates when isSpeaking is active

import React, { useRef, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';
import {
  getExpressionTargets,
  sampleGestureAnimation,
  ALL_EXPRESSION_NAMES,
  lerp,
  getRandomMicroExpression,
  expressionPulse,
  headMicroMovement,
} from './Expressions.jsx';

// ── Configuration ──
const VRM_PATH = '/assets/avatar/aura.vrm';

// Camera — full body view
const CAM_POS = { x: 0.0, y: 0.85, z: 2.8 };
const CAM_LOOK = { x: 0, y: 0.85, z: 0 };

// Idle animation
const BREATH_SPEED = 1.5;
const BREATH_INTENSITY = 0.015;
const SWAY_SPEED = 0.5;
const SWAY_INTENSITY = 0.015;
const BLINK_MIN_INTERVAL = 3000;
const BLINK_MAX_INTERVAL = 6000;
const BLINK_DURATION = 150;

// Expression blending
const BLEND_ALPHA = 0.1;            // Faster transitions (~0.3s vs ~1.5s)
const MICRO_BLEND_ALPHA = 0.03;     // Slow blend for micro-expressions

// Micro-expression timing
const MICRO_INTERVAL_MIN = 2500;    // ms between micro-expression changes
const MICRO_INTERVAL_MAX = 5000;

// Lip sync
const LIP_SYNC_SPEED = 12;
const CHARS_PER_SECOND = 14;

// Arm rest pose (additive offsets to bring arms down from T-pose)
const ARM_REST = {
  leftUpperArm:  { x: 0.4,  y: 0,     z: 1.2   },
  rightUpperArm: { x: 0.4,  y: 0,     z: -1.2  },
  leftLowerArm:  { x: 0,    y: 0.4,   z: 0.2   },
  rightLowerArm: { x: 0,    y: -0.4,  z: -0.2  },
};

export default function Avatar({ expression = 'neutral', gesture = 'idle', speakingText = null }) {
  const containerRef = useRef(null);
  const rendererRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const clockRef = useRef(new THREE.Clock());
  const vrmRef = useRef(null);
  const frameIdRef = useRef(null);

  // Expression blending state
  const currentBlendShapes = useRef({});
  const targetBlendShapes = useRef({});

  // Blink state
  const blinkTimer = useRef(null);
  const isBlinking = useRef(false);
  const blinkStartTime = useRef(0);

  // Lip sync state
  const speakingStartTime = useRef(null);
  const speakingDuration = useRef(0);

  // Gesture animation state
  const activeGesture = useRef('idle');
  const gestureStartTime = useRef(null);

  // Micro-expression state
  const microOffsets = useRef({});
  const microTargets = useRef({});
  const nextMicroTime = useRef(performance.now() + 2000);

  // ── Schedule next blink ──
  const scheduleNextBlink = useCallback(() => {
    const interval = BLINK_MIN_INTERVAL + Math.random() * (BLINK_MAX_INTERVAL - BLINK_MIN_INTERVAL);
    blinkTimer.current = setTimeout(() => {
      isBlinking.current = true;
      blinkStartTime.current = performance.now();
      scheduleNextBlink();
    }, interval);
  }, []);

  // ── Update expression targets when emotion changes ──
  useEffect(() => {
    const targets = getExpressionTargets(expression);
    targetBlendShapes.current = targets.blendShapes;
  }, [expression]);

  // ── Start gesture animation when gesture prop changes ──
  useEffect(() => {
    if (gesture && gesture !== 'idle') {
      activeGesture.current = gesture;
      gestureStartTime.current = performance.now();
    } else {
      activeGesture.current = 'idle';
      gestureStartTime.current = null;
    }
  }, [gesture]);

  // ── Trigger lip sync when speakingText changes ──
  useEffect(() => {
    if (speakingText) {
      const duration = (speakingText.length / CHARS_PER_SECOND) * 1000;
      speakingDuration.current = Math.max(duration, 800);
      speakingStartTime.current = performance.now();
    } else {
      speakingStartTime.current = null;
      speakingDuration.current = 0;
    }
  }, [speakingText]);

  // ── Helper: get a bone node (raw first, then normalized) ──
  const getBone = useCallback((vrm, boneName) => {
    if (!vrm.humanoid) return null;
    try {
      const raw = vrm.humanoid.getRawBoneNode(boneName);
      if (raw) return raw;
    } catch (e) {}
    try {
      const norm = vrm.humanoid.getNormalizedBoneNode(boneName);
      if (norm) return norm;
    } catch (e) {}
    return null;
  }, []);

  // ── Main setup effect ──
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      30,
      container.clientWidth / container.clientHeight,
      0.1,
      20
    );
    camera.position.set(CAM_POS.x, CAM_POS.y, CAM_POS.z);
    camera.lookAt(CAM_LOOK.x, CAM_LOOK.y, CAM_LOOK.z);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.appendChild(renderer.domElement);
    renderer.domElement.classList.add('avatar-canvas');
    rendererRef.current = renderer;

    // Lighting
    scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(1, 2, 1.5);
    scene.add(dirLight);
    const fillLight = new THREE.DirectionalLight(0xb4a0ff, 0.3);
    fillLight.position.set(-1, 1, 0.5);
    scene.add(fillLight);

    // ── Load VRM ──
    const loader = new GLTFLoader();
    loader.register((parser) => new VRMLoaderPlugin(parser));

    loader.load(
      VRM_PATH,
      (gltf) => {
        const vrm = gltf.userData.vrm;
        if (!vrm) { console.error('Failed to load VRM'); return; }

        VRMUtils.removeUnnecessaryVertices(gltf.scene);
        VRMUtils.removeUnnecessaryJoints(gltf.scene);
        VRMUtils.rotateVRM0(vrm);

        scene.add(vrm.scene);
        vrmRef.current = vrm;

        if (vrm.expressionManager) {
          const names = vrm.expressionManager.expressions.map(e => e.expressionName);
          console.log('VRM expressions available:', names);
        }
        if (vrm.humanoid) {
          const boneNames = ['leftUpperArm', 'rightUpperArm', 'leftLowerArm', 'rightLowerArm', 'head', 'spine', 'hips'];
          for (const name of boneNames) {
            const node = getBone(vrm, name);
            console.log(`Bone ${name}:`, node ? 'found' : 'NOT FOUND');
          }
        }

        const targets = getExpressionTargets(expression);
        targetBlendShapes.current = targets.blendShapes;
        currentBlendShapes.current = { ...targets.blendShapes };

        console.log('VRM loaded successfully');
      },
      (progress) => {
        if (progress.total > 0) {
          console.log(`Loading VRM: ${((progress.loaded / progress.total) * 100).toFixed(0)}%`);
        }
      },
      (error) => console.error('Error loading VRM:', error)
    );

    scheduleNextBlink();

    // Resize observer
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width === 0 || height === 0) continue;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
      }
    });
    resizeObserver.observe(container);

    // ── Animation loop ──
    const animate = () => {
      frameIdRef.current = requestAnimationFrame(animate);
      const delta = clockRef.current.getDelta();
      const elapsed = clockRef.current.getElapsedTime();
      const vrm = vrmRef.current;

      if (vrm) {
        // ════════════════════════════════════════════
        // 1) EXPRESSIONS — set BEFORE vrm.update()
        // ════════════════════════════════════════════
        if (vrm.expressionManager) {
          // ── Micro-expression timer ──
          const now = performance.now();
          if (now >= nextMicroTime.current) {
            microTargets.current = getRandomMicroExpression();
            const interval = MICRO_INTERVAL_MIN + Math.random() * (MICRO_INTERVAL_MAX - MICRO_INTERVAL_MIN);
            nextMicroTime.current = now + interval;
          }

          // Blend micro-expression offsets toward targets
          for (const name of ALL_EXPRESSION_NAMES) {
            const mCur = microOffsets.current[name] || 0;
            const mTgt = microTargets.current[name] || 0;
            microOffsets.current[name] = lerp(mCur, mTgt, MICRO_BLEND_ALPHA);
          }

          // ── Expression pulse (organic oscillation) ──
          const pulse = expressionPulse(elapsed);

          for (const name of ALL_EXPRESSION_NAMES) {
            const current = currentBlendShapes.current[name] || 0;
            const target = targetBlendShapes.current[name] || 0;
            const blended = lerp(current, target, BLEND_ALPHA);
            // Add micro-expression offset + pulse
            const micro = microOffsets.current[name] || 0;
            const final = Math.min(Math.max(blended * pulse + micro, 0), 1);
            currentBlendShapes.current[name] = blended;
            try { vrm.expressionManager.setValue(name, final); } catch (e) {}
          }

          // Blink
          let blinkWeight = 0;
          if (isBlinking.current) {
            const blinkElapsed = performance.now() - blinkStartTime.current;
            if (blinkElapsed < BLINK_DURATION) {
              const t = blinkElapsed / BLINK_DURATION;
              blinkWeight = t < 0.5 ? t * 2 : (1 - t) * 2;
            } else {
              isBlinking.current = false;
            }
          }
          try { vrm.expressionManager.setValue('blink', blinkWeight); } catch (e) {}

          // Lip sync
          let mouthWeight = 0;
          if (speakingStartTime.current !== null) {
            const speakElapsed = performance.now() - speakingStartTime.current;
            if (speakElapsed < speakingDuration.current) {
              const t = speakElapsed / 1000;
              const wave1 = Math.sin(t * LIP_SYNC_SPEED) * 0.5 + 0.5;
              const wave2 = Math.sin(t * LIP_SYNC_SPEED * 0.7 + 1.2) * 0.3 + 0.3;
              const wave3 = Math.sin(t * LIP_SYNC_SPEED * 1.5 + 0.7) * 0.2 + 0.2;
              mouthWeight = Math.min((wave1 + wave2 + wave3) / 3, 1.0) * 0.7;
              const fadeIn = Math.min(speakElapsed / 200, 1);
              const fadeOut = Math.min((speakingDuration.current - speakElapsed) / 200, 1);
              mouthWeight *= fadeIn * fadeOut;
            } else {
              speakingStartTime.current = null;
            }
          }
          if (mouthWeight > 0.01) {
            try { vrm.expressionManager.setValue('aa', mouthWeight); } catch (e) {}
            try { vrm.expressionManager.setValue('oh', mouthWeight * 0.4); } catch (e) {}
          } else {
            try { vrm.expressionManager.setValue('aa', 0); } catch (e) {}
            try { vrm.expressionManager.setValue('oh', 0); } catch (e) {}
          }
        }

        // ════════════════════════════════════════════
        // 2) VRM UPDATE — processes expressions + spring bones
        // ════════════════════════════════════════════
        vrm.update(delta);

        // ════════════════════════════════════════════
        // 3) BONES — apply AFTER vrm.update() using raw bones
        // ════════════════════════════════════════════

        // Idle: Breathing
        const spineBone = getBone(vrm, 'spine');
        if (spineBone) {
          const breathScale = 1 + Math.sin(elapsed * BREATH_SPEED) * BREATH_INTENSITY;
          spineBone.scale.set(1, breathScale, 1);
        }

        // Idle: Body sway
        const hipsBone = getBone(vrm, 'hips');
        if (hipsBone) {
          hipsBone.rotation.z += Math.sin(elapsed * SWAY_SPEED) * SWAY_INTENSITY;
        }

        // Arms: Rest pose (override T-pose)
        for (const [boneName, rot] of Object.entries(ARM_REST)) {
          const bone = getBone(vrm, boneName);
          if (bone) {
            bone.rotation.x += rot.x;
            bone.rotation.y += rot.y;
            bone.rotation.z += rot.z;
          }
        }

        // ── Gesture animation ──
        let gestureOffsets = null;
        if (activeGesture.current !== 'idle' && gestureStartTime.current !== null) {
          const gestureElapsed = performance.now() - gestureStartTime.current;
          gestureOffsets = sampleGestureAnimation(activeGesture.current, gestureElapsed);

          if (gestureOffsets === null) {
            // Animation finished
            activeGesture.current = 'idle';
            gestureStartTime.current = null;
          }
        }

        // Apply gesture bone offsets (on top of rest pose)
        if (gestureOffsets) {
          for (const [boneName, offset] of Object.entries(gestureOffsets)) {
            const bone = getBone(vrm, boneName);
            if (bone) {
              bone.rotation.x += offset.x;
              bone.rotation.y += offset.y;
              bone.rotation.z += offset.z;
            }
          }
        }

        // Head: emotion-based resting pose + micro-movements
        const headBone = getBone(vrm, 'head');
        if (headBone && (!gestureOffsets || !gestureOffsets.head)) {
          const targets = getExpressionTargets(expression);
          const tgt = targets.boneRotation;
          const micro = headMicroMovement(elapsed);
          headBone.rotation.x += tgt.x + micro.x;
          headBone.rotation.y += tgt.y + micro.y;
          headBone.rotation.z += tgt.z + micro.z;
        }
      }

      renderer.render(scene, camera);
    };

    clockRef.current.start();
    animate();

    // Cleanup
    return () => {
      if (frameIdRef.current) cancelAnimationFrame(frameIdRef.current);
      if (blinkTimer.current) clearTimeout(blinkTimer.current);
      resizeObserver.disconnect();

      if (vrmRef.current) {
        scene.remove(vrmRef.current.scene);
        VRMUtils.deepDispose(vrmRef.current.scene);
        vrmRef.current = null;
      }

      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }

      rendererRef.current = null;
      sceneRef.current = null;
      cameraRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="avatar-container" ref={containerRef}>
      {/* Three.js canvas is appended here programmatically */}
    </div>
  );
}

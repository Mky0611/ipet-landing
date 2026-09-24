/**
 * iPet 3D Interactive WebGL Experience & Hardware Exploded View
 * Powered by Three.js with accurate procedural CAD layers based on project schematic.
 */

class iPet3DExperience {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    if (!this.container) return;

    this.isExploded = false;
    this.currentColor = 'obsidian';
    this.isWebGLAvailable = this.checkWebGL();

    if (!this.isWebGLAvailable) {
      this.renderFallback();
      return;
    }

    this.init();
  }

  checkWebGL() {
    try {
      const canvas = document.createElement('canvas');
      return !!(window.WebGLRenderingContext && (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
    } catch (e) {
      return false;
    }
  }

  renderFallback() {
    if (!this.container) return;
    this.container.innerHTML = `
      <div class="webgl-fallback">
        <div class="fallback-badge">Chế độ 2D Tối Ưu</div>
        <p>Trình duyệt của bạn đang bật chế độ tiết kiệm tài nguyên hoặc không hỗ trợ WebGL. Bạn vẫn có thể trải nghiệm đầy đủ các tính năng vuốt chạm và đặt hàng iPet bên dưới!</p>
      </div>
    `;
  }

  init() {
    // Scene, Camera, Renderer
    const width = this.container.clientWidth || 500;
    const height = this.container.clientHeight || 420;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    this.camera.position.set(0, 1.8, 4.2);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.container.innerHTML = '';
    this.container.appendChild(this.renderer.domElement);

    // Controls
    if (typeof THREE.OrbitControls !== 'undefined') {
      this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
      this.controls.enableDamping = true;
      this.controls.dampingFactor = 0.05;
      this.controls.maxDistance = 7;
      this.controls.minDistance = 2.5;
      this.controls.maxPolarAngle = Math.PI / 2 + 0.15; // Don't flip under ground
      this.controls.target.set(0, 0.2, 0);
    }

    // Lighting
    this.setupLighting();

    // Robot Assembly Group
    this.robotRoot = new THREE.Group();
    this.scene.add(this.robotRoot);

    // Build CAD & Hardware Layers
    this.buildLayers();

    // Event listeners
    this.bindEvents();

    // Animation Loop
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  setupLighting() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    this.scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0x00f0ff, 1.2);
    dirLight1.position.set(4, 5, 3);
    this.scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x8b5cf6, 0.8);
    dirLight2.position.set(-4, -2, -3);
    this.scene.add(dirLight2);

    const pointLight = new THREE.PointLight(0x0066ff, 1.5, 10);
    pointLight.position.set(0, 2, 2);
    this.scene.add(pointLight);
  }

  buildLayers() {
    this.layers = {};

    // Material definitions
    this.materials = {
      shellObsidian: new THREE.MeshStandardMaterial({ color: 0x12141a, roughness: 0.25, metalness: 0.8 }),
      shellSilver: new THREE.MeshStandardMaterial({ color: 0xd8dde6, roughness: 0.2, metalness: 0.9 }),
      shellBlue: new THREE.MeshStandardMaterial({ color: 0x0055ff, roughness: 0.3, metalness: 0.7 }),
      glassScreen: new THREE.MeshPhysicalMaterial({
        color: 0x02050a,
        roughness: 0.1,
        transmission: 0.9,
        transparent: true,
        reflectivity: 0.9
      }),
      chassis: new THREE.MeshStandardMaterial({ color: 0x1e2330, roughness: 0.6, metalness: 0.5 }),
      pcb: new THREE.MeshStandardMaterial({ color: 0x0d3b25, roughness: 0.4, metalness: 0.4 }), // Green ESP32 PCB
      chips: new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.2, metalness: 0.8 }),
      battery: new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.3, metalness: 0.2 }), // Green 18650
      rubber: new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.8, metalness: 0.1 }),
      rim: new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.3, metalness: 0.8 }), // Yellow TT gear rims
      neonCyan: new THREE.MeshBasicMaterial({ color: 0x00f0ff })
    };

    // 1. LAYER 4: Bottom Chassis Plate & Mecanum Wheels (Ảnh 2 CAD)
    const layerChassis = new THREE.Group();
    const chassisPlateGeom = new THREE.BoxGeometry(1.6, 0.1, 2.2);
    const chassisPlate = new THREE.Mesh(chassisPlateGeom, this.materials.chassis);
    chassisPlate.position.set(0, 0, 0);
    layerChassis.add(chassisPlate);

    // Front rounded bumper
    const bumperGeom = new THREE.CylinderGeometry(0.8, 0.8, 0.12, 32, 1, false, 0, Math.PI);
    const bumper = new THREE.Mesh(bumperGeom, this.materials.chassis);
    bumper.rotation.y = -Math.PI / 2;
    bumper.position.set(0, 0, 1.1);
    layerChassis.add(bumper);

    // 2 TT Motors & Mecanum Wheels
    const wheelGeom = new THREE.CylinderGeometry(0.35, 0.35, 0.25, 24);
    wheelGeom.rotateZ(Math.PI / 2);

    const leftWheel = new THREE.Mesh(wheelGeom, this.materials.rubber);
    leftWheel.position.set(-0.95, -0.05, -0.4);
    const rightWheel = new THREE.Mesh(wheelGeom, this.materials.rubber);
    rightWheel.position.set(0.95, -0.05, -0.4);

    // Yellow TT Motor hubs
    const hubGeom = new THREE.CylinderGeometry(0.2, 0.2, 0.26, 16);
    hubGeom.rotateZ(Math.PI / 2);
    const leftHub = new THREE.Mesh(hubGeom, this.materials.rim);
    leftHub.position.copy(leftWheel.position);
    const rightHub = new THREE.Mesh(hubGeom, this.materials.rim);
    rightHub.position.copy(rightWheel.position);

    layerChassis.add(leftWheel, rightWheel, leftHub, rightHub);
    this.layers.chassis = { group: layerChassis, normalY: 0, explodedY: -0.6 };
    this.robotRoot.add(layerChassis);

    // 2. LAYER 3: Electronics & Battery (ESP32-S3 + Dual 18650 Li-ion + TB6612) (Ảnh 4)
    const layerElectronics = new THREE.Group();

    // 2x 18650 Batteries (Cylinders)
    const battGeom = new THREE.CylinderGeometry(0.18, 0.18, 1.2, 16);
    battGeom.rotateX(Math.PI / 2);
    const batt1 = new THREE.Mesh(battGeom, this.materials.battery);
    batt1.position.set(-0.3, 0.25, -0.1);
    const batt2 = new THREE.Mesh(battGeom, this.materials.battery);
    batt2.position.set(0.3, 0.25, -0.1);
    layerElectronics.add(batt1, batt2);

    // ESP32-S3 Main Board
    const espPcbGeom = new THREE.BoxGeometry(0.9, 0.05, 1.1);
    const espPcb = new THREE.Mesh(espPcbGeom, this.materials.pcb);
    espPcb.position.set(0, 0.5, 0.2);
    layerElectronics.add(espPcb);

    // ESP32 Metal Shield RF Can
    const espCanGeom = new THREE.BoxGeometry(0.35, 0.08, 0.45);
    const espCan = new THREE.Mesh(espCanGeom, this.materials.chips);
    espCan.position.set(0, 0.55, 0.35);
    layerElectronics.add(espCan);

    this.layers.electronics = { group: layerElectronics, normalY: 0, explodedY: -0.15 };
    this.robotRoot.add(layerElectronics);

    // 3. LAYER 2: ILI9341 2.8" SPI Display & Capacitive Touch Pad (Ảnh 4)
    const layerDisplay = new THREE.Group();

    // Screen PCB backing
    const screenPcbGeom = new THREE.BoxGeometry(1.1, 0.04, 0.8);
    const screenPcb = new THREE.Mesh(screenPcbGeom, this.materials.pcb);
    screenPcb.position.set(0, 0.9, 0.3);
    screenPcb.rotation.x = -Math.PI / 5; // 36-degree angle
    layerDisplay.add(screenPcb);

    // Glowing OLED/LCD Screen Face
    const screenFaceGeom = new THREE.BoxGeometry(1.0, 0.02, 0.7);
    const screenFace = new THREE.Mesh(screenFaceGeom, this.materials.neonCyan);
    screenFace.position.set(0, 0.92, 0.3);
    screenFace.rotation.x = -Math.PI / 5;
    layerDisplay.add(screenFace);

    this.layers.display = { group: layerDisplay, normalY: 0, explodedY: 0.4 };
    this.robotRoot.add(layerDisplay);

    // 4. LAYER 1: Top Shell Aerodynamic Casing with Screen Cutout (Ảnh 3 CAD)
    const layerTopShell = new THREE.Group();

    // Main Top Body Dome
    const topBodyGeom = new THREE.BoxGeometry(1.7, 0.65, 2.3);
    this.topShellMesh = new THREE.Mesh(topBodyGeom, this.materials.shellObsidian);
    this.topShellMesh.position.set(0, 0.75, 0);
    layerTopShell.add(this.topShellMesh);

    // Display Window Glass Bezel
    const glassBezelGeom = new THREE.BoxGeometry(1.2, 0.05, 0.9);
    const glassBezel = new THREE.Mesh(glassBezelGeom, this.materials.glassScreen);
    glassBezel.position.set(0, 1.08, 0.3);
    glassBezel.rotation.x = -Math.PI / 5;
    layerTopShell.add(glassBezel);

    // Side Wheel Arches
    const archGeom = new THREE.CylinderGeometry(0.48, 0.48, 0.28, 20, 1, false, 0, Math.PI);
    archGeom.rotateZ(Math.PI / 2);
    const leftArch = new THREE.Mesh(archGeom, this.materials.shellObsidian);
    leftArch.position.set(-0.85, 0.45, -0.4);
    const rightArch = new THREE.Mesh(archGeom, this.materials.shellObsidian);
    rightArch.position.set(0.85, 0.45, -0.4);
    layerTopShell.add(leftArch, rightArch);
    this.archMeshes = [leftArch, rightArch];

    this.layers.topShell = { group: layerTopShell, normalY: 0, explodedY: 1.0 };
    this.robotRoot.add(layerTopShell);

    // Center root position
    this.robotRoot.position.set(0, -0.3, 0);
  }

  setShellColor(colorKey) {
    this.currentColor = colorKey;
    let selectedMat = this.materials.shellObsidian;
    if (colorKey === 'silver') selectedMat = this.materials.shellSilver;
    else if (colorKey === 'electric_blue') selectedMat = this.materials.shellBlue;

    if (this.topShellMesh) this.topShellMesh.material = selectedMat;
    if (this.archMeshes) this.archMeshes.forEach(m => m.material = selectedMat);

    if (window.trackEvent) {
      window.trackEvent('product_color_change', { color: colorKey });
    }
  }

  setExploded(exploded) {
    this.isExploded = !!exploded;
    const btn = document.getElementById('btn-toggle-exploded');
    if (btn) {
      btn.classList.toggle('active', this.isExploded);
      btn.innerHTML = this.isExploded 
        ? '<i data-lucide="layers"></i> <span>Đóng Lại (Normal View)</span>'
        : '<i data-lucide="split"></i> <span>Bóc Tách Linh Kiện (Exploded View)</span>';
      if (typeof lucide !== 'undefined') lucide.createIcons();
    }

    // Toggle hotspots overlay visibility
    const hotspotsEl = document.getElementById('three-hotspots');
    if (hotspotsEl) {
      hotspotsEl.style.opacity = this.isExploded ? '1' : '0';
      hotspotsEl.style.pointerEvents = this.isExploded ? 'auto' : 'none';
    }

    if (window.trackEvent) {
      window.trackEvent('3d_exploded_view', { isExploded: this.isExploded });
    }
  }

  resetCamera() {
    if (!this.camera || !this.controls) return;
    this.camera.position.set(0, 1.8, 4.2);
    this.controls.target.set(0, 0.2, 0);
    this.controls.update();
  }

  bindEvents() {
    // Resize
    window.addEventListener('resize', () => {
      if (!this.container || !this.renderer || !this.camera) return;
      const w = this.container.clientWidth;
      const h = this.container.clientHeight;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
    });

    // Exploded toggle button
    const toggleBtn = document.getElementById('btn-toggle-exploded');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        if (window.motionSystem) window.motionSystem.playHaptic('toggle');
        this.setExploded(!this.isExploded);
      });
    }

    // Reset camera button
    const resetBtn = document.getElementById('btn-reset-3d-cam');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (window.motionSystem) window.motionSystem.playHaptic('click');
        this.resetCamera();
      });
    }

    // Color buttons
    document.querySelectorAll('.btn-color-swatch').forEach(btn => {
      btn.addEventListener('click', () => {
        const color = btn.getAttribute('data-color');
        document.querySelectorAll('.btn-color-swatch').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.setShellColor(color);
        if (window.motionSystem) window.motionSystem.playHaptic('click');
      });
    });
  }

  animate() {
    requestAnimationFrame(this.animate);

    // Smooth lerp layer positions towards normal or exploded coordinates
    const lerpSpeed = 0.08;
    for (const key of Object.values(this.layers)) {
      const targetY = this.isExploded ? key.explodedY : key.normalY;
      key.group.position.y += (targetY - key.group.position.y) * lerpSpeed;
    }

    // Subtle idle floating rotation when NOT dragging
    if (!this.isExploded && this.robotRoot) {
      this.robotRoot.rotation.y += 0.003;
    }

    if (this.controls) {
      this.controls.update();
    }

    this.renderer.render(this.scene, this.camera);
  }
}

// Auto init when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.ipet3D = new iPet3DExperience('three-canvas-container');
});

// Loading Screen
window.addEventListener('load', () => {
    const loader = document.getElementById('loader');
    const progressBar = document.querySelector('.progress');

    // Simulate loading
    progressBar.style.width = '100%';

    setTimeout(() => {
        loader.style.opacity = '0';
        setTimeout(() => {
            loader.style.display = 'none';
            initAnimations(); // Start animations after loader is gone
        }, 500);
    }, 1500);
});

// Three.js 3D Background
function initThree() {
    const canvas = document.querySelector('#webgl-canvas');
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0xf9f8f4, 0.002); // Light Fog

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 5;

    const renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        alpha: true,
        antialias: true
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0xf9f8f4, 1); // Set clear color to background

    // Geometry - Globe with Images in Triangles
    const sphere = new THREE.Group(); // Use a Group to hold both meshes
    scene.add(sphere);

    const baseGeometry = new THREE.IcosahedronGeometry(2, 1);

    // Helper: Create Text Texture
    function createTextTexture(text, color = '#d4af37') {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = color;
        ctx.font = 'bold 80px "Cormorant Garamond", serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, 256, 256);
        const texture = new THREE.CanvasTexture(canvas);
        return texture;
    }

    // Load Images
    const textureLoader = new THREE.TextureLoader();
    const imageUrls = [
        'images/Residential/IMG_5958.JPG',
        'images/Residential/IMG_5960.JPG',
        'images/Residential/IMG_5962.JPG',
        'images/Commercial/IMG_5964.JPG',
        'images/Commercial/IMG_5966.JPG',
        'images/Commercial/IMG_5970.JPG',
        'images/Kitchen/IMG_5959.JPG',
        'images/Kitchen/IMG_5998.JPG',
        'images/Living/IMG_5989.JPG',
        'images/Living/IMG_5990.JPG',
        'images/Wardrobe/IMG_5977.JPG',
        'images/Wardrobe/IMG_5979.JPG',
        'images/Pooja/IMG_5993.JPG',
        'images/bar%20units/IMG_5999.JPG',
        'images/logo.jpg'
    ];

    // Create Text Textures
    const textKeywords = ['Luxury', 'Design', 'Elegant', 'Bespoke', 'Style', 'Art', 'Sam\'s'];
    const textTextures = textKeywords.map(word => createTextTexture(word));

    // Combine all materials for the globe
    const allTextures = [...imageUrls.map(url => textureLoader.load(url)), ...textTextures];

    // We need MeshBasicMaterials for the globe faces
    const globeMaterials = allTextures.map(tex => {
        return new THREE.MeshBasicMaterial({
            map: tex,
            side: THREE.DoubleSide,
            transparent: true, // Needed for text transparency
            opacity: 1, // Ensure visibility
            color: 0xffffff
        });
    });

    // Create non-indexed geometry to allow independent face texturing
    const geometry = baseGeometry.toNonIndexed();
    const posAttribute = geometry.attributes.position;
    const uvAttribute = geometry.attributes.uv;
    const faceCount = posAttribute.count / 3;

    geometry.clearGroups();

    for (let i = 0; i < faceCount; i++) {
        // Set UVs to map the full image to the triangle face
        const vA = i * 3 + 0;
        const vB = i * 3 + 1;
        const vC = i * 3 + 2;

        uvAttribute.setXY(vA, 0.5, 1);
        uvAttribute.setXY(vB, 0, 0);
        uvAttribute.setXY(vC, 1, 0);

        // Assign a material index randomly
        const randomMaterialIndex = Math.floor(Math.random() * globeMaterials.length);
        geometry.addGroup(i * 3, 3, randomMaterialIndex);
    }

    // textured Mesh
    const globeMesh = new THREE.Mesh(geometry, globeMaterials);
    globeMesh.scale.setScalar(0.998); // Tiny bit smaller to avoid z-fighting
    // sphere.add(globeMesh); // Disabled globe mesh

    // Wireframe Overlay
    const wireframeMat = new THREE.MeshBasicMaterial({
        color: 0xb8860b, // Darker Gold for visibility on light bg
        wireframe: true,
        transparent: true,
        opacity: 0.4
    });
    // Use the SAME geometry as globeMesh so they explode together
    const wireframeMesh = new THREE.Mesh(geometry, wireframeMat);
    wireframeMesh.scale.setScalar(1.002); // Tiny bit larger
    // sphere.add(wireframeMesh); // Disabled wireframe mesh

    // Floating Elements (Sprites instead of Points)
    const floatingGroup = new THREE.Group();
    const floatCount = 60; // Less count than particles because sprites are bigger

    // Create materials for sprites (sharing textures)
    const spriteMaterials = allTextures.map(tex => new THREE.SpriteMaterial({
        map: tex,
        color: 0xffffff,
        transparent: true,
        opacity: 0.8
    }));

    for (let i = 0; i < floatCount; i++) {
        // Pick random material
        const mat = spriteMaterials[Math.floor(Math.random() * spriteMaterials.length)];
        const sprite = new THREE.Sprite(mat);

        // Random position spread outside the globe
        const r = 3 + Math.random() * 3; // Radius 3 to 6
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);

        sprite.position.set(
            r * Math.sin(phi) * Math.cos(theta),
            r * Math.sin(phi) * Math.sin(theta),
            r * Math.cos(phi)
        );

        // Random scale relative
        const scale = 0.3 + Math.random() * 0.3;
        sprite.scale.set(scale, scale, 1);

        floatingGroup.add(sprite);
    }

    scene.add(floatingGroup);


    // Light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    // Mouse Interaction
    let mouseX = 0;
    let mouseY = 0;

    document.addEventListener('mousemove', (event) => {
        mouseX = event.clientX / window.innerWidth - 0.5;
        mouseY = event.clientY / window.innerHeight - 0.5;
    });

    // Globe Explosion Interaction
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let isExploded = false;
    let isReforming = false;
    let reformTimeout;
    const faceVelocities = [];

    // Store original positions for reforming
    const originalPositions = Float32Array.from(geometry.attributes.position.array);

    window.addEventListener('click', (event) => {
        // Calculate mouse position in normalized device coordinates (-1 to +1)
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);

        // Check intersection with the globe
        const intersects = raycaster.intersectObject(globeMesh);

        if (intersects.length > 0 && !isExploded) {
            isExploded = true;
            isReforming = false;

            // Clear any pending reform
            if (reformTimeout) clearTimeout(reformTimeout);

            // Initialize velocities for each face
            const posAttribute = geometry.attributes.position;
            const array = posAttribute.array;

            // Clear previous velocities
            faceVelocities.length = 0;

            for (let i = 0; i < faceCount; i++) {
                // Get center of the face
                const v1x = array[i * 9];
                const cx = (array[i * 9] + array[i * 9 + 3] + array[i * 9 + 6]) / 3;
                const cy = (array[i * 9 + 1] + array[i * 9 + 4] + array[i * 9 + 7]) / 3;
                const cz = (array[i * 9 + 2] + array[i * 9 + 5] + array[i * 9 + 8]) / 3;

                const centerVec = new THREE.Vector3(cx, cy, cz).normalize();

                // Random explosion speed
                const speed = 0.05 + Math.random() * 0.05;

                faceVelocities.push({
                    x: centerVec.x * speed,
                    y: centerVec.y * speed,
                    z: centerVec.z * speed,
                    driftX: (Math.random() - 0.5) * 0.002,
                    driftY: (Math.random() - 0.5) * 0.002,
                    driftZ: (Math.random() - 0.5) * 0.002,
                    phase: Math.random() * Math.PI * 2
                });
            }

            // Schedule Reform
            reformTimeout = setTimeout(() => {
                isReforming = true;
            }, 20000); // 20 seconds wait
        }
    });

    // Animation Loop
    const clock = new THREE.Clock();

    function animate() {
        requestAnimationFrame(animate);
        const elapsedTime = clock.getElapsedTime();

        // Rotate main object
        sphere.rotation.y += 0.0005;
        sphere.rotation.x += 0.0002;

        // Interactive rotation based on mouse
        sphere.rotation.y += mouseX * 0.05;
        sphere.rotation.x += mouseY * 0.05;

        // Floating Group smooth rotation
        floatingGroup.rotation.y = -elapsedTime * 0.05;
        floatingGroup.rotation.x = mouseY * 0.1;

        // Subtle floating effect for the whole group
        sphere.position.y = Math.sin(elapsedTime * 0.5) * 0.1;

        // Explosion & Reform Logic
        const posAttribute = geometry.attributes.position;
        const array = posAttribute.array;

        if (isReforming) {
            let maxDist = 0;
            // Lerp back to original positions
            for (let i = 0; i < array.length; i++) {
                const diff = originalPositions[i] - array[i];
                array[i] += diff * 0.05; // 5% per frame (easing)
                if (Math.abs(diff) > maxDist) maxDist = Math.abs(diff);
            }

            posAttribute.needsUpdate = true;

            // Snap when close enough
            if (maxDist < 0.01) {
                for (let i = 0; i < array.length; i++) {
                    array[i] = originalPositions[i]; // Exact snap
                }
                isReforming = false;
                isExploded = false;
                posAttribute.needsUpdate = true;
            }

        } else if (isExploded) {
            // Explosion Physics
            for (let i = 0; i < faceCount; i++) {
                const vel = faceVelocities[i];
                if (!vel) continue;

                // Apply velocity with damping (drag)
                vel.x *= 0.96; // Slow down quickly
                vel.y *= 0.96;
                vel.z *= 0.96;

                // Add "float" drift once slowed down
                const floating = Math.sin(elapsedTime * 2 + vel.phase) * 0.002;

                const dx = vel.x + vel.driftX + floating * vel.x; // Float along normal
                const dy = vel.y + vel.driftY + floating * vel.y;
                const dz = vel.z + vel.driftZ + floating * vel.z;

                // Update all 3 vertices of the face
                for (let v = 0; v < 3; v++) {
                    const idx = (i * 3 + v) * 3;
                    array[idx] += dx;
                    array[idx + 1] += dy;
                    array[idx + 2] += dz;
                }
            }
            posAttribute.needsUpdate = true;
        }

        renderer.render(scene, camera);
    }
    animate();

    // Resize Handler
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
}

// GSAP Animations
function initAnimations() {
    gsap.registerPlugin(ScrollTrigger);

    // Hero Text Stagger
    gsap.to('.hero-content .fade-in-up', {
        y: 0,
        opacity: 1,
        duration: 1,
        stagger: 0.3,
        ease: 'power3.out'
    });

    // Sections Fade In
    const sections = document.querySelectorAll('.section');
    sections.forEach(section => {
        // Targeted selection for staggered animations
        const targets = section.querySelectorAll('.section-header, .about-text, .about-stats, .process-step, .portfolio-item, .testimonial-card, .service-card, .contact-wrapper');

        if (targets.length > 0) {
            gsap.fromTo(targets,
                { y: 50, opacity: 0 },
                {
                    y: 0,
                    opacity: 1,
                    duration: 1,
                    stagger: 0.1, // Faster stagger for smoother feel
                    scrollTrigger: {
                        trigger: section,
                        start: 'top 80%',
                        toggleActions: 'play none none reverse'
                    }
                }
            );
        }
    });
}

// Initialize Three.js immediately
initThree();

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
    scene.fog = new THREE.FogExp2(0x0d0d0d, 0.002);

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 5;

    const renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        alpha: true,
        antialias: true
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Geometry - Globe with Images in Triangles
    const sphere = new THREE.Group(); // Use a Group to hold both meshes
    scene.add(sphere);

    const baseGeometry = new THREE.IcosahedronGeometry(2, 1);

    // Load Images
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
        'images/bar%20units/IMG_5999.JPG'
    ];

    const globeMaterials = imageUrls.map(url => {
        return new THREE.MeshBasicMaterial({
            map: textureLoader.load(url,
                undefined, // onLoad
                undefined, // onProgress
                (err) => console.error('Error loading texture:', url, err) // onError
            ),
            side: THREE.DoubleSide,
            transparent: false, // Opaque to prevent sorting artifacts
            color: 0xffffff // White fallback if texture fails
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

    // Textured Mesh
    const globeMesh = new THREE.Mesh(geometry, globeMaterials);
    globeMesh.scale.setScalar(0.998); // Tiny bit smaller to avoid z-fighting
    sphere.add(globeMesh);

    // Wireframe Overlay
    const wireframeMat = new THREE.MeshBasicMaterial({
        color: 0xd4af37,
        wireframe: true,
        transparent: true,
        opacity: 0.3
    });
    // Use the SAME geometry as globeMesh so they explode together
    const wireframeMesh = new THREE.Mesh(geometry, wireframeMat);
    wireframeMesh.scale.setScalar(1.002); // Tiny bit larger
    sphere.add(wireframeMesh);

    // Particles
    const particlesGeometry = new THREE.BufferGeometry();
    const particleCount = 700;
    const posArray = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount * 3; i++) {
        // Random positions within a spread
        posArray[i] = (Math.random() - 0.5) * 15;
    }

    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    const particlesMaterial = new THREE.PointsMaterial({
        size: 0.02,
        color: 0xffffff,
        transparent: true,
        opacity: 0.5
    });
    const particlesMesh = new THREE.Points(particlesGeometry, particlesMaterial);
    scene.add(particlesMesh);

    // Light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
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
        sphere.rotation.y += 0.002;
        sphere.rotation.x += 0.001;

        // Interactive rotation based on mouse
        sphere.rotation.y += mouseX * 0.05;
        sphere.rotation.x += mouseY * 0.05;

        // Particle movement
        particlesMesh.rotation.y = -elapsedTime * 0.05;
        particlesMesh.rotation.x = mouseY * 0.1;

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

# Camera-Based Placement (No Hit-Test Required)

Replace the entire `render()` function (around line 542) with this:

```javascript
function render(timestamp, frame) {
    if (frame) {
        const referenceSpace = renderer.xr.getReferenceSpace();
        const session = renderer.xr.getSession();

        if (hitTestSourceRequested === false) {
            session.addEventListener("end", onSessionEnded);
            
            // Show drop button when AR session starts
            if (dropButton) {
                dropButton.style.display = 'block';
                dropButton.disabled = false; // Always enabled
            }
            
            console.log('✓ AR session started (camera-based placement)');
            hitTestSourceRequested = true;
        }
        
        // Place reticle 1.5m in front of camera at ground level
        camera.updateMatrixWorld();
        
        const cameraDirection = new THREE.Vector3(0, 0, -1);
        cameraDirection.applyQuaternion(camera.quaternion);
        
        const reticlePos = new THREE.Vector3();
        reticlePos.copy(camera.position);
        reticlePos.addScaledVector(cameraDirection, 1.5); // 1.5m forward
        reticlePos.y = camera.position.y - 1.3; // Ground level
        
        reticle.position.copy(reticlePos);
        reticle.rotation.set(-Math.PI / 2, 0, 0);
        reticle.visible = true;
        reticle.matrixAutoUpdate = true;
        
        reticle.updateMatrix();
        lastReticleMatrix = reticle.matrix.clone();
    }

    // Update frustum culling for dropped objects
    camera.updateMatrixWorld();
    cameraMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    frustum.setFromProjectionMatrix(cameraMatrix);
    
    // Capture camera snapshot
    if (frame && timestamp % 10 < 16) {
        currentCameraSnapshot = captureCanvasSnapshot();
    }
    
    droppedObjects.forEach(drop => {
        if (drop.mesh) {
            drop.mesh.visible = frustum.containsPoint(drop.mesh.position);
            
            drop.mesh.traverse(child => {
                if (child.userData && child.userData.lookAtCamera) {
                    child.lookAt(camera.position);
                }
            });
        }
    });

    renderer.render(scene, camera);
}
```

Also, in the `init()` function around line 347, change:

```javascript
reticle.matrixAutoUpdate = false;  // OLD
```

to:

```javascript
reticle.matrixAutoUpdate = true;   // NEW - enable for camera-based movement
```

And simplify `onDropButtonClick()` (around line 354) - remove the surface normal check:

```javascript
function onDropButtonClick() {
    // Reticle shows where object will be placed
    lastReticleMatrix = reticle.matrix.clone();

    let newModel = items[itemSelectedIndex].clone();
    newModel.visible = true;
    
    // Place at reticle position
    newModel.position.copy(reticle.position);
    newModel.quaternion.copy(reticle.quaternion);
    
    let scaleFactor = modelScaleFactor[itemSelectedIndex];
    newModel.scale.set(scaleFactor, scaleFactor, scaleFactor);

    scene.add(newModel);

    // Rest of function stays the same (GPS reporting, persistence)
    const worldPos = newModel.position.clone();
    const approxGeo = localToLatLon(worldPos);
    if (approxGeo) {
        console.log('Dropped object approximate GPS:', approxGeo);
        const coords = `${approxGeo.lat.toFixed(6)}, ${approxGeo.lon.toFixed(6)}`;
        showToast(`Lat: ${approxGeo.lat.toFixed(6)}, Lon: ${approxGeo.lon.toFixed(6)}`);
        
        const hudLast = document.getElementById('hud-last');
        if (hudLast) hudLast.textContent = coords;
        
        const dropSnapshot = captureCanvasSnapshot();
        
        persistCoordinates({
            modelIndex: itemSelectedIndex,
            lat: approxGeo.lat,
            lon: approxGeo.lon,
            alt: approxGeo.alt,
            localPos: { x: worldPos.x, y: worldPos.y, z: worldPos.z },
            quaternion: { x: newModel.quaternion.x, y: newModel.quaternion.y, z: newModel.quaternion.z, w: newModel.quaternion.w },
            hitTestMatrix: Array.from(lastReticleMatrix.elements),
            planeMetadata: extractPlaneMetadata(lastReticleMatrix),
            cameraSnapshot: dropSnapshot,
            timestamp: Date.now()
        });
    } else {
        showToast('GPS not available; showing local placement only');
    }
}
```

This removes all hit-test dependencies. The reticle now follows camera direction at a fixed distance.

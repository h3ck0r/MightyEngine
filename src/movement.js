import { mat4, vec3 } from 'gl-matrix';
import { globals } from "./globals.js";

export function updateCamera(modelViewProjectionMatrix, webClient) {
    globals.camera.cameraRotation[0] = -globals.mouseDelta.y;
    globals.camera.cameraRotation[1] = -globals.mouseDelta.x;

    let yaw = globals.camera.cameraRotation[1];
    let pitch = globals.camera.cameraRotation[0];

    let forward = vec3.fromValues(
        Math.cos(pitch) * Math.sin(yaw),
        Math.sin(pitch),
        Math.cos(pitch) * Math.cos(yaw)
    );

    let right = vec3.fromValues(
        Math.cos(yaw),
        0,
        -Math.sin(yaw)
    );

    let up = vec3.fromValues(0, 1, 0);
    vec3.cross(right, forward, up);

    if (globals.keyboardKeys["ShiftLeft"] || globals.keyboardKeys["ShiftRight"]) {
        globals.camera.moveSpeed = globals.camera.baseMoveSpeed * globals.camera.speedup;
    } else {
        globals.camera.moveSpeed = globals.camera.baseMoveSpeed;
    }

    let moveSpeed = globals.camera.moveSpeed;
    let movement = vec3.create();

    if (globals.keyboardKeys["KeyW"]) {
        vec3.scaleAndAdd(movement, movement, forward, moveSpeed);
    }
    if (globals.keyboardKeys["KeyS"]) {
        vec3.scaleAndAdd(movement, movement, forward, -moveSpeed);
    }
    if (globals.keyboardKeys["KeyA"]) {
        vec3.scaleAndAdd(movement, movement, right, -moveSpeed);
    }
    if (globals.keyboardKeys["KeyD"]) {
        vec3.scaleAndAdd(movement, movement, right, moveSpeed);
    }
    if (globals.keyboardKeys["Space"]) {
        vec3.scaleAndAdd(movement, movement, up, moveSpeed);
    }

    vec3.add(globals.camera.cameraPosition, globals.camera.cameraPosition, movement);

    webClient.sendPlayerPosition(globals.camera.cameraPosition, globals.camera.cameraRotation);

    let viewMatrix = mat4.create();
    let target = vec3.create();
    vec3.add(target, globals.camera.cameraPosition, forward);
    mat4.lookAt(viewMatrix, globals.camera.cameraPosition, target, up);

    let projectionMatrix = mat4.create();
    mat4.perspective(projectionMatrix, Math.PI / 4, globals.camera.aspect, globals.camera.nearCamera, globals.camera.farCamera);

    mat4.multiply(modelViewProjectionMatrix, projectionMatrix, viewMatrix);
}

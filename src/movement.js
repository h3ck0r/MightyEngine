import { mat4, vec3 } from "https://cdn.jsdelivr.net/npm/gl-matrix@3.4.3/+esm";
import { globals } from "./setup";

export function updateCamera(modelViewProjectionMatrix, webClient) {
    globals.cameraRotation[0] = -globals.mouseDelta.y;
    globals.cameraRotation[1] = -globals.mouseDelta.x;

    let yaw = globals.cameraRotation[1];
    let pitch = globals.cameraRotation[0];

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
        globals.moveSpeed = globals.baseMoveSpeed * 3.5;
    } else {
        globals.moveSpeed = globals.baseMoveSpeed;
    }


    let moveSpeed = globals.moveSpeed;
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

    vec3.add(globals.cameraPosition, globals.cameraPosition, movement);

    webClient.sendPlayerPosition(globals.cameraPosition, globals.cameraRotation);
    
    let viewMatrix = mat4.create();
    let target = vec3.create();
    vec3.add(target, globals.cameraPosition, forward);
    mat4.lookAt(viewMatrix, globals.cameraPosition, target, up);

    let projectionMatrix = mat4.create();
    mat4.perspective(projectionMatrix, Math.PI / 4, globals.aspect, globals.nearCamera, globals.farCamer);

    mat4.multiply(modelViewProjectionMatrix, projectionMatrix, viewMatrix);
}

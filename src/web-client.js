
import { GameObject } from "./game-object";

export class WebClient {
    constructor(connectionStr, scene) {
        this.socket = new WebSocket(connectionStr);
        this.players = {};
        this.scene = scene;
        this.playerId = null;
        this.initWebHandlers();
    }
    initWebHandlers() {
        this.socket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.type === "init") {
                this.players = data.players;
                this.playerId = data.id;
                for (const [id, player] of Object.entries(this.players)) {
                    if (id == this.playerId) {
                        continue;
                    }
                    this.scene.addPlayer(player, id);
                }
            }
            else if (data.type === "new_player") {
                if (data.id == this.playerId) {
                    return;
                }
                this.scene.addPlayer({ x: data.position.x, y: data.position.y, z: data.position.z }, data.id);
            }
            else if (data.type === "update") {
                if (data.id == this.playerId) {
                    return;
                }
                this.scene.players[data.id].position[0] = data.position.x;
                this.scene.players[data.id].position[1] = data.position.y-0.65;
                this.scene.players[data.id].position[2] = data.position.z;

                this.scene.players[data.id].rotation[0] = -data.position.rx;
                this.scene.players[data.id].rotation[1] = data.position.ry;

            }
            else if (data.type === "remove") {
                delete this.players[data.id];
            }
        };
    }
    sendPlayerPosition(position, rotation) {
        if (this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({
                type: "move",
                id: this.playerId,
                position: { x: position[0], y: position[1], z: position[2], rx: rotation[0], ry: rotation[1] },

            }));
        } else {
            console.warn("WebSocket not open. Skipping position update.");
        }
    }

}

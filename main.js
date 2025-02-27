import { Engine } from "./src/engine.js";

async function main() {
    const engine = new Engine();
    await engine.init();
    engine.run();
}

main();
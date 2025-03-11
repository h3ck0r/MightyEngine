import { Engine } from "./src/engine.js";

const engine = new Engine();
window.engine = engine;

async function main() {
    console.log("Welcome to Mighty Engine ₍^. .^₎⟆")
    await engine.init();
    engine.run();
}

main();

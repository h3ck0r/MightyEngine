export function creatRenderPasses(renderTextureViews) {
    const clearValue = { r: 0.15, g: 0.15, b: 0.2, a: 1 };
    const scenePass = {
        colorAttachments: [{
            view: renderTextureViews.sceneTextureView,
            loadOp: "clear",
            clearValue: clearValue,
            storeOp: "store"
        }],
        depthStencilAttachment: {
            view: renderTextureViews.depthView,
            depthLoadOp: "clear",
            depthClearValue: 1.0,
            depthStoreOp: "store"
        }
    };
    const pointLightPass = {
        colorAttachments: [{
            view: renderTextureViews.sceneTextureView,
            loadOp: "load",
            clearValue: clearValue,
            storeOp: "store"
        }],
        depthStencilAttachment: {
            view: renderTextureViews.depthView,
            depthLoadOp: "load",
            depthClearValue: 1.0,
            depthStoreOp: "store"
        }
    };
    const bloomPass = {
        colorAttachments: [{
            view: renderTextureViews.bloomTextureView,
            loadOp: "clear",
            clearValue: clearValue,
            storeOp: "store"
        }]
    };
    const blurHPass = {
        colorAttachments: [{
            view: renderTextureViews.blurHTextureView,
            loadOp: "clear",
            clearValue: clearValue,
            storeOp: "store"
        }]
    };
    const blurVPass = {
        colorAttachments: [{
            view: renderTextureViews.blurVTextureView,
            loadOp: "clear",
            clearValue: clearValue,
            storeOp: "store"
        }]
    };
    const postProcessPass = {
        colorAttachments: [{
            view: null,
            loadOp: "clear",
            clearValue: clearValue,
            storeOp: "store"
        }]
    };
    return {
        scenePass,
        pointLightPass,
        bloomPass,
        blurHPass,
        blurVPass,
        postProcessPass
    };
}

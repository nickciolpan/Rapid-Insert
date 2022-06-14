var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
/**
 * Utility functions to help parse the *documents* Figma tree
 */
function* walkTree(node) {
    yield node;
    let children = node.children;
    if (children) {
        for (let child of children) {
            yield* walkTree(child);
        }
    }
}
let latestPreview = null;
const useWalker = (source) => {
    const sourcePage = figma.root.children.find(page => page.name === source);
    let walker = walkTree(sourcePage);
    return { walker };
};
const findAll = (query, source, level = null) => {
    // If no query is provided, return no results
    if (query.length <= 1)
        return [];
    const { walker } = useWalker(source);
    const nodes = [];
    let res;
    const isMatch = (name) => {
        return name.toLowerCase().includes(query.toLowerCase());
    };
    while (!(res = walker.next()).done) {
        let node = res.value;
        if (node.type === (level !== null && level !== void 0 ? level : 'INSTANCE') && isMatch(node.name)) {
            nodes.push(node);
        }
    }
    return nodes;
};
const findOne = (match, source, level = null) => {
    const { walker } = useWalker(source);
    let res;
    let result;
    while (!(res = walker.next()).done) {
        let node = res.value;
        if (node.type === (level !== null && level !== void 0 ? level : 'INSTANCE') && node.name === match) {
            result = node;
        }
    }
    return result;
};
const generateResults = (msg) => {
    const results = findAll(msg.componentName, msg.source, msg.level);
    figma.ui.postMessage({
        type: 'results',
        results: Array.from(new Map(results.map(r => [r.name, r])).keys())
    });
};
const generatePreview = (msg) => {
    const node = findOne(msg.componentName, msg.source, msg.level);
    if (!!latestPreview) {
        try {
            latestPreview.remove();
        }
        catch (e) {
            latestPreview = null;
        }
    }
    if (!!node) {
        node.visible = true;
        latestPreview = node.clone();
        figma.currentPage.selection = [latestPreview];
        figma.viewport.scrollAndZoomIntoView([latestPreview]);
    }
};
// Runs this code if the plugin is run in Figma
if (figma.editorType === 'figma') {
    // This plugin will open a window to prompt the user to enter a number, and
    // it will then create that many rectangles on the screen.
    // This shows the HTML page in "ui.html".
    figma.showUI(__html__);
    figma.ui.resize(300, 300);
    // Calls to "parent.postMessage" from within the HTML page will trigger this
    // callback. The callback will be passed the "pluginMessage" property of the
    // posted message.
    figma.ui.onmessage = (msg) => __awaiter(this, void 0, void 0, function* () {
        // One way of distinguishing between different types of messages sent from
        // your HTML page is to use an object with a "type" property like this.
        if (msg.type === 'fetch-pages') {
            const pages = figma.root.children;
            figma.ui.postMessage({ type: 'pages', figma: figma, pages: pages.map(r => ({ title: r.name, id: r.id })) });
        }
        if (msg.type === 'get-current-source') {
            figma.ui.postMessage({
                type: 'retrieved-current-source',
                source: yield figma.clientStorage.getAsync('source')
            });
        }
        if (msg.type === 'update-source') {
            try {
                latestPreview.remove();
            }
            catch (e) {
                latestPreview = null;
            }
            latestPreview = null;
            yield figma.clientStorage.setAsync('source', msg.source);
            const results = findAll(msg.componentName, msg.source, msg.level);
            if (results.length > 0) {
                generatePreview(msg);
                generateResults(msg);
            }
            else {
                generateResults(msg);
            }
        }
        if (msg.type === 'fetch-results') {
            generateResults(msg);
        }
        if (msg.type === 'preview:remove') {
            if (!!latestPreview) {
                try {
                    latestPreview.remove();
                }
                catch (e) {
                    latestPreview = null;
                }
            }
            latestPreview = null;
        }
        if (msg.type === 'preview:insert') {
            // The node is already insered at this point
            // We just need to close the plugin
            if (!!latestPreview) {
                latestPreview = null;
                figma.closePlugin();
            }
        }
        if (msg.type === 'preview') {
            generatePreview(msg);
        }
        if (msg.type === 'insert-component') {
            const node = findOne(msg.componentName, msg.source, msg.level);
            node.visible = true;
            const clone = node.clone();
            figma.currentPage.selection = [clone];
            figma.viewport.scrollAndZoomIntoView([clone]);
        }
        if (msg.type === 'cancel') {
            figma.closePlugin();
        }
        // Make sure to close the plugin when you're done. Otherwise the plugin will
        // keep running, which shows the cancel button at the bottom of the screen.
    });
    // If the plugins isn't run in Figma, run this code
}
else {
    // This plugin will open a window to prompt the user to enter a number, and
    // it will then create that many shapes and connectors on the screen.
    // This shows the HTML page in "ui.html".
    figma.showUI(__html__);
    // Calls to "parent.postMessage" from within the HTML page will trigger this
    // callback. The callback will be passed the "pluginMessage" property of the
    // posted message.
    figma.ui.onmessage = msg => {
        // One way of distinguishing between different types of messages sent from
        // your HTML page is to use an object with a "type" property like this.
        if (msg.type === 'insert-node') {
            const numberOfShapes = msg.count;
            const nodes = [];
            for (let i = 0; i < numberOfShapes; i++) {
                const shape = figma.createShapeWithText();
                // You can set shapeType to one of: 'SQUARE' | 'ELLIPSE' | 'ROUNDED_RECTANGLE' | 'DIAMOND' | 'TRIANGLE_UP' | 'TRIANGLE_DOWN' | 'PARALLELOGRAM_RIGHT' | 'PARALLELOGRAM_LEFT'
                shape.shapeType = 'ROUNDED_RECTANGLE';
                shape.x = i * (shape.width + 200);
                shape.fills = [{ type: 'SOLID', color: { r: 1, g: 0.5, b: 0 } }];
                figma.currentPage.appendChild(shape);
                nodes.push(shape);
            }
            ;
            for (let i = 0; i < (numberOfShapes - 1); i++) {
                const connector = figma.createConnector();
                connector.strokeWeight = 8;
                connector.connectorStart = {
                    endpointNodeId: nodes[i].id,
                    magnet: 'AUTO',
                };
                connector.connectorEnd = {
                    endpointNodeId: nodes[i + 1].id,
                    magnet: 'AUTO',
                };
            }
            ;
            figma.currentPage.selection = nodes;
            figma.viewport.scrollAndZoomIntoView(nodes);
        }
        // Make sure to close the plugin when you're done. Otherwise the plugin will
        // keep running, which shows the cancel button at the bottom of the screen.
        figma.closePlugin();
    };
}
;

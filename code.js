// This file holds the main code for the plugin. It has access to the *document*.
// You can access browser APIs such as the network by creating a UI which contains
// a full browser environment (see documentation).
// Two helper functions that can help you perform traversals are node.findOne and node.findAll.
function* walkTree(node) {
    yield node;
    let children = node.children;
    if (children) {
        for (let child of children) {
            yield* walkTree(child);
        }
    }
}
// Runs this code if the plugin is run in Figma
if (figma.editorType === 'figma') {
    // This plugin will open a window to prompt the user to enter a number, and
    // it will then create that many rectangles on the screen.
    // This shows the HTML page in "ui.html".
    figma.showUI(__html__);
    // Calls to "parent.postMessage" from within the HTML page will trigger this
    // callback. The callback will be passed the "pluginMessage" property of the
    // posted message.
    const getNodes = (query, source, level = null) => {
        const nodes = [];
        const sourcePage = figma.root.children.find(page => page.id === source);
        let walker = walkTree(sourcePage);
        let res;
        while (!(res = walker.next()).done) {
            let node = res.value;
            if (node.type === (level !== null && level !== void 0 ? level : 'INSTANCE') && node.name.toLowerCase().includes(query.toLowerCase())) {
                nodes.push(node);
            }
        }
        return nodes;
    };
    const getNode = (match, source, level = null) => {
        const sourcePage = figma.root.children.find(page => page.id === source);
        let walker = walkTree(sourcePage);
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
    figma.ui.onmessage = msg => {
        // One way of distinguishing between different types of messages sent from
        // your HTML page is to use an object with a "type" property like this.
        if (msg.type === 'fetch-pages') {
            const pages = figma.root.children;
            figma.ui.postMessage({ type: 'pages', pages: pages.map(r => ({ title: r.name, id: r.id })) });
        }
        if (msg.type === 'fetch-results') {
            const results = getNodes(msg.componentName, msg.source, msg.level);
            figma.ui.postMessage({ type: 'results', results: results.map(r => r.name) });
        }
        if (msg.type === 'insert-component') {
            getNode(msg.componentName, msg.source, msg.level).clone();
            // figma.closePlugin();
        }
        // Make sure to close the plugin when you're done. Otherwise the plugin will
        // keep running, which shows the cancel button at the bottom of the screen.
    };
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

/**
 * Utility functions to help parse the *documents* Figma tree
 */
function* walkTree(node: any) {
  yield node;
  let children = node.children;
  if (children) {
    for (let child of children) {
      yield* walkTree(child)
    }
  }
}

const useWalker = (source) => {
  const sourcePage = figma.root.children.find(page => page.name === source)
  let walker = walkTree(sourcePage)
  return {walker};
}
const findAll = (query: string, source: any, level = null) => {
    // If no query is provided, return no results
    if (query.length === 0) return [];

    const { walker } = useWalker(source);
    const nodes = [];
    let res: { value: any; };

    while (!(res = walker.next()).done) {
      let node = res.value
      if (node.type === (level ?? 'INSTANCE') && node.name.toLowerCase().includes(query.toLowerCase())) {
        nodes.push(node);
      }
    }
    
    return nodes;
}

const findOne = (match: any, source: any, level = null) => {
    const { walker } = useWalker(source);
    let res: { value: any; };
    let result: any;

    while (!(res = walker.next()).done) {
      let node = res.value
      if (node.type === (level ?? 'INSTANCE') && node.name === match) {
        result = node;
      }
    }
    
    return result;
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
  figma.ui.onmessage = async msg => {
    // One way of distinguishing between different types of messages sent from
    // your HTML page is to use an object with a "type" property like this.
    if (msg.type === 'fetch-pages') {
      const pages = figma.root.children;
      figma.ui.postMessage({type: 'pages',figma: figma,  pages: pages.map(r => ({title: r.name, id: r.id}))});
    }

    if (msg.type === 'get-current-source') {
      figma.ui.postMessage({
        type: 'retrieved-current-source', 
        source: await figma.clientStorage.getAsync('source')
      });
    }

    if (msg.type === 'update-source') {
      figma.clientStorage.setAsync('source', msg.source);
    }

    if (msg.type === 'fetch-results') {
      const results = findAll(msg.componentName, msg.source, msg.level);
      figma.ui.postMessage({
        type: 'results', 
        results: Array.from(new Map(results.map(r => [r.name, r])).keys())
        // results: results.map(r => r.name)
      });
    }

    if (msg.type === 'insert-component') {
      const node = findOne(msg.componentName, msg.source, msg.level)
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
  };

// If the plugins isn't run in Figma, run this code
} else {
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
      const nodes: SceneNode[] = [];
      for (let i = 0; i < numberOfShapes; i++) {
        const shape = figma.createShapeWithText();
        // You can set shapeType to one of: 'SQUARE' | 'ELLIPSE' | 'ROUNDED_RECTANGLE' | 'DIAMOND' | 'TRIANGLE_UP' | 'TRIANGLE_DOWN' | 'PARALLELOGRAM_RIGHT' | 'PARALLELOGRAM_LEFT'
        shape.shapeType = 'ROUNDED_RECTANGLE'
        shape.x = i * (shape.width + 200);
        shape.fills = [{type: 'SOLID', color: {r: 1, g: 0.5, b: 0}}];
        figma.currentPage.appendChild(shape);
        nodes.push(shape);
      };

      for (let i = 0; i < (numberOfShapes - 1); i++) {
        const connector = figma.createConnector();
        connector.strokeWeight = 8

        connector.connectorStart = {
          endpointNodeId: nodes[i].id,
          magnet: 'AUTO',
        };

        connector.connectorEnd = {
          endpointNodeId: nodes[i+1].id,
          magnet: 'AUTO',
        };
      };

      figma.currentPage.selection = nodes;
      figma.viewport.scrollAndZoomIntoView(nodes);
    }

    // Make sure to close the plugin when you're done. Otherwise the plugin will
    // keep running, which shows the cancel button at the bottom of the screen.
    figma.closePlugin();
  };
};

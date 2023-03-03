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

let latestPreview = null;

const useWalker = (source) => {
  const sourcePage = figma.root.children.find(page => page.name === source)
  let walker = walkTree(sourcePage)
  return {walker};
}
const findAll = (query: string, source: any) => {
    // If no query is provided, return no results
    if (query.length <= 1) return [];

    const { walker } = useWalker(source);
    const nodes = [];
    let res: { value: any; };

    const isMatch = (name) => {
      return name.toLowerCase().includes(query.toLowerCase())
    }

    while (!(res = walker.next()).done) {
      let node = res.value
      if (isMatch(node.name) && node.type !== 'PAGE') {
        nodes.push(node);
      } 
    }
    
    return nodes;
}

const findOne = (match: any, source: any) => {
    const { walker } = useWalker(source);
    let res: { value: any; };
    let result: any;

    while (!(res = walker.next()).done) {
      let node = res.value
      if (node.name === match && node.type !== 'PAGE') {
        result = node;
      } 
    }
    
    return result;
}

const generateResults = (msg) => {
  console.log(msg);
  const results = findAll(msg.componentName, msg.source);
  figma.ui.postMessage({
    type: 'results', 
    results: Array.from(new Map(results.map(r => [r.name, r])).keys())
  });
}

const generatePreview = (msg) => {
  const node = findOne(msg.componentName, msg.source)
  if (!!latestPreview) {
    try {

      latestPreview.remove();
    } catch (e) {
      latestPreview = null;
    }
  }

  if (!!node) {
    node.visible = true;
    latestPreview = node.type === 'COMPONENT' ? node.createInstance() :  node.clone();
    latestPreview.x = figma.viewport.center.x - (latestPreview.width/2);
    latestPreview.y = figma.viewport.center.y - (latestPreview.height/2);
    figma.currentPage.selection = [latestPreview];
  }
}


// This plugin will open a window to prompt the user to enter a number, and
// it will then create that many rectangles on the screen.

// This shows the HTML page in "ui.html".
figma.showUI(__html__);
figma.ui.resize(300, 300);
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
    try { 
      latestPreview.remove();
    } catch (e) {
      latestPreview = null;
    }

    latestPreview = null;
    await figma.clientStorage.setAsync('source', msg.source);
    const results = findAll(msg.componentName, msg.source);

    if (results.length > 0) {
      generatePreview(msg);
      generateResults(msg);
    } else  {
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
      } catch (e) {
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
    const node = findOne(msg.componentName, msg.source)
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
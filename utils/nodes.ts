// Export a flatten array containing al children nodes in the target node
export function* walkTree(node: any) {
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
export const findAll = (query: string, source: any, level = null) => {
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

export const findOne = (match: any, source: any, level = null) => {
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
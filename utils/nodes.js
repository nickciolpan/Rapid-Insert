// Export a flatten array containing al children nodes in the target node
export function* walkTree(node) {
    yield node;
    let children = node.children;
    if (children) {
        for (let child of children) {
            yield* walkTree(child);
        }
    }
}
const useWalker = (source) => {
    const sourcePage = figma.root.children.find(page => page.name === source);
    let walker = walkTree(sourcePage);
    return { walker };
};
export const findAll = (query, source, level = null) => {
    // If no query is provided, return no results
    if (query.length === 0)
        return [];
    const { walker } = useWalker(source);
    const nodes = [];
    let res;
    while (!(res = walker.next()).done) {
        let node = res.value;
        if (node.type === (level !== null && level !== void 0 ? level : 'INSTANCE') && node.name.toLowerCase().includes(query.toLowerCase())) {
            nodes.push(node);
        }
    }
    return nodes;
};
export const findOne = (match, source, level = null) => {
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

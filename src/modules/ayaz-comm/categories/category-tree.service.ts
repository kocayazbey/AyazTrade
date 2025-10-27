import { Injectable } from '@nestjs/common';

@Injectable()
export class CategoryTreeService {
  buildTree(categories: any[], parentId: string | null = null): any[] {
    const tree = [];

    const children = categories.filter(cat => cat.parentId === parentId);

    for (const child of children) {
      const node = {
        ...child,
        children: this.buildTree(categories, child.id),
      };
      tree.push(node);
    }

    return tree;
  }

  flattenTree(tree: any[]): any[] {
    const flattened = [];

    const traverse = (nodes: any[], level: number = 0) => {
      for (const node of nodes) {
        flattened.push({
          ...node,
          level,
          hasChildren: node.children && node.children.length > 0,
        });

        if (node.children && node.children.length > 0) {
          traverse(node.children, level + 1);
        }
      }
    };

    traverse(tree);

    return flattened;
  }

  findNode(tree: any[], categoryId: string): any | null {
    for (const node of tree) {
      if (node.id === categoryId) {
        return node;
      }

      if (node.children && node.children.length > 0) {
        const found = this.findNode(node.children, categoryId);
        if (found) {
          return found;
        }
      }
    }

    return null;
  }

  getAncestors(tree: any[], categoryId: string): any[] {
    const ancestors = [];

    const findAncestors = (nodes: any[], targetId: string, path: any[]): boolean => {
      for (const node of nodes) {
        if (node.id === targetId) {
          ancestors.push(...path);
          return true;
        }

        if (node.children && node.children.length > 0) {
          if (findAncestors(node.children, targetId, [...path, node])) {
            return true;
          }
        }
      }

      return false;
    };

    findAncestors(tree, categoryId, []);

    return ancestors;
  }

  getDescendants(node: any): any[] {
    const descendants = [];

    const traverse = (current: any) => {
      if (current.children && current.children.length > 0) {
        for (const child of current.children) {
          descendants.push(child);
          traverse(child);
        }
      }
    };

    traverse(node);

    return descendants;
  }
}


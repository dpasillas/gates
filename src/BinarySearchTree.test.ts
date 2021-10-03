import BinarySearchTree from "./BinarySearchTree";

test('renders learn react link', () => {
  let bst = new BinarySearchTree<number>({cmp: (a, b) =>  a - b});

  for (let i = 1; i <= 16; ++i) {
    bst.insert(i);
  }

  let f = bst.first();
  expect(f).toBe(1);
  expect(bst.size()).toBe(16);

  for (let i = 0; i < 16; ++i) {
    bst.remove(i);
  }

  bst.insert(5);
  expect(bst.size()).toBe(2);
});
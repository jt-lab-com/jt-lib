export function randArray(array: any[]) {
  const randIndex = Math.floor(Math.random() * array.length);
  return array[randIndex];
}

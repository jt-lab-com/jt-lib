// getAllObjectFunctions = (toCheck: Object): string[] => {
//     const props = [];
//     let obj = toCheck;
//
//     if (!obj) return [];
//     while (obj.constructor.name !== 'Object') {
//       props.push(...Object.getOwnPropertyNames(obj));
//       obj = Object.getPrototypeOf(obj);
//     }
//
//     return props.sort().filter((e, i, arr) => {
//       if (e != arr[i + 1] && typeof toCheck[e] == 'function') return true;
//     });
//   };

export function objectGetAllFunctions(obj: any): string[] {
  const props: string[] = [];
  let currentObj: any = obj;

  if (!currentObj) return [];

  while (currentObj.constructor.name !== 'Object') {
    props.push(...Object.getOwnPropertyNames(currentObj));
    currentObj = Object.getPrototypeOf(currentObj);
  }

  return props.sort().filter((e, i, arr) => {
    return e !== arr[i + 1] && typeof obj[e] === 'function';
  });
}

export function objectGetAllProperties(obj: any): string[] {
  const props: string[] = [];
  let currentObj: any = obj;

  if (!currentObj) return [];

  while (currentObj.constructor.name !== 'Object') {
    props.push(...Object.getOwnPropertyNames(currentObj));
    currentObj = Object.getPrototypeOf(currentObj);
  }

  return props.sort().filter((e, i, arr) => {
    return e !== arr[i + 1] && typeof obj[e] !== 'function';
  });
}
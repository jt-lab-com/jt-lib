

export function objectGetAllFunctions(obj: any): string[] {
  if (obj == null) return [];

  const fns: string[] = [];
  let current: any = obj;

  // Идём по прототипам до Object.prototype; для null-прото — остановимся на null.
  while (current && current !== Object.prototype) {
    for (const name of Object.getOwnPropertyNames(current)) {
      const desc = Object.getOwnPropertyDescriptor(current, name);
      // Берём только свойства-значения, которые являются функциями (без аксессоров)
      if (desc && 'value' in desc && typeof desc.value === 'function') {
        fns.push(name);
      }
    }
    current = Object.getPrototypeOf(current);
  }

  // Уберём дубли и служебный constructor
  return Array.from(new Set(fns))
    .filter((n) => n !== 'constructor')
    .sort();
}
export function objectGetAllProperties(obj: any): string[] {
  if (obj == null) return [];

  const props: string[] = [];
  let current: any = obj;


  while (current && current !== Object.prototype) {
    for (const name of Object.getOwnPropertyNames(current)) {
      const desc = Object.getOwnPropertyDescriptor(current, name);
      // Берём только «значенческие» свойства, не функции и не аксессоры
      if (desc && 'value' in desc && typeof desc.value !== 'function') {
        props.push(name);
      }
    }

    const nextProto = Object.getPrototypeOf(current);
    if (nextProto === null) break;
    current = nextProto;
  }

  // Удаляем дубли и сортируем
  return Array.from(new Set(props)).sort();
}



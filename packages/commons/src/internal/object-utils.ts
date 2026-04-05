// Recursively checks for specific properties on nested objects and removes them.
export const removeProps = (obj: any, ...props: string[]): any => {
  const maxDepth = 3;
  const removePropsRecursive = (inputObj: any, currentDepth: number): any => {
    if (currentDepth <= maxDepth) {
      const newObj: any = Array.isArray(inputObj) ? [] : {};
      for (const key in inputObj) {
        if (props.includes(key)) {
          // noinspection UnnecessaryContinueJS
          continue;
        } else if (
          typeof inputObj[key] === "object" &&
          inputObj[key] !== null
        ) {
          newObj[key] = removePropsRecursive(inputObj[key], currentDepth + 1);
        } else {
          newObj[key] = inputObj[key];
        }
      }
      return newObj;
    }
    return inputObj;
  };
  return removePropsRecursive(obj, 1);
};

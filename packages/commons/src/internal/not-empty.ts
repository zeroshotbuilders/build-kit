export const notEmpty = (value: any): boolean => {
  return (
    value !== null &&
    value !== undefined &&
    // proto numbers
    value !== 0 &&
    value !== "" &&
    // proto enums
    !(typeof value == "string" && value.toLowerCase().includes("unknown"))
  );
};

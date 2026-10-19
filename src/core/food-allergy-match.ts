const groups = [
  [
    "susu",
    "susu sapi",
    "milk",
    "dairy",
    "whey",
    "casein",
    "kasein",
    "laktosa",
    "lactose",
  ],
  ["kacang tanah", "peanut", "peanuts"],
  ["kedelai", "soy", "soya", "soybean", "soybeans"],
  ["gandum", "wheat", "gluten"],
  ["telur", "egg", "eggs"],
  ["ikan", "fish"],
  ["udang", "shrimp", "shrimps", "crustacean", "crustaceans"],
  ["wijen", "sesame"],
  ["almond", "almonds", "tree nut", "tree nuts"],
];
export function allergyConflict(text: string, allergies: string[]) {
  const words = text
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  return allergies.some((a) => {
    const n = a.toLowerCase().trim();
    const group = groups.find((g) => g.includes(n));
    return (group ?? [n]).some(
      (t) =>
        t.length > 0 &&
        new RegExp(
          `(?:^|[^a-z])${t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:$|[^a-z])`,
          "i",
        ).test(words),
    );
  });
}

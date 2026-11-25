

export type University = {
  name: string;
  country?: string;
  status: "Considering" | "Applying" | "Applied";
  supplementals?: Record<string, string>;
};


export type University = {
  name: string;
  country?: string;
  status: "Considering" | "Applying" | "Applied";
  deadline: number;
  supplementals?: Record<string, string>;
};
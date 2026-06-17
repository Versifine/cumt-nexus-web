export type ComponentInventoryItem = {
  components: string[];
  file: string;
};

export type ComponentInventoryGroup = {
  description: string;
  id: string;
  items: ComponentInventoryItem[];
  label: string;
};

export type ComponentInventorySummary = {
  componentCount: number;
  fileCount: number;
  groupCount: number;
};

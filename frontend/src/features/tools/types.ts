export type ToolRecord = {
  id: number;
  name: string;
  description: string;
  input_schema: string;
  output_schema: string;
  usable: boolean;
};

export type ToolValidateResponse = {
  valid: boolean;
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
  output_schema: Record<string, unknown>;
  errors: string[];
};

export type ToolCreatePayload = {
  name: string;
  description: string;
  inputSchema: string;
  outputSchema: string;
};

export interface ApiDocDef {
  method: "GET" | "POST" | "PUT" | "DELETE" | string;
  path: string;
  description: string;
  params?: Record<string, string>; // 例如 { "id": "用户ID (必填)" }
  body?: Record<string, string>;
}

export abstract class ApiDocCollector {
  abstract set(data: ApiDocDef): void;
  abstract toMarkdown(): string;
}

export class ApiDocCollectorVoidImpl extends ApiDocCollector {
  toMarkdown(): string {
    return "";
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  set(data: ApiDocDef) {}
}

export class ApiDocCollectorDefaultImpl extends ApiDocCollector {
  toMarkdown(): string {
    return this.apiDocData
      .map((doc) => {
        return `
# ${doc.method} ${doc.path}

${doc.description}

${
  doc.params
    ? `
## Params

${Object.entries(doc.params)
  .map(([k, v]) => `- \`${k}\`: ${v}`)
  .join("\n")}
`
    : ""
}

${
  doc.body
    ? `
## Body

${Object.entries(doc.body)
  .map(([k, v]) => `- \`${k}\`: ${v}`)
  .join("\n")}
`
    : ""
}
`;
      })
      .join("\n---\n");
  }
  private apiDocData: ApiDocDef[] = [];

  set(data: ApiDocDef) {
    this.apiDocData.push(data);
  }
}

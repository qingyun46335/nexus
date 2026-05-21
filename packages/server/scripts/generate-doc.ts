import { createApp } from "../src/app";
import { ApiDocCollectorDefaultImpl } from "../src/utils/api_doc_collector";
import fs from "node:fs";

const collector = new ApiDocCollectorDefaultImpl();

createApp(collector);

const markdown = collector.toMarkdown();

fs.writeFileSync("../../docs/api.md", markdown, "utf-8");

console.log("API docs generated.");

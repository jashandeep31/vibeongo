import {
  defineCollections,
  defineConfig,
  defineDocs,
} from "fumadocs-mdx/config";
import { metaSchema, pageSchema } from "fumadocs-core/source/schema";

// You can customize Zod schemas for frontmatter and `meta.json` here
// see https://fumadocs.dev/docs/mdx/collections
export const docs = defineDocs({
  dir: "content/docs",
  docs: {
    schema: pageSchema,
    postprocess: {
      includeProcessedMarkdown: true,
    },
  },
  meta: {
    schema: metaSchema,
  },
});

export const blogs = defineCollections({
  type: "doc",
  dir: "content/blogs",
  schema: pageSchema.extend({
    author: pageSchema.shape.title.optional(),
    date: pageSchema.shape.title.optional(),
  }),
});

export default defineConfig({
  mdxOptions: {
    // MDX options
  },
});

import type { LambdaEvent, LambdaContext } from "hono/aws-lambda";
import { swaggerUI } from "@hono/swagger-ui";
import { Hono } from "hono";
import {
  describeRoute,
  resolver,
  validator as vValidator,
  openAPIRouteHandler,
} from "hono-openapi";
import { handle } from "hono/aws-lambda";
import { prettyJSON } from "hono/pretty-json";
import * as v from "valibot";

const querySchema = v.object({
  name: v.optional(v.string()),
});

const responseSchema = v.string();

type Bindings = {
  event: LambdaEvent;
  lambdaContext: LambdaContext;
};

const app = new Hono<{ Bindings: Bindings }>().use(prettyJSON()).get(
  "/",
  describeRoute({
    description: "Say hello to the user",
    responses: {
      200: {
        description: "Successful response",
        content: {
          "text/plain": { schema: resolver(responseSchema) },
        },
      },
    },
  }),
  vValidator("query", querySchema),
  (c) => {
    const query = c.req.valid("query");
    return c.text(`Hello ${query?.name ?? "Hono"}!`);
  },
);

app.get("/openapi", (c) => {
  // API Gatewayのステージ名(/dev等)を含むフルURLをSwagger UIのServersに表示するためリクエストコンテキストから動的に構築
  // openAPIRouteHandlerはミドルウェア形式(c, next)を返すため、手動で呼び出す必要がある
  const requestContext = c.env.event.requestContext;
  const baseUrl = (() => {
    if (!("domainName" in requestContext && "stage" in requestContext)) {
      return ".";
    }
    const { domainName, stage } = requestContext;
    // SAM localではステージ名がパスに含まれないため除外
    const isLocal = domainName.startsWith("127.0.0.1") || domainName.startsWith("localhost");
    return isLocal ? `http://${domainName}` : `https://${domainName}/${stage}`;
  })();

  return openAPIRouteHandler(app, {
    documentation: {
      info: {
        title: "Hono AWS Sandbox API",
        version: "0.1.0",
        description: "Hono AWS Sandbox API",
      },
      servers: [{ url: baseUrl }],
    },
  })(c, () => Promise.resolve());
});

// API Gatewayのステージ名(/dev等)を考慮するため相対パスを使用
app.get("/ui", swaggerUI({ url: "./openapi" }));

export const handler = handle(app);
export type AppType = typeof app;

import * as cdk from "aws-cdk-lib";
import * as apigw from "aws-cdk-lib/aws-apigateway";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Construct } from "constructs";

export class ApiStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: cdk.StackProps) {
    super(scope, id, props);

    cdk.Tags.of(this).add("Application", "hono-aws-sandbox");
    cdk.Tags.of(this).add("ManagedBy", "IaC");

    const fn = new NodejsFunction(this, "lambda", {
      entry: "src/lambda/index.ts",
      handler: "handler",
      runtime: lambda.Runtime.NODEJS_22_X,
    });

    new apigw.LambdaRestApi(this, "hono-aws-sandbox", {
      handler: fn,
      deployOptions: {
        stageName: "dev",
      },
      defaultCorsPreflightOptions: {
        allowOrigins: apigw.Cors.ALL_ORIGINS,
        allowMethods: apigw.Cors.ALL_METHODS,
        allowHeaders: apigw.Cors.DEFAULT_HEADERS,
      },
    });
  }
}

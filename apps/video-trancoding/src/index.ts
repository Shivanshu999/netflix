//src/index.ts
import dotenv from "dotenv";
dotenv.config();
console.log("CWD:", process.cwd());
console.log("--------consumer ready--------");
import {
  DeleteMessageCommand,
  ReceiveMessageCommand,
  SQSClient,
} from "@aws-sdk/client-sqs";
import { ECSClient, RunTaskCommand } from "@aws-sdk/client-ecs";
import type { S3Event } from "aws-lambda";

const SQS_QUEUE_URL = process.env.SQS_QUEUE_URL || "";
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID || "";
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY || "";
const AWS_REGION = process.env.AWS_REGION || "";
const OUTPUT_BUCKET = process.env.OUTPUT_BUCKET || "";
const TASK_DEFINITION_ARN =
  process.env.TASK_DEFINITION_ARN ||
  "";
const ECS_CLUSTER_ARN =
  process.env.ECS_CLUSTER_ARN ||
  "";
  const SUBNETS = process.env.SUBNETS || "";
  const SECURITY_GROUPS = process.env.SECURITY_GROUPS || "";

if (
  !SQS_QUEUE_URL ||
  !AWS_ACCESS_KEY_ID ||
  !AWS_SECRET_ACCESS_KEY ||
  !AWS_REGION ||
  !OUTPUT_BUCKET ||
  !TASK_DEFINITION_ARN ||
  !ECS_CLUSTER_ARN

) {
  throw new Error("Missing required environment variables");
}

// Initialize AWS SQS Client
const client = new SQSClient({
  region: AWS_REGION,
});

const ecsClient = new ECSClient({
  region: AWS_REGION,
});

function log(payload: Record<string, any>) {
  console.log(JSON.stringify(payload));
}
const parsedSubnets = SUBNETS
  .split(",")
  .map(s => s.trim())
  .filter(Boolean);

const parsedSecurityGroups = SECURITY_GROUPS
  .split(",")
  .map(s => s.trim())
  .filter(Boolean);

log({
  event: "NETWORK_CONFIG",
  subnets: parsedSubnets,
  securityGroups: parsedSecurityGroups,
});

async function pollQueue() {
  log({ event: "CONSUMER_STARTED" });
  while (true) {
    try {
      const { Messages } = await client.send(
        new ReceiveMessageCommand({
          QueueUrl: SQS_QUEUE_URL,
          MaxNumberOfMessages: 1,
          WaitTimeSeconds: 20,
          VisibilityTimeout: 3600,
        }),
      );
      if (!Messages?.length) {
        await new Promise(r => setTimeout(r, 3000))
        continue;
      }

      for (const message of Messages) {
        if (!message.Body) continue;

        const event = JSON.parse(message.Body) as S3Event;

        // ignore S3 test events
        if ("Event" in event && event.Event === "s3:TestEvent") {
          log({ event: "S3_TEST_EVENT_IGNORED" });
          continue;
        }
        for (const record of event.Records) {
          const { s3 } = record;
          const {
            bucket,
            object: { key: rawKey },
          } = s3;
          const decodedKey = decodeURIComponent(rawKey.replace(/\+/g, " "));

          log({
            event: "RUN_ECS_TASK",
            bucket,
            decodedKey,
          });

          const task = await ecsClient.send(
            new RunTaskCommand({
              taskDefinition: TASK_DEFINITION_ARN,
              cluster: ECS_CLUSTER_ARN,
              launchType: "FARGATE",
              networkConfiguration: {
                awsvpcConfiguration: {
                  securityGroups: parsedSecurityGroups,
                  assignPublicIp: "ENABLED",
                  subnets: parsedSubnets,
                },
              },
              overrides: {
                containerOverrides: [
                  {
                    name: "video-transcoder",
                    environment: [
                      { name: "BUCKET_NAME", value: bucket.name },
                      { name: "KEY", value: decodedKey },
                      { name: "OUTPUT_BUCKET", value: OUTPUT_BUCKET },
                      { name: "AWS_REGION", value: AWS_REGION },
                      {
                        name: "AWS_ACCESS_KEY_ID",
                        value: AWS_ACCESS_KEY_ID,
                      },
                      {
                        name: "AWS_SECRET_ACCESS_KEY",
                        value: AWS_SECRET_ACCESS_KEY,
                      },
                    ],
                  },
                ],
              },
            }),
          );


        }
      }
    } catch (err: any) {
      log({
        event: "WORKER_ERROR",
        error: err.message,
      });
      await new Promise((r) => setTimeout(r, 5000));
    }
  }
}

pollQueue();

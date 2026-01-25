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

// async function init() {
//   const command = new ReceiveMessageCommand({
//     QueueUrl: SQS_QUEUE_URL,
//     MaxNumberOfMessages: 10,
//     WaitTimeSeconds: 20,
//     VisibilityTimeout: 600,
//   });

//   while (true) {
//     try {
//       // Receive messages from SQS
//       const { Messages } = await client.send(command);

//       if (!Messages) {
//         console.log("No messages");
//         continue;
//       }
//       // Process each message
//       for (const message of Messages) {
//         // Log the message details
//         const { MessageId, Body } = message;
//         console.log(`MessageId: ${MessageId}, Body: ${Body}`);

//         if (!Body) continue;

//         //Validate and parse the event

//         const event = JSON.parse(Body) as S3Event;

//         // ignore the test events

//         if ("Service" in event && "Event" in event) {
//           if (event.Event === "s3:TestEvent") {
//             //Delete the message from the queue.
//             await client.send(
//               new DeleteMessageCommand({
//                 QueueUrl: SQS_QUEUE_URL,
//                 ReceiptHandle: message.ReceiptHandle!,
//               }),
//             );
//             continue;
//           }
//         }

//         //spin the docker container

//         for (const record of event.Records) {
//           //Extract bucket name and object key from the S3 event record
//           const { s3 } = record;
//           const {
//             bucket,
//             object: { key: rawKey },
//           } = s3;

//           const decodedKey = decodeURIComponent(rawKey.replace(/\+/g, " "));

//           //Run ECS task to process the S3 object
//           const runTaskCommand = new RunTaskCommand({
//             taskDefinition:
//               "arn:aws:ecs:us-east-1:656581531871:task-definition/video-transcoder",
//             cluster: "arn:aws:ecs:us-east-1:656581531871:cluster/dev",
//             launchType: "FARGATE",
//             networkConfiguration: {
//               awsvpcConfiguration: {
//                 securityGroups: ["sg-0edd6fbbc81f1cd9b"],
//                 assignPublicIp: "ENABLED",
//                 subnets: [
//                   "subnet-0eb7844f174ba3486",
//                   "subnet-0fbe126fa3010331f",
//                   "subnet-009928d02d0c0d205",
//                   "subnet-0234ca4969e25105c",
//                   "subnet-0871fbc1622537b5c",
//                   "subnet-03b5a0687692a13d9",
//                 ],
//               },
//             },
//             overrides: {
//               containerOverrides: [
//                 {
//                   name: "video-transcoder",
//                   environment: [
//                     { name: "BUCKET_NAME", value: bucket.name },
//                     { name: "KEY", value: decodedKey },
//                     { name: "OUTPUT_BUCKET", value: "prod.bucket.xyz" },
//                     { name: "AWS_REGION", value: AWS_REGION },
//                     {
//                       name: "AWS_ACCESS_KEY_ID",
//                       value: AWS_ACCESS_KEY_ID,
//                     },
//                     {
//                       name: "AWS_SECRET_ACCESS_KEY",
//                       value: AWS_SECRET_ACCESS_KEY,
//                     },
//                   ],
//                 },
//               ],
//             },
//           });
//           //Send the command to run the ECS task
//           await ecsClient.send(runTaskCommand);

//           //Delete the message from the queue.

//           await client.send(
//             new DeleteMessageCommand({
//               QueueUrl: SQS_QUEUE_URL,
//               ReceiptHandle: message.ReceiptHandle!,
//             }),
//           );
//         }
//       }
//     } catch (error) {
//       console.log("Error receiving messages: ", error);
//     }
//   }
// }
// init();

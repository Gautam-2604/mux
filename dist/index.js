"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_sqs_1 = require("@aws-sdk/client-sqs");
const client_ecs_1 = require("@aws-sdk/client-ecs");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const client = new client_sqs_1.SQSClient({
    region: 'ap-south-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY,
        secretAccessKey: process.env.AWS_SECRET_KEY
    }
});
const ecsClient = new client_ecs_1.ECSClient({
    region: 'ap-south-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY,
        secretAccessKey: process.env.AWS_SECRET_KEY
    }
});
function init() {
    return __awaiter(this, void 0, void 0, function* () {
        const command = new client_sqs_1.ReceiveMessageCommand({
            QueueUrl: 'https://sqs.ap-south-1.amazonaws.com/841162693180/TempRawVideoS3Queue',
            MaxNumberOfMessages: 1,
            WaitTimeSeconds: 5
        });
        while (true) {
            const { Messages } = yield client.send(command);
            if (!Messages) {
                console.log('No Message found in queue');
                continue;
            }
            try {
                for (const message of Messages) {
                    const { Body, MessageId } = message;
                    console.log(`Message Received`, { Body, MessageId });
                    if (!Body)
                        continue;
                    //TODO: Validate & Parse Event, Spin up Docker, Hta do event ko
                    const event = JSON.parse(Body);
                    if ("Service" in event && "Event" in event) {
                        if (event.Event === 's3:TestEvent')
                            continue;
                    }
                    for (const record of event.Records) {
                        const { s3 } = record;
                        const { bucket, object: { key } } = s3;
                        const taskCommand = new client_ecs_1.RunTaskCommand({
                            taskDefinition: 'arn:aws:ecs:ap-south-1:841162693180:task-definition/video-transcoder',
                            cluster: 'arn:aws:ecs:ap-south-1:841162693180:cluster/dev',
                            launchType: 'FARGATE',
                            networkConfiguration: {
                                awsvpcConfiguration: {
                                    assignPublicIp: 'ENABLED',
                                    subnets: ['subnet-0fed44918529a0cbd', 'subnet-0d20ec00389cb54bf', 'subnet-04beae4001b2cb609'],
                                    securityGroups: ['sg-08284a56e6960313e']
                                }
                            },
                            overrides: {
                                containerOverrides: [{ name: 'video-transcoder', environment: [{ name: 'BUCKET', value: bucket.name }, { name: 'KEY', value: key }] }]
                            }
                        });
                        yield ecsClient.send(taskCommand);
                        //Spinning the docker container
                    }
                }
            }
            catch (error) {
                console.log(error);
            }
        }
    });
}
init();

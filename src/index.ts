import {SQSClient, ReceiveMessageCommand, DeleteMessageCommand} from '@aws-sdk/client-sqs'
import { ECSClient, RunTaskCommand } from '@aws-sdk/client-ecs'
import type {S3Event} from 'aws-lambda'
import dotenv from 'dotenv'

dotenv.config()

const client = new SQSClient({
    region:'ap-south-1',
    credentials:{
        accessKeyId:process.env.AWS_ACCESS_KEY!,
        secretAccessKey:process.env.AWS_SECRET_KEY!
    }
})

const ecsClient = new ECSClient({
    region:'ap-south-1',
    credentials:{
        accessKeyId:process.env.AWS_ACCESS_KEY!,
        secretAccessKey:process.env.AWS_SECRET_KEY!
    }
})

 

async function init() {
    const command = new ReceiveMessageCommand({
        QueueUrl:'https://sqs.ap-south-1.amazonaws.com/841162693180/TempRawVideoS3Queue',
        MaxNumberOfMessages:1,
        WaitTimeSeconds:5

    });

    while (true){
        const {Messages} = await client.send(command)
        if(!Messages){
            console.log('No Message found in queue');
            continue
            
        }

        try {
            for(const message of Messages){
                const {Body, MessageId} = message
                console.log(`Message Received`, {Body, MessageId});
    
                if(!Body) continue;
                //TODO: Validate & Parse Event, Spin up Docker, Hta do event ko
    
                const event = JSON.parse(Body) as S3Event
                if("Service" in event && "Event" in event){
                    if(event.Event==='s3:TestEvent') continue
                }

                for(const record of event.Records){
                    const {s3} = record 
                    const {bucket, object:{key}} = s3
                

                const taskCommand = new RunTaskCommand({
                    taskDefinition:'arn:aws:ecs:ap-south-1:841162693180:task-definition/video-transcoder',
                    cluster:'arn:aws:ecs:ap-south-1:841162693180:cluster/dev',
                    launchType:'FARGATE',
                    networkConfiguration: {
                        awsvpcConfiguration:{
                            assignPublicIp:'ENABLED',
                            subnets:['subnet-0fed44918529a0cbd', 'subnet-0d20ec00389cb54bf', 'subnet-04beae4001b2cb609'],
                            securityGroups:['sg-08284a56e6960313e']
                        }
                    },
                    overrides:{
                        containerOverrides:[{name:'video-transcoder', environment:[{name:'BUCKET', value:bucket.name},{name:'KEY', value:key}]}]
                    } 
                })

                await ecsClient.send(taskCommand)

                //Spinning the docker container
                
    
                
            }
        }
        } catch (error) {
            console.log(error);
            
        }
    }
}

init()
//Path
//Download the original video , start the transcoder, upload the video

import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import fs from 'node:fs/promises'
import path, { resolve } from "node:path";
import ffmpeg from "fluent-ffmpeg";

const RESOLUTIONS=[
    {name:"360p", width:480, height:360},
    {name:"480p", width:858, height:480},
    {name:"720p", width:1280, height:720},

]

const s3client = new S3Client({
    region:'ap-south-1',
    credentials:{
        accessKeyId:process.env.AWS_ACCESS_KEY,
        secretAccessKey:process.env.AWS_SECRET_KEY
    }
})

const BUCKET = process.env.BUCKET_NAME
const KEY = process.env.KEY
 async function init(){
    const command = new GetObjectCommand({BUCKET, KEY});
    const result = await s3client.send(command)

    const originalFilePath = `videos/original-video.mp4 `
    await fs.writeFile(originalFilePath, result.Body)
    const originalVideoPath = path.resolve(originalFilePath)

     const promises = RESOLUTIONS.map(resolution=>{
        const output = `transcoded/video-${resolution.name}.mp4`
        ffmpeg(originalVideoPat).output(output).withVideoCodec("libx264").audioCodec('aac').withSize(`${resolution.height}*${resolution.width}`).format("mp4").on("end", async()=>{const putCommand = new PutObjectCommand ({
            Bucket:"production.ggaurisaria",
            Key:output
        })
        await s3client.send(putCommand)
        console.log('Uploaded');
        resolve;
    }).run() 

    
    
    })
    await Promise.all(promises)
    process.exit(0)
    

    


 }

 init()
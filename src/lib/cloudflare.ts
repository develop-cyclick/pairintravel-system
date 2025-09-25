import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

const s3Client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_ACCESS_KEY_ID!,
    secretAccessKey: process.env.CLOUDFLARE_SECRET_ACCESS_KEY!,
  },
})

export async function uploadToR2(file: Buffer, key: string, contentType?: string) {
  try {
    const command = new PutObjectCommand({
      Bucket: process.env.CLOUDFLARE_R2_BUCKET!,
      Key: key,
      Body: file,
      ContentType: contentType || 'application/octet-stream'
    })
    
    await s3Client.send(command)
    return `${process.env.CLOUDFLARE_R2_PUBLIC_URL}/${key}`
  } catch (error) {
    console.error('Error uploading to R2:', error)
    throw new Error('Failed to upload file to storage')
  }
}

export async function getSignedDownloadUrl(key: string, expiresIn: number = 3600) {
  try {
    const command = new GetObjectCommand({
      Bucket: process.env.CLOUDFLARE_R2_BUCKET!,
      Key: key,
    })
    
    return await getSignedUrl(s3Client, command, { expiresIn })
  } catch (error) {
    console.error('Error generating signed URL:', error)
    throw new Error('Failed to generate download URL')
  }
}

export async function deleteFromR2(key: string) {
  try {
    const command = new DeleteObjectCommand({
      Bucket: process.env.CLOUDFLARE_R2_BUCKET!,
      Key: key,
    })
    
    await s3Client.send(command)
  } catch (error) {
    console.error('Error deleting from R2:', error)
    throw new Error('Failed to delete file from storage')
  }
}
import {
  S3Client,
  ListObjectsV2Command,
  type ListObjectsV2CommandInput,
} from "@aws-sdk/client-s3";
import z from "zod";
import { zodParsePrettyErrors } from "./utility";
import env from "./env";

const client = new S3Client({
  region: "auto",
  endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
  },
});

export async function listAllObjects(bucketName: string): Promise<string[]> {
  const allKeys: string[] = [];
  let continuationToken: string | undefined = undefined;

  do {
    const params: ListObjectsV2CommandInput = {
      Bucket: bucketName,
      ContinuationToken: continuationToken,
    };

    const command = new ListObjectsV2Command(params);
    const response = await client.send(command);

    if (response.Contents) {
      for (const object of response.Contents) {
        if (object.Key) {
          allKeys.push(object.Key);
        }
      }
    }

    if (response.IsTruncated) {
      continuationToken = response.NextContinuationToken;
    } else {
      continuationToken = undefined;
    }
  } while (continuationToken);

  return allKeys;
}

// https://pub-232f9aa938d64458b3360607cda3228f.r2.dev/6bdb4045-c64d-4b1b-8e6d-137ec622fbac.jpg

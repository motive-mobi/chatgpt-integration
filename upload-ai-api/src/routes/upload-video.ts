import { FastifyInstance } from "fastify";
import { fastifyMultipart } from "@fastify/multipart";
import { prisma } from "../lib/prisma";
import path from "path";
import { randomUUID } from "crypto";
import fs from "fs";
import { pipeline } from "stream";
import { promisify } from "util";

const pump = promisify(pipeline)

export async function uploadVideoRoute(app: FastifyInstance) {
    app.register(fastifyMultipart, {
        limits: {
            fileSize: 1048576 * 25 // 25MB
        }
    })

    app.post("/videos", async (request, reply) => {
        const data = await request.file()

        if (!data) {
            return reply.status(400).send({
                error: "No file uploaded"
            })
        }

        const extension = path.extname(data.filename)

        if (extension !== ".mp3") {
            return reply.status(400).send({
                error: "Only mp3 files are allowed"
            })
        }

        const fileBaseName = path.basename(data.filename, extension)
        const fileUploadName = `${fileBaseName}-${randomUUID()}${extension}`
        const uploadDestination = path.resolve(__dirname, "../../temp", fileUploadName)

        await pump(data.file, fs.createWriteStream(uploadDestination))

        const video = await prisma.video.create({
            data: {
                name: data.filename,
                path: uploadDestination,
            }
        })

        return {
            video,
        }
    })
}
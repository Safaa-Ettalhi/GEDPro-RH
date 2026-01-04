import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as MinIO from 'minio';

@Injectable()
export class MinioService implements OnModuleInit {
  private readonly logger = new Logger(MinioService.name);
  private minioClient: MinIO.Client;
  private bucketName: string;

  constructor(private configService: ConfigService) {
    const endpoint = this.configService.get<string>('MINIO_ENDPOINT');
    const port = this.configService.get<number>('MINIO_PORT', 9000);
    const useSSL =
      this.configService.get<string>('MINIO_USE_SSL', 'false') === 'true';
    const accessKey = this.configService.get<string>('MINIO_ACCESS_KEY');
    const secretKey = this.configService.get<string>('MINIO_SECRET_KEY');

    this.bucketName = this.configService.get<string>(
      'MINIO_BUCKET_NAME',
      'gedpro-documents',
    );

    this.minioClient = new MinIO.Client({
      endPoint: endpoint || 'localhost',
      port: port,
      useSSL: useSSL,
      accessKey: accessKey || 'minioadmin',
      secretKey: secretKey || 'minioadmin',
    });
  }

  async onModuleInit() {
    await this.ensureBucketExists();
  }

  private async ensureBucketExists() {
    try {
      const exists = await this.minioClient.bucketExists(this.bucketName);
      if (!exists) {
        await this.minioClient.makeBucket(this.bucketName, 'us-east-1');
        this.logger.log(`Bucket ${this.bucketName} créé avec succès`);
      } else {
        this.logger.log(`Bucket ${this.bucketName} existe déjà`);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erreur inconnue';
      this.logger.error(
        `Erreur lors de la création du bucket: ${errorMessage}`,
      );
      throw error;
    }
  }

  async uploadFile(
    file: Express.Multer.File,
    organizationId: number,
    documentType: string,
  ): Promise<{ path: string; filename: string }> {
    const timestamp = Date.now();
    const filename = `${organizationId}/${documentType}/${timestamp}-${file.originalname}`;

    try {
      await this.minioClient.putObject(
        this.bucketName,
        filename,
        file.buffer,
        file.size,
        {
          'Content-Type': file.mimetype,
        },
      );

      return {
        path: filename,
        filename: file.originalname,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erreur inconnue';
      this.logger.error(`Erreur lors de l'upload: ${errorMessage}`);
      throw error;
    }
  }

  async getFile(path: string): Promise<Buffer> {
    try {
      const dataStream = await this.minioClient.getObject(
        this.bucketName,
        path,
      );
      const chunks: Buffer[] = [];

      return new Promise<Buffer>((resolve, reject) => {
        dataStream.on('data', (chunk: Buffer) => chunks.push(chunk));
        dataStream.on('end', () => resolve(Buffer.concat(chunks)));
        dataStream.on('error', (error: Error) => reject(error));
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erreur inconnue';
      this.logger.error(
        `Erreur lors de la récupération du fichier: ${errorMessage}`,
      );
      throw error;
    }
  }

  async deleteFile(path: string): Promise<void> {
    try {
      await this.minioClient.removeObject(this.bucketName, path);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erreur inconnue';
      this.logger.error(
        `Erreur lors de la suppression du fichier: ${errorMessage}`,
      );
      throw error;
    }
  }

  async getFileUrl(
    path: string,
    expiry: number = 7 * 24 * 60 * 60,
  ): Promise<string> {
    try {
      return await this.minioClient.presignedGetObject(
        this.bucketName,
        path,
        expiry,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erreur inconnue';
      this.logger.error(
        `Erreur lors de la génération de l'URL: ${errorMessage}`,
      );
      throw error;
    }
  }

  getBucketName(): string {
    return this.bucketName;
  }
}

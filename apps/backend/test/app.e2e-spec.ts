import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '../src/app.module';
import { configureApplication } from '../src/app.setup';
import { PrismaService } from '../src/prisma/prisma.service';

describe('App bootstrap (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.env.DATABASE_URL =
      'postgresql://postgres:postgres@localhost:5432/port_102?schema=public';
    process.env.PORT = '3102';

    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApplication(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('loads global configuration from environment variables', () => {
    const configService = app.get(ConfigService);

    expect(configService.get<number>('port')).toBe(3102);
    expect(configService.get<string>('database.url')).toContain('port_102');
  });

  it('provides PrismaService through PrismaModule', () => {
    const prismaService = app.get(PrismaService);

    expect(prismaService).toBeDefined();
    expect(typeof prismaService.$disconnect).toBe('function');
  });

  it('serves Swagger UI', async () => {
    await request(app.getHttpServer())
      .get('/api/docs')
      .expect(200)
      .expect('Content-Type', /html/);
  });

  it('formats HTTP exceptions globally', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/unknown-route')
      .expect(404);

    expect(response.body).toMatchObject({
      success: false,
      statusCode: 404,
      error: 'Not Found',
      message: 'Cannot GET /api/unknown-route',
      path: '/api/unknown-route',
    });
  });
});

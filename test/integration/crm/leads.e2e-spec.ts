import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';

describe('LeadsController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('/api/v1/crm/leads (GET)', () => {
    it('should return leads list', () => {
      return request(app.getHttpServer())
        .get('/api/v1/crm/leads')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('data');
          expect(res.body).toHaveProperty('total');
          expect(res.body).toHaveProperty('page');
          expect(res.body).toHaveProperty('totalPages');
          expect(Array.isArray(res.body.data)).toBe(true);
        });
    });
  });

  describe('/api/v1/crm/leads/stats (GET)', () => {
    it('should return lead statistics', () => {
      return request(app.getHttpServer())
        .get('/api/v1/crm/leads/stats')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('totalLeads');
          expect(res.body).toHaveProperty('newLeads');
          expect(res.body).toHaveProperty('qualifiedLeads');
          expect(res.body).toHaveProperty('convertedLeads');
          expect(res.body).toHaveProperty('averageScore');
        });
    });
  });

  describe('/api/v1/crm/leads (POST)', () => {
    it('should create a new lead', () => {
      const createLeadDto = {
        name: 'Test Lead',
        email: 'test@example.com',
        source: 'website',
        status: 'new',
      };

      return request(app.getHttpServer())
        .post('/api/v1/crm/leads')
        .send(createLeadDto)
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.name).toBe(createLeadDto.name);
          expect(res.body.email).toBe(createLeadDto.email);
          expect(res.body.source).toBe(createLeadDto.source);
          expect(res.body.status).toBe(createLeadDto.status);
        });
    });

    it('should return 400 for invalid lead data', () => {
      const invalidLeadDto = {
        name: '',
        email: 'invalid-email',
        source: '',
        status: 'invalid-status',
      };

      return request(app.getHttpServer())
        .post('/api/v1/crm/leads')
        .send(invalidLeadDto)
        .expect(400);
    });
  });

  describe('/api/v1/crm/leads/:id (GET)', () => {
    it('should return a lead by id', () => {
      return request(app.getHttpServer())
        .get('/api/v1/crm/leads/lead1')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.id).toBe('lead1');
        });
    });

    it('should return 404 for non-existent lead', () => {
      return request(app.getHttpServer())
        .get('/api/v1/crm/leads/non-existent')
        .expect(404);
    });
  });

  describe('/api/v1/crm/leads/:id (PATCH)', () => {
    it('should update a lead', () => {
      const updateData = {
        name: 'Updated Lead',
        status: 'contacted',
      };

      return request(app.getHttpServer())
        .patch('/api/v1/crm/leads/lead1')
        .send(updateData)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.name).toBe(updateData.name);
          expect(res.body.status).toBe(updateData.status);
        });
    });
  });

  describe('/api/v1/crm/leads/:id (DELETE)', () => {
    it('should delete a lead', () => {
      return request(app.getHttpServer())
        .delete('/api/v1/crm/leads/lead1')
        .expect(200);
    });
  });

  describe('/api/v1/crm/leads/:id/convert (POST)', () => {
    it('should convert a lead to customer', () => {
      return request(app.getHttpServer())
        .post('/api/v1/crm/leads/lead1/convert')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('lead');
          expect(res.body).toHaveProperty('customer');
          expect(res.body.lead.status).toBe('closed-won');
        });
    });
  });
});

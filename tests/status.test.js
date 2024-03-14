const { expect } = require('chai');
const request = require('supertest');
const app = require('../app');

describe('GET /status', () => {
  it('responds with json and status 200', (done) => {
    request(app)
      .get('/status')
      .expect('Content-Type', /json/)
      .expect(200)
      .end((err, res) => {
        if (err) return done(err);
        expect(res.body).to.have.property('redis').to.equal('OK');
        done();
      });
  });
});

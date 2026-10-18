import mongoose from 'mongoose';
import request from 'supertest';
import bcrypt from 'bcryptjs';

let memoryServer = null;

/**
 * Connects to a throwaway database.
 *  - If MONGODB_TEST_URI is set it is used (any MongoDB-compatible server).
 *  - Otherwise an in-memory MongoDB is started with mongodb-memory-server
 *    (downloads a mongod binary on first run).
 */
export async function connectTestDb(name) {
  let uri = process.env.MONGODB_TEST_URI;
  if (!uri) {
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    memoryServer = await MongoMemoryServer.create();
    uri = memoryServer.getUri();
  }
  await mongoose.connect(uri, { dbName: `campuscare_test_${name}`, serverSelectionTimeoutMS: 10000 });
  await mongoose.connection.dropDatabase();
  // make sure unique indexes exist before the first write
  await Promise.all(Object.values(mongoose.models).map((m) => m.init()));
}

export async function disconnectTestDb() {
  await mongoose.connection.dropDatabase().catch(() => {});
  await mongoose.disconnect();
  if (memoryServer) await memoryServer.stop();
  memoryServer = null;
}

export const PASSWORD = 'Passw0rd!x';

/** supertest agent that keeps cookies and always sends the CSRF header. */
export function makeAgent(app) {
  const agent = request.agent(app);
  for (const m of ['post', 'patch', 'put', 'delete']) {
    const orig = agent[m].bind(agent);
    agent[m] = (...args) => orig(...args).set('X-Requested-With', 'CampusCare');
  }
  return agent;
}

export async function createUserDirect(User, data) {
  return User.create({ passwordHash: await bcrypt.hash(PASSWORD, 4), ...data });
}

export async function loginAs(app, email) {
  const agent = makeAgent(app);
  const res = await agent.post('/api/auth/login').send({ email, password: PASSWORD });
  if (res.status !== 200) throw new Error(`login failed for ${email}: ${res.status} ${JSON.stringify(res.body)}`);
  return agent;
}

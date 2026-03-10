import admin from 'firebase-admin';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const serviceAccount = require('./firebaseServiceAccountKey.json'); // ✅ load JSON

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

export default admin;
process.env.NODE_ENV = "test";
process.env.MONGO_URI = "mongodb://invalid-host/should-never-be-used";
process.env.ACCESS_TOKEN_SECRET = "test-access-secret";
process.env.REFRESH_TOKEN_SECRET = "test-refresh-secret";
process.env.EMAIL_PROVIDER = "mailtrap";
process.env.MAIL_FROM = "Test <test@example.com>";
process.env.SERVER_URL = "http://localhost:5000";
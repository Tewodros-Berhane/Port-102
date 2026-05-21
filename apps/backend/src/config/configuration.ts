function optionalEnv(name: string, fallback: string) {
  const value = process.env[name]?.trim();

  return value || fallback;
}

export default () => ({
  environment: process.env.NODE_ENV ?? 'development',
  port: Number.parseInt(process.env.PORT ?? '3000', 10),
  database: {
    url: process.env.DATABASE_URL,
  },
  jwt: {
    accessSecret: optionalEnv('JWT_ACCESS_SECRET', 'change-me-access-secret'),
    refreshSecret: optionalEnv(
      'JWT_REFRESH_SECRET',
      'change-me-refresh-secret',
    ),
    accessExpiresIn: optionalEnv('JWT_ACCESS_EXPIRES_IN', '15m'),
    refreshExpiresIn: optionalEnv('JWT_REFRESH_EXPIRES_IN', '30d'),
    hotelSelectionExpiresIn: optionalEnv(
      'JWT_HOTEL_SELECTION_EXPIRES_IN',
      '10m',
    ),
  },
  security: {
    bcryptSaltRounds: Number.parseInt(
      optionalEnv('BCRYPT_SALT_ROUNDS', '12'),
      10,
    ),
  },
});

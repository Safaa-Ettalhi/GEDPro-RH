export const JWT_SECRET =
  process.env.JWT_SECRET ||
  'ccf64213265a145b5146aaf5836b03532d81d0a889dba8c12e7f65ecb01f3a69AYUF';

export const JWT_EXPIRES_IN =
  Number(process.env.JWT_EXPIRES_IN) || 24 * 60 * 60;
